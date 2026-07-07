import json
import os
import time
import logging
from typing import Dict, Any, List
from langchain_groq import ChatGroq
from services.compliance_engine import get_vectorstore, check_cancellation
from services.retrieval_utils import retrieve_relevant_docs, format_docs_for_prompt

logger = logging.getLogger(__name__)

groq_api_key = os.getenv("GROQ_API_KEY")

if groq_api_key:
    llm_auditor = ChatGroq(model="llama-3.1-8b-instant", groq_api_key=groq_api_key, temperature=0.0)
    llm_legal = ChatGroq(model="llama-3.1-8b-instant", groq_api_key=groq_api_key, temperature=0.3)
    llm_business = ChatGroq(model="llama-3.1-8b-instant", groq_api_key=groq_api_key, temperature=0.35)
else:
    llm_auditor = None
    llm_legal = None
    llm_business = None

AGENT_SLEEP_SECONDS = 2


def _clean_json(content: str) -> str:
    content = content.strip()
    start_list = content.find("[")
    start_obj = content.find("{")
    
    if start_list != -1 and (start_obj == -1 or start_list < start_obj):
        start = start_list
        end = content.rfind("]")
    elif start_obj != -1:
        start = start_obj
        end = content.rfind("}")
    else:
        if content.startswith("```json"):
            content = content[7:]
        elif content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        return content.strip()
        
    if start != -1 and end != -1 and end > start:
        return content[start:end+1].strip()
    return content.strip()


def _invoke_with_retry(llm, prompt: str, max_retries: int = 3) -> str:
    for attempt in range(max_retries):
        try:
            response = llm.invoke(prompt)
            return response.content.strip()
        except Exception as e:
            logger.warning(f"LLM attempt {attempt + 1} failed: {e}")
            if "rate_limit" in str(e).lower() or "413" in str(e):
                time.sleep(65)
            elif attempt < max_retries - 1:
                time.sleep(5)
            else:
                raise
    return ""


def _parse_json_array(raw: str, fallback: List | None = None) -> list:
    try:
        data = json.loads(_clean_json(raw))
        if isinstance(data, list):
            return data
    except json.JSONDecodeError as e:
        logger.error(f"JSON parse failed: {e}")
    return fallback or []


def _save_deep_audit(user_id: str, policy_id: str, result: Dict[str, Any]) -> None:
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    report_dir = os.path.join(base_dir, "reports", user_id)
    os.makedirs(report_dir, exist_ok=True)
    path = os.path.join(report_dir, f"deep_audit_{policy_id}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)


def load_deep_audit(user_id: str, policy_id: str) -> Dict[str, Any] | None:
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    path = os.path.join(base_dir, "reports", user_id, f"deep_audit_{policy_id}.json")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return None


def run_deep_audit(policy_id: str, user_id: str, force_refresh: bool = False) -> Dict[str, Any]:
    if not llm_auditor or not llm_legal:
        raise ValueError("GROQ_API_KEY is not set.")

    if not force_refresh:
        cached = load_deep_audit(user_id, policy_id)
        if cached:
            logger.info(f"Returning cached deep audit for {policy_id}")
            return cached

    logger.info(f"Starting Multi-Agent Deep Audit for Policy ID: {policy_id}")
    check_cancellation(user_id)

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    master_policies_path = os.path.join(base_dir, "data", "master_policies.json")

    with open(master_policies_path, "r", encoding="utf-8") as f:
        master_data = json.load(f)

    target_policy = next((p for p in master_data.get("policies", []) if p.get("policy_id") == policy_id), None)
    if not target_policy:
        raise ValueError(f"Master policy {policy_id} not found.")

    title = target_policy.get("title", "No Title")
    req_objs = target_policy.get("detailed_requirements", [])
    req_strings = [
        f"- [{r.get('requirement_id')}] {r.get('requirement_text')}" if isinstance(r, dict) else f"- {r}"
        for r in req_objs
    ]
    requirements_text = "\n".join(req_strings)
    category = target_policy.get("category")
    expected_count = len(req_objs)

    vectorstore = get_vectorstore(user_id)
    unique_docs: dict = {}
    for req_obj in req_objs:
        check_cancellation(user_id)
        req_text = req_obj.get("requirement_text") if isinstance(req_obj, dict) else req_obj
        docs = retrieve_relevant_docs(vectorstore, f"{title} {req_text}", category=category, k=4, top_n=4)
        for doc, score in docs:
            key = doc.page_content
            if key not in unique_docs or score < unique_docs[key][1]:
                unique_docs[key] = (doc, score)

    best_docs = sorted(unique_docs.values(), key=lambda x: x[1])[:8]
    company_policies_text = format_docs_for_prompt(best_docs, "Evidence Document")

    transcript = []

    # AGENT 1: Auditor
    logger.info("Agent 1 (Auditor) analyzing...")
    prompt_1 = f"""You are a strict compliance auditor evaluating company policies against master requirements.
Master Policy: {policy_id} - {title}

Requirements ({expected_count} total — you MUST evaluate every one):
{requirements_text}

Evidence Documents:
{company_policies_text}

Rules:
- Evaluate ALL {expected_count} requirements. Output exactly {expected_count} objects.
- Mark each: "Satisfied", "Partially Satisfied", or "Not Satisfied".
- Explain semantic gaps in reasoning when not fully satisfied.
- Include supporting_evidence from the documents above.

Return ONLY a JSON ARRAY:
[{{"requirement_id":"...","requirement_text":"...","status":"...","confidence":85,"reasoning":"...","recommended_action":"...","supporting_evidence":[{{"company_policy_title":"...","evidence_snippet":"..."}}]}}]
"""
    auditor_raw = _invoke_with_retry(llm_auditor, prompt_1)
    auditor_json = _parse_json_array(auditor_raw)
    if not auditor_json:
        raise ValueError("Auditor agent failed to produce valid JSON. Please retry.")

    auditor_json_str = json.dumps(auditor_json)
    transcript.append({
        "agent": "Auditor",
        "role": "Compliance Auditor",
        "message": f"Completed initial scan of {len(auditor_json)} requirements against {len(best_docs)} evidence documents.",
    })
    time.sleep(AGENT_SLEEP_SECONDS)

    # AGENT 2: Legal — find loopholes AND acceptable risks
    logger.info("Agent 2 (Legal) reviewing...")
    prompt_2 = f"""You are a sharp corporate compliance lawyer and risk strategist.

Review the Auditor's findings and identify:
1. **Compliance loopholes** — vague language ("should" vs "must"), missing scope, audit failures waiting to happen.
2. **Profit-preserving loopholes** — places where strict remediation would hurt revenue, velocity, or competitive advantage BUT the current policy language may still be defensible with compensating controls.
3. **Acceptable risks** — gaps the organization can consciously accept with documented rationale.

For EACH issue, use this format:

### [{{requirement_id}}] [Short Title]
- **Loophole Type:** Compliance Risk | Profit-Preserving | Acceptable Risk
- **Finding:** [1 sentence]
- **Business Impact:** [1 sentence]
- **Profit Impact if Remediated:** [How fixing this hurts or helps revenue/operations — be specific]
- **Acceptable Risk:** Yes or No
- **Rationale:** [Why keep or fix]

If no issues exist, output exactly: "No material loopholes identified."

Auditor JSON:
{auditor_json_str}

Evidence:
{company_policies_text}
"""
    legal_critique = _invoke_with_retry(llm_legal, prompt_2)
    transcript.append({"agent": "Legal Adversary", "role": "Corporate Counsel", "message": legal_critique})
    time.sleep(AGENT_SLEEP_SECONDS)

    # AGENT 3: Business — profit & operational perspective
    logger.info("Agent 3 (Business) reviewing...")
    prompt_3 = f"""You are the CFO and VP of Engineering. Your job is to protect organizational profit and operational efficiency.

Review the Auditor findings and Legal critique. For each gap or loophole:
- Identify if strict remediation would **reduce profit**, **slow product delivery**, or **increase costs** unnecessarily.
- Propose **profit-friendly alternatives**: compensating controls, phased rollout, risk acceptance with monitoring.
- Flag loopholes the company should **keep** because they enable legitimate business flexibility without unacceptable risk.

Format each item as:

### [{{requirement_id}}] [Title]
- **Operational Friction:** [1 sentence]
- **Profit Impact:** [Revenue, cost, or velocity impact if we remediate strictly]
- **Recommended Stance:** Remediate | Accept Risk | Compensating Control
- **Profit-Preserving Alternative:** [Practical compromise that keeps compliance reasonable without killing business]

If all fixes are low-friction, output: "Remediation approved — no material profit or operational impact."

Auditor JSON:
{auditor_json_str}

Legal Critique:
{legal_critique}
"""
    business_critique = _invoke_with_retry(llm_business, prompt_3)
    transcript.append({"agent": "Business Stakeholder", "role": "CFO & VP Engineering", "message": business_critique})
    time.sleep(AGENT_SLEEP_SECONDS)

    # AGENT 4: Consensus
    logger.info("Agent 4 (Consensus) finalizing...")
    prompt_4 = f"""You are the Lead Compliance Consultant producing the final strategic ruling.

Synthesize Auditor, Legal, and Business perspectives into a final JSON ARRAY with exactly {expected_count} objects.
You are generating a premium paid report, so ensure all fields contain highly specific, professional, and audit-grade content. Do not use generic answers or empty placeholders.

For each requirement include ALL fields below. Use empty string or [] when Satisfied.

[
  {{
    "requirement_id": "...",
    "requirement_text": "...",
    "status": "Satisfied|Partially Satisfied|Not Satisfied",
    "confidence": 90,
    "reasoning": "Provide a detailed explanation of the compliance status based ONLY on the evidence.",
    "recommended_action": "Provide specific, practical guidance to fix the gap.",
    "final_recommendation": "Remediate|Accept Risk|Compensating Control",
    "acceptable_risk": true,
    "acceptable_risk_rationale": "A compelling executive rationale of why the company can accept or must remediate this risk.",
    "profit_preserving_loophole": "Specify exact policy language or phrasing (e.g., 'where operationally feasible') that preserves operational flexibility and revenue while meeting the requirement.",
    "profit_impact_if_remediated": "A detailed assessment of how strict compliance will affect engineering velocity, direct costs, or business revenue.",
    "legal_position": "1-sentence corporate counsel legal exposure assessment.",
    "business_position": "1-sentence executive/operational stakeholder business stance.",
    "financial_risk_exposure": "Qualitative financial liability or penalty severity if audited or exploited.",
    "implementation_effort": "Easy|Medium|Hard",
    "boardroom_summary": "1-sentence executive summary suitable for the Board of Directors.",
    "strategic_business_value": "The competitive advantage or cost saving unlocked by resolving this issue or accepting the risk.",
    "security_impact_analysis": "Technical analysis of the vulnerability or security vector exposed by the policy gap.",
    "policy_loophole_identified": "Cite the exact phrasing in the company policy that creates a compliance gap or loophole.",
    "loophole_workaround": "How the current vague policy wording can be interpreted to avoid strict penalties in an audit.",
    "workaround_risk_warning": "The risk rating or regulatory penalty of relying on this workaround instead of fixing it.",
    "auto_drafted_policy_patch": "A ready-to-copy, professionally written 2-3 sentence policy amendment paragraph to insert directly into the company handbook to close the gap completely. Ensure it is fully written out and does not contain placeholders like '[Insert name here]'.",
    "target_document_placement": "Specify the exact document section and paragraph index where the patch should be added.",
    "blast_radius": "Departments, systems, or data repositories exposed by this policy gap.",
    "step_by_step_runbook": ["Detailed implementation Step 1", "Detailed implementation Step 2", "Detailed implementation Step 3"],
    "supporting_evidence": [{{"company_policy_title":"...","evidence_snippet":"..."}}]
  }}
]

Auditor: {auditor_json_str}
Legal: {legal_critique}
Business: {business_critique}
"""
    consensus_raw = _invoke_with_retry(llm_auditor, prompt_4)
    final_json = _parse_json_array(consensus_raw, fallback=auditor_json)

    risk_weights = {"Critical": 4, "High": 3, "Medium": 2, "Low": 1, "N/A": 1}
    gap_weights = {"Not Satisfied": 4, "Partially Satisfied": 2, "Satisfied": 0}
    base_risk = risk_weights.get(target_policy.get("risk_level", "Medium"), 2)

    for r in final_json:
        status = r.get("status", "Satisfied")
        r["risk_score"] = base_risk * gap_weights.get(status, 0)
        if "acceptable_risk" not in r:
            r["acceptable_risk"] = r.get("final_recommendation") == "Accept Risk"

    transcript.append({
        "agent": "Lead Consultant",
        "role": "Consensus Auditor",
        "message": (
            f"Final ruling: {sum(1 for r in final_json if r.get('final_recommendation') == 'Remediate')} to remediate, "
            f"{sum(1 for r in final_json if r.get('final_recommendation') == 'Accept Risk')} acceptable risks, "
            f"{sum(1 for r in final_json if r.get('final_recommendation') == 'Compensating Control')} compensating controls."
        ),
    })

    result = {
        "policy_id": policy_id,
        "policy_title": title,
        "transcript": transcript,
        "final_evaluation": final_json,
        "summary": {
            "total_requirements": len(final_json),
            "to_remediate": sum(1 for r in final_json if r.get("final_recommendation") == "Remediate"),
            "acceptable_risks": sum(1 for r in final_json if r.get("final_recommendation") == "Accept Risk"),
            "compensating_controls": sum(1 for r in final_json if r.get("final_recommendation") == "Compensating Control"),
            "profit_preserving_loopholes": sum(1 for r in final_json if r.get("profit_preserving_loophole")),
        },
    }

    _save_deep_audit(user_id, policy_id, result)
    return result


def generate_exec_insights(state: Dict[str, Any]) -> Dict[str, Any]:
    if not llm_business:
        raise ValueError("GROQ_API_KEY is not set.")

    logger.info("Generating dynamic executive insights...")

    prompt = f"""You are a C-level Executive AI for AlignIQ compliance platform.

PLATFORM STATE:
- Compliance Score: {state.get('globalCompliance', 0)}%
- Gaps: {state.get('notSatisfiedReqs', 0)} missing, {state.get('partialReqs', 0)} partial
- Roadmap: {state.get('tickets_todo', 0)} todo, {state.get('tickets_inprogress', 0)} in progress, {state.get('tickets_done', 0)} done
- Auto-Fix Completed: {state.get('autoFixPerformed', False)}

Use ONLY these metrics. Output JSON:
{{
  "executive_summary": "2-3 sentence compliance posture briefing",
  "aligniq_value": "How AlignIQ saved time and improved accuracy",
  "strategic_recommendations": ["action 1", "action 2", "action 3"]
}}
"""
    try:
        response = llm_business.invoke(prompt)
        return json.loads(_clean_json(response.content))
    except Exception as e:
        logger.error(f"Failed to generate exec insights: {e}")
        return {
            "executive_summary": "Compliance analysis complete. Review gap priorities and remediation roadmap.",
            "aligniq_value": "AlignIQ automated policy extraction, gap analysis, and framework mapping.",
            "strategic_recommendations": [
                "Address P0 critical gaps within 30 days",
                "Run Deep Audit on high-risk policies",
                "Deploy Auto-Fix for policy language gaps",
            ],
        }
