"""
Generate Publication-Grade PDF Reports for SpamGuard AI
Compiles Markdown reports into styled HTML and renders high-resolution PDFs via Edge headless.
"""

import os
import re
import sys
import base64
import mimetypes
import subprocess
from pathlib import Path
import markdown

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DOCS_DIR = PROJECT_ROOT / "docs"
IA3_DIR = DOCS_DIR / "ia3"
EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

CSS_STYLES = """
@page {
    size: A4;
    margin: 18mm 16mm 18mm 16mm;
}

@media print {
    body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }
    .no-print {
        display: none !important;
    }
    h1 {
        page-break-before: always;
    }
    h1:first-of-type {
        page-break-before: avoid !important;
    }
    h1, h2, h3, h4, h5, h6 {
        page-break-after: avoid !important;
        break-after: avoid-page !important;
    }
    table, figure, .figure-container, pre {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
    }
    tr {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
    }
}

* {
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #1e293b;
    background-color: #ffffff;
    font-size: 9.5pt;
    line-height: 1.58;
    margin: 0;
    padding: 0;
}

/* Header & Cover Banner */
.report-header-banner {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #1e3a8a 100%);
    color: #ffffff;
    padding: 24px 28px;
    border-radius: 8px;
    margin-bottom: 24px;
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
}

.report-header-banner h1 {
    color: #ffffff !important;
    font-size: 20pt !important;
    margin: 0 0 8px 0 !important;
    border: none !important;
    padding: 0 !important;
    page-break-before: avoid !important;
    letter-spacing: -0.02em;
}

.report-header-banner .subtitle {
    color: #93c5fd;
    font-size: 11pt;
    font-weight: 500;
    margin-bottom: 14px;
}

.badge-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 10px;
}

.badge {
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.25);
    color: #f8fafc;
    padding: 3px 9px;
    border-radius: 4px;
    font-size: 8pt;
    font-weight: 500;
}

.badge-highlight {
    background: #2563eb;
    border-color: #3b82f6;
    color: #ffffff;
    font-weight: 600;
}

/* Typography */
h1 {
    color: #0f172a;
    font-size: 17pt;
    font-weight: 700;
    border-bottom: 2.5px solid #2563eb;
    padding-bottom: 6px;
    margin-top: 26px;
    margin-bottom: 12px;
    letter-spacing: -0.01em;
}

h2 {
    color: #1e293b;
    font-size: 13pt;
    font-weight: 600;
    border-bottom: 1.5px solid #e2e8f0;
    padding-bottom: 4px;
    margin-top: 20px;
    margin-bottom: 10px;
}

h3 {
    color: #334155;
    font-size: 10.5pt;
    font-weight: 600;
    margin-top: 15px;
    margin-bottom: 6px;
}

h4 {
    color: #475569;
    font-size: 9.5pt;
    font-weight: 600;
    margin-top: 12px;
    margin-bottom: 4px;
}

p {
    margin: 0 0 10px 0;
    text-align: justify;
}

ul, ol {
    margin: 0 0 12px 0;
    padding-left: 22px;
}

li {
    margin-bottom: 4px;
}

hr {
    border: none;
    border-top: 1px solid #e2e8f0;
    margin: 18px 0;
}

/* Tables */
table {
    width: 100%;
    border-collapse: collapse;
    margin: 14px 0 16px 0;
    font-size: 8.5pt;
    background-color: #ffffff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

table th {
    background-color: #0f172a;
    color: #ffffff;
    font-weight: 600;
    text-align: left;
    padding: 7px 9px;
    border: 1px solid #0f172a;
}

table td {
    padding: 6px 9px;
    border: 1px solid #e2e8f0;
    vertical-align: top;
}

table tbody tr:nth-child(even) {
    background-color: #f8fafc;
}

table tbody tr:hover {
    background-color: #f1f5f9;
}

/* Code Blocks & Inline Code */
pre {
    background-color: #0f172a;
    color: #f8fafc;
    border: 1px solid #334155;
    border-radius: 6px;
    padding: 10px 14px;
    font-family: "Consolas", "Cascadia Code", "Fira Code", monospace;
    font-size: 8pt;
    line-height: 1.45;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-word;
    margin: 12px 0;
}

code {
    font-family: "Consolas", "Cascadia Code", monospace;
    font-size: 8.5pt;
    background-color: #f1f5f9;
    color: #0f172a;
    border: 1px solid #e2e8f0;
    border-radius: 3px;
    padding: 1.5px 4.5px;
}

pre code {
    background-color: transparent;
    color: inherit;
    border: none;
    border-radius: 0;
    padding: 0;
    font-size: 8pt;
}

/* Blockquotes */
blockquote {
    border-left: 4px solid #2563eb;
    background-color: #f8fafc;
    color: #334155;
    margin: 12px 0;
    padding: 8px 14px;
    border-radius: 0 6px 6px 0;
    font-style: normal;
}

blockquote p:last-child {
    margin-bottom: 0;
}

/* Figures & Images */
.figure-container {
    text-align: center;
    margin: 14px 0 18px 0;
    page-break-inside: avoid;
}

.figure-container img {
    max-width: 94%;
    max-height: 480px;
    width: auto;
    height: auto;
    display: block;
    margin: 0 auto;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.08);
}

.figure-caption {
    font-size: 8.2pt;
    color: #475569;
    font-weight: 500;
    margin-top: 6px;
    margin-bottom: 10px;
    text-align: center;
    font-style: italic;
}

/* Links */
a {
    color: #2563eb;
    text-decoration: none;
}

a:hover {
    text-decoration: underline;
}

/* Math formatting helpers */
.math-inline {
    font-family: "Cambria Math", "Times New Roman", serif;
    font-style: italic;
    color: #0f172a;
}
"""


def file_to_base64_uri(file_path: Path) -> str:
    """Convert an image file to a base64 Data URI."""
    mime_type, _ = mimetypes.guess_type(str(file_path))
    if mime_type is None:
        if file_path.suffix.lower() == ".svg":
            mime_type = "image/svg+xml"
        else:
            mime_type = "image/png"
    with open(file_path, "rb") as f:
        encoded = base64.b64encode(f.read()).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


def preprocess_markdown_math(text: str) -> str:
    """Lightly format simple LaTeX expressions for clean HTML rendering."""
    # Replace display math $$ ... $$ with a styled div
    def replace_display_math(match):
        eq = match.group(1).strip()
        # Clean common latex symbols
        eq = eq.replace(r"\Delta_{\text{odds}}", "Δ_odds")
        eq = eq.replace(r"\log", "log")
        eq = eq.replace(r"\text{Spam}", "Spam")
        eq = eq.replace(r"\text{Ham}", "Ham")
        eq = eq.replace(r"\text{Contribution}", "Contribution")
        eq = eq.replace(r"\text{TF-IDF}", "TF-IDF")
        eq = eq.replace(r"\times", "×")
        eq = eq.replace(r"\le", "≤")
        eq = eq.replace(r"\ge", "≥")
        eq = eq.replace(r"\approx", "≈")
        eq = eq.replace(r"\alpha", "α")
        eq = eq.replace(r"\sum", "Σ")
        eq = eq.replace(r"\prod", "Π")
        eq = eq.replace(r"\int", "∫")
        eq = eq.replace(r"\cdot", "·")
        return f'<div style="text-align:center; padding:8px; margin:10px 0; background:#f8fafc; border:1px solid #e2e8f0; border-radius:4px; font-family:\'Cambria Math\', serif; font-size:10pt;"><b>{eq}</b></div>'

    text = re.sub(r"\$\$(.*?)\$\$", replace_display_math, text, flags=re.DOTALL)

    # Replace inline math $ ... $
    def replace_inline_math(match):
        eq = match.group(1).strip()
        eq = eq.replace(r"\alpha", "α")
        eq = eq.replace(r"\le", "≤")
        eq = eq.replace(r"\ge", "≥")
        eq = eq.replace(r"\approx", "≈")
        eq = eq.replace(r"\times", "×")
        eq = eq.replace(r"\Delta", "Δ")
        eq = eq.replace(r"\text{", "").replace(r"}", "")
        eq = eq.replace(r"\mathbf{", "").replace(r"}", "")
        return f'<span class="math-inline">{eq}</span>'

    text = re.sub(r"(?<!\$)\$(?!\$)(.*?)\$", replace_inline_math, text)
    return text


def convert_images_to_base64_in_html(html: str, base_dir: Path) -> str:
    """Replace image src attributes with embedded base64 Data URIs and wrap in figure containers."""
    def replacer(match):
        full_tag = match.group(0)
        alt = match.group(1) if match.group(1) else ""
        src = match.group(2) if match.group(2) else ""

        if not src or src.startswith("data:"):
            return full_tag

        # Determine path
        img_path = (base_dir / src).resolve()
        if not img_path.exists():
            # Try from PROJECT_ROOT
            img_path = (PROJECT_ROOT / src).resolve()
        if not img_path.exists():
            # Try from docs
            img_path = (DOCS_DIR / src).resolve()

        if img_path.exists():
            data_uri = file_to_base64_uri(img_path)
            caption_html = f'<div class="figure-caption">{alt}</div>' if alt else ""
            return f'<div class="figure-container"><img src="{data_uri}" alt="{alt}"/>{caption_html}</div>'
        else:
            print(f"[WARN] Image not found: {src} (resolved to {img_path})")
            return full_tag

    # Match <p><img ... /></p> or standalone <img ...>
    # Match markdown-generated image tag: <p><img alt="..." src="..." /></p>
    pattern = r'<p><img\s+([^>]*?)src="([^"]*)"([^>]*?)\/?><\/p>'
    def p_replacer(match):
        pre_src = match.group(1)
        src = match.group(2)
        post_src = match.group(3)

        if not src or src.startswith("data:"):
            return match.group(0)

        # Extract alt if present
        alt_match = re.search(r'alt="([^"]*)"', pre_src + " " + post_src)
        alt = alt_match.group(1) if alt_match else ""

        img_path = (base_dir / src).resolve()
        if not img_path.exists():
            img_path = (PROJECT_ROOT / src).resolve()
        if not img_path.exists():
            img_path = (DOCS_DIR / src).resolve()
        if img_path.exists():
            data_uri = file_to_base64_uri(img_path)
            caption_html = f'<div class="figure-caption">{alt}</div>' if alt else ""
            return f'<div class="figure-container"><img src="{data_uri}" alt="{alt}"/>{caption_html}</div>'
        return match.group(0)

    html = re.sub(pattern, p_replacer, html)

    # General catch-all for any remaining non-data img tags
    gen_pattern = r'<img\s+[^>]*?src="(?!data:)([^"]*)"[^>]*?>'
    def gen_replacer(match):
        src = match.group(1)
        img_path = (base_dir / src).resolve()
        if not img_path.exists():
            img_path = (PROJECT_ROOT / src).resolve()
        if not img_path.exists():
            img_path = (DOCS_DIR / src).resolve()
        if img_path.exists():
            data_uri = file_to_base64_uri(img_path)
            return f'<img src="{data_uri}">'
        return match.group(0)

    html = re.sub(gen_pattern, gen_replacer, html)
    return html


def build_html_document(title: str, body_html: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{title}</title>
    <style>
{CSS_STYLES}
    </style>
</head>
<body>
{body_html}
</body>
</html>"""


def render_pdf_with_edge(html_file: Path, pdf_file: Path) -> bool:
    """Invoke Microsoft Edge in headless mode to render the HTML file into a PDF."""
    if not os.path.exists(EDGE_PATH):
        raise FileNotFoundError(f"Microsoft Edge executable not found at {EDGE_PATH}")

    cmd = [
        EDGE_PATH,
        "--headless=new",
        "--disable-gpu",
        "--run-all-compositor-stages-before-draw",
        "--no-pdf-header-footer",
        f"--print-to-pdf={pdf_file.resolve()}",
        str(html_file.resolve())
    ]
    print(f"Rendering PDF: {pdf_file.name} ...")
    res = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    if res.returncode != 0:
        print(f"Edge error: {res.stderr}")
        return False
    
    if pdf_file.exists() and pdf_file.stat().st_size > 0:
        print(f"[OK] Successfully generated {pdf_file.name} ({pdf_file.stat().st_size:,} bytes)")
        return True
    return False


def compile_report(md_file: Path, pdf_file: Path, title: str):
    print(f"\n--- Processing: {md_file.name} ---")
    with open(md_file, "r", encoding="utf-8") as f:
        md_text = f.read()

    # Preprocess math formulas
    md_text = preprocess_markdown_math(md_text)

    # Convert markdown to HTML
    md = markdown.Markdown(extensions=["tables", "fenced_code", "toc"])
    raw_html = md.convert(md_text)

    # Embed images as Base64 URIs
    processed_html = convert_images_to_base64_in_html(raw_html, md_file.parent)

    # Wrap in complete HTML document
    full_html = build_html_document(title, processed_html)

    # Write temporary HTML file next to PDF
    html_file = pdf_file.with_suffix(".html")
    with open(html_file, "w", encoding="utf-8") as f:
        f.write(full_html)

    # Render PDF via Edge
    success = render_pdf_with_edge(html_file, pdf_file)
    if success:
        # Keep HTML for reference or inspection
        pass
    else:
        print(f"[ERROR] Failed to generate {pdf_file.name}")


def main():
    print("==================================================================")
    print("      SPAMGUARD AI — PUBLICATION-GRADE PDF REPORT COMPILER        ")
    print("==================================================================")

    # 1. Compile Final Project Academic Report
    final_report_md = DOCS_DIR / "SpamGuard_AI_Final_Project_Report.md"
    final_report_pdf = DOCS_DIR / "SpamGuard_AI_Final_Project_Report.pdf"
    if final_report_md.exists():
        compile_report(
            final_report_md,
            final_report_pdf,
            "SpamGuard AI — Final Academic Micro-Project Report"
        )
    else:
        print(f"Missing {final_report_md}")

    # 2. Compile Complete IA3 Evaluation Submission Report
    ia3_report_md = IA3_DIR / "SpamGuard_AI_IA3_Complete_Submission_Report.md"
    ia3_report_pdf = IA3_DIR / "SpamGuard_AI_IA3_Complete_Submission_Report.pdf"
    if ia3_report_md.exists():
        compile_report(
            ia3_report_md,
            ia3_report_pdf,
            "SpamGuard AI — Software Engineering IA3 Complete Evaluation Dossier"
        )
    else:
        print(f"Missing {ia3_report_md}")

    # 3. Compile Individual IA3 Sections for modular submission
    sections = [
        ("01_Working_Software_Project.md", "01_Working_Software_Project.pdf", "Section 1: Working Software Project"),
        ("02_Detailed_Software_Requirements_Specification.md", "02_Detailed_Software_Requirements_Specification.pdf", "Section 2: Detailed Software Requirements Specification (SRS)"),
        ("03_UML_Diagrams.md", "03_UML_Diagrams.pdf", "Section 3: UML Architectural & Behavioral Diagrams"),
        ("04_Detailed_Software_Test_Cases.md", "04_Detailed_Software_Test_Cases.pdf", "Section 4: Detailed Software Test Cases & Traceability Matrix"),
    ]
    for md_name, pdf_name, sec_title in sections:
        sec_md = IA3_DIR / md_name
        sec_pdf = IA3_DIR / pdf_name
        if sec_md.exists():
            compile_report(
                sec_md,
                sec_pdf,
                f"SpamGuard AI — {sec_title}"
            )

    print("\n==================================================================")
    print("                      COMPILATION COMPLETE                        ")
    print("==================================================================")


if __name__ == "__main__":
    main()
