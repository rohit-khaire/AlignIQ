import os
import json
import csv
import io
from fastapi.responses import Response
from fpdf import FPDF
import logging

logger = logging.getLogger(__name__)

def generate_export(report_path: str, format_type: str) -> tuple[bytes, str, str]:
    """
    Reads the report from report_path and generates the export in the requested format.
    Returns a tuple of (content_bytes, media_type, filename).
    """
    if not os.path.exists(report_path):
        raise FileNotFoundError("Report file not found. Please run an analysis first.")
        
    with open(report_path, "r", encoding="utf-8") as f:
        report_data = json.load(f)
        
    if format_type == "json":
        content = json.dumps(report_data, indent=2).encode("utf-8")
        return content, "application/json", "compliance_report.json"
        
    elif format_type == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow(["Policy ID", "Policy Title", "Overall Status", "Matched Requirement", "Requirement Status", "Reasoning", "Recommended Action"])
        
        results = report_data if isinstance(report_data, list) else report_data.get("report", [])
        for res in results:
            policy_id = res.get("policy_id", "")
            title = res.get("policy_title", "")
            overall_status = res.get("overall_status", "")
            
            reqs = res.get("requirements", [])
            if not reqs:
                writer.writerow([policy_id, title, overall_status, "", "", "", ""])
            else:
                for req in reqs:
                    req_text = req.get("requirement_text", "")
                    req_status = req.get("status", "")
                    reasoning = req.get("reasoning", "")
                    action = req.get("recommended_action", "")
                    writer.writerow([policy_id, title, overall_status, req_text, req_status, reasoning, action])
                    
        content = output.getvalue().encode("utf-8")
        return content, "text/csv", "compliance_report.csv"
        
    elif format_type == "pdf":
        pdf = FPDF()
        pdf.add_page()
        pdf.set_auto_page_break(auto=True, margin=15)
        
        # --- HEADER ---
        pdf.set_fill_color(15, 23, 42) # Dark Slate
        pdf.set_text_color(255, 255, 255)
        pdf.set_font("Helvetica", 'B', 18)
        pdf.multi_cell(190, 15, "Enterprise Compliance Analysis Report", align='C', fill=True)
        pdf.ln(10)
        
        # Calculate summary manually
        results = report_data if isinstance(report_data, list) else report_data.get("report", [])
        total_reqs = sum(r.get("summary", {}).get("total_requirements", 0) for r in results)
        satisfied = sum(r.get("summary", {}).get("satisfied", 0) for r in results)
        partial = sum(r.get("summary", {}).get("partially_satisfied", 0) for r in results)
        overall_score = int(((satisfied + (partial * 0.5)) / total_reqs) * 100) if total_reqs > 0 else 0
        
        # --- SUMMARY SECTION ---
        pdf.set_text_color(15, 23, 42)
        pdf.set_font("Helvetica", 'B', 14)
        pdf.multi_cell(190, 10, "Executive Summary")
        
        pdf.set_fill_color(248, 250, 252) # Very light grey
        pdf.set_font("Helvetica", '', 11)
        summary_text = (f"Total Master Policies Analyzed: {len(results)}\n"
                        f"Total Individual Requirements Checked: {total_reqs}\n"
                        f"Fully Satisfied: {satisfied}  |  Partially Satisfied: {partial}  |  Not Satisfied: {total_reqs - satisfied - partial}")
        pdf.multi_cell(190, 8, summary_text, fill=True, border=1)
            
        pdf.set_font("Helvetica", 'B', 12)
        if overall_score >= 80:
            pdf.set_text_color(22, 163, 74) # Green
        elif overall_score >= 50:
            pdf.set_text_color(234, 88, 12) # Orange
        else:
            pdf.set_text_color(220, 38, 38) # Red
            
        pdf.multi_cell(190, 10, f"Global Compliance Score: {overall_score}%", align='R')
        pdf.set_text_color(0, 0, 0)
        pdf.ln(5)
        
        # --- DETAILED FINDINGS ---
        pdf.set_text_color(15, 23, 42)
        pdf.set_font("Helvetica", 'B', 14)
        pdf.multi_cell(190, 10, "Detailed Policy Findings")
        pdf.line(pdf.get_x(), pdf.get_y(), pdf.get_x() + 190, pdf.get_y())
        pdf.ln(5)
        
        for res in results:
            pdf.set_fill_color(241, 245, 249) # Slate 50
            pdf.set_text_color(15, 23, 42)    # Slate 900
            pdf.set_font("Helvetica", 'B', 12)
            
            clean_title = str(res.get('policy_title', '')).encode('latin-1', 'replace').decode('latin-1').replace('\n', ' ')
            pdf.multi_cell(190, 10, f"  {res.get('policy_id', '')} - {clean_title}", fill=True, border='L')
            
            pdf.set_font("Helvetica", 'I', 10)
            pdf.set_text_color(100, 116, 139) # Slate 500
            pdf.multi_cell(190, 6, f"  Overall Status: {res.get('overall_status', '')} (Confidence: {res.get('confidence', '')}%)")
            pdf.ln(3)
            
            reqs = res.get("requirements", [])
            if reqs:
                for req in reqs:
                    pdf.set_text_color(15, 23, 42)
                    pdf.set_font("Helvetica", 'B', 10)
                    clean_req = str(req.get('requirement_text', '')).encode('latin-1', 'replace').decode('latin-1').replace('\n', ' ')
                    pdf.multi_cell(190, 6, f"    - {clean_req}")
                    
                    status = req.get('status', '')
                    if status == "Satisfied":
                        pdf.set_text_color(22, 163, 74)
                    elif status == "Partially Satisfied":
                        pdf.set_text_color(234, 88, 12)
                    else:
                        pdf.set_text_color(220, 38, 38)
                        
                    pdf.set_font("Helvetica", 'B', 10)
                    pdf.multi_cell(190, 6, f"      Status: {status}")
                    
                    pdf.set_text_color(71, 85, 105)
                    pdf.set_font("Helvetica", '', 10)
                    clean_reasoning = str(req.get('reasoning', '')).encode('latin-1', 'replace').decode('latin-1').replace('\n', ' ')
                    pdf.multi_cell(190, 6, f"      Reasoning: {clean_reasoning}")
                    pdf.ln(3)
                    
            next_actions = res.get("next_actions", [])
            if next_actions:
                pdf.ln(2)
                pdf.set_text_color(2, 132, 199) # Sky 600
                pdf.set_font("Helvetica", 'B', 10)
                pdf.multi_cell(190, 6, "    Recommended Action Plan:")
                
                pdf.set_text_color(15, 23, 42)
                pdf.set_font("Helvetica", '', 10)
                for action in next_actions:
                    clean_action = str(action).encode('latin-1', 'replace').decode('latin-1').replace('\n', ' ')
                    pdf.multi_cell(190, 6, f"      \x95 {clean_action}")
            
            pdf.ln(5)
            
        content = bytes(pdf.output())
        return content, "application/pdf", "compliance_report.pdf"
        
    else:
        raise ValueError(f"Unsupported format: {format_type}")
