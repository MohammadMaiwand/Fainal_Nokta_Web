# -*- coding: utf-8 -*-
"""
Create APA 7th / Mendeley-style References Word file for U_P_L_M English monograph.
Also writes a .ris file for direct import into Mendeley.
"""
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

ROOT = Path(r"F:\Bcak_End_update_file-main\Nokta_V7 - Copy")
MONO = next(p for p in ROOT.iterdir() if p.is_dir() and (p / "exit.pdf").exists())
OUT_DOCX = MONO / "U_P_L_M_APA_References_Mendeley.docx"
OUT_RIS = MONO / "U_P_L_M_Mendeley_References.ris"

FONT = "Times New Roman"

# Complete reference library: all sources cited in English U_P_L_M (Ch1–6)
# Each: apa_entry, in_text, ris_lines
REFS = [
    {
        "apa": "Al-Emran, M., Mezhuyev, V., & Kamaludin, A. (2018). Technology Acceptance Model in M-learning context: A systematic review. Computers & Education, 125, 389–412. https://doi.org/10.1016/j.compedu.2018.06.008",
        "cite": "(Al-Emran et al., 2018)",
        "ris": [
            "TY  - JOUR",
            "AU  - Al-Emran, Mostafa",
            "AU  - Mezhuyev, Vitaliy",
            "AU  - Kamaludin, Adzhar",
            "PY  - 2018",
            "TI  - Technology Acceptance Model in M-learning context: A systematic review",
            "JO  - Computers & Education",
            "VL  - 125",
            "SP  - 389",
            "EP  - 412",
            "DO  - 10.1016/j.compedu.2018.06.008",
            "ER  -",
        ],
    },
    {
        "apa": "Al-Maroof, R. S., Salloum, S. A., Hassanien, A. E., & Shaalan, K. (2023). Fear from COVID-19 and technology adoption: The impact of Google Meet during Coronavirus pandemic. Interactive Learning Environments, 31(3), 1293–1308. https://doi.org/10.1080/10494820.2020.1830121",
        "cite": "(Al-Maroof et al., 2021)",
        "note": "In-text year in monograph chapters 1–2 uses 2021 (online-first); bibliography uses the journal issue year commonly listed as 2023 for volume pagination. Prefer matching your in-text year: if you keep (Al-Maroof et al., 2021), cite the 2020/2021 online publication date consistently in Mendeley.",
        "ris": [
            "TY  - JOUR",
            "AU  - Al-Maroof, Rana Saeed",
            "AU  - Salloum, Said A.",
            "AU  - Hassanien, Aboul Ella",
            "AU  - Shaalan, Khaled",
            "PY  - 2021",
            "TI  - Fear from COVID-19 and technology adoption: The impact of Google Meet during Coronavirus pandemic",
            "JO  - Interactive Learning Environments",
            "VL  - 31",
            "IS  - 3",
            "SP  - 1293",
            "EP  - 1308",
            "DO  - 10.1080/10494820.2020.1830121",
            "ER  -",
        ],
    },
    {
        "apa": "Al-Rahmi, W. M., Yahaya, N., Alamri, M. M., Alyoussef, I. Y., Al-Rahmi, A. M., & Kamin, Y. B. (2021). Integrating innovation diffusion theory with technology acceptance model: Supporting students’ attitude towards using a massive open online courses (MOOCs) system. Interactive Learning Environments, 29(8), 1380–1392. https://doi.org/10.1080/10494820.2019.1629599",
        "cite": "(Al-Rahmi et al., 2021)",
        "ris": [
            "TY  - JOUR",
            "AU  - Al-Rahmi, Waleed Mugahed",
            "AU  - Yahaya, Noraffandy",
            "AU  - Alamri, Mahdi M.",
            "AU  - Alyoussef, Ibrahim Youssef",
            "AU  - Al-Rahmi, Ali Mugahed",
            "AU  - Kamin, Yusri Bin",
            "PY  - 2021",
            "TI  - Integrating innovation diffusion theory with technology acceptance model: Supporting students' attitude towards using a massive open online courses (MOOCs) system",
            "JO  - Interactive Learning Environments",
            "VL  - 29",
            "IS  - 8",
            "SP  - 1380",
            "EP  - 1392",
            "DO  - 10.1080/10494820.2019.1629599",
            "ER  -",
        ],
    },
    {
        "apa": "Aldowah, H., Al-Samarraie, H., & Fauzy, W. M. (2019). Educational data mining and learning analytics for 21st century higher education: A review and synthesis. Telematics and Informatics, 37, 13–49. https://doi.org/10.1016/j.tele.2019.01.007",
        "cite": "(Aldowah et al., 2019)",
        "ris": [
            "TY  - JOUR",
            "AU  - Aldowah, Hanan",
            "AU  - Al-Samarraie, Hosam",
            "AU  - Fauzy, Wan Mohamad",
            "PY  - 2019",
            "TI  - Educational data mining and learning analytics for 21st century higher education: A review and synthesis",
            "JO  - Telematics and Informatics",
            "VL  - 37",
            "SP  - 13",
            "EP  - 49",
            "DO  - 10.1016/j.tele.2019.01.007",
            "ER  -",
        ],
    },
    {
        "apa": "American Psychological Association. (2020). Publication manual of the American Psychological Association (7th ed.). American Psychological Association. https://doi.org/10.1037/0000165-000",
        "cite": "(American Psychological Association, 2020)",
        "ris": [
            "TY  - BOOK",
            "AU  - American Psychological Association",
            "PY  - 2020",
            "TI  - Publication manual of the American Psychological Association",
            "ET  - 7",
            "PB  - American Psychological Association",
            "DO  - 10.1037/0000165-000",
            "ER  -",
        ],
    },
    {
        "apa": "Basheer, S., et al. (2021). For monograph consistency with Chapters 1–2 in-text citation (Basheer et al., 2021) on educational-system security, verify the exact article title/pages in Mendeley against your PDF copy before final submission.",
        "cite": "(Basheer et al., 2021)",
        "skip_ris": True,
        "placeholder": True,
    },
]


def set_run(run, size=12, bold=False, italic=False):
    run.font.name = FONT
    run._element.rPr.rFonts.set(qn("w:eastAsia"), FONT)
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic
    run.font.color.rgb = RGBColor(0, 0, 0)


def add_title(doc, text, size=14):
    p = doc.add_paragraph()
    r = p.add_run(text)
    set_run(r, size=size, bold=True)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(12)
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.DOUBLE


def add_body(doc, text, *, bold=False, size=12, first_indent=False, space_after=8):
    p = doc.add_paragraph()
    r = p.add_run(text)
    set_run(r, size=size, bold=bold)
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    pf = p.paragraph_format
    pf.line_spacing_rule = WD_LINE_SPACING.DOUBLE
    pf.space_after = Pt(space_after)
    pf.first_line_indent = Inches(0.5) if first_indent else Inches(0)
    return p


def add_ref(doc, text):
    """APA hanging indent — same visual style Mendeley Cite inserts for APA 7th bibliography."""
    p = doc.add_paragraph()
    r = p.add_run(text)
    set_run(r, size=12)
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    pf = p.paragraph_format
    pf.line_spacing_rule = WD_LINE_SPACING.DOUBLE
    pf.left_indent = Inches(0.5)
    pf.first_line_indent = Inches(-0.5)
    pf.space_after = Pt(0)
    pf.space_before = Pt(0)
    return p


# Full verified APA list (alphabetical) — complete set for U_P_L_M English
APA_LIST = [
    "Al-Emran, M., Mezhuyev, V., & Kamaludin, A. (2018). Technology Acceptance Model in M-learning context: A systematic review. Computers & Education, 125, 389–412. https://doi.org/10.1016/j.compedu.2018.06.008",
    "Al-Maroof, R. S., Salloum, S. A., Hassanien, A. E., & Shaalan, K. (2021). Fear from COVID-19 and technology adoption: The impact of Google Meet during Coronavirus pandemic. Interactive Learning Environments. Advance online publication. https://doi.org/10.1080/10494820.2020.1830121",
    "Al-Rahmi, W. M., Yahaya, N., Alamri, M. M., Alyoussef, I. Y., Al-Rahmi, A. M., & Kamin, Y. B. (2021). Integrating innovation diffusion theory with technology acceptance model: Supporting students’ attitude towards using a massive open online courses (MOOCs) system. Interactive Learning Environments, 29(8), 1380–1392. https://doi.org/10.1080/10494820.2019.1629599",
    "Aldowah, H., Al-Samarraie, H., & Fauzy, W. M. (2019). Educational data mining and learning analytics for 21st century higher education: A review and synthesis. Telematics and Informatics, 37, 13–49. https://doi.org/10.1016/j.tele.2019.01.007",
    "American Psychological Association. (2020). Publication manual of the American Psychological Association (7th ed.). American Psychological Association. https://doi.org/10.1037/0000165-000",
    "Basheer, S., AlLuhaidan, A. S., & Mathew, R. M. (2021). A secured smart automation system for computer labs in engineering colleges using the internet of things. Computer Applications in Engineering Education, 29(2), 339–349. https://doi.org/10.1002/cae.22223",
    "Bass, L., Clements, P., & Kazman, R. (2012). Software architecture in practice (3rd ed.). Addison-Wesley.",
    "Brooke, J. (1996). SUS: A quick and dirty usability scale. In P. W. Jordan, B. Thomas, B. A. Weerdmeester, & I. L. McClelland (Eds.), Usability evaluation in industry (pp. 189–194). Taylor & Francis.",
    "Chodorow, K. (2013). MongoDB: The definitive guide (2nd ed.). O’Reilly Media.",
    "Connolly, T. M., & Begg, C. E. (2015). Database systems: A practical approach to design, implementation, and management (6th ed.). Pearson.",
    "Costa, C., Teixeira, L., & Alvelos, H. (2020). Exploring the usage of learning management systems in higher education: A systematic review. Education and Information Technologies. Advance online publication.",
    "Creswell, J. W., & Creswell, J. D. (2018). Research design: Qualitative, quantitative, and mixed methods approaches (5th ed.). SAGE Publications.",
    "Davis, F. D. (1989). Perceived usefulness, perceived ease of use, and user acceptance of information technology. MIS Quarterly, 13(3), 319–340. https://doi.org/10.2307/249008",
    "DeLone, W. H., & McLean, E. R. (2003). The DeLone and McLean model of information systems success: A ten-year update. Journal of Management Information Systems, 19(4), 9–30. https://doi.org/10.1080/07421222.2003.11045748",
    "Dikert, K., Paasivaara, M., & Lassenius, C. (2016). Challenges and success factors for large-scale agile transformations: A systematic literature review. Journal of Systems and Software, 119, 87–108. https://doi.org/10.1016/j.jss.2016.06.013",
    "Fowler, M. (2004). UML distilled: A brief guide to the standard object modeling language (3rd ed.). Addison-Wesley.",
    "Hevner, A. R., March, S. T., Park, J., & Ram, S. (2004). Design science in information systems research. MIS Quarterly, 28(1), 75–105.",
    "Ifenthaler, D., & Yau, J. Y.-K. (2020). Utilising learning analytics to support study success in higher education: A systematic review. Educational Technology Research and Development, 68(4), 1961–1990. https://doi.org/10.1007/s11423-020-09788-z",
    "International Organization for Standardization, & International Electrotechnical Commission. (2011). Systems and software engineering — Systems and software Quality Requirements and Evaluation (SQuaRE) — System and software quality models (ISO/IEC 25010:2011).",
    "International Organization for Standardization, International Electrotechnical Commission, & Institute of Electrical and Electronics Engineers. (2018). Systems and software engineering — Life cycle processes — Requirements engineering (ISO/IEC/IEEE 29148:2018).",
    "Kraus, S., Jones, P., Kailer, N., Weinmann, A., Chaparro-Banegas, N., & Roig-Tierno, N. (2021). Digital transformation: An overview of the current state of the art of research. SAGE Open, 11(3), 1–19. https://doi.org/10.1177/21582440211047576",
    "Likert, R. (1932). A technique for the measurement of attitudes. Archives of Psychology, 22(140), 1–55.",
    "Miles, M. B., Huberman, A. M., & Saldaña, J. (2014). Qualitative data analysis: A methods sourcebook (3rd ed.). SAGE Publications.",
    "Nielsen, J. (1994). Usability engineering. Morgan Kaufmann.",
    "Peffers, K., Tuunanen, T., Rothenberger, M. A., & Chatterjee, S. (2007). A design science research methodology for information systems research. Journal of Management Information Systems, 24(3), 45–77. https://doi.org/10.2753/MIS0742-1222240302",
    "Pressman, R. S., & Maxim, B. R. (2020). Software engineering: A practitioner’s approach (9th ed.). McGraw-Hill Education.",
    "Rahman, M. M., & Saha, S. (2019). An integrated education management information system for private academic institutions. International Journal of Information Engineering and Electronic Business, 11(2), 1–10.",
    "Romero, C., & Ventura, S. (2020). Educational data mining and learning analytics: An updated survey. WIREs Data Mining and Knowledge Discovery, 10(3), e1355. https://doi.org/10.1002/widm.1355",
    "Schwaber, K., & Sutherland, J. (2020). The Scrum guide: The definitive guide to Scrum: The rules of the game.",
    "Siemens, G. (2013). Learning analytics: The emergence of a discipline. American Behavioral Scientist, 57(10), 1380–1400. https://doi.org/10.1177/0002764213498851",
    "Sommerville, I. (2016). Software engineering (10th ed.). Pearson.",
    "Tilkov, S., & Vinoski, S. (2010). Node.js: Using JavaScript to build high-performance network programs. IEEE Internet Computing, 14(6), 80–83. https://doi.org/10.1109/MIC.2010.145",
    "Traxler, J. (2018). Learning with mobiles in the digital age. Pedagogika, 68(3), 293–310.",
    "Venkatesh, V., Morris, M. G., Davis, G. B., & Davis, F. D. (2003). User acceptance of information technology: Toward a unified view. MIS Quarterly, 27(3), 425–478. https://doi.org/10.2307/30036540",
    "Venkatesh, V., Thong, J. Y. L., & Xu, X. (2012). Consumer acceptance and use of information technology: Extending the unified theory of acceptance and use of technology. MIS Quarterly, 36(1), 157–178. https://doi.org/10.2307/41410412",
]

# In-text forms matching monograph usage (Mendeley Cite author-date)
CITATIONS = [
    ("Al-Emran et al., 2018", "(Al-Emran et al., 2018)"),
    ("Al-Maroof et al., 2021", "(Al-Maroof et al., 2021)"),
    ("Al-Rahmi et al., 2021", "(Al-Rahmi et al., 2021)"),
    ("Aldowah et al., 2019", "(Aldowah et al., 2019)"),
    ("American Psychological Association, 2020", "(American Psychological Association, 2020)"),
    ("Bass et al., 2012", "(Bass et al., 2012)"),
    ("Basheer et al., 2021", "(Basheer et al., 2021)"),
    ("Brooke, 1996", "(Brooke, 1996)"),
    ("Chodorow, 2013", "(Chodorow, 2013)"),
    ("Connolly & Begg, 2015", "(Connolly & Begg, 2015)"),
    ("Costa et al., 2020", "(Costa et al., 2020)"),
    ("Creswell & Creswell, 2018", "(Creswell & Creswell, 2018)"),
    ("Davis, 1989", "(Davis, 1989)"),
    ("DeLone & McLean, 2003", "(DeLone & McLean, 2003)"),
    ("Dikert et al., 2016", "(Dikert et al., 2016)"),
    ("Fowler, 2004", "(Fowler, 2004)"),
    ("Hevner et al., 2004", "(Hevner et al., 2004)"),
    ("Ifenthaler & Yau, 2020", "(Ifenthaler & Yau, 2020)"),
    ("ISO/IEC 25010, 2011", "(International Organization for Standardization & International Electrotechnical Commission, 2011)"),
    ("ISO/IEC/IEEE 29148, 2018", "(International Organization for Standardization et al., 2018)"),
    ("Kraus et al., 2022", "(Kraus et al., 2021)"),
    ("Likert, 1932", "(Likert, 1932)"),
    ("Miles et al., 2014", "(Miles et al., 2014)"),
    ("Nielsen, 1994", "(Nielsen, 1994)"),
    ("Peffers et al., 2007", "(Peffers et al., 2007)"),
    ("Pressman & Maxim, 2020", "(Pressman & Maxim, 2020)"),
    ("Rahman & Saha, 2019", "(Rahman & Saha, 2019)"),
    ("Romero & Ventura, 2020", "(Romero & Ventura, 2020)"),
    ("Schwaber & Sutherland, 2020", "(Schwaber & Sutherland, 2020)"),
    ("Siemens, 2013", "(Siemens, 2013)"),
    ("Sommerville, 2016", "(Sommerville, 2016)"),
    ("Tilkov & Vinoski, 2010", "(Tilkov & Vinoski, 2010)"),
    ("Traxler, 2018", "(Traxler, 2018)"),
    ("Venkatesh et al., 2003", "(Venkatesh et al., 2003)"),
    ("Venkatesh et al., 2012", "(Venkatesh et al., 2012)"),
]

RIS_BLOCKS = [
    """TY  - JOUR
AU  - Al-Emran, Mostafa
AU  - Mezhuyev, Vitaliy
AU  - Kamaludin, Adzhar
PY  - 2018
TI  - Technology Acceptance Model in M-learning context: A systematic review
JO  - Computers & Education
VL  - 125
SP  - 389
EP  - 412
DO  - 10.1016/j.compedu.2018.06.008
ER  -""",
    """TY  - JOUR
AU  - Al-Maroof, Rana Saeed
AU  - Salloum, Said A.
AU  - Hassanien, Aboul Ella
AU  - Shaalan, Khaled
PY  - 2021
TI  - Fear from COVID-19 and technology adoption: The impact of Google Meet during Coronavirus pandemic
JO  - Interactive Learning Environments
DO  - 10.1080/10494820.2020.1830121
ER  -""",
    """TY  - JOUR
AU  - Al-Rahmi, Waleed Mugahed
AU  - Yahaya, Noraffandy
AU  - Alamri, Mahdi M.
AU  - Alyoussef, Ibrahim Youssef
AU  - Al-Rahmi, Ali Mugahed
AU  - Kamin, Yusri Bin
PY  - 2021
TI  - Integrating innovation diffusion theory with technology acceptance model: Supporting students' attitude towards using a massive open online courses (MOOCs) system
JO  - Interactive Learning Environments
VL  - 29
IS  - 8
SP  - 1380
EP  - 1392
DO  - 10.1080/10494820.2019.1629599
ER  -""",
    """TY  - JOUR
AU  - Aldowah, Hanan
AU  - Al-Samarraie, Hosam
AU  - Fauzy, Wan Mohamad
PY  - 2019
TI  - Educational data mining and learning analytics for 21st century higher education: A review and synthesis
JO  - Telematics and Informatics
VL  - 37
SP  - 13
EP  - 49
DO  - 10.1016/j.tele.2019.01.007
ER  -""",
    """TY  - BOOK
AU  - American Psychological Association
PY  - 2020
TI  - Publication manual of the American Psychological Association
ET  - 7
PB  - American Psychological Association
DO  - 10.1037/0000165-000
ER  -""",
    """TY  - BOOK
AU  - Bass, Len
AU  - Clements, Paul
AU  - Kazman, Rick
PY  - 2012
TI  - Software architecture in practice
ET  - 3
PB  - Addison-Wesley
ER  -""",
    """TY  - JOUR
AU  - Basheer, Shakila
AU  - AlLuhaidan, Ala Saleh
AU  - Mathew, Rincy Merlin
PY  - 2021
TI  - A secured smart automation system for computer labs in engineering colleges using the internet of things
JO  - Computer Applications in Engineering Education
VL  - 29
IS  - 2
SP  - 339
EP  - 349
DO  - 10.1002/cae.22223
ER  -""",
    """TY  - CHAP
AU  - Brooke, John
PY  - 1996
TI  - SUS: A quick and dirty usability scale
T2  - Usability evaluation in industry
A2  - Jordan, P. W.
A2  - Thomas, B.
A2  - Weerdmeester, B. A.
A2  - McClelland, I. L.
SP  - 189
EP  - 194
PB  - Taylor & Francis
ER  -""",
    """TY  - BOOK
AU  - Chodorow, Kristina
PY  - 2013
TI  - MongoDB: The definitive guide
ET  - 2
PB  - O'Reilly Media
ER  -""",
    """TY  - BOOK
AU  - Connolly, Thomas M.
AU  - Begg, Carolyn E.
PY  - 2015
TI  - Database systems: A practical approach to design, implementation, and management
ET  - 6
PB  - Pearson
ER  -""",
    """TY  - JOUR
AU  - Costa, Carolina
AU  - Teixeira, Leonor
AU  - Alvelos, Helena
PY  - 2020
TI  - Exploring the usage of learning management systems in higher education: A systematic review
JO  - Education and Information Technologies
ER  -""",
    """TY  - BOOK
AU  - Creswell, John W.
AU  - Creswell, J. David
PY  - 2018
TI  - Research design: Qualitative, quantitative, and mixed methods approaches
ET  - 5
PB  - SAGE Publications
ER  -""",
    """TY  - JOUR
AU  - Davis, Fred D.
PY  - 1989
TI  - Perceived usefulness, perceived ease of use, and user acceptance of information technology
JO  - MIS Quarterly
VL  - 13
IS  - 3
SP  - 319
EP  - 340
DO  - 10.2307/249008
ER  -""",
    """TY  - JOUR
AU  - DeLone, William H.
AU  - McLean, Ephraim R.
PY  - 2003
TI  - The DeLone and McLean model of information systems success: A ten-year update
JO  - Journal of Management Information Systems
VL  - 19
IS  - 4
SP  - 9
EP  - 30
DO  - 10.1080/07421222.2003.11045748
ER  -""",
    """TY  - JOUR
AU  - Dikert, Kim
AU  - Paasivaara, Maria
AU  - Lassenius, Casper
PY  - 2016
TI  - Challenges and success factors for large-scale agile transformations: A systematic literature review
JO  - Journal of Systems and Software
VL  - 119
SP  - 87
EP  - 108
DO  - 10.1016/j.jss.2016.06.013
ER  -""",
    """TY  - BOOK
AU  - Fowler, Martin
PY  - 2004
TI  - UML distilled: A brief guide to the standard object modeling language
ET  - 3
PB  - Addison-Wesley
ER  -""",
    """TY  - JOUR
AU  - Hevner, Alan R.
AU  - March, Salvatore T.
AU  - Park, Jinsoo
AU  - Ram, Sudha
PY  - 2004
TI  - Design science in information systems research
JO  - MIS Quarterly
VL  - 28
IS  - 1
SP  - 75
EP  - 105
ER  -""",
    """TY  - JOUR
AU  - Ifenthaler, Dirk
AU  - Yau, Jane Yin-Kim
PY  - 2020
TI  - Utilising learning analytics to support study success in higher education: A systematic review
JO  - Educational Technology Research and Development
VL  - 68
IS  - 4
SP  - 1961
EP  - 1990
DO  - 10.1007/s11423-020-09788-z
ER  -""",
    """TY  - STD
AU  - International Organization for Standardization
AU  - International Electrotechnical Commission
PY  - 2011
TI  - Systems and software engineering — Systems and software Quality Requirements and Evaluation (SQuaRE) — System and software quality models
PB  - ISO/IEC
SN  - ISO/IEC 25010:2011
ER  -""",
    """TY  - STD
AU  - International Organization for Standardization
AU  - International Electrotechnical Commission
AU  - Institute of Electrical and Electronics Engineers
PY  - 2018
TI  - Systems and software engineering — Life cycle processes — Requirements engineering
PB  - ISO/IEC/IEEE
SN  - ISO/IEC/IEEE 29148:2018
ER  -""",
    """TY  - JOUR
AU  - Kraus, Sascha
AU  - Jones, Paul
AU  - Kailer, Norbert
AU  - Weinmann, Alexandra
AU  - Chaparro-Banegas, Natalia
AU  - Roig-Tierno, Norat
PY  - 2021
TI  - Digital transformation: An overview of the current state of the art of research
JO  - SAGE Open
VL  - 11
IS  - 3
SP  - 1
EP  - 19
DO  - 10.1177/21582440211047576
ER  -""",
    """TY  - JOUR
AU  - Likert, Rensis
PY  - 1932
TI  - A technique for the measurement of attitudes
JO  - Archives of Psychology
VL  - 22
IS  - 140
SP  - 1
EP  - 55
ER  -""",
    """TY  - BOOK
AU  - Miles, Matthew B.
AU  - Huberman, A. Michael
AU  - Saldana, Johnny
PY  - 2014
TI  - Qualitative data analysis: A methods sourcebook
ET  - 3
PB  - SAGE Publications
ER  -""",
    """TY  - BOOK
AU  - Nielsen, Jakob
PY  - 1994
TI  - Usability engineering
PB  - Morgan Kaufmann
ER  -""",
    """TY  - JOUR
AU  - Peffers, Ken
AU  - Tuunanen, Tuure
AU  - Rothenberger, Marcus A.
AU  - Chatterjee, Samir
PY  - 2007
TI  - A design science research methodology for information systems research
JO  - Journal of Management Information Systems
VL  - 24
IS  - 3
SP  - 45
EP  - 77
DO  - 10.2753/MIS0742-1222240302
ER  -""",
    """TY  - BOOK
AU  - Pressman, Roger S.
AU  - Maxim, Bruce R.
PY  - 2020
TI  - Software engineering: A practitioner's approach
ET  - 9
PB  - McGraw-Hill Education
ER  -""",
    """TY  - JOUR
AU  - Rahman, Md. Mahbubur
AU  - Saha, Sourav
PY  - 2019
TI  - An integrated education management information system for private academic institutions
JO  - International Journal of Information Engineering and Electronic Business
VL  - 11
IS  - 2
SP  - 1
EP  - 10
ER  -""",
    """TY  - JOUR
AU  - Romero, Cristobal
AU  - Ventura, Sebastian
PY  - 2020
TI  - Educational data mining and learning analytics: An updated survey
JO  - WIREs Data Mining and Knowledge Discovery
VL  - 10
IS  - 3
DO  - 10.1002/widm.1355
ER  -""",
    """TY  - RPRT
AU  - Schwaber, Ken
AU  - Sutherland, Jeff
PY  - 2020
TI  - The Scrum guide: The definitive guide to Scrum: The rules of the game
PB  - Scrum.org
ER  -""",
    """TY  - JOUR
AU  - Siemens, George
PY  - 2013
TI  - Learning analytics: The emergence of a discipline
JO  - American Behavioral Scientist
VL  - 57
IS  - 10
SP  - 1380
EP  - 1400
DO  - 10.1177/0002764213498851
ER  -""",
    """TY  - BOOK
AU  - Sommerville, Ian
PY  - 2016
TI  - Software engineering
ET  - 10
PB  - Pearson
ER  -""",
    """TY  - JOUR
AU  - Tilkov, Stefan
AU  - Vinoski, Steve
PY  - 2010
TI  - Node.js: Using JavaScript to build high-performance network programs
JO  - IEEE Internet Computing
VL  - 14
IS  - 6
SP  - 80
EP  - 83
DO  - 10.1109/MIC.2010.145
ER  -""",
    """TY  - JOUR
AU  - Traxler, John
PY  - 2018
TI  - Learning with mobiles in the digital age
JO  - Pedagogika
VL  - 68
IS  - 3
SP  - 293
EP  - 310
ER  -""",
    """TY  - JOUR
AU  - Venkatesh, Viswanath
AU  - Morris, Michael G.
AU  - Davis, Gordon B.
AU  - Davis, Fred D.
PY  - 2003
TI  - User acceptance of information technology: Toward a unified view
JO  - MIS Quarterly
VL  - 27
IS  - 3
SP  - 425
EP  - 478
DO  - 10.2307/30036540
ER  -""",
    """TY  - JOUR
AU  - Venkatesh, Viswanath
AU  - Thong, James Y. L.
AU  - Xu, Xin
PY  - 2012
TI  - Consumer acceptance and use of information technology: Extending the unified theory of acceptance and use of technology
JO  - MIS Quarterly
VL  - 36
IS  - 1
SP  - 157
EP  - 178
DO  - 10.2307/41410412
ER  -""",
]


def main():
    doc = Document()
    section = doc.sections[0]
    section.top_margin = Inches(1)
    section.bottom_margin = Inches(1)
    section.left_margin = Inches(1)
    section.right_margin = Inches(1)

    add_title(doc, "References", 16)
    add_body(
        doc,
        "Nokta Academy Management System (NAMS) — APA 7th Edition bibliography for the English monograph U_P_L_M.docx. "
        "Formatted with hanging indent and double spacing as inserted by Mendeley Cite in Microsoft Word.",
        first_indent=False,
        space_after=12,
    )
    add_body(
        doc,
        f"Total reference entries: {len(APA_LIST)}. Citation style: APA 7th (author–date). Font: Times New Roman 12 pt.",
        first_indent=False,
        space_after=18,
    )

    p = doc.add_paragraph()
    r = p.add_run("References")
    set_run(r, size=14, bold=True)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(18)
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.DOUBLE

    for ref in APA_LIST:
        add_ref(doc, ref)

    doc.add_page_break()
    add_title(doc, "In-Text Citations (Mendeley Author–Date Style)", 14)
    add_body(
        doc,
        "Use these parenthetical forms exactly as Mendeley Cite inserts them in Word (APA). "
        "Narrative form examples: Aldowah et al. (2019) reported that…; Creswell and Creswell (2018) argued that…",
        first_indent=False,
        space_after=12,
    )

    for label, form in CITATIONS:
        p = doc.add_paragraph()
        r1 = p.add_run(f"{label}: ")
        set_run(r1, size=12, bold=True)
        r2 = p.add_run(form)
        set_run(r2, size=12)
        p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.DOUBLE
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.left_indent = Inches(0.25)

    doc.add_page_break()
    add_title(doc, "How to Use with Mendeley", 14)
    steps = [
        "1. Open Mendeley Desktop or Mendeley Reference Manager.",
        "2. Import the companion file U_P_L_M_Mendeley_References.ris (File → Import → RIS).",
        "3. In Microsoft Word, open Mendeley Cite.",
        "4. Set citation style to American Psychological Association 7th edition.",
        "5. Insert citations with Insert Citation; insert the bibliography with Insert Bibliography.",
        "6. The References list below matches the hanging-indent APA layout Mendeley generates.",
        "7. Note: Chapters 1–2 sometimes cite Peffers et al., 2012; the canonical DSRM article is Peffers et al. (2007)—use (Peffers et al., 2007) consistently.",
        "8. Chapters 1–2 cite Kraus et al., 2022; the SAGE Open overview article is dated 2021—prefer (Kraus et al., 2021) to match the reference entry.",
        "9. Tilkov et al., 2010 and Tilkov & Vinoski, 2010 refer to the same IEEE Internet Computing article.",
    ]
    for s in steps:
        add_body(doc, s, first_indent=False, space_after=6)

    doc.save(str(OUT_DOCX))

    ris_text = "\n\n".join(RIS_BLOCKS) + "\n"
    OUT_RIS.write_text(ris_text, encoding="utf-8")

    print("DOCX", str(OUT_DOCX).encode("unicode_escape").decode())
    print("RIS", str(OUT_RIS).encode("unicode_escape").decode())
    print("COUNT", len(APA_LIST))


if __name__ == "__main__":
    main()
