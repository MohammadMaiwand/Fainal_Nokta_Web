# -*- coding: utf-8 -*-
"""
Figure 3.18 — Core Relational/Document Schema for NAMS
Colored domain groups · Crow's Foot cardinality · PK/FK readable layout
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import math

ROOT = Path(r"F:\Bcak_End_update_file-main\Nokta_V7 - Copy")
MONO = next(p for p in ROOT.iterdir() if p.is_dir() and (p / "exit.pdf").exists())
OUT = MONO / "Figure_3_18_NAMS_Core_Relational_Document_Schema.png"

W, H = 2400, 1750
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
    "identity": {"fill": "#EBF5FB", "head": "#1A5276", "edge": "#2980B9", "pk": "#1A5276", "fk": "#8E44AD"},
    "academic": {"fill": "#E8F8F5", "head": "#0E6655", "edge": "#16A085", "pk": "#0E6655", "fk": "#8E44AD"},
    "finance": {"fill": "#FEF9E7", "head": "#9A7D0A", "edge": "#D4AC0D", "pk": "#9A7D0A", "fk": "#8E44AD"},
    "comms": {"fill": "#F5EEF8", "head": "#6C3483", "edge": "#A569BD", "pk": "#6C3483", "fk": "#8E44AD"},
}

# name: (domain, fields[(name, kind)], (cx,cy), (w,h))
# kind: pk | fk | uq | attr
ENTS = {
    "roles": (
        "identity",
        [("_id ObjectId", "pk"), ("key String UQ", "uq"), ("permissionKeys[]", "attr")],
        (150, 250),
        (200, 100),
    ),
    "branches": (
        "identity",
        [("_id ObjectId", "pk"), ("code String UQ", "uq"), ("name", "attr"), ("managerId → users", "fk")],
        (150, 430),
        (210, 115),
    ),
    "users": (
        "identity",
        [
            ("_id ObjectId", "pk"),
            ("email String UQ", "uq"),
            ("role String", "attr"),
            ("branchId? → branches", "fk"),
            ("passwordHash", "attr"),
            ("status / createdAt", "attr"),
        ],
        (460, 320),
        (230, 145),
    ),
    "students": (
        "identity",
        [
            ("_id ObjectId", "pk"),
            ("studentId String UQ", "uq"),
            ("userId? / login", "fk"),
            ("classId → classes", "fk"),
            ("subjectId → subjects", "fk"),
            ("teacherId → users", "fk"),
            ("familyId → families", "fk"),
            ("feeAmount / remaining", "attr"),
        ],
        (820, 230),
        (240, 175),
    ),
    "teachers": (
        "identity",
        [
            ("_id ObjectId", "pk"),
            ("userId UQ → users", "fk"),
            ("teacherCode UQ", "uq"),
            ("salaryType", "attr"),
            ("percentageRate?", "attr"),
            ("assignedClassIds[]", "fk"),
        ],
        (820, 460),
        (240, 145),
    ),
    "parents": (
        "identity",
        [
            ("_id ObjectId", "pk"),
            ("userId UQ → users", "fk"),
            ("linkedStudentIds[]", "fk"),
        ],
        (460, 540),
        (220, 100),
    ),
    "families": (
        "identity",
        [("_id ObjectId", "pk"), ("guardianEmail", "attr"), ("students[] → students", "fk")],
        (150, 600),
        (210, 100),
    ),
    "classes": (
        "academic",
        [
            ("_id ObjectId", "pk"),
            ("classCode String UQ", "uq"),
            ("branchId? → branches", "fk"),
            ("name / capacity", "attr"),
            ("feeAmount", "attr"),
            ("assignedSubjects[]", "fk"),
            ("assignedTeachers[]", "fk"),
        ],
        (1180, 220),
        (240, 160),
    ),
    "subjects": (
        "academic",
        [
            ("_id ObjectId", "pk"),
            ("code String UQ", "uq"),
            ("classId → classes", "fk"),
            ("title", "attr"),
            ("feeAmount", "attr"),
            ("teacher? → users", "fk"),
        ],
        (1500, 220),
        (230, 145),
    ),
    "enrollments": (
        "academic",
        [
            ("_id ObjectId", "pk"),
            ("studentId → students", "fk"),
            ("classId → classes", "fk"),
            ("subjectId → subjects", "fk"),
            ("teacherId → users", "fk"),
            ("status / enrolledAt", "attr"),
            ("UQ(student,class,subject,year)", "uq"),
        ],
        (1180, 460),
        (260, 160),
    ),
    "attendance": (
        "academic",
        [
            ("_id ObjectId", "pk"),
            ("studentId → students", "fk"),
            ("classId → classes", "fk"),
            ("date / session", "attr"),
            ("status enum", "attr"),
            ("markedBy → users", "fk"),
        ],
        (1500, 460),
        (230, 145),
    ),
    "exams": (
        "academic",
        [
            ("_id ObjectId", "pk"),
            ("classId → classes", "fk"),
            ("subjectId → subjects", "fk"),
            ("teacherId → users", "fk"),
            ("title / schedule", "attr"),
            ("status / deliveryMode", "attr"),
        ],
        (1820, 220),
        (230, 145),
    ),
    "questions": (
        "academic",
        [
            ("_id ObjectId", "pk"),
            ("examId → exams", "fk"),
            ("type MCQ|TF|essay", "attr"),
            ("prompt / options", "attr"),
            ("correctAnswer?", "attr"),
        ],
        (2140, 220),
        (220, 130),
    ),
    "results": (
        "academic",
        [
            ("_id ObjectId", "pk"),
            ("examId → exams", "fk"),
            ("studentId → students", "fk"),
            ("score / grade", "attr"),
            ("feedback?", "attr"),
        ],
        (1820, 430),
        (230, 130),
    ),
    "payments": (
        "finance",
        [
            ("_id ObjectId", "pk"),
            ("studentId → students", "fk"),
            ("enrollmentId? → enrollments", "fk"),
            ("classId / subjectId / teacherId", "fk"),
            ("amount / currency AFN", "attr"),
            ("invoiceNumber UQ", "uq"),
            ("status / paidAt", "attr"),
        ],
        (1180, 760),
        (270, 160),
    ),
    "salary_records": (
        "finance",
        [
            ("_id ObjectId", "pk"),
            ("userId → users/teachers", "fk"),
            ("period (Hijri)", "attr"),
            ("grossSalary", "attr"),
            ("taxAmount / netSalary", "attr"),
            ("status", "attr"),
        ],
        (1540, 760),
        (250, 145),
    ),
    "tax_records": (
        "finance",
        [
            ("_id ObjectId", "pk"),
            ("salaryRecordId? → salary", "fk"),
            ("branchId? → branches", "fk"),
            ("quarter / year", "attr"),
            ("BRT / wage tax", "attr"),
        ],
        (1860, 760),
        (240, 130),
    ),
    "expenses": (
        "finance",
        [
            ("_id ObjectId", "pk"),
            ("branchId? → branches", "fk"),
            ("category / title", "attr"),
            ("amount / date", "attr"),
        ],
        (2140, 760),
        (220, 115),
    ),
    "announcements": (
        "comms",
        [
            ("_id ObjectId", "pk"),
            ("authorId → users", "fk"),
            ("audience / content", "attr"),
            ("publishedAt", "attr"),
        ],
        (460, 760),
        (230, 115),
    ),
    "notifications": (
        "comms",
        [
            ("_id ObjectId", "pk"),
            ("recipientIds[] → users", "fk"),
            ("type / content", "attr"),
            ("readAt?", "attr"),
        ],
        (780, 760),
        (230, 115),
    ),
    "audit_logs": (
        "comms",
        [
            ("_id ObjectId", "pk"),
            ("actor → users", "fk"),
            ("action / entityType", "attr"),
            ("entityId / time", "attr"),
        ],
        (150, 760),
        (220, 115),
    ),
}


def draw_crows_foot(x, y, angle_deg, kind, color="#1C2833"):
    ang = math.radians(angle_deg)
    ux, uy = math.cos(ang), math.sin(ang)
    px, py = -uy, ux

    def P(dx, dy):
        return (x + dx * ux + dy * px, y + dx * uy + dy * py)

    def bar(dist=6):
        d.line([P(dist, -7), P(dist, 7)], fill=color, width=2)

    def circle(dist=2, r=4.5):
        cx, cy = P(dist + r, 0)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=color, width=2)

    def foot(dist=9):
        tip = P(dist, 0)
        d.line([tip, P(dist + 11, -8)], fill=color, width=2)
        d.line([tip, P(dist + 11, 0)], fill=color, width=2)
        d.line([tip, P(dist + 11, 8)], fill=color, width=2)

    if kind == "one":
        bar(3)
        bar(10)
    elif kind == "zero_one":
        circle(1)
        bar(14)
    elif kind == "one_many":
        bar(3)
        foot(9)
    elif kind == "zero_many":
        circle(1)
        foot(13)


def draw_entity(name):
    dom, fields, (cx, cy), (w, h) = ENTS[name]
    c = DOM[dom]
    x0, y0 = cx - w // 2, cy - h // 2
    # body
    d.rounded_rectangle([x0, y0, x0 + w, y0 + h], radius=7, fill=c["fill"], outline=c["edge"], width=2)
    # header
    d.rectangle([x0, y0, x0 + w, y0 + 26], fill=c["head"])
    d.rounded_rectangle([x0, y0, x0 + w, y0 + 26], radius=7, fill=c["head"], outline=c["head"])
    d.rectangle([x0, y0 + 14, x0 + w, y0 + 26], fill=c["head"])
    tw = d.textbbox((0, 0), name, font=font(13, True))[2]
    d.text((cx - tw // 2, y0 + 5), name, fill="white", font=font(13, True))
    # separator under header
    d.line([x0 + 1, y0 + 26, x0 + w - 1, y0 + 26], fill=c["edge"], width=1)

    ty = y0 + 32
    for fname, kind in fields:
        if kind == "pk":
            tag, col, fbold = "PK", c["pk"], True
        elif kind == "fk":
            tag, col, fbold = "FK", c["fk"], False
        elif kind == "uq":
            tag, col, fbold = "UQ", "#117A65", True
        else:
            tag, col, fbold = "  ", "#2C3E50", False
        d.text((x0 + 6, ty), tag, fill=col, font=font(10, True))
        d.text((x0 + 32, ty), fname, fill="#1C2833", font=font(10, fbold))
        ty += 15
    return x0, y0, x0 + w, y0 + h, cx, cy


def side_point(box, side):
    x0, y0, x1, y1, cx, cy = box
    return {"L": (x0, cy), "R": (x1, cy), "T": (cx, y0), "B": (cx, y1)}[side]


def connect(a, b, a_side, b_side, a_card, b_card, label="", color="#5D6D7E"):
    ax, ay = side_point(boxes[a], a_side)
    bx, by = side_point(boxes[b], b_side)
    ang_a = {"L": 180, "R": 0, "T": 270, "B": 90}[a_side]
    ang_b = {"L": 180, "R": 0, "T": 270, "B": 90}[b_side]

    def offset(x, y, ang, dist=20):
        r = math.radians(ang)
        return x + dist * math.cos(r), y + dist * math.sin(r)

    ax2, ay2 = offset(ax, ay, ang_a)
    bx2, by2 = offset(bx, by, ang_b)

    if a_side in ("L", "R") and b_side in ("L", "R"):
        mid = (ax2 + bx2) / 2
        path = [(ax2, ay2), (mid, ay2), (mid, by2), (bx2, by2)]
    elif a_side in ("T", "B") and b_side in ("T", "B"):
        mid = (ay2 + by2) / 2
        path = [(ax2, ay2), (ax2, mid), (bx2, mid), (bx2, by2)]
    else:
        path = [(ax2, ay2), (bx2, ay2), (bx2, by2)]

    for i in range(len(path) - 1):
        d.line([path[i], path[i + 1]], fill=color, width=2)

    draw_crows_foot(ax, ay, ang_a, a_card, color)
    draw_crows_foot(bx, by, ang_b, b_card, color)

    if label:
        mx, my = (ax2 + bx2) / 2, (ay2 + by2) / 2 - 9
        bb = d.textbbox((0, 0), label, font=font(9))
        d.rectangle(
            [mx - (bb[2] - bb[0]) / 2 - 2, my - 1, mx + (bb[2] - bb[0]) / 2 + 2, my + 12],
            fill="white",
            outline="#E5E7E9",
        )
        d.text((mx - (bb[2] - bb[0]) / 2, my), label, fill=color, font=font(9))


# ===== Title =====
d.rectangle([0, 0, W, 72], fill="#1B4F72")
d.text(
    (36, 12),
    "Figure 3.18  ·  Core Relational / Document Schema — Nokta Academy Management System (NAMS)",
    fill="white",
    font=font(22, True),
)
d.text(
    (36, 42),
    "MongoDB collections with ObjectId references (application-level FK) · Crow’s Foot cardinality · PK / FK / UQ field tags",
    fill="#D4E6F1",
    font=font(13),
)

# Legend
d.rounded_rectangle([28, 86, 2372, 132], radius=6, fill="#F8F9F9", outline="#D5D8DC")
d.text((40, 98), "Domains:", fill="#1C2833", font=font(12, True))
x = 120
for lab, col in [
    ("Identity", DOM["identity"]["head"]),
    ("Academic", DOM["academic"]["head"]),
    ("Finance", DOM["finance"]["head"]),
    ("Ops / Comms", DOM["comms"]["head"]),
]:
    d.rounded_rectangle([x, 96, x + 16, 114], radius=3, fill=col)
    d.text((x + 22, 98), lab, fill="#1C2833", font=font(12))
    x += 150

d.text((780, 98), "Field tags:", fill="#1C2833", font=font(12, True))
d.text((870, 98), "PK", fill="#1A5276", font=font(12, True))
d.text((900, 98), "primary key (_id)", fill="#5D6D7E", font=font(12))
d.text((1060, 98), "FK", fill="#8E44AD", font=font(12, True))
d.text((1090, 98), "reference (ObjectId)", fill="#5D6D7E", font=font(12))
d.text((1280, 98), "UQ", fill="#117A65", font=font(12, True))
d.text((1310, 98), "unique business key", fill="#5D6D7E", font=font(12))

d.text((1520, 98), "Cardinality:", fill="#1C2833", font=font(12, True))
lx = 1630
for kind, lab in [("one", "|| 1"), ("zero_one", "O| 0..1"), ("one_many", "|< 1..*"), ("zero_many", "O< 0..*")]:
    draw_crows_foot(lx, 106, 0, kind)
    d.text((lx + 24, 98), lab, fill="#5D6D7E", font=font(11))
    lx += 160

# Section labels
d.text((80, 155), "IDENTITY & ACCESS", fill="#1A5276", font=font(14, True))
d.text((1150, 155), "ACADEMIC STRUCTURE · ENROLLMENT · ASSESSMENT", fill="#0E6655", font=font(14, True))
d.text((80, 700), "AUDIT & COMMUNICATION", fill="#6C3483", font=font(14, True))
d.text((1150, 700), "FINANCE · PAYROLL · TAX · EXPENSE", fill="#9A7D0A", font=font(14, True))

boxes = {n: draw_entity(n) for n in ENTS}

# Relationships — identity
connect("roles", "users", "R", "L", "one", "zero_many", "role policy", "#2980B9")
connect("branches", "users", "R", "L", "one", "zero_many", "branch scope", "#2980B9")
connect("users", "students", "R", "L", "one", "zero_one", "1:0..1", "#1A5276")
connect("users", "teachers", "R", "L", "one", "zero_one", "1:0..1", "#1A5276")
connect("users", "parents", "B", "T", "one", "zero_one", "1:0..1", "#1A5276")
connect("families", "students", "R", "L", "one", "zero_many", "family", "#2980B9")
connect("parents", "students", "R", "B", "zero_many", "zero_many", "link[]", "#8E44AD")

# Academic
connect("branches", "classes", "R", "L", "one", "zero_many", "", "#16A085")
connect("classes", "subjects", "R", "L", "one", "zero_many", "offers", "#0E6655")
connect("students", "enrollments", "R", "L", "one", "zero_many", "registers", "#0E6655")
connect("classes", "enrollments", "B", "T", "one", "zero_many", "has", "#16A085")
connect("subjects", "enrollments", "B", "T", "one", "zero_many", "", "#16A085")
connect("students", "attendance", "R", "L", "one", "zero_many", "marked", "#0E6655")
connect("classes", "attendance", "R", "L", "one", "zero_many", "", "#16A085")
connect("classes", "exams", "R", "L", "one", "zero_many", "assesses", "#0E6655")
connect("subjects", "exams", "R", "L", "one", "zero_many", "", "#16A085")
connect("exams", "questions", "R", "L", "one", "zero_many", "contains", "#0E6655")
connect("exams", "results", "B", "T", "one", "zero_many", "scores", "#16A085")
connect("students", "results", "R", "L", "one", "zero_many", "earns", "#0E6655")

# Finance
connect("students", "payments", "B", "T", "one", "zero_many", "pays", "#B9770E")
connect("enrollments", "payments", "B", "T", "zero_one", "zero_many", "linked", "#9A7D0A")
connect("teachers", "salary_records", "B", "T", "one", "zero_many", "payroll", "#B9770E")
connect("payments", "salary_records", "R", "L", "zero_many", "zero_many", "commission", "#9A7D0A")
connect("salary_records", "tax_records", "R", "L", "one", "zero_one", "tax", "#B9770E")
connect("branches", "expenses", "B", "L", "one", "zero_many", "incurs", "#9A7D0A")

# Comms
connect("users", "announcements", "B", "T", "one", "zero_many", "posts", "#8E44AD")
connect("users", "notifications", "B", "T", "one", "zero_many", "alerts", "#6C3483")
connect("users", "audit_logs", "B", "T", "one", "zero_many", "actions", "#8E44AD")

# Footer
d.rounded_rectangle([28, 1620, 2372, 1725], radius=10, fill="#FEF9E7", outline="#F5B041", width=2)
d.text((44, 1630), "Schema reading guide:", fill="#B9770E", font=font(13, True))
d.text(
    (44, 1652),
    "• Each box is a MongoDB collection. PK = _id (ObjectId). FK = application reference field (not DB-enforced). UQ = unique index / business key.",
    fill="#1C2833",
    font=font(12),
)
d.text(
    (44, 1672),
    "• Crow’s Foot ends show cardinality: || exactly one · O| optional one · |< mandatory many · O< optional many. Arrays ([] ) model M:N without physical junction tables where noted.",
    fill="#1C2833",
    font=font(12),
)
d.text(
    (44, 1692),
    "• Source alignment: backend Mongoose models (students, enrollments, attendance, exams/questions/results, payments, salary_records, tax, expenses). Companion to Figure 3.17 conceptual ERD.",
    fill="#5D6D7E",
    font=font(12),
)
d.text(
    (44, 1710),
    "• Main result: academic enrollment links students to classes/subjects; payments and salary/tax records reuse those references for financial transparency.",
    fill="#5D6D7E",
    font=font(12),
)

img.save(OUT, "PNG", optimize=True)
print("SAVED", str(OUT).encode("unicode_escape").decode())
print("BYTES", OUT.stat().st_size, "DIM", img.size)
