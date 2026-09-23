# -*- coding: utf-8 -*-
"""
Professional UML 2.x sequence diagram for NAMS
Figure 3.13 — Student Enrollment and Fee Payment Flow
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(r"F:\Bcak_End_update_file-main\Nokta_V7 - Copy")
MONO = next(p for p in ROOT.iterdir() if p.is_dir() and (p / "exit.pdf").exists())
OUT = MONO / "Figure_3_13_Student_Enrollment_and_Fee_Payment_Sequence.png"


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


W, H = 1500, 1120
img = Image.new("RGB", (W, H), "#FFFFFF")
d = ImageDraw.Draw(img)

NAVY = "#1B4F72"
BLUE = "#2874A6"
TEAL = "#117A65"
ORANGE = "#B9770E"
PURPLE = "#6C3483"
GRAY = "#5D6D7E"
LINE = "#1C2833"
LIGHT = "#EBF5FB"
BOX_BG = "#FBFCFC"
FRAG = "#D5F5E3"
FRAG_B = "#196F3D"
ACT_FILL = "#FCF3CF"
ACT_EDGE = "#B7950B"

participants = [
    ("admin", "Administrator", "«actor»", "#1A5276", 100),
    ("ui", "React Web UI", "«boundary»", BLUE, 340),
    ("auth", "Auth / RBAC", "«control»", PURPLE, 580),
    ("svc", "Student Service", "«control»", TEAL, 840),
    ("pay", "Payment Service", "«control»", ORANGE, 1100),
    ("db", "MongoDB", "«entity»", NAVY, 1360),
]

# Title
d.rectangle([0, 0, W, 68], fill=NAVY)
d.text((36, 14), "Figure 3.13  ·  Sequence Diagram: Student Enrollment and Fee Payment Flow", fill="white", font=font(22, True))
d.text((36, 42), "Nokta Academy Management System (NAMS)  —  UML 2.x  ·  Aligned with StudentService.create() and Payment workflow", fill="#D6EAF8", font=font(13))

# Legend
d.rounded_rectangle([30, 82, 1470, 122], radius=6, fill=LIGHT, outline="#AED6F1", width=1)
d.text((44, 92), "Notation:", fill=NAVY, font=font(12, True))
d.line([130, 102, 175, 102], fill=LINE, width=2)
d.polygon([(175, 102), (167, 98), (167, 106)], fill=LINE)
d.text((182, 94), "Call", fill=GRAY, font=font(12))
for x in range(250, 295, 6):
    d.line([x, 102, min(x + 3, 295), 102], fill=BLUE, width=2)
d.polygon([(295, 102), (287, 98), (287, 106)], fill=BLUE)
d.text((302, 94), "Return", fill=GRAY, font=font(12))
d.rectangle([390, 94, 402, 110], fill=ACT_FILL, outline=ACT_EDGE)
d.text((410, 94), "Activation", fill=GRAY, font=font(12))
d.rectangle([520, 90, 640, 114], outline=FRAG_B, fill=FRAG)
d.text((528, 94), "opt [condition]", fill=FRAG_B, font=font(11, True))
d.text((660, 94), "Optional fragment", fill=GRAY, font=font(12))
d.text((980, 94), "Persistence: Student · User · Enrollment · Payment · Family", fill=NAVY, font=font(12, True))


def head_box(x, title, stereo, color):
    w, h = 148, 70
    d.rounded_rectangle([x - w // 2, 140, x + w // 2, 140 + h], radius=8, fill=BOX_BG, outline=color, width=2)
    tw = d.textbbox((0, 0), stereo, font=font(11))[2]
    d.text((x - tw // 2, 148), stereo, fill=color, font=font(11))
    lines = title.split("\n") if "\n" in title else [title]
    # wrap long titles
    if len(title) > 16 and " " in title and "\n" not in title:
        parts = title.split(" ", 1)
        lines = parts
    ty = 168
    for line in lines:
        bb = d.textbbox((0, 0), line, font=font(13, True))
        d.text((x - (bb[2] - bb[0]) // 2, ty), line, fill=LINE, font=font(13, True))
        ty += 16


for p in participants:
    head_box(p[4], p[1], p[2], p[3])

LIFE_TOP = 220
LIFE_BOT = 1020
X = {p[0]: p[4] for p in participants}

for p in participants:
    x = p[4]
    y = LIFE_TOP
    while y < LIFE_BOT:
        d.line([x, y, x, min(y + 7, LIFE_BOT)], fill="#D5D8DC", width=2)
        y += 12


def activation(x, y1, y2):
    d.rectangle([x - 8, y1, x + 8, y2], fill=ACT_FILL, outline=ACT_EDGE, width=1)


def call(x1, x2, y, label, color=LINE):
    d.line([x1 + (8 if x2 > x1 else -8), y, x2 - (8 if x2 > x1 else -8), y], fill=color, width=2)
    if x2 > x1:
        tip = x2 - 8
        d.polygon([(tip, y), (tip - 10, y - 5), (tip - 10, y + 5)], fill=color)
        d.text((x1 + 14, y - 17), label, fill=color, font=font(12))
    else:
        tip = x2 + 8
        d.polygon([(tip, y), (tip + 10, y - 5), (tip + 10, y + 5)], fill=color)
        d.text((x2 + 14, y - 17), label, fill=color, font=font(12))


def ret(x1, x2, y, label, color=BLUE):
    # x1 = from, x2 = to
    left, right = (x2, x1) if x1 > x2 else (x1, x2)
    x = left + 8
    end = right - 8
    while x < end:
        d.line([x, y, min(x + 4, end), y], fill=color, width=2)
        x += 7
    if x2 < x1:  # returning left
        tip = x2 + 8
        d.polygon([(tip, y), (tip + 9, y - 4), (tip + 9, y + 4)], fill=color)
        d.text((x2 + 16, y - 16), label, fill=color, font=font(11))
    else:
        tip = x2 - 8
        d.polygon([(tip, y), (tip - 9, y - 4), (tip - 9, y + 4)], fill=color)
        d.text((x1 + 14, y - 16), label, fill=color, font=font(11))


# Activations
activation(X["ui"], 248, 980)
activation(X["auth"], 295, 350)
activation(X["svc"], 340, 960)
activation(X["pay"], 700, 840)
activation(X["db"], 385, 920)

y = 260
G = 46

call(X["admin"], X["ui"], y, "1: Enter student profile, class, subject, teacher, fee / paidAmount", NAVY)
y += G
call(X["ui"], X["auth"], y, "2: POST /api/students  (Authorization: Bearer JWT)", PURPLE)
y += G
call(X["auth"], X["svc"], y, "3: authorize(admin | branch_manager) → StudentService.create()", TEAL)
y += G
call(X["svc"], X["db"], y, "4: assertEnrollmentLinksMatch(); resolveFeeAmount(class, subject)", NAVY)
y += 38
ret(X["db"], X["svc"], y, "feeAmount + link validation OK", BLUE)
y += G
call(X["svc"], X["db"], y, "5: insert Student, User(role=student), Family / ParentProfile / FamilyLink", NAVY)
y += 38
ret(X["db"], X["svc"], y, "studentId, userId, familyId", BLUE)
y += G
call(X["svc"], X["db"], y, "6: Enrollment.create { student, class, subject, teacher, status: active }", TEAL)
y += 38
ret(X["db"], X["svc"], y, "enrollmentId", BLUE)
y += 28

# opt fragment
ft = y
fb = y + 195
d.rounded_rectangle([X["svc"] - 55, ft, X["db"] + 70, fb], radius=6, outline=FRAG_B, width=2)
d.rectangle([X["svc"] - 55, ft, X["svc"] + 145, ft + 22], fill=FRAG, outline=FRAG_B)
d.text((X["svc"] - 48, ft + 3), "opt  [paidAmount > 0]", fill=FRAG_B, font=font(12, True))

y = ft + 40
call(X["svc"], X["pay"], y, "7: create initial Payment (paymentFor = student_fee, AFN)", ORANGE)
y += 42
call(X["pay"], X["db"], y, "8: generateInvoiceNumber(); Payment.create { status: completed }", NAVY)
y += 38
ret(X["db"], X["pay"], y, "invoiceNumber, referenceNumber", BLUE)
y += 38
ret(X["pay"], X["svc"], y, "payment saved; remainingBalance = fee − paid", ORANGE)

y = fb + 28
ret(X["svc"], X["ui"], y, "9: { student, enrollment, feeAmount, remainingBalance, receipt?}", TEAL)
y += G
ret(X["ui"], X["admin"], y, "10: Display success + printable fee receipt / outstanding balance", NAVY)

# Footer boxes under lifelines
for p in participants:
    x = p[4]
    d.rounded_rectangle([x - 60, LIFE_BOT + 4, x + 60, LIFE_BOT + 28], radius=4, fill=BOX_BG, outline=p[3], width=1)
    name = p[1]
    bb = d.textbbox((0, 0), name, font=font(10, True))
    d.text((x - (bb[2] - bb[0]) // 2, LIFE_BOT + 9), name, fill=p[3], font=font(10, True))

# Result note
d.rounded_rectangle([30, 1055, 1470, 1105], radius=8, fill="#FEF9E7", outline="#F5B041", width=2)
d.text((44, 1062), "Main result:", fill=ORANGE, font=font(13, True))
d.text(
    (140, 1062),
    "Valid enrollment links the student to class/subject/teacher and sets feeAmount / remainingBalance;",
    fill=LINE,
    font=font(13),
)
d.text(
    (140, 1082),
    "optional initial Payment starts fee collection used later by payroll commission and debt workflows.  Source: backend/src/services/studentService.ts",
    fill=GRAY,
    font=font(12),
)

img.save(OUT, "PNG", optimize=True)
print("SAVED", str(OUT).encode("unicode_escape").decode())
print("BYTES", OUT.stat().st_size)
print("DIM", img.size)
