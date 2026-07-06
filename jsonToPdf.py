import json
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT

def create_pdf(json_file_path, pdf_file_path):
    with open(json_file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    doc = SimpleDocTemplate(pdf_file_path, pagesize=letter)
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = styles['Title']
    heading_style = styles['Heading2']
    normal_style = styles['Normal']
    
    bold_style = ParagraphStyle(
        'BoldStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        spaceAfter=6
    )

    story = []

    # Document Header
    story.append(Paragraph("COMPANY POLICY HANDBOOK", title_style))
    story.append(Spacer(1, 12))

    story.append(Paragraph(f"<b>Company Name:</b> {data.get('company_name', '')}", normal_style))
    story.append(Paragraph(f"<b>Document Title:</b> {data.get('document_title', '')}", normal_style))
    story.append(Paragraph(f"<b>Version:</b> {data.get('version', '')}", normal_style))
    story.append(Paragraph(f"<b>Effective Date:</b> {data.get('effective_date', '')}", normal_style))
    story.append(Paragraph(f"<b>Total Policies:</b> {data.get('total_policies', '')}", normal_style))
    story.append(Spacer(1, 20))

    # Policies
    policies = data.get("policies", [])
    for policy in policies:
        story.append(Paragraph(f"Policy ID: {policy.get('company_policy_id', '')}", heading_style))
        story.append(Paragraph(f"<b>Title:</b> {policy.get('title', '')}", normal_style))
        story.append(Paragraph(f"<b>Category:</b> {policy.get('category', '')}", normal_style))
        story.append(Paragraph(f"<b>Department:</b> {policy.get('department', '')}", normal_style))
        story.append(Paragraph(f"<b>Status:</b> {policy.get('status', '')}", normal_style))
        
        # Text wrapping for policy text
        policy_text = policy.get('policy_text', '')
        story.append(Paragraph(f"<b>Policy Text:</b> {policy_text}", normal_style))
        
        story.append(Spacer(1, 15))

    doc.build(story)
    print(f"Successfully generated {pdf_file_path} from {json_file_path}")

if __name__ == "__main__":
    create_pdf("company_policies.json", "Rk.pdf")
