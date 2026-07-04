import json
import os
import time
import logging
from dotenv import load_dotenv
from langchain_pinecone import PineconeVectorStore, PineconeEmbeddings
from langchain_groq import ChatGroq
from langchain_core.documents import Document
from pinecone import Pinecone

logger = logging.getLogger(__name__)

# Load environment variables
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(env_path)

pinecone_api_key = os.environ.get("PINECONE_API")
groq_api_key = os.environ.get("GROQ_API_KEY")

if not pinecone_api_key or not groq_api_key:
    logger.warning("Missing API keys in .env (PINECONE_API or GROQ_API_KEY). Ensure they are set.")

def get_vectorstore():
    embeddings = PineconeEmbeddings(model="multilingual-e5-large", pinecone_api_key=pinecone_api_key)
    index_name = "company-policies"
    vectorstore = PineconeVectorStore(
        index_name=index_name,
        embedding=embeddings,
        pinecone_api_key=pinecone_api_key
    )
    return vectorstore

def ingest_company_policies(file_path: str):
    logger.info(f"Starting ingestion from {file_path}")
    
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    documents = []
    for policy in data.get("policies", []):
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
    vectorstore = get_vectorstore()
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
# 5. Explain why each requirement is Satisfied, Partially Satisfied or Not Satisfied.
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

def run_compliance_analysis(master_file_path: str) -> dict:
    logger.info(f"Starting compliance analysis using {master_file_path}")
    
    llm = ChatGroq(model="llama-3.1-8b-instant", groq_api_key=groq_api_key, temperature=0)
    vectorstore = get_vectorstore()
    
    with open(master_file_path, "r", encoding="utf-8") as f:
        master_data = json.load(f)

    report = []
    
    logger.info(f"Loaded {len(master_data.get('policies', []))} master policies to process.")

    for policy in master_data.get("policies", []):
        policy_id = policy.get("policy_id", "UNKNOWN")
        title = policy.get("title", "No Title")
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
        
        # Retrieve unique documents for all requirements to ensure specific rules (like plaintext, rate-limiting) are found
        unique_docs = {}
        
        for req_obj in req_objs:
            req_text = req_obj.get("requirement_text") if isinstance(req_obj, dict) else req_obj
            query = f"{title} {req_text}"
            
            search_kwargs = {"k": 3}
            if category:
                search_kwargs["filter"] = {"category": category}
                
            docs_with_scores = vectorstore.similarity_search_with_score(query, **search_kwargs)
            for doc, score in docs_with_scores:
                # Deduplicate by content to prevent exact same texts
                doc_text = doc.page_content
                if doc_text not in unique_docs or unique_docs[doc_text][1] < score:
                    unique_docs[doc_text] = (doc, score)
        
        # Get the top 10 most relevant unique documents overall for this Master Policy
        best_docs = sorted(unique_docs.values(), key=lambda x: x[1], reverse=True)[:10]
        
        company_policies_text = ""
        for i, (doc, score) in enumerate(best_docs):
            metadata = doc.metadata
            company_policies_text += f"\n--- Retrieved Policy {i+1} ---\n"
            company_policies_text += f"ID: {metadata.get('company_policy_id', 'N/A')}\n"
            company_policies_text += f"Title: {metadata.get('title', 'N/A')}\n"
            company_policies_text += f"Category: {metadata.get('category', 'N/A')}\n"
            company_policies_text += f"Department: {metadata.get('department', 'N/A')}\n"
            company_policies_text += f"Status: {metadata.get('status', 'N/A')}\n"
            company_policies_text += f"Similarity Score: {score:.4f}\n"
            company_policies_text += f"Text: {doc.page_content}\n"
        
        prompt = f"""You are a strict compliance auditor. 
We have a Master Compliance Policy and up to 3 retrieved internal company policies.

### Master Policy ID & Title:
{policy_id} - {title}

### Requirements to Evaluate:
{requirements_text}
    
### Retrieved Internal Company Policies:
{company_policies_text}

### Instructions:
1. Evaluate ALL of the requirements listed above using ONLY the retrieved company policy evidence.
2. Never assume missing controls exist.
3. Never infer compliance without evidence.
4. Mark each requirement as exactly one of: "Satisfied", "Partially Satisfied", or "Not Satisfied".
5. Assign a 'confidence' score (0-100) reflecting your certainty.
6. Under 'supporting_evidence', ONLY include policies that actually contributed to the decision. If status is Not Satisfied, this array must be empty.
7. For 'recommended_action', if the requirement is not fully satisfied, provide a short, practical, implementation-focused action. Otherwise, return null.
8. Return ONLY a valid JSON ARRAY of objects, and no other text or Markdown formatting.

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
        
        response = llm.invoke(prompt)
        req_evaluations = []
        try:
            content = response.content.strip()
            if content.startswith("```json"):
                content = content[7:]
            if content.endswith("```"):
                content = content[:-3]
            req_evaluations = json.loads(content)
            if not isinstance(req_evaluations, list):
                logger.error(f"JSON returned is not a list for {policy_id}")
                req_evaluations = []
        except json.JSONDecodeError:
            logger.error(f"Failed to parse JSON for {policy_id}")

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
        
        # Adding a 12s delay to respect Groq's strict 6000 TPM free-tier rate limits
        time.sleep(12)
        
    return {"status": "success", "report": report}
