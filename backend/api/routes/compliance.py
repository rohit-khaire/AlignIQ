import os
import json
import logging
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException, Query, Response, Header
from fastapi.concurrency import run_in_threadpool
from models.responses import ComplianceReportResponse
from services.compliance_engine import ingest_company_policies, run_compliance_analysis, clear_pinecone_db, cancel_analysis, reset_cancellation, AnalysisCancelledException
from services.export_service import generate_export
from services.pdf_extractor import extract_pdf_to_dict
from services.consulting_insights import generate_consulting_insights
from services.progress_service import reset_progress, set_progress, complete_progress, fail_progress, cancel_progress, get_progress, get_steps
import hashlib
from services.autofix_engine import run_autofix
from pydantic import BaseModel
from services.chatbot_engine import ask_oracle
from services.db_service import log_compliance_score, get_historical_scores, increment_docs_uploaded

logger = logging.getLogger(__name__)
router = APIRouter()

UPLOAD_DIR_BASE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
REPORTS_DIR_BASE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "reports")

def get_user_dirs(user_id: str):
    user_upload_dir = os.path.join(UPLOAD_DIR_BASE, user_id)
    user_report_dir = os.path.join(REPORTS_DIR_BASE, user_id)
    os.makedirs(user_upload_dir, exist_ok=True)
    os.makedirs(user_report_dir, exist_ok=True)
    return user_upload_dir, user_report_dir

@router.get("/export")
async def export_report(
    format: str = Query(..., description="Export format: json, csv, or pdf"),
    x_user_id: str = Header("anonymous")
):
    logger.info(f"Received request to export report in format: {format} for user: {x_user_id}")
    
    _, user_report_dir = get_user_dirs(x_user_id)
    report_path = os.path.join(user_report_dir, "report.json")
    if not os.path.exists(report_path):
        raise HTTPException(status_code=404, detail="No compliance report found to export.")
        
    try:
        content, media_type, filename = generate_export(report_path, format.lower())
        
        return Response(
            content=content,
            media_type=media_type,
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Failed to generate export: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate export file.")

@router.post("/analyze", response_model=ComplianceReportResponse)
async def analyze_compliance(
    file: UploadFile = File(...),
    x_user_id: str = Header("anonymous"),
    x_session_id: str = Header("default_session")
):
    logger.info(f"Received request to analyze compliance using file: {file.filename} for user: {x_user_id}")
    reset_cancellation(x_user_id)
    reset_progress(x_user_id)
    
    if not file.filename.lower().endswith(".pdf"):
        logger.error("Uploaded file is not a PDF file.")
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
        
    user_upload_dir, user_report_dir = get_user_dirs(x_user_id)
        
    upload_pdf_path = os.path.join(user_upload_dir, "uploaded_policies.pdf")
    upload_json_path = os.path.join(user_upload_dir, "company_policies.json")
    hash_file_path = os.path.join(user_report_dir, "last_hash.txt")
    session_file_path = os.path.join(user_report_dir, "last_session.txt")
    report_path = os.path.join(user_report_dir, "report.json")
    insights_path = os.path.join(user_report_dir, "consulting_insights.json")
    
    try:
        file_content = await file.read()
        set_progress(x_user_id, "upload", "Document received", 8, f"Processing {file.filename}")
        if len(file_content) > 25 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="PDF file exceeds 25MB limit.")
        file_hash = hashlib.sha256(file_content).hexdigest()
        
        if os.path.exists(hash_file_path) and os.path.exists(session_file_path) and os.path.exists(report_path):
            with open(hash_file_path, "r", encoding="utf-8") as f:
                last_hash = f.read().strip()
            with open(session_file_path, "r", encoding="utf-8") as f:
                last_session = f.read().strip()
                
            if last_hash == file_hash and last_session == x_session_id:
                logger.info("File hash and session match last analyzed file. Returning cached report to save LLM tokens.")
                with open(report_path, "r", encoding="utf-8") as f:
                    cached_report = json.load(f)
                    
                total_satisfied = sum(pol.get("summary", {}).get("satisfied", 0) for pol in cached_report)
                total_partial = sum(pol.get("summary", {}).get("partially_satisfied", 0) for pol in cached_report)
                total_missing = sum(pol.get("summary", {}).get("not_satisfied", 0) for pol in cached_report)
                
                total_reqs = total_satisfied + total_partial + total_missing
                score = round(((total_satisfied + (total_partial * 0.5)) / total_reqs) * 100) if total_reqs > 0 else 0
                log_compliance_score(x_user_id, score, total_satisfied, total_partial, total_missing)
                
                cached_insights = None
                cached_extraction = None
                cached_policy_count = 0
                if os.path.exists(insights_path):
                    with open(insights_path, "r", encoding="utf-8") as f:
                        cached_insights = json.load(f)
                if os.path.exists(upload_json_path):
                    try:
                        with open(upload_json_path, "r", encoding="utf-8") as f:
                            upload_data = json.load(f)
                            cached_extraction = upload_data.get("extraction_metadata")
                            cached_policy_count = upload_data.get("total_policies", 0)
                    except Exception:
                        cached_policy_count = 0

                complete_progress(x_user_id, cached_policy_count)
                return {
                    "status": "success",
                    "report": cached_report,
                    "consulting_insights": cached_insights,
                    "extraction_metadata": cached_extraction,
                }
    except Exception as e:
        logger.warning(f"Cache check failed, proceeding with full analysis: {e}")
    
    try:
        with open(upload_pdf_path, "wb") as buffer:
            buffer.write(file_content)
        logger.info(f"Upload successful. PDF saved to {upload_pdf_path}")
        set_progress(x_user_id, "extract", "Reading PDF with layout-aware parser", 12)
    except Exception as e:
        logger.error(f"Failed to save uploaded file: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to process uploaded file.")
        
    try:
        logger.info("Extracting PDF contents using pymupdf4llm...")
        policy_dict = await run_in_threadpool(extract_pdf_to_dict, upload_pdf_path, x_user_id)
        
        with open(upload_json_path, "w", encoding="utf-8") as f:
            json.dump(policy_dict, f, indent=2)
            
        logger.info(f"Successfully converted PDF to structured JSON at {upload_json_path}")
        total_policies = policy_dict.get("total_policies", 0)
        meta = policy_dict.get("extraction_metadata", {})
        set_progress(
            x_user_id, "structure", f"Structured {total_policies} policies",
            32,
            f"{meta.get('regex_extracted', 0)} via fast-path, {meta.get('llm_extracted', 0)} via AI — {meta.get('extraction_time_seconds', '?')}s",
            policies_extracted=total_policies,
        )
    except ValueError as ve:
        fail_progress(x_user_id, str(ve))
        logger.error(f"PDF extraction validation failed: {ve}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        fail_progress(x_user_id, "PDF extraction failed")
        logger.error(f"Failed to extract PDF: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to parse PDF document.")
        
    try:
        logger.info("Starting analysis via compliance engine...")
        set_progress(x_user_id, "index", "Embedding policies in Pinecone vector DB", 42, f"{total_policies} policies")
        clear_pinecone_db(x_user_id)
        await run_in_threadpool(ingest_company_policies, upload_json_path, x_user_id)
        master_policies_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "master_policies.json")
        try:
            with open(master_policies_path, "r", encoding="utf-8") as f:
                total_master = len(json.load(f).get("policies", []))
        except Exception:
            total_master = "all"
        
        set_progress(x_user_id, "analyze", "Starting AI gap analysis", 48, f"{total_master} master policies")
        result = await run_in_threadpool(run_compliance_analysis, master_policies_path, x_user_id)
        logger.info("Analysis completed successfully.")

        set_progress(x_user_id, "insights", "Building consulting replacement report", 92)
        
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(result["report"], f, indent=2)

        consulting_insights = generate_consulting_insights(
            result["report"],
            company_meta=policy_dict,
            extraction_metadata=policy_dict.get("extraction_metadata"),
        )
        with open(insights_path, "w", encoding="utf-8") as f:
            json.dump(consulting_insights, f, indent=2)
            
        with open(hash_file_path, "w", encoding="utf-8") as f:
            f.write(file_hash)
            
        with open(session_file_path, "w", encoding="utf-8") as f:
            f.write(x_session_id)
            
        logger.info(f"Report generated and saved to {report_path}")

        total_satisfied = sum(pol.get("summary", {}).get("satisfied", 0) for pol in result["report"])
        total_partial = sum(pol.get("summary", {}).get("partially_satisfied", 0) for pol in result["report"])
        total_missing = sum(pol.get("summary", {}).get("not_satisfied", 0) for pol in result["report"])
        
        total_reqs = total_satisfied + total_partial + total_missing
        score = round(((total_satisfied + (total_partial * 0.5)) / total_reqs) * 100) if total_reqs > 0 else 0
        log_compliance_score(x_user_id, score, total_satisfied, total_partial, total_missing)
        
        if x_user_id != "anonymous":
            increment_docs_uploaded(x_user_id)

        complete_progress(x_user_id, total_policies)
        
        return {
            "status": "success",
            "report": result["report"],
            "consulting_insights": consulting_insights,
            "extraction_metadata": policy_dict.get("extraction_metadata"),
        }
        
    except AnalysisCancelledException as e:
        logger.info(f"Analysis cancelled by user {x_user_id}. Cleaning up.")
        clear_pinecone_db(x_user_id)
        cancel_progress(x_user_id)
        return {"status": "cancelled", "report": [], "consulting_insights": None, "extraction_metadata": None}
    except HTTPException:
        raise
    except Exception as e:
        fail_progress(x_user_id, "Analysis failed")
        logger.error(f"Error during compliance analysis: {str(e)}")
        raise HTTPException(status_code=500, detail="Analysis failed. Please verify your PDF and try again.")

@router.get("/progress")
async def analysis_progress(x_user_id: str = Header("anonymous")):
    """Live analysis progress for the frontend progress tracker."""
    progress = get_progress(x_user_id)
    return {"status": "success", "progress": progress, "steps": get_steps()}

@router.post("/cancel")
async def cancel_analysis_route(x_user_id: str = Header("anonymous")):
    logger.info(f"Cancel request received for user: {x_user_id}")
    cancel_analysis(x_user_id)
    cancel_progress(x_user_id)
    return {"status": "success"}

@router.post("/autofix")
async def autofix_policies(x_user_id: str = Header("anonymous")):
    logger.info("Starting autofix process...")
    try:
        result = await run_in_threadpool(run_autofix, x_user_id)
        return {"status": "success", "data": result}
    except Exception as e:
        logger.error(f"Error during autofix: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to autofix policies: {str(e)}")

@router.get("/export-remediated")
async def export_remediated(
    format: str = Query("json", description="Export format: json, md, docx, or pdf"),
    x_user_id: str = Header("anonymous")
):
    logger.info(f"Exporting remediated policies in format: {format} for user: {x_user_id}")
    
    user_upload_dir, user_report_dir = get_user_dirs(x_user_id)
    remediated_path = os.path.join(user_report_dir, "remediated_policies.json")
    
    if not os.path.exists(remediated_path):
        raise HTTPException(status_code=404, detail="No remediated policies found to export.")
    
    company_name = "Company"
    upload_json_path = os.path.join(user_upload_dir, "company_policies.json")
    if os.path.exists(upload_json_path):
        try:
            with open(upload_json_path, "r", encoding="utf-8") as f:
                comp_data = json.load(f)
                company_name = comp_data.get("company_name", "Company")
        except Exception:
            pass
            
    if format.lower() in ["docx", "pdf"]:
        from services.export_service import generate_remediated_export
        try:
            content, media_type, filename = generate_remediated_export(remediated_path, format.lower(), company_name)
            return Response(
                content=content,
                media_type=media_type,
                headers={"Content-Disposition": f"attachment; filename={filename}"}
            )
        except Exception as e:
            logger.error(f"Failed to generate {format} export: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to generate export file: {str(e)}")
            
    with open(remediated_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    safe_company = "".join([c if c.isalnum() else "_" for c in company_name]) or "Company"
        
    if format.lower() == "md":
        md_lines = [f"# {company_name} - Remediated Policies\n"]
        for cat in data.get("remediated_categories", []):
            md_lines.append(f"## {cat.get('category')}")
            md_lines.append(f"\n{cat.get('remediated_text')}\n\n---\n")
            
        content = "\n".join(md_lines).encode("utf-8")
        media_type = "text/markdown"
        filename = f"{safe_company}_Remediated_Policies.md"
    else:
        content = json.dumps(data, indent=2).encode("utf-8")
        media_type = "application/json"
        filename = f"{safe_company}_Remediated_Policies.json"
        
    return Response(
        content=content,
        media_type=media_type,
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )

class ChatRequest(BaseModel):
    query: str
    history: list = []

@router.post("/chat")
async def chat_with_oracle(
    request: ChatRequest,
    x_user_id: str = Header("anonymous")
):
    logger.info(f"Received chat query: {request.query} from user: {x_user_id}")
    try:
        answer = await run_in_threadpool(ask_oracle, request.query, request.history, x_user_id)
        return {"status": "success", "response": answer}
    except Exception as e:
        logger.error(f"Chatbot failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process chat query: {str(e)}")

@router.get("/history")
async def get_history(x_user_id: str = Header("anonymous")):
    logger.info(f"Fetching historical compliance scores for user: {x_user_id}")
    try:
        data = get_historical_scores(x_user_id)
        return {"status": "success", "history": data}
    except Exception as e:
        logger.error(f"Failed to fetch history: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch historical scores.")

class DeepAuditRequest(BaseModel):
    policy_id: str
    force_refresh: bool = False

@router.post("/deep-audit")
async def trigger_deep_audit(
    request: DeepAuditRequest,
    x_user_id: str = Header("anonymous")
):
    logger.info(f"Triggering Deep Audit for {request.policy_id} by user: {x_user_id}")
    from services.agent_engine import run_deep_audit
    try:
        result = await run_in_threadpool(run_deep_audit, request.policy_id, x_user_id, request.force_refresh)
        return {"status": "success", "data": result}
    except Exception as e:
        logger.error(f"Deep Audit failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Deep Audit failed: {str(e)}")

@router.get("/deep-audit/{policy_id}")
async def get_deep_audit(policy_id: str, x_user_id: str = Header("anonymous")):
    from services.agent_engine import load_deep_audit
    result = load_deep_audit(x_user_id, policy_id)
    if not result:
        raise HTTPException(status_code=404, detail="No deep audit found for this policy.")
    return {"status": "success", "data": result}


@router.api_route("/reset", methods=["GET", "POST"])
async def reset_session(x_user_id: str = Header("anonymous")):
    """Deletes temporary uploaded files and generated reports to save space on cloud deployments."""
    logger.info(f"Resetting session, deleting temporary files for user: {x_user_id}")
    
    user_upload_dir, user_report_dir = get_user_dirs(x_user_id)
    
    files_to_delete = [
        os.path.join(user_upload_dir, "uploaded_policies.pdf"),
        os.path.join(user_upload_dir, "company_policies.json"),
        os.path.join(user_report_dir, "last_hash.txt"),
        os.path.join(user_report_dir, "last_session.txt"),
        os.path.join(user_report_dir, "report.json"),
        os.path.join(user_report_dir, "consulting_insights.json"),
        os.path.join(user_report_dir, "remediated_policies.json"),
        os.path.join(user_report_dir, "remediated_hash.txt"),
        os.path.join(user_report_dir, "autofix_test_result.json"),
    ]
    deep_audit_glob = [
        f for f in os.listdir(user_report_dir) if f.startswith("deep_audit_")
    ] if os.path.exists(user_report_dir) else []
    files_to_delete.extend(os.path.join(user_report_dir, f) for f in deep_audit_glob)
    
    deleted_count = 0
    for file_path in files_to_delete:
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                deleted_count += 1
        except Exception as e:
            logger.error(f"Failed to delete {file_path}: {e}")
            
    # Clear vector database namespace for this user
    clear_pinecone_db(x_user_id)
            
    return {"status": "success", "message": f"Deleted {deleted_count} temporary files and cleared Pinecone VectorDB for user."}

@router.get("/consulting-insights")
async def get_consulting_insights(x_user_id: str = Header("anonymous")):
    """Return the consulting replacement deliverable for the latest analysis."""
    _, user_report_dir = get_user_dirs(x_user_id)
    insights_path = os.path.join(user_report_dir, "consulting_insights.json")
    if not os.path.exists(insights_path):
        raise HTTPException(status_code=404, detail="No consulting insights found. Run an analysis first.")
    with open(insights_path, "r", encoding="utf-8") as f:
        return {"status": "success", "consulting_insights": json.load(f)}

class ExecInsightsRequest(BaseModel):
    globalCompliance: int
    notSatisfiedReqs: int
    partialReqs: int
    tickets_todo: int
    tickets_inprogress: int
    tickets_done: int
    autoFixPerformed: bool

@router.post("/exec-insights")
async def get_exec_insights(req: ExecInsightsRequest):
    from services.agent_engine import generate_exec_insights
    try:
        insights = await run_in_threadpool(generate_exec_insights, req.model_dump())
        return {"status": "success", "insights": insights}
    except Exception as e:
        logger.error(f"Error generating insights: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate insights")
