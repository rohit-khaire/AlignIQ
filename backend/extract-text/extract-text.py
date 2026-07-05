import pymupdf4llm

markdown = pymupdf4llm.to_markdown(
    "../data/Enterprise_Compliance_Manual_Fictional_Demo.pdf"
)

with open("../data/Enterprise_Compliance_Manual_Fictional_Demo.md", "w", encoding="utf-8") as f:
    f.write(markdown)