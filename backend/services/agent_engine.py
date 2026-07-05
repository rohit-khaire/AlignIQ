import json
import os
import time
import logging
from typing import Dict, Any
from langchain_groq import ChatGroq
from services.compliance_engine import get_vectorstore

logger = logging.getLogger(__name__)

groq_api_key = os.getenv("GROQ_API_KEY")

if groq_api_key:
    # Use a slightly higher temperature for the Legal Adversary to be creative in finding loopholes
    llm_auditor = ChatGroq(model="llama-3.1-8b-instant", groq_api_key=groq_api_key, temperature=0.0)
    llm_legal = ChatGroq(model="llama-3.1-8b-instant", groq_api_key=groq_api_key, temperature=0.2)
else:
    llm_auditor = None
    llm_legal = None

def run_deep_audit(policy_id: str) -> Dict[str, Any]:
    if not llm_auditor or not llm_legal:
        raise ValueError("GROQ_API_KEY is not set.")

    logger.info(f"Starting Multi-Agent Deep Audit for Policy ID: {policy_id}")

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    master_policies_path = os.path.join(base_dir, "data", "master_policies.json")

    with open(master_policies_path, "r", encoding="utf-8") as f:
        master_data = json.load(f)

    # Find the specific policy
    target_policy = None
    for p in master_data.get("policies", []):
        if p.get("policy_id") == policy_id:
            target_policy = p
            break

    if not target_policy:
        raise ValueError(f"Master policy {policy_id} not found.")

    title = target_policy.get("title", "No Title")
    req_objs = target_policy.get("detailed_requirements", [])
    
    req_strings = []
    for req_obj in req_objs:
        if isinstance(req_obj, dict):
            req_strings.append(f"- [{req_obj.get('requirement_id')}] {req_obj.get('requirement_text')}")
        else:
            req_strings.append(f"- {req_obj}")
    requirements_text = "\n".join(req_strings)
    
    category = target_policy.get("category")

    # Retrieve Evidence
    vectorstore = get_vectorstore()
    unique_docs = {}
    for req_obj in req_objs:
        req_text = req_obj.get("requirement_text") if isinstance(req_obj, dict) else req_obj
        query = f"{title} {req_text}"
        search_kwargs = {"k": 3}
        if category:
            search_kwargs["filter"] = {"category": category}
            
        docs_with_scores = vectorstore.similarity_search_with_score(query, **search_kwargs)
        for doc, score in docs_with_scores:
            doc_text = doc.page_content
            if doc_text not in unique_docs or unique_docs[doc_text][1] < score:
                unique_docs[doc_text] = (doc, score)

    best_docs = sorted(unique_docs.values(), key=lambda x: x[1], reverse=True)[:5]
    
    company_policies_text = ""
    for i, (doc, score) in enumerate(best_docs):
        metadata = doc.metadata
        company_policies_text += f"\n--- Evidence Document {i+1} ---\n"
        company_policies_text += f"ID: {metadata.get('company_policy_id', 'N/A')}\n"
        company_policies_text += f"Title: {metadata.get('title', 'N/A')}\n"
        company_policies_text += f"Text: {doc.page_content}\n"

    transcript = []

    # ==========================================
    # AGENT 1: Initial Auditor
    # ==========================================
    logger.info("Agent 1 (Auditor) analyzing...")
    prompt_1 = f"""You are a strict compliance auditor.
Master Policy: {policy_id} - {title}
Requirements to Evaluate:
{requirements_text}

Evidence Documents:
{company_policies_text}

Output a JSON ARRAY evaluating each requirement. 
Mark as "Satisfied", "Partially Satisfied", or "Not Satisfied".
For 'reasoning', you MUST explicitly explain WHY you gave the score. If you mark it "Partially Satisfied" or "Not Satisfied", explicitly point out the semantic gap, missing scope, or pedantic difference between the master requirement and the internal policy (e.g., "Requirement asks for X, but policy only provides Y"). Do not just summarize the policy.
Respond ONLY with a valid JSON ARRAY matching the exact structure below:
[
  {{
    "requirement_id": "REQ-XX",
    "requirement_text": "...",
    "status": "...",
    "confidence": 95,
    "reasoning": "...",
    "recommended_action": "...",
    "supporting_evidence": [
      {{
        "company_policy_title": "...",
        "evidence_snippet": "..."
      }}
    ]
  }}
]
"""
    response_1 = llm_auditor.invoke(prompt_1)
    auditor_json_str = _clean_json(response_1.content)
    
    transcript.append({
        "agent": "Auditor",
        "message": "I have completed the initial compliance scan based on the provided evidence. Here are my preliminary findings."
    })
    
    time.sleep(4) # Rate limit protection

    # ==========================================
    # AGENT 2: Legal Adversary
    # ==========================================
    logger.info("Agent 2 (Legal) reviewing...")
    prompt_2 = f"""You are a sharp corporate compliance lawyer.
Your job is to review the Auditor's initial findings and concisely find flaws, loopholes, or missing strictness.
If the Auditor marked something "Satisfied" but the evidence doesn't explicitly guarantee it (e.g. says "should" instead of "must"), you must point it out as a loophole.

CRITICAL INSTRUCTIONS FOR FORMATTING:
Business executives do not have time to read long paragraphs. Your critique MUST be extremely concise, strictly structured, and highly readable.
DO NOT output any introductory or concluding conversational filler (e.g., "Here is my review"). Just output the issues directly.
Separate each issue with a clear Markdown heading and an empty line.

Format each issue EXACTLY like this:

### Issue 1: [Short Title of Flaw]
- **Loophole:** [1 sentence identifying the flaw]
- **Business Impact:** [1 sentence on how it affects the organization]
- **Acceptable Risk:** [Yes/No] - [1 sentence explaining if the company can safely keep this loophole depending on operational needs]

### Issue 2: [Short Title of Flaw]
...and so on.

If the Auditor is perfectly correct and there are no loopholes, output exactly: "I concur with the Auditor's findings. No loopholes found."

Auditor's Initial JSON:
{auditor_json_str}

Original Evidence:
{company_policies_text}
"""
    response_2 = llm_legal.invoke(prompt_2)
    legal_critique = response_2.content.strip()

    transcript.append({
        "agent": "Legal Adversary",
        "message": legal_critique
    })

    time.sleep(4) # Rate limit protection

    # ==========================================
    # AGENT 3: Consensus (Final Auditor)
    # ==========================================
    logger.info("Agent 3 (Consensus) finalizing...")
    prompt_3 = f"""You are the Lead Consensus Auditor. 
You must output the final, corrected JSON evaluation taking the Legal Adversary's critique into account.

Auditor's Initial JSON:
{auditor_json_str}

Legal Adversary's Critique:
{legal_critique}

Revise the JSON array based on the valid points from the critique. 
Respond ONLY with a valid JSON ARRAY matching the exact structure below:
[
  {{
    "requirement_id": "REQ-XX",
    "requirement_text": "...",
    "status": "...",
    "confidence": 95,
    "reasoning": "...",
    "recommended_action": "...",
    "supporting_evidence": [
      {{
        "company_policy_title": "...",
        "evidence_snippet": "..."
      }}
    ]
  }}
]
"""
    response_3 = llm_auditor.invoke(prompt_3)
    final_json_str = _clean_json(response_3.content)
    
    try:
        final_json = json.loads(final_json_str)
    except Exception as e:
        logger.error(f"Failed to parse final consensus JSON: {e}")
        final_json = []

    transcript.append({
        "agent": "Consensus",
        "message": "I have incorporated the Legal Adversary's feedback and generated the finalized, legally sound compliance evaluation."
    })

    return {
        "policy_id": policy_id,
        "transcript": transcript,
        "final_evaluation": final_json
    }

def _clean_json(content: str) -> str:
    content = content.strip()
    if content.startswith("```json"):
        content = content[7:]
    elif content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
    return content.strip()
