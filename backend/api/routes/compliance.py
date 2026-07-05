import os
import json
import logging
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException, Query, Response
from models.responses import ComplianceReportResponse
from services.compliance_engine import ingest_company_policies, run_compliance_analysis, clear_pinecone_db
from services.export_service import generate_export

logger = logging.getLogger(__name__)
router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
REPORTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "reports")

@router.get("/export")
async def export_report(format: str = Query(..., description="Export format: json, csv, or pdf")):
    logger.info(f"Received request to export report in format: {format}")
    
    report_path = os.path.join(REPORTS_DIR, "report.json")
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

from services.pdf_extractor import extract_pdf_to_dict

import hashlib

@router.post("/analyze", response_model=ComplianceReportResponse)
async def analyze_compliance(file: UploadFile = File(...)):
    logger.info(f"Received request to analyze compliance using file: {file.filename}")
    
    # Validate file extension (Now we expect PDF)
    if not file.filename.lower().endswith(".pdf"):
        logger.error("Uploaded file is not a PDF file.")
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
        
    upload_pdf_path = os.path.join(UPLOAD_DIR, "uploaded_policies.pdf")
    upload_json_path = os.path.join(UPLOAD_DIR, "company_policies.json")
    hash_file_path = os.path.join(REPORTS_DIR, "last_hash.txt")
    report_path = os.path.join(REPORTS_DIR, "report.json")
    
    try:
        file_content = await file.read()
        file_hash = hashlib.sha256(file_content).hexdigest()
        
        # Check if we already processed this exact file
        if os.path.exists(hash_file_path) and os.path.exists(report_path):
            with open(hash_file_path, "r", encoding="utf-8") as f:
                last_hash = f.read().strip()
                
            if last_hash == file_hash:
                logger.info("File hash matches last analyzed file. Returning cached report to save LLM tokens.")
                with open(report_path, "r", encoding="utf-8") as f:
                    cached_report = json.load(f)
                    
                # LOG HISTORICAL SCORE EVEN ON CACHE HIT
                total_satisfied = 0
                total_partial = 0
                total_missing = 0
                for pol in cached_report:
                    summary = pol.get("summary", {})
                    total_satisfied += summary.get("satisfied", 0)
                    total_partial += summary.get("partially_satisfied", 0)
                    total_missing += summary.get("not_satisfied", 0)
                
                total_reqs = total_satisfied + total_partial + total_missing
                score = round(((total_satisfied + (total_partial * 0.5)) / total_reqs) * 100) if total_reqs > 0 else 0
                log_compliance_score(score, total_satisfied, total_partial, total_missing)
                
                return {"status": "success", "report": cached_report}
    except Exception as e:
        logger.warning(f"Cache check failed, proceeding with full analysis: {e}")
    
    # Save the PDF file temporarily
    try:
        with open(upload_pdf_path, "wb") as buffer:
            buffer.write(file_content)
        logger.info(f"Upload successful. PDF saved to {upload_pdf_path}")
    except Exception as e:
        logger.error(f"Failed to save uploaded file: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to process uploaded file.")
        
    # Extract PDF to JSON structure
    try:
        logger.info("Extracting PDF contents using pymupdf4llm...")
        policy_dict = extract_pdf_to_dict(upload_pdf_path)
        
        # Save extracted JSON to file for ingest engine
        with open(upload_json_path, "w", encoding="utf-8") as f:
            json.dump(policy_dict, f, indent=2)
            
        logger.info(f"Successfully converted PDF to structured JSON at {upload_json_path}")
    except ValueError as ve:
        logger.error(f"PDF extraction validation failed: {ve}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Failed to extract PDF: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to parse PDF document.")
        
    # Call the compliance engine
    try:
        logger.info("Starting analysis via compliance engine...")
        ingest_company_policies(upload_json_path)
        
        master_policies_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "master_policies.json")
        result = run_compliance_analysis(master_policies_path)
        logger.info("Analysis completed successfully.")
        
        # Save report
        report_path = os.path.join(REPORTS_DIR, "report.json")
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(result["report"], f, indent=2)
            
        # Save file hash for caching
        with open(hash_file_path, "w", encoding="utf-8") as f:
            f.write(file_hash)
            
        logger.info(f"Report generated and saved to {report_path}")

        # LOG HISTORICAL SCORE
        total_satisfied = 0
        total_partial = 0
        total_missing = 0
        for pol in result["report"]:
            summary = pol.get("summary", {})
            total_satisfied += summary.get("satisfied", 0)
            total_partial += summary.get("partially_satisfied", 0)
            total_missing += summary.get("not_satisfied", 0)
        
        total_reqs = total_satisfied + total_partial + total_missing
        score = round(((total_satisfied + (total_partial * 0.5)) / total_reqs) * 100) if total_reqs > 0 else 0
        log_compliance_score(score, total_satisfied, total_partial, total_missing)
        
        return result
        
    except Exception as e:
        logger.error(f"Error during compliance analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error during analysis: {str(e)}")

from services.autofix_engine import run_autofix

@router.post("/autofix")
async def autofix_policies():
    logger.info("Starting autofix process...")
    try:
        result = run_autofix()
        return {"status": "success", "data": result}
    except Exception as e:
        logger.error(f"Error during autofix: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to autofix policies: {str(e)}")

@router.get("/export-remediated")
async def export_remediated(format: str = Query("json", description="Export format: json, md, docx, or pdf")):
    logger.info(f"Exporting remediated policies in format: {format}")
    remediated_path = os.path.join(REPORTS_DIR, "remediated_policies.json")
    if not os.path.exists(remediated_path):
        raise HTTPException(status_code=404, detail="No remediated policies found to export.")
    
    # Extract company name from uploaded JSON
    company_name = "Company"
    upload_json_path = os.path.join(UPLOAD_DIR, "company_policies.json")
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
            
    # Fallback to json/md
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

from pydantic import BaseModel
from services.chatbot_engine import ask_oracle
from services.db_service import log_compliance_score, get_historical_scores

class ChatRequest(BaseModel):
    query: str
    history: list = []

@router.post("/chat")
async def chat_with_oracle(request: ChatRequest):
    logger.info(f"Received chat query: {request.query}")
    try:
        answer = ask_oracle(request.query, request.history)
        return {"status": "success", "response": answer}
    except Exception as e:
        logger.error(f"Chatbot failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process chat query: {str(e)}")

@router.get("/history")
async def get_history():
    logger.info("Fetching historical compliance scores...")
    try:
        data = get_historical_scores()
        return {"status": "success", "history": data}
    except Exception as e:
        logger.error(f"Failed to fetch history: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch historical scores.")

class DeepAuditRequest(BaseModel):
    policy_id: str

@router.post("/deep-audit")
async def trigger_deep_audit(request: DeepAuditRequest):
    logger.info(f"Triggering Deep Audit for {request.policy_id}")
    from services.agent_engine import run_deep_audit
    try:
        result = run_deep_audit(request.policy_id)
        return {"status": "success", "data": result}
    except Exception as e:
        logger.error(f"Deep Audit failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Deep Audit failed: {str(e)}")

# @router.post("/reset")
# @router.get("/reset")
@router.api_route("/reset", methods=["GET", "POST"])
async def reset_session():
    """Deletes temporary uploaded files and generated reports to save space on cloud deployments."""
    logger.info("Resetting session, deleting temporary files...")
    
    files_to_delete = [
        os.path.join(UPLOAD_DIR, "uploaded_policies.pdf"),
        os.path.join(UPLOAD_DIR, "company_policies.json"),
        os.path.join(REPORTS_DIR, "last_hash.txt"),
        os.path.join(REPORTS_DIR, "report.json"),
        os.path.join(REPORTS_DIR, "remediated_policies.json"),
        os.path.join(REPORTS_DIR, "autofix_test_result.json"),
    ]
    
    deleted_count = 0
    for file_path in files_to_delete:
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                deleted_count += 1
        except Exception as e:
            logger.error(f"Failed to delete {file_path}: {e}")
            
    # Clear vector database
    clear_pinecone_db()
            
    return {"status": "success", "message": f"Deleted {deleted_count} temporary files and cleared Pinecone VectorDB."}
