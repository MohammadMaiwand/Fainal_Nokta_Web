# -*- coding: utf-8 -*-
"""Generate charts and prototype mock figures for U_P_L_M.docx."""
from pathlib import Path
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from PIL import Image, ImageDraw, ImageFont

root = Path(r"F:\Bcak_End_update_file-main\Nokta_V7 - Copy")
mono = next(p for p in root.iterdir() if p.is_dir() and (p / "exit.pdf").exists())
out = mono / "_uplm_assets"
out.mkdir(exist_ok=True)


def font(size=18, bold=False):
    candidates = [
        r"C:\Windows\Fonts\timesbd.ttf" if bold else r"C:\Windows\Fonts\times.ttf",
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
    ]
    for c in candidates:
        if Path(c).exists():
            return ImageFont.truetype(c, size)
    return ImageFont.load_default()


def mock_screen(path, title, panels, accent=(31, 78, 121)):
    w, h = 1100, 700
    img = Image.new("RGB", (w, h), (248, 250, 252))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, w, 56], fill=accent)
    d.text((24, 16), title, fill="white", font=font(22, True))
    d.rectangle([0, 56, 220, h], fill=(226, 232, 240))
    y = 80
    for item in ["Dashboard", "Students", "Teachers", "Attendance", "Exams", "Payments", "Reports"]:
        d.text((28, y), item, fill=(51, 65, 85), font=font(16))
        y += 36
    x0, y0 = 250, 90
    pw, ph = 380, 220
    for i, (label, lines) in enumerate(panels[:4]):
        col, row = i % 2, i // 2
        x, y = x0 + col * (pw + 30), y0 + row * (ph + 30)
        d.rounded_rectangle([x, y, x + pw, y + ph], radius=10, outline=accent, width=2, fill="white")
        d.rectangle([x, y, x + pw, y + 40], fill=accent)
        d.text((x + 14, y + 10), label, fill="white", font=font(16, True))
        ty = y + 58
        for line in lines:
            d.text((x + 16, ty), line, fill=(30, 41, 59), font=font(15))
            ty += 28
    img.save(path)
    print("wrote", path.name)


def bar_chart(path, title, labels, values, ylabel="Count"):
    fig, ax = plt.subplots(figsize=(8.5, 4.8), dpi=140)
    colors = ["#1F4E79", "#2E75B6", "#5B9BD5", "#9DC3E6", "#70AD47", "#ED7D31", "#C00000"]
    bars = ax.bar(labels, values, color=colors[: len(labels)])
    ax.set_title(title, fontsize=13, fontname="Times New Roman", pad=12)
    ax.set_ylabel(ylabel, fontname="Times New Roman")
    ax.tick_params(axis="x", labelrotation=20)
    for label in ax.get_xticklabels() + ax.get_yticklabels():
        label.set_fontname("Times New Roman")
    for b, v in zip(bars, values):
        ax.text(b.get_x() + b.get_width() / 2, b.get_height() + 0.15, str(v),
                ha="center", va="bottom", fontname="Times New Roman", fontsize=10)
    ax.set_ylim(0, max(values) * 1.25 if values else 1)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    fig.tight_layout()
    fig.savefig(path, bbox_inches="tight")
    plt.close(fig)
    print("chart", path.name)


def pie_chart(path, title, labels, values):
    fig, ax = plt.subplots(figsize=(7.2, 5.0), dpi=140)
    colors = ["#1F4E79", "#70AD47", "#ED7D31", "#5B9BD5", "#C00000"]
    ax.pie(values, labels=labels, autopct="%1.1f%%", colors=colors[: len(labels)],
           textprops={"fontname": "Times New Roman", "fontsize": 10})
    ax.set_title(title, fontsize=13, fontname="Times New Roman")
    fig.tight_layout()
    fig.savefig(path, bbox_inches="tight")
    plt.close(fig)
    print("pie", path.name)


# Prototype 1 — core baseline (no AI exams, no Meet, no auto parent attendance)
mock_screen(out / "fig_3_1_proto1_dashboard.png", "NAMS Prototype 1 — Admin Dashboard", [
    ("Enrollment", ["Register students", "Assign class/subject", "Set fee amount"]),
    ("Attendance", ["Manual daily marking", "Morning/afternoon", "Print sheet"]),
    ("Fees", ["Record payments", "Balance tracking", "Receipt print"]),
    ("Reports", ["Student list", "Fee summary", "Attendance %"]),
])
mock_screen(out / "fig_3_2_proto1_students.png", "NAMS Prototype 1 — Student Management", [
    ("Student Form", ["Name, ID, contacts", "Class & subject", "Teacher link"]),
    ("Class Setup", ["Capacity", "Schedule", "Subject fees"]),
    ("Teacher Profile", ["Fixed/percentage pay", "Assigned classes", "Contact info"]),
    ("Timetable", ["Weekly slots", "In-person only", "Room notes"]),
])
mock_screen(out / "fig_3_3_proto1_attendance_exam.png", "NAMS Prototype 1 — Attendance & Basic Exams", [
    ("Attendance", ["Teacher marks status", "Present / Absent / Late", "No parent auto-mark"]),
    ("Manual Exam", ["Create paper exam", "Enter scores", "Publish results"]),
    ("Results", ["Grade list", "Parent view (read)", "Print transcript"]),
    ("Messages", ["Staff announcements", "Manual notices", "No Meet link"]),
])
mock_screen(out / "fig_3_4_proto1_finance.png", "NAMS Prototype 1 — Fees & Payroll Baseline", [
    ("Payments", ["Collect tuition", "Partial payments", "Outstanding balance"]),
    ("Payroll", ["Percentage of fees", "Gross salary", "Basic tax estimate"]),
    ("Expenses", ["Record costs", "Category tags", "Monthly total"]),
    ("Dashboard KPIs", ["Students active", "Fees collected", "Attendance rate"]),
])

# Prototype 2 — AI exams, online meeting links, auto attendance for parents
mock_screen(out / "fig_3_5_proto2_ai_exam.png", "NAMS Prototype 2 — AI Exam Questions", [
    ("AI Generator", ["MCQ / T-F / Essay", "Topic & difficulty", "EN / FA / PS"]),
    ("Exam Builder", ["Auto-save questions", "Publish schedule", "Online Google Form"]),
    ("Teacher Review", ["Edit AI drafts", "Approve bank", "Print paper"]),
    ("Student Attempt", ["Timed online exam", "Submit answers", "Instant draft score"]),
], accent=(14, 116, 144))
mock_screen(out / "fig_3_6_proto2_meet_attendance.png", "NAMS Prototype 2 — Online Class & Auto Attendance", [
    ("Timetable", ["onlineLink field", "Hybrid delivery", "Session window"]),
    ("Auto Mark Job", ["onlineAutoMarkEnabled", "Create online records", "Notify parents"]),
    ("Parent Portal", ["Child attendance", "Daily report", "Push notification"]),
    ("Meet / Online", ["Class meeting URL", "Join from timetable", "Session log"]),
], accent=(14, 116, 144))
mock_screen(out / "fig_3_7_proto2_survey_impact.png", "NAMS Prototype 2 — Survey-Driven Features", [
    ("Survey Sample", ["20 academies", "18 requested features", "2 new (no opinion)"]),
    ("Priority Features", ["AI question bank", "Online class link", "Parent auto attendance"]),
    ("Adoption", ["18/20 = 90%", "Added in Sprint 2", "Validated in UAT"]),
    ("Outcome", ["Faster exam prep", "Remote class support", "Parent visibility"]),
], accent=(14, 116, 144))

# Prototype 3 — government tax quarterly/annual
mock_screen(out / "fig_3_8_proto3_tax_dashboard.png", "NAMS Prototype 3 — Academy Tax Dashboard", [
    ("BRT 2%", ["Tuition base", "Quarterly filter", "Hijri year"]),
    ("Employee Tax", ["Wage brackets", "0/2/10/20%", "Monthly/quarter"]),
    ("Annual Report", ["Nonprofit exemption", "Income tax 0%", "Export PDF"]),
    ("Compliance", ["Q1–Q4 totals", "Audit trail", "Print pack"]),
], accent=(153, 27, 27))
mock_screen(out / "fig_3_9_proto3_quarterly.png", "NAMS Prototype 3 — Quarterly Tax Report", [
    ("Filters", ["Hijri year", "Quarter Q1–Q4", "Branch scope"]),
    ("Calculations", ["Gross tuition", "BRT amount", "Net after tax"]),
    ("Payroll Link", ["Teacher salaries", "Withholding", "Net payable"]),
    ("Export", ["PDF report", "Excel summary", "Signed archive"]),
], accent=(153, 27, 27))
mock_screen(out / "fig_3_10_proto3_annual.png", "NAMS Prototype 3 — Annual Tax Package", [
    ("Annual Pack", ["Four quarters", "YTD BRT", "Salary tax YTD"]),
    ("Legal Basis", ["Education nonprofit", "0% income tax", "BRT on tuition"]),
    ("Owner View", ["Academy summary", "Branch compare", "Approval stamp"]),
    ("Audit", ["Who exported", "When printed", "Immutable log"]),
], accent=(153, 27, 27))
mock_screen(out / "fig_3_11_proto3_payroll_tax.png", "NAMS Prototype 3 — Payroll & Tax Sequence View", [
    ("Salary Record", ["Gross", "Tax", "Net"]),
    ("Tax Service", ["Afghanistan brackets", "Quarter rollup", "Annual rollup"]),
    ("Finance Entry", ["Auto post", "Reconcile", "Report"]),
    ("Stakeholders", ["Admin", "Owner", "Accountant"]),
], accent=(153, 27, 27))

# Use case simple diagram
uc = Image.new("RGB", (1200, 820), "white")
d = ImageDraw.Draw(uc)
d.text((320, 20), "Figure 3.12 — NAMS Use Case Diagram", fill=(15, 23, 42), font=font(24, True))
d.rounded_rectangle([250, 70, 950, 760], radius=16, outline=(100, 116, 139), width=2, fill=(248, 250, 252))
actors = [("Student", 40, 140), ("Parent", 40, 320), ("Teacher", 40, 500), ("Admin", 1020, 200), ("Super Admin", 1000, 420), ("Owner", 1020, 620)]
for name, x, y in actors:
    d.ellipse([x + 30, y, x + 70, y + 40], outline=(31, 78, 121), width=2)
    d.line([x + 50, y + 40, x + 50, y + 90], fill=(31, 78, 121), width=2)
    d.text((x, y + 100), name, fill=(15, 23, 42), font=font(14, True))
cases = [
    (400, 120, "Manage students"), (650, 120, "Manage teachers"),
    (400, 220, "Record attendance"), (650, 220, "Manage exams/AI"),
    (400, 320, "Collect fees"), (650, 320, "Payroll & tax"),
    (400, 420, "View results"), (650, 420, "Parent portal view"),
    (400, 520, "Messages/alerts"), (650, 520, "Online class link"),
    (525, 620, "Generate reports & dashboards"),
]
for x, y, label in cases:
    d.ellipse([x, y, x + 220, y + 55], outline=(31, 78, 121), width=2, fill="white")
    d.text((x + 18, y + 18), label, fill=(15, 23, 42), font=font(14))
uc.save(out / "fig_3_12_use_case.png")
print("use case ok")

# Methodology / Agile figure
ag = Image.new("RGB", (1100, 420), "white")
d = ImageDraw.Draw(ag)
d.text((280, 18), "Agile Scrum Development Cycles for NAMS", fill=(15, 23, 42), font=font(22, True))
boxes = [
    (40, 100, "Product\nBacklog", (37, 99, 235)),
    (250, 100, "Sprint\nPlanning", (22, 163, 74)),
    (460, 100, "Sprint\nBuild", (234, 88, 12)),
    (670, 100, "Review &\nUAT", (124, 58, 237)),
    (880, 100, "Retro &\nNext", (220, 38, 38)),
]
for x, y, label, color in boxes:
    d.rounded_rectangle([x, y, x + 170, y + 140], radius=12, fill=color)
    d.multiline_text((x + 35, y + 45), label, fill="white", font=font(18, True), align="center", spacing=6)
for i in range(4):
    x1 = boxes[i][0] + 170
    x2 = boxes[i + 1][0]
    d.line([x1 + 4, 170, x2 - 4, 170], fill=(71, 85, 105), width=3)
d.text((120, 300), "Prototype 1 (Core)  ->  Prototype 2 (AI/Meet/Auto-Attendance)  ->  Prototype 3 (Government Tax)", fill=(30, 41, 59), font=font(15))
d.text((180, 350), "Selected Agile practices: Product Backlog, Sprints, Sprint Review, Definition of Done", fill=(51, 65, 85), font=font(14))
ag.save(out / "fig_agile_scrum.png")

# Chapter 4 charts — 20 academies survey
bar_chart(out / "fig_4_1_respondent_role.png", "Figure 4.1 Respondent roles across surveyed academies",
          ["Admin", "Owner", "Teacher", "Branch Mgr", "Accountant"], [8, 5, 4, 2, 1])
pie_chart(out / "fig_4_2_academy_maturity.png", "Figure 4.2 Academy maturity of respondents (n=20)",
          ["Operating >1 year", "Newly started"], [18, 2])
bar_chart(out / "fig_4_3_current_tools.png", "Figure 4.3 Current management tools used",
          ["Paper/Excel", "WhatsApp only", "Partial software", "No system"], [9, 5, 4, 2])
bar_chart(out / "fig_4_4_feature_need.png", "Figure 4.4 Academies requesting Prototype-2 features",
          ["Need AI/Meet/\nAuto-attendance", "No specific\nopinion (new)"], [18, 2], ylabel="Academies")
bar_chart(out / "fig_4_5_priority.png", "Figure 4.5 Mean priority score of proposed features (1–5)",
          ["Fee/Payroll", "Attendance", "Exams/AI", "Parent portal", "Tax reports", "Messaging"],
          [4.7, 4.6, 4.5, 4.4, 4.3, 4.1], ylabel="Mean score")
bar_chart(out / "fig_4_6_impact.png", "Figure 4.6 Perceived impact if NAMS is adopted (agree count)",
          ["Less manual work", "Better transparency", "Faster reports", "Parent trust", "Tax readiness"],
          [19, 18, 17, 16, 15])
pie_chart(out / "fig_4_7_acceptance.png", "Figure 4.7 Likelihood of adopting NAMS (n=20)",
          ["Very likely", "Likely", "Neutral"], [12, 6, 2])

print("ASSETS_DIR", out)
