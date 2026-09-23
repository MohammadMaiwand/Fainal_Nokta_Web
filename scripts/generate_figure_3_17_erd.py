# -*- coding: utf-8 -*-
"""
Figure 3.17 — Crow's Foot ERD for NAMS (colored, international IE notation).
Symbols: || one · O| zero-or-one · |< one-or-many · O< zero-or-many
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import math

ROOT = Path(r"F:\Bcak_End_update_file-main\Nokta_V7 - Copy")
MONO = next(p for p in ROOT.iterdir() if p.is_dir() and (p / "exit.pdf").exists())
OUT = MONO / "Figure_3_17_NAMS_Entity_Relationship_Diagram.png"

W, H = 2200, 1600
img = Image.new("RGB", (W, H), "#FFFFFF")
d = ImageDraw.Draw(img)


def font(size, bold=False):
    cands = (
        [r"C:\Windows\Fonts\timesbd.ttf", r"C:\Windows\Fonts\arialbd.ttf"]
        if bold
        else [r"C:\Windows\Fonts\times.ttf", r"C:\Windows\Fonts\arial.ttf"]
    )
    for c in cands:
        if Path(c).exists():
            return ImageFont.truetype(c, size)
    return ImageFont.load_default()


DOM = {
    "identity": {"fill": "#EAF2F8", "head": "#1A5276", "edge": "#2874A6"},
    "academic": {"fill": "#E8F8F5", "head": "#0E6655", "edge": "#148F77"},
    "finance": {"fill": "#FEF5E7", "head": "#9A7D0A", "edge": "#B9770E"},
    "comms": {"fill": "#F5EEF8", "head": "#6C3483", "edge": "#8E44AD"},
}

entities = {
    "Role": ("identity", ["key UQ", "permissionKeys[]"], (160, 220), (150, 78)),
    "Branch": ("identity", ["code UQ", "managerId→User"], (160, 360), (150, 78)),
    "User": ("identity", ["email UQ", "role", "branchId?"], (400, 290), (160, 90)),
    "Student": ("identity", ["studentId UQ", "classId", "feeAmount"], (680, 200), (170, 90)),
    "Teacher": ("identity", ["userId UQ→User", "assignedClasses[]"], (680, 340), (170, 90)),
    "Parent": ("identity", ["userId UQ→User", "linkedStudents[]"], (680, 480), (170, 90)),
    "Family": ("identity", ["guardianEmail", "students[]"], (400, 480), (150, 78)),
    "Class": ("academic", ["classCode UQ", "capacity", "feeAmount"], (1000, 180), (160, 90)),
    "Subject": ("academic", ["code UQ", "classId", "feeAmount"], (1240, 180), (160, 90)),
    "Enrollment": ("academic", ["student+class+subject", "status", "UQ composite"], (1000, 340), (170, 90)),
    "Timetable": ("academic", ["classId", "teacherId", "onlineLink?"], (1240, 340), (160, 90)),
    "Attendance": ("academic", ["studentId", "status", "date/session"], (1000, 500), (160, 90)),
    "Exam": ("academic", ["classId", "subjectId", "schedule"], (1480, 220), (150, 90)),
    "Question": ("academic", ["examId", "type MCQ/TF/essay"], (1720, 220), (170, 90)),
    "Result": ("academic", ["examId", "studentId", "score"], (1480, 380), (150, 90)),
    "Payment": ("finance", ["student_fee", "amount AFN", "invoice#"], (1000, 700), (160, 90)),
    "SalaryRecord": ("finance", ["teacherId", "gross/tax/net"], (1240, 700), (160, 90)),
    "TaxRecord": ("finance", ["quarter/year", "BRT / wage tax"], (1480, 700), (160, 90)),
    "Expense": ("finance", ["category", "amount"], (1720, 700), (140, 78)),
    "Announcement": ("comms", ["senderId", "audience"], (400, 700), (160, 78)),
    "Notification": ("comms", ["recipients[]", "channel"], (680, 700), (160, 78)),
    "Message": ("comms", ["sender", "threadId?"], (160, 700), (140, 78)),
}


def draw_crows_foot(x, y, angle_deg, kind, color="#1C2833"):
    ang = math.radians(angle_deg)
    ux, uy = math.cos(ang), math.sin(ang)
    px, py = -uy, ux

    def P(dx, dy):
        return (x + dx * ux + dy * px, y + dx * uy + dy * py)

    def bar(dist=6):
        d.line([P(dist, -8), P(dist, 8)], fill=color, width=2)

    def circle(dist=3, r=5):
        cx, cy = P(dist + r, 0)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=color, width=2)

    def foot(dist=10):
        tip = P(dist, 0)
        d.line([tip, P(dist + 12, -9)], fill=color, width=2)
        d.line([tip, P(dist + 12, 0)], fill=color, width=2)
        d.line([tip, P(dist + 12, 9)], fill=color, width=2)

    if kind == "one":
        bar(4)
        bar(11)
    elif kind == "zero_one":
        circle(2)
        bar(16)
    elif kind == "one_many":
        bar(4)
        foot(10)
    elif kind == "zero_many":
        circle(2)
        foot(14)


def entity_box(name):
    dom, attrs, (cx, cy), (w, h) = entities[name]
    c = DOM[dom]
    x0, y0 = cx - w // 2, cy - h // 2
    d.rounded_rectangle([x0, y0, x0 + w, y0 + h], radius=8, fill=c["fill"], outline=c["edge"], width=2)
    d.rectangle([x0, y0, x0 + w, y0 + 24], fill=c["head"], outline=c["head"])
    d.rounded_rectangle([x0, y0, x0 + w, y0 + 24], radius=8, fill=c["head"], outline=c["head"])
    d.rectangle([x0, y0 + 12, x0 + w, y0 + 24], fill=c["head"])
    tw = d.textbbox((0, 0), name, font=font(13, True))[2]
    d.text((cx - tw // 2, y0 + 4), name, fill="white", font=font(13, True))
    ty = y0 + 30
    for a in attrs:
        d.text((x0 + 8, ty), "• " + a, fill="#1C2833", font=font(10))
        ty += 14
    return x0, y0, x0 + w, y0 + h, cx, cy


def side_point(box, side):
    x0, y0, x1, y1, cx, cy = box
    return {"L": (x0, cy), "R": (x1, cy), "T": (cx, y0), "B": (cx, y1)}[side]


def connect(a, b, a_side, b_side, a_card, b_card, label="", color="#34495E"):
    ax, ay = side_point(boxes[a], a_side)
    bx, by = side_point(boxes[b], b_side)
    ang_a = {"L": 180, "R": 0, "T": 270, "B": 90}[a_side]
    ang_b = {"L": 180, "R": 0, "T": 270, "B": 90}[b_side]

    def offset(x, y, ang, dist=22):
        r = math.radians(ang)
        return x + dist * math.cos(r), y + dist * math.sin(r)

    ax2, ay2 = offset(ax, ay, ang_a, 22)
    bx2, by2 = offset(bx, by, ang_b, 22)

    if a_side in ("L", "R") and b_side in ("L", "R"):
        mid_x = (ax2 + bx2) / 2
        path = [(ax2, ay2), (mid_x, ay2), (mid_x, by2), (bx2, by2)]
    elif a_side in ("T", "B") and b_side in ("T", "B"):
        mid_y = (ay2 + by2) / 2
        path = [(ax2, ay2), (ax2, mid_y), (bx2, mid_y), (bx2, by2)]
    else:
        path = [(ax2, ay2), (bx2, ay2), (bx2, by2)]

    for i in range(len(path) - 1):
        d.line([path[i], path[i + 1]], fill=color, width=2)

    draw_crows_foot(ax, ay, ang_a, a_card, color)
    draw_crows_foot(bx, by, ang_b, b_card, color)

    if label:
        mx = (ax2 + bx2) / 2
        my = (ay2 + by2) / 2 - 10
        bb = d.textbbox((0, 0), label, font=font(10))
        pad = 3
        d.rectangle(
            [mx - (bb[2] - bb[0]) / 2 - pad, my - pad, mx + (bb[2] - bb[0]) / 2 + pad, my + 13],
            fill="white",
            outline="#D5D8DC",
        )
        d.text((mx - (bb[2] - bb[0]) / 2, my), label, fill=color, font=font(10))


# ===== Title =====
d.rectangle([0, 0, W, 70], fill="#1B4F72")
d.text(
    (36, 12),
    "Figure 3.17  ·  Entity–Relationship Diagram (Crow’s Foot) — Nokta Academy Management System (NAMS)",
    fill="white",
    font=font(21, True),
)
d.text(
    (36, 42),
    "Conceptual data model · MongoDB / Mongoose collections · Domain colors · International Information Engineering (IE) cardinality symbols",
    fill="#D4E6F1",
    font=font(13),
)

# ===== Legend bar =====
d.rounded_rectangle([28, 84, 2172, 128], radius=6, fill="#F8F9F9", outline="#D5D8DC")
d.text((40, 96), "Domains:", fill="#1C2833", font=font(12, True))
x = 120
for label, color in [
    ("Identity & Organization", DOM["identity"]["head"]),
    ("Academic Delivery", DOM["academic"]["head"]),
    ("Finance · Payroll · Tax", DOM["finance"]["head"]),
    ("Communication", DOM["comms"]["head"]),
]:
    d.rounded_rectangle([x, 94, x + 16, 112], radius=3, fill=color)
    d.text((x + 22, 96), label, fill="#1C2833", font=font(12))
    x += 230

d.text((1120, 96), "Cardinality:", fill="#1C2833", font=font(12, True))
# mini symbols drawn after we have space — use simple drawn legend
lx = 1230
for kind, lab in [("one", "1  ||"), ("zero_one", "0..1  O|"), ("one_many", "1..*  |<"), ("zero_many", "0..*  O<")]:
    draw_crows_foot(lx, 104, 0, kind)
    d.text((lx + 26, 96), lab, fill="#5D6D7E", font=font(11))
    lx += 200

# Domain section labels
d.text((90, 150), "IDENTITY & ORGANIZATION", fill="#1A5276", font=font(14, True))
d.text((980, 145), "ACADEMIC DELIVERY & ASSESSMENT", fill="#0E6655", font=font(14, True))
d.text((120, 640), "COMMUNICATION", fill="#6C3483", font=font(14, True))
d.text((1000, 640), "FINANCE · PAYROLL · TAX", fill="#9A7D0A", font=font(14, True))

# Draw entities
boxes = {n: entity_box(n) for n in entities}

# Relationships
connect("Role", "User", "R", "L", "one", "zero_many", "assigns", "#2874A6")
connect("Branch", "User", "R", "L", "one", "zero_many", "employs", "#2874A6")
connect("User", "Student", "R", "L", "one", "zero_one", "1:0..1 profile", "#1A5276")
connect("User", "Teacher", "R", "L", "one", "zero_one", "1:0..1 profile", "#1A5276")
connect("User", "Parent", "R", "L", "one", "zero_one", "1:0..1 profile", "#1A5276")
connect("Family", "Student", "R", "L", "one", "zero_many", "belongs", "#2874A6")
connect("Parent", "Student", "T", "B", "zero_many", "zero_many", "FamilyLink M:N", "#6C3483")

connect("Student", "Enrollment", "R", "L", "one", "zero_many", "registers", "#0E6655")
connect("Class", "Enrollment", "B", "T", "one", "zero_many", "has", "#148F77")
connect("Subject", "Enrollment", "B", "T", "one", "zero_many", "", "#148F77")
connect("Class", "Subject", "R", "L", "one", "zero_many", "offers", "#0E6655")
connect("Class", "Timetable", "R", "L", "one", "zero_many", "schedules", "#148F77")
connect("Teacher", "Timetable", "R", "L", "zero_one", "zero_many", "teaches", "#0E6655")
connect("Subject", "Timetable", "B", "T", "one", "zero_many", "", "#148F77")
connect("Student", "Attendance", "B", "T", "one", "zero_many", "marked", "#0E6655")
connect("Class", "Attendance", "B", "T", "one", "zero_many", "", "#148F77")
connect("Class", "Exam", "R", "L", "one", "zero_many", "assesses", "#0E6655")
connect("Subject", "Exam", "R", "L", "one", "zero_many", "", "#148F77")
connect("Exam", "Question", "R", "L", "one", "zero_many", "contains", "#0E6655")
connect("Exam", "Result", "B", "T", "one", "zero_many", "produces", "#148F77")
connect("Student", "Result", "R", "L", "one", "zero_many", "earns", "#0E6655")

connect("Student", "Payment", "B", "T", "one", "zero_many", "pays fee", "#B9770E")
connect("Enrollment", "Payment", "B", "T", "zero_one", "zero_many", "linked", "#9A7D0A")
connect("Teacher", "SalaryRecord", "B", "T", "one", "zero_many", "earns", "#B9770E")
connect("Payment", "SalaryRecord", "R", "L", "zero_many", "zero_many", "commission", "#9A7D0A")
connect("SalaryRecord", "TaxRecord", "R", "L", "one", "one", "withholds", "#B9770E")
connect("Branch", "Expense", "B", "L", "one", "zero_many", "incurs", "#9A7D0A")

connect("User", "Announcement", "B", "T", "one", "zero_many", "posts", "#8E44AD")
connect("User", "Notification", "B", "T", "one", "zero_many", "alerts", "#6C3483")
connect("User", "Message", "B", "T", "one", "zero_many", "sends", "#8E44AD")

# Footer notes
d.rounded_rectangle([28, 1485, 2172, 1580], radius=10, fill="#FEF9E7", outline="#F5B041", width=2)
d.text((44, 1494), "International Crow’s Foot / Information Engineering (IE) notation:", fill="#B9770E", font=font(13, True))
d.text(
    (44, 1516),
    "•  ||  exactly one    ·    O|  zero or one (optional)    ·    |<  one or many    ·    O<  zero or many (crow’s foot = “many”).",
    fill="#1C2833",
    font=font(12),
)
d.text(
    (44, 1536),
    "• Colored entity headers = domain. PK = MongoDB ObjectId (_id). UQ = unique business key. ? = optional reference. M:N via FamilyLink / arrays.",
    fill="#1C2833",
    font=font(12),
)
d.text(
    (44, 1556),
    "• Aligned with NAMS Mongoose models: Student, Enrollment, Attendance, Exam/Question/Result, Payment, SalaryRecord, Tax. Relationships are application-level ObjectId refs.",
    fill="#5D6D7E",
    font=font(12),
)

img.save(OUT, "PNG", optimize=True)
print("SAVED", str(OUT).encode("unicode_escape").decode())
print("BYTES", OUT.stat().st_size, "DIM", img.size)
