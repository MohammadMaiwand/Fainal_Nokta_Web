# -*- coding: utf-8 -*-
"""Standalone List of Abbreviations for NAMS English monograph."""
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor, Cm

ROOT = Path(r"F:\Bcak_End_update_file-main\Nokta_V7 - Copy")
MONO = next(p for p in ROOT.iterdir() if p.is_dir() and (p / "exit.pdf").exists())
OUT = MONO / "U_P_L_M_LIST_OF_ABBREVIATIONS.docx"

FONT = "Times New Roman"

# Alphabetically sorted: abbreviation -> meaning (project-relevant)
ABBREVIATIONS = [
    ("AFN", "Afghan Afghani (currency unit used in fee and payroll modules)"),
    ("AI", "Artificial Intelligence"),
    ("API", "Application Programming Interface"),
    ("APA", "American Psychological Association"),
    ("BRT", "Business Receipt Tax (academy-level tax treatment used in NAMS reports)"),
    ("CRUD", "Create, Read, Update, Delete"),
    ("DBMS", "Database Management System"),
    ("ERD", "Entity–Relationship Diagram"),
    ("FK", "Foreign Key (application-level ObjectId reference in MongoDB schemas)"),
    ("FR", "Functional Requirement"),
    ("IEEE", "Institute of Electrical and Electronics Engineers"),
    ("JWT", "JSON Web Token"),
    ("LMS", "Learning Management System"),
    ("MIS", "Management Information System"),
    ("NAMS", "Nokta Academy Management System"),
    ("NFR", "Non-Functional Requirement"),
    ("PDF", "Portable Document Format"),
    ("PK", "Primary Key"),
    ("PWA", "Progressive Web Application"),
    ("RBAC", "Role-Based Access Control"),
    ("REST", "Representational State Transfer"),
    ("RTL", "Right-to-Left (script direction for Dari and Pashto interfaces)"),
    ("SDLC", "Software Development Life Cycle"),
    ("SPA", "Single-Page Application"),
    ("UAT", "User Acceptance Testing"),
    ("UI", "User Interface"),
    ("UQ", "Unique (unique index / unique business key)"),
    ("UX", "User Experience"),
]


def set_run(run, size=12, bold=False, italic=False):
    run.font.name = FONT
    run._element.rPr.rFonts.set(qn("w:eastAsia"), FONT)
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic
    run.font.color.rgb = RGBColor(0, 0, 0)


def set_cell_borders_none(cell):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    borders = OxmlElement("w:tcBorders")
    for edge in ("top", "left", "bottom", "right"):
        el = OxmlElement(f"w:{edge}")
        el.set(qn("w:val"), "nil")
        borders.append(el)
    tcPr.append(borders)


def main():
    doc = Document()
    for sec in doc.sections:
        sec.top_margin = Inches(1)
        sec.bottom_margin = Inches(1)
        sec.left_margin = Inches(1)
        sec.right_margin = Inches(1)

    p = doc.add_paragraph()
    r = p.add_run("Nokta Academy Management System (NAMS)")
    set_run(r, size=14, bold=True)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.DOUBLE

    p = doc.add_paragraph()
    r = p.add_run("Final Year Project Monograph — Preliminary Pages")
    set_run(r, size=11, italic=True)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(18)
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.DOUBLE

    p = doc.add_paragraph()
    r = p.add_run("LIST OF ABBREVIATIONS")
    set_run(r, size=14, bold=True)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(18)
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.DOUBLE

    p = doc.add_paragraph()
    r = p.add_run(
        "The following abbreviations are used in this monograph. They are listed in alphabetical order."
    )
    set_run(r, size=12)
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.DOUBLE
    p.paragraph_format.space_after = Pt(12)

    table = doc.add_table(rows=len(ABBREVIATIONS), cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = True

    for i, (abbr, meaning) in enumerate(ABBREVIATIONS):
        row = table.rows[i]
        c0, c1 = row.cells[0], row.cells[1]
        set_cell_borders_none(c0)
        set_cell_borders_none(c1)

        c0.text = ""
        p0 = c0.paragraphs[0]
        r0 = p0.add_run(abbr)
        set_run(r0, size=12, bold=True)
        p0.paragraph_format.space_after = Pt(4)
        p0.paragraph_format.line_spacing_rule = WD_LINE_SPACING.DOUBLE

        c1.text = ""
        p1 = c1.paragraphs[0]
        r1 = p1.add_run(f"—  {meaning}")
        set_run(r1, size=12)
        p1.paragraph_format.space_after = Pt(4)
        p1.paragraph_format.line_spacing_rule = WD_LINE_SPACING.DOUBLE

    # set column widths roughly
    for row in table.rows:
        row.cells[0].width = Cm(3.2)
        row.cells[1].width = Cm(13.5)

    p = doc.add_paragraph()
    r = p.add_run(
        "Note. Abbreviations are spelled out at first mention in the main text where helpful for clarity."
    )
    set_run(r, size=11, italic=True)
    p.paragraph_format.space_before = Pt(18)
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.DOUBLE

    doc.save(str(OUT))
    print("CREATED", str(OUT).encode("unicode_escape").decode())
    print("COUNT", len(ABBREVIATIONS))


if __name__ == "__main__":
    main()
