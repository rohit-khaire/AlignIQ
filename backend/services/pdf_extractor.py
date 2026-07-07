import os
import re
import json
import logging
import time
from typing import Any

import pymupdf4llm
from langchain_groq import ChatGroq
from services.compliance_engine import check_cancellation, interruptible_sleep
from services.progress_service import set_progress

logger = logging.getLogger(__name__)

POLICY_ID_RE = re.compile(
    r"(?:Policy\s*ID|Policy_ID|POLICY\s*ID)\s*[:|]\s*([A-Z][A-Z0-9]{1,7}-\d{2,4})|"
    r"^\s*\*{0,2}([A-Z][A-Z0-9]{1,7}-\d{2,4})\s*\*{0,2}\s*[—–\-]",
    re.IGNORECASE | re.MULTILINE,
)
HEADER_SPLIT_RE = re.compile(
    r"(?=(?:Policy\s*ID\s*[:|]\s*[A-Z][A-Z0-9]{1,7}-\d{2,4}|[A-Z][A-Z0-9]{1,7}-\d{2,4}\s*[—–\-]))",
    re.IGNORECASE,
)
FIELD_PATTERNS = {
    "title": re.compile(r"(?:Title|Policy\s*Title)\s*[:|]\s*(.+?)(?:\n|$)", re.IGNORECASE),
    "category": re.compile(r"Category\s*[:|]\s*(.+?)(?:\n|$)", re.IGNORECASE),
    "department": re.compile(r"Department\s*[:|]\s*(.+?)(?:\n|$)", re.IGNORECASE),
    "status": re.compile(r"Status\s*[:|]\s*(.+?)(?:\n|$)", re.IGNORECASE),
}
DOC_META_PATTERNS = {
    "company_name": re.compile(
        r"(?:"
        r"(?:Company|Organization|Prepared\s+(?:for|by)|Client|Issued\s+by)\s*[:|]\s*(.+?)(?:\n|$)"
        r")",
        re.IGNORECASE,
    ),
    "document_title": re.compile(r"(?:Document\s*Title|Handbook|Manual)\s*[:|]?\s*(.+?)(?:\n|$)", re.IGNORECASE),
    "version": re.compile(r"Version\s*[:|]\s*([\d.]+)", re.IGNORECASE),
    "effective_date": re.compile(r"Effective\s*Date\s*[:|]\s*([\d\-/A-Za-z ,]+)", re.IGNORECASE),
}
TOTAL_POLICIES_RE = re.compile(
    r"(?:Total\s*Policies|Number\s*of\s*Policies|Policies\s*Included)\s*[:|]\s*(\d+)", re.IGNORECASE
)
# Fallback: match lines like "40 Policies" or "40 Company Policies" near the top
TOTAL_POLICIES_FALLBACK_RE = re.compile(
    r"(?:^|\n)\s*(\d{1,4})\s+(?:company\s+)?policies\b", re.IGNORECASE
)


def _clean_text(text: str) -> str:
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]+\n", "\n", text)
    return text.strip()


def _extract_policy_id(block: str) -> str | None:
    match = POLICY_ID_RE.search(block)
    if not match:
        return None
    return (match.group(1) or match.group(2) or "").upper()


def _extract_field(block: str, field: str) -> str | None:
    match = FIELD_PATTERNS[field].search(block)
    return match.group(1).strip() if match else None


def _split_into_blocks(raw_text: str) -> list[str]:
    raw_text = _clean_text(raw_text)
    blocks = HEADER_SPLIT_RE.split(raw_text)
    blocks = [b.strip() for b in blocks if b.strip() and len(b.strip()) > 40]
    if len(blocks) > 1:
        return blocks

    alt_blocks = raw_text.split("Policy ID:")
    if len(alt_blocks) > 1:
        return [alt_blocks[0]] + ["Policy ID:" + b for b in alt_blocks[1:] if b.strip()]

    return [raw_text[i : i + 2000] for i in range(0, len(raw_text), 2000) if raw_text[i : i + 2000].strip()]


def _regex_extract_policy(block: str) -> dict[str, Any] | None:
    policy_id = _extract_policy_id(block)
    if not policy_id:
        return None

    title = _extract_field(block, "title")
    if not title:
        title_match = re.search(
            rf"{re.escape(policy_id)}\s*[—–\-]\s*(.+?)(?:\n|_\(|$)",
            block,
            re.IGNORECASE,
        )
        title = title_match.group(1).strip() if title_match else policy_id

    policy_text = block
    stmt_match = re.search(
        r"(?:Policy\s*Statement|policy_statement)\s*[:|]\s*(.+?)(?:\n\n|Indicators|Required\s*Evidence|$)",
        block,
        re.IGNORECASE | re.DOTALL,
    )
    if stmt_match:
        policy_text = stmt_match.group(1).strip()
    elif len(policy_text) > 3000:
        policy_text = policy_text[:3000]

    return {
        "company_policy_id": policy_id,
        "title": title[:200],
        "category": _extract_field(block, "category") or "General",
        "department": _extract_field(block, "department") or "Security",
        "status": _extract_field(block, "status") or "Active",
        "policy_text": policy_text,
        "extraction_method": "regex",
    }


def _extract_document_metadata(raw_text: str) -> dict[str, str]:
    meta: dict[str, str] = {
        "company_name": "Unknown Company",
        "document_title": "Information Security Policy",
        "version": "1.0",
        "effective_date": "2026-01-01",
    }
    header = raw_text[:4000]
    for key, pattern in DOC_META_PATTERNS.items():
        match = pattern.search(header)
        if match:
            meta[key] = match.group(1).strip()

    # Extract declared total_policies from front page
    tp_match = TOTAL_POLICIES_RE.search(header)
    if not tp_match:
        tp_match = TOTAL_POLICIES_FALLBACK_RE.search(header)
    if tp_match:
        meta["declared_total_policies"] = tp_match.group(1).strip()

    return meta


def _dedupe_policies(policies: list[dict]) -> list[dict]:
    seen: dict[str, dict] = {}
    for p in policies:
        pid = (p.get("company_policy_id") or "").upper()
        if not pid:
            continue
        if pid not in seen or len(p.get("policy_text", "")) > len(seen[pid].get("policy_text", "")):
            seen[pid] = p
    return list(seen.values())


def _llm_extract_chunk(llm: ChatGroq, chunk: str, is_first: bool, user_id: str) -> dict:
    header_rule = (
        "Extract 'company_name', 'document_title', 'version', 'effective_date', and 'total_policies' from the header."
        if is_first
        else "Omit document-level metadata fields."
    )
    prompt = f"""You are a compliance document extraction engine. Parse policy text into structured JSON.

### RULES:
1. {header_rule}
2. Extract every distinct policy into the 'policies' array.
3. Each policy needs: company_policy_id, title, category, department, status, policy_text.
4. Preserve full policy_text — do not summarize or truncate requirements.
5. Return ONLY valid JSON. No markdown fences.

### TARGET SCHEMA:
{{
  "company_name": "...",
  "document_title": "...",
  "version": "...",
  "effective_date": "...",
  "policies": [
    {{
      "company_policy_id": "AUTH-001",
      "title": "...",
      "category": "...",
      "department": "...",
      "status": "Active",
      "policy_text": "Full policy content..."
    }}
  ]
}}

### RAW TEXT:
{chunk}
"""
    max_retries = 3
    for attempt in range(max_retries):
        check_cancellation(user_id)
        try:
            response = llm.invoke(prompt)
            content = response.content.strip()
            if content.startswith("```"):
                content = re.sub(r"^```(?:json)?\s*", "", content)
                content = re.sub(r"\s*```$", "", content)
            data = json.loads(content.strip())
            for p in data.get("policies", []):
                p["extraction_method"] = "llm"
            return data
        except Exception as e:
            if "Analysis was cancelled" in str(e):
                raise
            logger.warning(f"LLM chunk attempt {attempt + 1} failed: {e}")
            if "rate_limit" in str(e).lower() or "413" in str(e):
                interruptible_sleep(65, user_id)
            else:
                interruptible_sleep(5, user_id)
    return {"policies": []}


def _llm_extract_frontpage_meta(raw_text: str, user_id: str) -> dict:
    """Use LLM to reliably extract company name and total policies from the PDF front page."""
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        return {}
    try:
        llm = ChatGroq(
            model="llama-3.1-8b-instant",
            groq_api_key=groq_api_key,
            temperature=0.0,
            max_tokens=500,
            model_kwargs={"response_format": {"type": "json_object"}},
        )
        prompt = f"""Extract ONLY the following from this document front-page / header.
Return a JSON object with exactly these keys:
- "company_name": The name of the company/organization that owns these policies. Look for it in the title, header, "Prepared for", "Company:", or any prominent mention. If not found, return null.
- "total_policies": The total number of policies declared in the document (e.g. "40 Policies", "Total Policies: 40"). Return as integer. If not found, return null.

Document text (first 2000 chars):
{raw_text[:2000]}
"""
        check_cancellation(user_id)
        response = llm.invoke(prompt)
        content = response.content.strip()
        if content.startswith("```"):
            content = re.sub(r"^```(?:json)?\s*", "", content)
            content = re.sub(r"\s*```$", "", content)
        data = json.loads(content.strip())
        result = {}
        if data.get("company_name") and data["company_name"] not in ("null", "None", "", "Unknown", "Unknown Company"):
            result["company_name"] = str(data["company_name"]).strip()
        if data.get("total_policies") and str(data["total_policies"]).isdigit():
            result["declared_total_policies"] = str(data["total_policies"])
        return result
    except Exception as e:
        if "Analysis was cancelled" in str(e):
            raise
        logger.warning(f"LLM front-page metadata extraction failed: {e}")
        return {}


def extract_pdf_to_dict(pdf_path: str, user_id: str) -> dict:
    """
    Hybrid PDF → structured policy JSON pipeline.
    1. pymupdf4llm markdown extraction (layout-aware)
    2. Regex fast-path for structured policy manuals
    3. LLM fallback for unstructured sections only
    """
    logger.info(f"Extracting text from PDF: {pdf_path}")
    start = time.time()
    set_progress(user_id, "extract", "Parsing PDF layout with PyMuPDF", 15)

    try:
        raw_text = pymupdf4llm.to_markdown(pdf_path)
    except Exception as e:
        logger.error(f"Failed to read PDF: {e}")
        raise ValueError(f"Failed to read PDF file: {e}")

    set_progress(user_id, "structure", "Detecting policy sections", 20, f"{len(raw_text):,} characters extracted")

    raw_text = _clean_text(raw_text)
    if len(raw_text) < 50:
        raise ValueError("PDF appears empty or unreadable. Ensure the document contains selectable text.")

    doc_meta = _extract_document_metadata(raw_text)

    # If regex didn't find company name, try LLM extraction from front page
    if doc_meta.get("company_name") == "Unknown Company":
        llm_meta = _llm_extract_frontpage_meta(raw_text, user_id)
        if llm_meta.get("company_name"):
            doc_meta["company_name"] = llm_meta["company_name"]
        if llm_meta.get("declared_total_policies") and not doc_meta.get("declared_total_policies"):
            doc_meta["declared_total_policies"] = llm_meta["declared_total_policies"]

    blocks = _split_into_blocks(raw_text)

    regex_policies: list[dict] = []
    unstructured_blocks: list[str] = []

    for block in blocks:
        extracted = _regex_extract_policy(block)
        if extracted and len(extracted.get("policy_text", "")) >= 80:
            regex_policies.append(extracted)
        else:
            unstructured_blocks.append(block)

    all_policies = _dedupe_policies(regex_policies)
    regex_count = len(all_policies)
    llm_count = 0

    if regex_count:
        set_progress(user_id, "structure", f"Fast-path extracted {regex_count} policies", 26, "Regex parser — no AI wait")

    groq_api_key = os.getenv("GROQ_API_KEY")
    if unstructured_blocks:
        if not groq_api_key:
            if not all_policies:
                raise ValueError("GROQ_API_KEY is missing and regex extraction found no policies.")
            logger.warning("Unstructured sections skipped — GROQ_API_KEY not set.")
        else:
            llm = ChatGroq(
                model="llama-3.1-8b-instant",
                groq_api_key=groq_api_key,
                temperature=0.0,
                max_tokens=4000,
                model_kwargs={"response_format": {"type": "json_object"}},
            )
            chunk_size = 4
            chunks = [
                "\n\n".join(unstructured_blocks[i : i + chunk_size])
                for i in range(0, len(unstructured_blocks), chunk_size)
            ]
            logger.info(f"LLM fallback: {len(chunks)} chunks for {len(unstructured_blocks)} unstructured blocks")

            for i, chunk in enumerate(chunks):
                check_cancellation(user_id)
                set_progress(
                    user_id, "structure",
                    f"AI structuring policies ({i + 1}/{len(chunks)})",
                    22 + int((i / max(len(chunks), 1)) * 10),
                    "LLM fallback for unstructured sections",
                )
                data = _llm_extract_chunk(llm, chunk, i == 0 and not regex_policies, user_id)
                if i == 0 and not regex_policies:
                    for k in ("company_name", "document_title", "version", "effective_date"):
                        if data.get(k) and (k != "company_name" or doc_meta.get(k) == "Unknown Company"):
                            doc_meta[k] = data[k]
                llm_policies = data.get("policies", [])
                all_policies.extend(llm_policies)
                llm_count += len(llm_policies)

    all_policies = _dedupe_policies(all_policies)

    if not all_policies:
        raise ValueError(
            "No policies could be extracted. Ensure the PDF contains identifiable policy sections "
            "(Policy ID, AUTH-001, or similar markers)."
        )

    elapsed = round(time.time() - start, 2)
    regex_pct = round((regex_count / len(all_policies)) * 100) if all_policies else 0

    # Use the declared total from PDF front page if available, otherwise use extracted count
    declared_total = doc_meta.pop("declared_total_policies", None)
    actual_extracted = len(all_policies)
    total_policies = int(declared_total) if declared_total and declared_total.isdigit() else actual_extracted

    # Truncate policies if LLM hallucinated extra beyond declared total
    if declared_total and declared_total.isdigit() and total_policies < actual_extracted:
        all_policies = all_policies[:total_policies]
        actual_extracted = len(all_policies)

    result = {
        **doc_meta,
        "total_policies": total_policies,
        "policies": all_policies,
        "extraction_metadata": {
            "source_file": os.path.basename(pdf_path),
            "raw_characters": len(raw_text),
            "blocks_detected": len(blocks),
            "regex_extracted": regex_count,
            "llm_extracted": llm_count,
            "total_policies": total_policies,
            "extracted_count": actual_extracted,
            "declared_count": int(declared_total) if declared_total and declared_total.isdigit() else None,
            "regex_coverage_pct": regex_pct,
            "extraction_time_seconds": elapsed,
            "pipeline": "pymupdf4llm → regex → llm-fallback",
        },
    }

    logger.info(
        f"Extracted {actual_extracted} policies in {elapsed}s "
        f"({regex_count} regex, {llm_count} LLM) — declared total: {declared_total or 'N/A'}"
    )
    return result
