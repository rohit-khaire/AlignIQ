import os
import json
import logging
from typing import List, Dict, Any
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from services.compliance_engine import get_vectorstore

logger = logging.getLogger(__name__)

groq_api_key = os.environ.get("GROQ_API_KEY")

if groq_api_key:
    llm = ChatGroq(model="llama-3.1-8b-instant", groq_api_key=groq_api_key, temperature=0.3)
else:
    llm = None

def get_compliance_context(user_id: str) -> str:
    """Loads the report.json to provide the LLM with current compliance status context."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    report_path = os.path.join(base_dir, "reports", user_id, "report.json")
    
    if not os.path.exists(report_path):
        return "No compliance report generated yet."
        
    try:
        with open(report_path, "r", encoding="utf-8") as f:
            report_data = json.load(f)
            
        # Create a condensed summary of the report to save tokens
        summary = "Current Compliance Status:\n"
        for policy in report_data:
            summary += f"- {policy.get('policy_title')}: {policy.get('overall_status')} ({policy['summary']['satisfied']} satisfied, {policy['summary']['not_satisfied']} not satisfied)\n"
            if policy.get('overall_status') != 'Satisfied':
                for req in policy.get('requirements', []):
                    if req.get('status') != 'Satisfied':
                        summary += f"  * Missing: {req.get('requirement_text')}\n"
        return summary
    except Exception as e:
        logger.error(f"Failed to load compliance context: {e}")
        return "Failed to load report."

def ask_oracle(query: str, history: List[Dict[str, str]], user_id: str) -> str:
    """
    Query the Pinecone vectorstore and Groq LLM to answer user questions.
    history is a list of dicts: [{"role": "user", "content": "..."}]
    """
    if not llm:
        raise ValueError("GROQ_API_KEY is not set.")

    # 1. Retrieve similar policies from Pinecone
    try:
        vectorstore = get_vectorstore(user_id)
        docs = vectorstore.similarity_search(query, k=5)
        retrieved_context = "\n\n".join([f"Policy Document:\n{doc.page_content}" for doc in docs])
    except Exception as e:
        logger.error(f"Vector search failed: {e}")
        retrieved_context = "Could not retrieve company policies."

    # 2. Get Report Context
    report_context = get_compliance_context(user_id)

    # 3. Construct System Prompt
    system_prompt = f"""You are the 'Policy Oracle', an expert AI compliance assistant.
Your job is to answer the user's questions about their company policies and compliance status.

### Current Compliance Report Context:
{report_context}

### Retrieved Company Policies (Relevant to the query):
{retrieved_context}

### Instructions:
1. ALWAYS start your answer with a direct, 1-sentence summary (e.g., "**Yes, but with conditions.**" or "**No, this is strictly forbidden.**").
2. Keep your entire response EXTREMELY short and precise. Executives do not have time to read long paragraphs.
3. If they ask about their compliance status, use the Report Context.
4. If they ask about specific company policies, refer to the Retrieved Company Policies.
5. If you don't know the answer based on the context, say so. Do not invent company policies.
6. Format your responses with beautiful Markdown (use bolding, and bullet points where appropriate).
"""

    messages = [SystemMessage(content=system_prompt)]
    
    # 4. Append History
    for msg in history:
        if msg.get("role") == "user":
            messages.append(HumanMessage(content=msg.get("content", "")))
        elif msg.get("role") == "assistant":
            messages.append(AIMessage(content=msg.get("content", "")))
            
    # 5. Append current query
    messages.append(HumanMessage(content=query))
    
    # 6. Invoke LLM
    try:
        response = llm.invoke(messages)
        return response.content
    except Exception as e:
        logger.error(f"LLM interaction failed: {e}")
        raise e
