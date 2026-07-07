import json
import os
import time
from typing import Dict, List, Any
from langchain_groq import ChatGroq

# Setup Groq LLM
groq_api_key = os.getenv("GROQ_API_KEY")

if groq_api_key:
    llm = ChatGroq(model="llama-3.1-8b-instant", groq_api_key=groq_api_key, temperature=0.2)
else:
    llm = None

def run_autofix(user_id: str) -> Dict[str, Any]:
    if not llm:
        raise ValueError("GROQ_API_KEY is not set.")

    # Paths
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    report_path = os.path.join(base_dir, "reports", user_id, "report.json")
    company_policies_path = os.path.join(base_dir, "uploads", user_id, "company_policies.json")
    master_policies_path = os.path.join(base_dir, "data", "master_policies.json")
    remediated_path = os.path.join(base_dir, "reports", user_id, "remediated_policies.json")

    if not os.path.exists(report_path) or not os.path.exists(company_policies_path) or not os.path.exists(master_policies_path):
        raise FileNotFoundError("Required JSON files are missing. Run analysis first.")

    hash_file_path = os.path.join(base_dir, "reports", user_id, "last_hash.txt")
    remediated_hash_path = os.path.join(base_dir, "reports", user_id, "remediated_hash.txt")
    
    # Check if we can use cached remediated policies
    if os.path.exists(hash_file_path) and os.path.exists(remediated_hash_path) and os.path.exists(remediated_path):
        with open(hash_file_path, "r", encoding="utf-8") as f:
            last_hash = f.read().strip()
        with open(remediated_hash_path, "r", encoding="utf-8") as f:
            rem_hash = f.read().strip()
            
        if last_hash == rem_hash:
            print("Returning cached remediated policies")
            with open(remediated_path, "r", encoding="utf-8") as f:
                return json.load(f)

    with open(report_path, "r", encoding="utf-8") as f:
        report_data = json.load(f)
    
    with open(company_policies_path, "r", encoding="utf-8") as f:
        company_data = json.load(f)
        
    with open(master_policies_path, "r", encoding="utf-8") as f:
        master_data = json.load(f)

    # 1. Map Master Policy ID -> Category
    master_id_to_category = {}
    for mp in master_data.get("policies", []):
        master_id_to_category[mp.get("policy_id", "")] = mp.get("category", "General")

    # 2. Extract failing requirements per category
    failing_reqs_by_category = {}
    recommended_actions_by_category = {}
    
    for report_item in report_data:
        policy_id = report_item.get("policy_id")
        category = master_id_to_category.get(policy_id, "General")
        
        if category not in failing_reqs_by_category:
            failing_reqs_by_category[category] = []
            recommended_actions_by_category[category] = []
            
        for req in report_item.get("requirements", []):
            if req.get("status") in ["Not Satisfied", "Partially Satisfied"]:
                failing_reqs_by_category[category].append(req.get("requirement_text"))
                if req.get("recommended_action"):
                    recommended_actions_by_category[category].append(req.get("recommended_action"))

    # 3. Extract original company policies per category
    company_policies_by_category = {}
    for cp in company_data.get("policies", []):
        cat = cp.get("category", "General")
        if cat not in company_policies_by_category:
            company_policies_by_category[cat] = []
        company_policies_by_category[cat].append(cp.get("policy_text"))

    # 4. Generate Remediation
    remediated_results = []
    
    # To avoid rate limits, we process category by category
    categories_to_process = [c for c in failing_reqs_by_category.keys() if len(failing_reqs_by_category[c]) > 0]
    
    for i, category in enumerate(categories_to_process):
        reqs = failing_reqs_by_category[category]
        recs = recommended_actions_by_category[category]
        original_texts = company_policies_by_category.get(category, ["No existing policies found for this category."])
        
        # Deduplicate
        reqs = list(set(reqs))
        recs = list(set(recs))
        
        reqs_str = "\n".join(f"- {r}" for r in reqs)
        recs_str = "\n".join(f"- {r}" for r in recs)
        orig_str = "\n".join(f"- {o}" for o in original_texts)
        
        prompt = f"""You are a strict and professional Senior Compliance Officer.
        
Your task is to REWRITE and CONSOLIDATE the company's existing policies for the '{category}' category so that they perfectly satisfy all missing compliance requirements.

### Existing Company Policies (Flawed/Incomplete):
{orig_str}

### Missing/Failing Compliance Requirements that MUST be explicitly included:
{reqs_str}

### Recommended Actions to implement:
{recs_str}

INSTRUCTIONS:
1. Write a comprehensive, highly professional policy document for this category.
2. You MUST explicitly include specific rules and controls that satisfy EVERY single missing requirement.
3. Fix any explicitly non-compliant statements in the existing policies (e.g., if they say "passwords don't expire", change it so they do).
4. Output ONLY the raw markdown text for the new policy. Do not include introductory text like "Here is the rewritten policy".

REWRITTEN POLICY:
"""
        
        try:
            response = llm.invoke(prompt)
            remediated_text = response.content.strip()
            
            remediated_results.append({
                "category": category,
                "original_text": orig_str,
                "remediated_text": remediated_text,
                "fixed_requirements_count": len(reqs)
            })
            
        except Exception as e:
            print(f"Error remediating {category}: {e}")
            remediated_results.append({
                "category": category,
                "original_text": orig_str,
                "remediated_text": f"Error during AI remediation: {str(e)}",
                "fixed_requirements_count": 0
            })
            
        # Rate limiting delay (Groq free tier limits)
        if i < len(categories_to_process) - 1:
            time.sleep(12)

    # Save to file
    output_data = {
        "remediated_categories": remediated_results
    }
    
    with open(remediated_path, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=2)
        
    # Save the hash to cache the remediated report
    if os.path.exists(hash_file_path):
        with open(hash_file_path, "r", encoding="utf-8") as f:
            current_hash = f.read().strip()
        with open(remediated_hash_path, "w", encoding="utf-8") as f:
            f.write(current_hash)
            
    return output_data
