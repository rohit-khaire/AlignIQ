import os
import json
import logging
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException, Query, Response
from models.responses import ComplianceReportResponse
from services.compliance_engine import ingest_company_policies, run_compliance_analysis
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

@router.post("/analyze", response_model=ComplianceReportResponse)
async def analyze_compliance(file: UploadFile = File(...)):
    logger.info(f"Received request to analyze compliance using file: {file.filename}")
    
    # Validate file extension (Now we expect PDF)
    if not file.filename.lower().endswith(".pdf"):
        logger.error("Uploaded file is not a PDF file.")
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
        
    upload_pdf_path = os.path.join(UPLOAD_DIR, "uploaded_policies.pdf")
    upload_json_path = os.path.join(UPLOAD_DIR, "company_policies.json")
    
    # Save the PDF file temporarily
    try:
        with open(upload_pdf_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
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
        logger.info(f"Report generated and saved to {report_path}")
        
        return result
        
    except Exception as e:
        logger.error(f"Error during compliance analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error during analysis: {str(e)}")
