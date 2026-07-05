import os
import json
import logging
import pymupdf4llm
from langchain_groq import ChatGroq

logger = logging.getLogger(__name__)

def extract_pdf_to_dict(pdf_path: str) -> dict:
    """
    Extracts structured policy data from a PDF format using pymupdf4llm and an LLM.
    Returns a dictionary matching the company_policies.json schema.
    """
    logger.info(f"Extracting text from PDF: {pdf_path}")
    try:
        # Extract raw text/markdown using pymupdf4llm
        raw_text = pymupdf4llm.to_markdown(pdf_path)
    except Exception as e:
        logger.error(f"Failed to read PDF with pymupdf4llm: {e}")
        raise ValueError(f"Failed to read PDF file: {e}")
        
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        logger.error("GROQ_API_KEY not found. Cannot perform LLM extraction.")
        raise ValueError("GROQ_API_KEY is missing.")
        
    llm = ChatGroq(
        model="llama-3.1-8b-instant", 
        groq_api_key=groq_api_key, 
        temperature=0.0, 
        max_tokens=1500,
        model_kwargs={"response_format": {"type": "json_object"}}
    )
    
    # Split text into manageable chunks to respect Groq's 6000 TPM limit.
    # We will split by 'Policy ID:' which is a standard marker in the PDF
    blocks = raw_text.split("Policy ID:")
    if len(blocks) > 1:
        # Re-attach the delimiter
        blocks = [blocks[0]] + ["Policy ID:" + b for b in blocks[1:]]
    else:
        # Fallback if delimiter is missing, chunk by ~1500 chars
        blocks = [raw_text[i:i+1500] for i in range(0, len(raw_text), 1500)]
        
    chunk_size = 5 # Process 5 policies at a time
    chunks = []
    for i in range(0, len(blocks), chunk_size):
        chunk_text = "\n".join(blocks[i:i+chunk_size])
        if chunk_text.strip():
            chunks.append(chunk_text)

    all_policies = []
    final_data = {
        "company_name": "Unknown Company",
        "document_title": "Information Security Policy",
        "version": "1.0",
        "effective_date": "2026-01-01",
        "total_policies": 0,
        "policies": []
    }
    
    import time
    
    logger.info(f"Processing PDF in {len(chunks)} chunks to avoid LLM rate limits...")
    for i, chunk in enumerate(chunks):
        logger.info(f"Processing chunk {i+1}/{len(chunks)}...")
        
        prompt = f"""You are a strict data extraction engine.
I will provide you with a chunk of raw text extracted from a company policy PDF document.
Your task is to parse this text and output a STRICT JSON object representing the policies.

### EXTRACTION RULES:
1. If this is the FIRST chunk (Chunk 1), extract 'company_name', 'document_title', 'version', 'effective_date', and 'total_policies' from the header. Otherwise, leave them blank or omit them.
2. Extract all individual policies into a list under the key 'policies'.
3. For each policy, extract:
   - company_policy_id
   - title
   - category
   - department
   - status
   - policy_text
4. You MUST return ONLY a valid JSON object. Do not include markdown codeblocks, explanations, or any other text.

### TARGET JSON STRUCTURE:
{{
  "company_name": "...",
  "document_title": "...",
  "version": "...",
  "effective_date": "...",
  "total_policies": 0,
  "policies": [
    {{
      "company_policy_id": "...",
      "title": "...",
      "category": "...",
      "department": "...",
      "status": "...",
      "policy_text": "..."
    }}
  ]
}}

### RAW PDF TEXT CHUNK:
{chunk}
"""
        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = llm.invoke(prompt)
                content = response.content.strip()
                if content.startswith("```json"):
                    content = content[7:]
                elif content.startswith("```"):
                    content = content[3:]
                if content.endswith("```"):
                    content = content[:-3]
                content = content.strip()
                
                data = json.loads(content)
                if i == 0:
                    final_data["company_name"] = data.get("company_name", final_data["company_name"])
                    final_data["document_title"] = data.get("document_title", final_data["document_title"])
                    final_data["version"] = data.get("version", final_data["version"])
                    final_data["effective_date"] = data.get("effective_date", final_data["effective_date"])
                
                extracted_policies = data.get("policies", [])
                all_policies.extend(extracted_policies)
                logger.info(f"Extracted {len(extracted_policies)} policies from chunk {i+1}")
                time.sleep(2) # Small delay to avoid TPM burst limits
                break # Success
            except Exception as e:
                logger.warning(f"Error on chunk {i+1}, attempt {attempt+1}: {str(e)}")
                if "413" in str(e) or "rate_limit_exceeded" in str(e).lower():
                    logger.info("Rate limit hit. Waiting 20 seconds before retry...")
                    time.sleep(20)
                else:
                    time.sleep(5)
                if attempt == max_retries - 1:
                    logger.error(f"Failed to process chunk {i+1} after {max_retries} attempts.")
                    
    final_data["policies"] = all_policies
    final_data["total_policies"] = len(all_policies)
    
    if len(all_policies) == 0:
         raise ValueError("LLM failed to return any valid policies across all chunks.")
         
    return final_data
