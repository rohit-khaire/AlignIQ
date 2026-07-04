import os
import pymupdf4llm
import logging

logger = logging.getLogger(__name__)

def extract_pdf_to_dict(pdf_path: str) -> dict:
    """
    Extracts structured policy data from a strict Label: Value PDF format 
    using pymupdf4llm. Returns a dictionary matching the company_policies.json schema.
    """
    logger.info(f"Extracting text from PDF: {pdf_path}")
    try:
        # Extract raw text/markdown using pymupdf4llm
        raw_text = pymupdf4llm.to_markdown(pdf_path)
    except Exception as e:
        logger.error(f"Failed to read PDF with pymupdf4llm: {e}")
        raise ValueError(f"Failed to read PDF file: {e}")

    # Split by the known delimiter
    blocks = raw_text.split("---END POLICY---")
    
    policies = []
    import re
    
    for block in blocks:
        block = block.replace("**", "").replace("#", "").strip()
        if not block:
            continue
            
        policy_dict = {}
        
        match_id = re.search(r'Policy ID:\s*(.*?)(?=\s*(Title:|Category:|Department:|Status:|Policy Text:|$))', block, re.IGNORECASE | re.DOTALL)
        if match_id:
            policy_dict['company_policy_id'] = match_id.group(1).strip()
            
        match_title = re.search(r'Title:\s*(.*?)(?=\s*(Category:|Department:|Status:|Policy Text:|$))', block, re.IGNORECASE | re.DOTALL)
        if match_title:
            policy_dict['title'] = match_title.group(1).strip()
            
        match_category = re.search(r'Category:\s*(.*?)(?=\s*(Department:|Status:|Policy Text:|$))', block, re.IGNORECASE | re.DOTALL)
        if match_category:
            policy_dict['category'] = match_category.group(1).strip()
            
        match_department = re.search(r'Department:\s*(.*?)(?=\s*(Status:|Policy Text:|$))', block, re.IGNORECASE | re.DOTALL)
        if match_department:
            policy_dict['department'] = match_department.group(1).strip()
            
        match_status = re.search(r'Status:\s*(.*?)(?=\s*(Policy Text:|$))', block, re.IGNORECASE | re.DOTALL)
        if match_status:
            policy_dict['status'] = match_status.group(1).strip()
            
        match_text = re.search(r'Policy Text:\s*(.*)', block, re.IGNORECASE | re.DOTALL)
        if match_text:
            policy_dict['policy_text'] = match_text.group(1).strip()
            
        if policy_dict:
            policies.append(policy_dict)

    logger.info(f"Successfully extracted {len(policies)} policies from PDF.")

    # Assemble the final dictionary matching the required JSON schema
    return {
        "company_name": "Rohit Digital Solutions Pvt. Ltd.",
        "document_title": "Internal Information Security Policy Handbook",
        "version": "1.0",
        "effective_date": "2026-01-10",
        "total_policies": len(policies),
        "policies": policies
    }
