import json
import os
import time
import logging
from dotenv import load_dotenv
from langchain_pinecone import PineconeVectorStore, PineconeEmbeddings
from langchain_groq import ChatGroq
from langchain_core.documents import Document
from pinecone import Pinecone
from services.retrieval_utils import retrieve_relevant_docs, format_docs_for_prompt
from services.progress_service import set_progress

logger = logging.getLogger(__name__)

class AnalysisCancelledException(Exception):
    pass

cancellation_flags = {}

def cancel_analysis(user_id: str):
    logger.info(f"Setting cancellation flag for user {user_id}")
    cancellation_flags[user_id] = True

def reset_cancellation(user_id: str):
    cancellation_flags[user_id] = False

def check_cancellation(user_id: str):
    if cancellation_flags.get(user_id):
        raise AnalysisCancelledException("Analysis was cancelled by the user")


def interruptible_sleep(seconds: float, user_id: str, interval: float = 0.25) -> None:
    """Sleep in short chunks so cancel is picked up quickly."""
    deadline = time.time() + seconds
    while time.time() < deadline:
        check_cancellation(user_id)
        time.sleep(min(interval, max(0, deadline - time.time())))

# Load environment variables
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(env_path)

pinecone_api_key = os.environ.get("PINECONE_API_KEY") or os.environ.get("PINECONE_API")
groq_api_key = os.environ.get("GROQ_API_KEY")

if not pinecone_api_key or not groq_api_key:
    logger.warning("Missing API keys in .env (PINECONE_API or GROQ_API_KEY). Ensure they are set.")

def get_vectorstore(user_id: str):
    embeddings = PineconeEmbeddings(model="multilingual-e5-large", pinecone_api_key=pinecone_api_key)
    index_name = "company-policies"
    vectorstore = PineconeVectorStore(
        index_name=index_name,
        embedding=embeddings,
        pinecone_api_key=pinecone_api_key,
        namespace=user_id
    )
    return vectorstore

def clear_pinecone_db(user_id: str):
    logger.info(f"Clearing Pinecone VectorDB for namespace {user_id}...")
    try:
        pc = Pinecone(api_key=pinecone_api_key)
        index = pc.Index("company-policies")
        index.delete(delete_all=True, namespace=user_id)
        # Wait until vector count is 0 to handle Pinecone's eventual consistency
        for _ in range(30):
            time.sleep(0.5)
            stats = index.describe_index_stats()
            if stats.namespaces.get(user_id, {}).get("vector_count", 0) == 0:
                break
        logger.info("Successfully cleared Pinecone VectorDB.")
    except Exception as e:
        logger.error(f"Failed to clear Pinecone VectorDB: {e}")
def ingest_company_policies(file_path: str, user_id: str):
    logger.info(f"Starting ingestion from {file_path}")
    
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    documents = []
    policies = data.get("policies", [])
    for i, policy in enumerate(policies):
        check_cancellation(user_id)
        if i % 5 == 0:
            set_progress(
                user_id, "index",
                f"Preparing policy {i + 1}/{len(policies)} for indexing",
                40 + int((i / max(len(policies), 1)) * 6),
            )
        text = f"Title: {policy.get('title')}\nCategory: {policy.get('category')}\nDepartment: {policy.get('department')}\nPolicy: {policy.get('policy_text')}"
        metadata = {
            "company_policy_id": policy.get("company_policy_id") or "N/A",
            "title": policy.get("title") or "N/A",
            "category": policy.get("category") or "N/A",
            "department": policy.get("department") or "N/A",
            "status": policy.get("status") or "N/A"
        }
        doc = Document(page_content=text, metadata=metadata)
        documents.append(doc)

    logger.info(f"Loaded {len(documents)} policies. Storing in Pinecone...")
    check_cancellation(user_id)
    vectorstore = get_vectorstore(user_id)
    vectorstore.add_documents(documents)
    logger.info("Successfully stored policies in Pinecone VectorDB.")


# def run_compliance_analysis(master_file_path: str) -> dict:
#     logger.info(f"Starting compliance analysis using {master_file_path}")
#     
#     llm = ChatGroq(model="llama-3.1-8b-instant", groq_api_key=groq_api_key, temperature=0)
#     vectorstore = get_vectorstore()
#     
#     with open(master_file_path, "r", encoding="utf-8") as f:
#         master_data = json.load(f)
# 
#     report = []
#     
#     logger.info(f"Loaded {len(master_data.get('policies', []))} master policies to process.")
# 
#     for policy in master_data.get("policies", []):
#         policy_id = policy.get("policy_id", "UNKNOWN")
#         title = policy.get("title", "No Title")
#         statement = policy.get("policy_statement", "")
#         req_objs = policy.get("detailed_requirements", [])
#         req_strings = [r.get("requirement_text", "") for r in req_objs] if req_objs and isinstance(req_objs[0], dict) else req_objs
#         requirements = "\n".join(req_strings)
#         category = policy.get("category")
#         
#         master_text = f"Policy ID: {policy_id}\nTitle: {title}\nStatement: {statement}\nRequirements:\n{requirements}"
#         
#         query = f"{title} {statement}"
#         search_kwargs = {"k": 3}
#         if category:
#             search_kwargs["filter"] = {"category": category}
#             
#         docs_with_scores = vectorstore.similarity_search_with_score(query, **search_kwargs)
#         
#         company_policies_text = ""
#         for i, (doc, score) in enumerate(docs_with_scores):
#             metadata = doc.metadata
#             company_policies_text += f"\n--- Retrieved Policy {i+1} ---\n"
#             company_policies_text += f"ID: {metadata.get('company_policy_id', 'N/A')}\n"
#             company_policies_text += f"Title: {metadata.get('title', 'N/A')}\n"
#             company_policies_text += f"Category: {metadata.get('category', 'N/A')}\n"
#             company_policies_text += f"Department: {metadata.get('department', 'N/A')}\n"
#             company_policies_text += f"Status: {metadata.get('status', 'N/A')}\n"
#             company_policies_text += f"Similarity Score: {score:.4f}\n"
#             company_policies_text += f"Text: {doc.page_content}\n"
#         
#         requirements_list = policy.get("detailed_requirements", [])
#         req_evaluations = []
#         
#         for req_obj in requirements_list:
#             if isinstance(req_obj, dict):
#                 req_id = req_obj.get("requirement_id")
#                 req_text = req_obj.get("requirement_text")
#             else:
#                 req_id = "UNKNOWN"
#                 req_text = req_obj
#             
#             prompt = f"""You are a strict compliance auditor. 
# We have a Master Compliance Policy and up to 3 retrieved internal company policies.
# 
# ### Master Policy ID & Title:
# {policy_id} - {title}
# 
# ### Specific Requirement to Evaluate:
# {req_text}
#     
# ### Retrieved Internal Company Policies:
# {company_policies_text}
# 
# ### Instructions:
# 1. Evaluate one requirement at a time.
# 2. Use only the retrieved company policy evidence.
# 3. Never assume missing controls exist.
# 4. Never infer compliance without evidence.
# 5. For 'reasoning', you MUST explicitly explain WHY you gave the score. If you mark it "Partially Satisfied" or "Not Satisfied", explicitly point out the semantic gap, missing scope, or pedantic difference between the master requirement and the internal policy (e.g., "Requirement asks for X, but policy only provides Y"). Do not just summarize the policy.
# 6. Mark the requirement as exactly one of: "Satisfied", "Partially Satisfied", or "Not Satisfied".
# 7. Assign a 'confidence' score (0-100) reflecting your certainty. Lower it if evidence is weak or ambiguous. Increase it if multiple policies strongly support the decision.
# 8. Under 'supporting_evidence', ONLY include policies that actually contributed to the decision. If status is Not Satisfied, this array must be empty.
# 9. For 'recommended_action', if the requirement is not fully satisfied, provide a short, practical, implementation-focused action. Otherwise, return null.
# 10. Return only valid JSON.
# 11. Do not generate Markdown.
# 
# Respond ONLY with a valid JSON object in the following format, and no other text:
# {{
#   "requirement_id": "{req_id}",
#   "requirement_text": "The text of the requirement",
#   "status": "Satisfied, Partially Satisfied, or Not Satisfied",
#   "supporting_evidence": [
#     {{
#       "company_policy_id": "ID of the matching policy",
#       "title": "Title of the matching policy",
#       "similarity_score": 0.85,
#       "evidence_snippet": "Relevant snippet from the policy text justifying the decision",
#       "supports_requirement": "Brief explanation of how this policy supports this specific requirement"
#     }}
#   ],
#   "confidence": 85,
#   "reasoning": "Explanation of your decision based ONLY on retrieved text",
#   "recommended_action": "Short, practical action to fix the missing requirement (or null)"
# }}
# """
#             
#             response = llm.invoke(prompt)
#             
#             try:
#                 content = response.content.strip()
#                 if content.startswith("```json"):
#                     content = content[7:]
#                 if content.endswith("```"):
#                     content = content[:-3]
#                 req_eval = json.loads(content)
#                 req_evaluations.append(req_eval)
#             except json.JSONDecodeError:
#                 logger.error(f"Failed to parse JSON for {req_id}")
#                 req_evaluations.append({"requirement_id": req_id, "error": "Failed to parse JSON response."})
# 
#         statuses = [r.get("status") for r in req_evaluations]
#         
#         confidences = [r.get("confidence", 0) for r in req_evaluations if isinstance(r.get("confidence"), (int, float))]
#         overall_confidence = int(sum(confidences) / len(confidences)) if confidences else 0
#         
#         total_requirements = len(statuses)
#         satisfied_count = statuses.count("Satisfied")
#         partially_satisfied_count = statuses.count("Partially Satisfied")
#         not_satisfied_count = statuses.count("Not Satisfied")
#         
#         compliance_score = (satisfied_count * 1.0) + (partially_satisfied_count * 0.5)
#         compliance_percentage = int((compliance_score / total_requirements) * 100) if total_requirements > 0 else 0
#         
#         if satisfied_count == total_requirements and total_requirements > 0:
#             overall_status = "Satisfied"
#         elif satisfied_count + partially_satisfied_count > 0:
#             overall_status = "Partially Satisfied"
#         else:
#             overall_status = "Not Satisfied"
#             
#         next_actions = []
#         for r in req_evaluations:
#             action = r.get("recommended_action")
#             if action and isinstance(action, str) and action.strip():
#                 next_actions.append(action.strip())
#             
#         policy_result = {
#             "policy_id": policy_id,
#             "policy_title": title,
#             "overall_status": overall_status,
#             "confidence": overall_confidence,
#             "summary": {
#                 "total_requirements": total_requirements,
#                 "satisfied": satisfied_count,
#                 "partially_satisfied": partially_satisfied_count,
#                 "not_satisfied": not_satisfied_count,
#                 "compliance_percentage": compliance_percentage
#             },
#             "requirements": req_evaluations,
#             "next_actions": next_actions
#         }
#         
#         report.append(policy_result)
#         logger.info(f"Processed: {policy_id} - {title} with {len(requirements_list)} requirements.")
#         
#     return {"status": "success", "report": report}

def run_compliance_analysis(master_file_path: str, user_id: str) -> dict:
    logger.info(f"Starting compliance analysis using {master_file_path}")
    
    llm = ChatGroq(model="llama-3.1-8b-instant", groq_api_key=groq_api_key, temperature=0)
    vectorstore = get_vectorstore(user_id)
    
    with open(master_file_path, "r", encoding="utf-8") as f:
        master_data = json.load(f)

    report = []
    
    policies_list = master_data.get("policies", [])
    total_master = len(policies_list)
    logger.info(f"Loaded {total_master} master policies to process.")

    for idx, policy in enumerate(policies_list):
        check_cancellation(user_id)

        policy_id = policy.get("policy_id", "UNKNOWN")
        title = policy.get("title", "No Title")
        pct = 48 + int((idx / max(total_master, 1)) * 42)
        set_progress(
            user_id, "analyze",
            f"Analyzing {policy_id}: {title}",
            pct,
            f"Policy {idx + 1} of {total_master}",
            policies_analyzed=idx,
            policies_total=total_master,
        )
        statement = policy.get("policy_statement", "")
        req_objs = policy.get("detailed_requirements", [])
        
        # Prepare requirements list string
        req_strings = []
        for req_obj in req_objs:
            if isinstance(req_obj, dict):
                req_strings.append(f"- [{req_obj.get('requirement_id')}] {req_obj.get('requirement_text')}")
            else:
                req_strings.append(f"- {req_obj}")
        requirements_text = "\n".join(req_strings)
        
        category = policy.get("category")
        unique_docs: dict = {}

        for req_obj in req_objs:
            check_cancellation(user_id)
            req_text = req_obj.get("requirement_text") if isinstance(req_obj, dict) else req_obj
            docs = retrieve_relevant_docs(
                vectorstore, f"{title} {req_text}", category=category, k=4, top_n=4
            )
            for doc, score in docs:
                key = doc.page_content
                if key not in unique_docs or score < unique_docs[key][1]:
                    unique_docs[key] = (doc, score)

        best_docs = sorted(unique_docs.values(), key=lambda x: x[1])[:10]
        company_policies_text = format_docs_for_prompt(best_docs)

        prompt = f"""You are a strict compliance auditor.
We have a Master Compliance Policy and retrieved internal company policies.

### Master Policy ID & Title:
{policy_id} - {title}

### Requirements to Evaluate ({len(req_objs)} total — evaluate ALL):
{requirements_text}
    
### Retrieved Internal Company Policies:
{company_policies_text}

### Instructions:
1. Evaluate ALL {len(req_objs)} requirements using ONLY the retrieved evidence.
2. Never assume missing controls exist. Never infer compliance without evidence.
3. Mark each: "Satisfied", "Partially Satisfied", or "Not Satisfied".
4. Assign confidence 0-100. Include supporting_evidence for every evaluated requirement.
5. For recommended_action, provide practical fix steps when not fully satisfied, else null.
6. Return ONLY a valid JSON ARRAY with exactly {len(req_objs)} objects.

Respond ONLY with a valid JSON ARRAY in the following format:
[
  {{
    "requirement_id": "ID of the requirement",
    "requirement_text": "The text of the requirement",
    "status": "Satisfied, Partially Satisfied, or Not Satisfied",
    "supporting_evidence": [
      {{
        "company_policy_id": "ID of the matching policy",
        "title": "Title of the matching policy",
        "similarity_score": 0.85,
        "evidence_snippet": "Relevant snippet from the policy text justifying the decision",
        "supports_requirement": "Brief explanation of how this policy supports this specific requirement"
      }}
    ],
    "confidence": 85,
    "reasoning": "Explanation of your decision based ONLY on retrieved text",
    "recommended_action": "Short, practical action to fix the missing requirement (or null)"
  }}
]
"""
        
        check_cancellation(user_id)
        response = llm.invoke(prompt)
        check_cancellation(user_id)

        req_evaluations = []
        for attempt in range(2):
            try:
                content = response.content.strip()
                if content.startswith("```json"):
                    content = content[7:]
                if content.endswith("```"):
                    content = content[:-3]
                req_evaluations = json.loads(content.strip())
                if isinstance(req_evaluations, list) and len(req_evaluations) > 0:
                    break
            except json.JSONDecodeError:
                logger.warning(f"JSON parse attempt {attempt + 1} failed for {policy_id}")
                if attempt == 0:
                    retry_prompt = prompt + "\n\nYour previous response was invalid JSON. Return ONLY the JSON ARRAY."
                    response = llm.invoke(retry_prompt)
                else:
                    req_evaluations = []

        risk_weights = {'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1, 'N/A': 1}
        gap_weights = {'Not Satisfied': 4, 'Partially Satisfied': 2, 'Satisfied': 0}
        base_risk = risk_weights.get(policy.get("risk_level", "Medium"), 2)

        for r in req_evaluations:
            status = r.get("status", "Satisfied")
            gap_weight = gap_weights.get(status, 0)
            r["risk_score"] = base_risk * gap_weight

        statuses = [r.get("status") for r in req_evaluations]
        
        confidences = [r.get("confidence", 0) for r in req_evaluations if isinstance(r.get("confidence"), (int, float))]
        overall_confidence = int(sum(confidences) / len(confidences)) if confidences else 0
        
        total_requirements = len(statuses)
        satisfied_count = statuses.count("Satisfied")
        partially_satisfied_count = statuses.count("Partially Satisfied")
        not_satisfied_count = statuses.count("Not Satisfied")
        
        compliance_score = (satisfied_count * 1.0) + (partially_satisfied_count * 0.5)
        compliance_percentage = int((compliance_score / total_requirements) * 100) if total_requirements > 0 else 0
        
        if satisfied_count == total_requirements and total_requirements > 0:
            overall_status = "Satisfied"
        elif satisfied_count + partially_satisfied_count > 0:
            overall_status = "Partially Satisfied"
        else:
            overall_status = "Not Satisfied"
            
        next_actions = []
        for r in req_evaluations:
            action = r.get("recommended_action")
            if action and isinstance(action, str) and action.strip():
                next_actions.append(action.strip())
            
        policy_result = {
            "policy_id": policy_id,
            "policy_title": title,
            "category": category,
            "master_policy_details": {
                "statement": statement,
                "department": policy.get("department", "N/A"),
                "risk_level": policy.get("risk_level", "N/A"),
                "business_objective": policy.get("business_objective", "N/A"),
                "owner": policy.get("owner", "N/A"),
                "version": policy.get("version", "N/A"),
                "effective_date": policy.get("effective_date", "N/A"),
                "review_cycle": policy.get("review_cycle", "N/A"),
                "priority": policy.get("priority", "N/A")
            },
            "overall_status": overall_status,
            "confidence": overall_confidence,
            "summary": {
                "total_requirements": total_requirements,
                "satisfied": satisfied_count,
                "partially_satisfied": partially_satisfied_count,
                "not_satisfied": not_satisfied_count,
                "compliance_percentage": compliance_percentage
            },
            "requirements": req_evaluations,
            "next_actions": next_actions
        }
        
        report.append(policy_result)
        logger.info(f"Processed: {policy_id} - {title} with {len(req_evaluations)} evaluations.")
        
    return {"status": "success", "report": report}
