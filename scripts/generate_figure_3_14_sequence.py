# -*- coding: utf-8 -*-
"""
Professional UML 2.x sequence diagram for NAMS
Figure 3.14 — Attendance and Examination Flow
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(r"F:\Bcak_End_update_file-main\Nokta_V7 - Copy")
MONO = next(p for p in ROOT.iterdir() if p.is_dir() and (p / "exit.pdf").exists())
OUT = MONO / "Figure_3_14_Attendance_and_Examination_Sequence.png"


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


W, H = 1580, 1280
img = Image.new("RGB", (W, H), "#FFFFFF")
d = ImageDraw.Draw(img)

NAVY = "#1B4F72"
BLUE = "#2874A6"
TEAL = "#117A65"
ORANGE = "#B9770E"
PURPLE = "#6C3483"
RED = "#922B21"
GRAY = "#5D6D7E"
LINE = "#1C2833"
LIGHT = "#EBF5FB"
BOX_BG = "#FBFCFC"
FRAG_A = "#D6EAF8"
FRAG_A_B = "#1A5276"
FRAG_E = "#FDEBD0"
FRAG_E_B = "#B9770E"
FRAG_O = "#D5F5E3"
FRAG_O_B = "#196F3D"
ACT_FILL = "#FCF3CF"
ACT_EDGE = "#B7950B"

participants = [
    ("teacher", "Teacher", "«actor»", "#1A5276", 90),
    ("ui", "Web / Mobile UI", "«boundary»", BLUE, 300),
    ("auth", "Auth / RBAC", "«control»", PURPLE, 520),
    ("att", "Attendance\nService", "«control»", TEAL, 760),
    ("exam", "Exam Service", "«control»", ORANGE, 1000),
    ("print", "Print / PDF", "«control»", RED, 1220),
    ("db", "MongoDB", "«entity»", NAVY, 1440),
]

# Title
d.rectangle([0, 0, W, 68], fill=NAVY)
d.text((32, 12), "Figure 3.14  ·  Sequence Diagram: Attendance and Examination Flow", fill="white", font=font(22, True))
d.text(
    (32, 40),
    "Nokta Academy Management System (NAMS)  —  UML 2.x  ·  attendance.routes + exams.routes + Question / Print workflow",
    fill="#D6EAF8",
    font=font(13),
)

# Legend
d.rounded_rectangle([28, 80, 1552, 118], radius=6, fill=LIGHT, outline="#AED6F1")
d.text((40, 90), "Notation:", fill=NAVY, font=font(12, True))
d.line([120, 100, 160, 100], fill=LINE, width=2)
d.polygon([(160, 100), (152, 96), (152, 104)], fill=LINE)
d.text((168, 92), "Call", fill=GRAY, font=font(12))
for x in range(230, 270, 6):
    d.line([x, 100, min(x + 3, 270), 100], fill=BLUE, width=2)
d.polygon([(270, 100), (262, 96), (262, 104)], fill=BLUE)
d.text((278, 92), "Return", fill=GRAY, font=font(12))
d.rectangle([360, 92, 372, 108], fill=ACT_FILL, outline=ACT_EDGE)
d.text((380, 92), "Activation", fill=GRAY, font=font(12))
d.rectangle([490, 88, 620, 112], fill=FRAG_A, outline=FRAG_A_B)
d.text((498, 92), "sd Attendance", fill=FRAG_A_B, font=font(11, True))
d.rectangle([640, 88, 760, 112], fill=FRAG_E, outline=FRAG_E_B)
d.text((648, 92), "sd Examination", fill=FRAG_E_B, font=font(11, True))
d.rectangle([780, 88, 900, 112], fill=FRAG_O, outline=FRAG_O_B)
d.text((788, 92), "opt [AI enabled]", fill=FRAG_O_B, font=font(11, True))
d.text((980, 92), "Types: present/absent/late/excused · MCQ / T-F / descriptive", fill=NAVY, font=font(12, True))


def head_box(x, title, stereo, color):
    w, h = 140, 72
    d.rounded_rectangle([x - w // 2, 135, x + w // 2, 135 + h], radius=8, fill=BOX_BG, outline=color, width=2)
    tw = d.textbbox((0, 0), stereo, font=font(11))[2]
    d.text((x - tw // 2, 142), stereo, fill=color, font=font(11))
    lines = title.split("\n")
    ty = 162
    for line in lines:
        bb = d.textbbox((0, 0), line, font=font(12, True))
        d.text((x - (bb[2] - bb[0]) // 2, ty), line, fill=LINE, font=font(12, True))
        ty += 15


for p in participants:
    head_box(p[4], p[1], p[2], p[3])

LIFE_TOP = 218
LIFE_BOT = 1165
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
        d.text((x1 + 12, y - 17), label, fill=color, font=font(11))
    else:
        tip = x2 + 8
        d.polygon([(tip, y), (tip + 10, y - 5), (tip + 10, y + 5)], fill=color)
        d.text((x2 + 12, y - 17), label, fill=color, font=font(11))


def ret(x1, x2, y, label, color=BLUE):
    left, right = (min(x1, x2) + 8, max(x1, x2) - 8)
    x = left
    while x < right:
        d.line([x, y, min(x + 4, right), y], fill=color, width=2)
        x += 7
    if x2 < x1:
        tip = x2 + 8
        d.polygon([(tip, y), (tip + 9, y - 4), (tip + 9, y + 4)], fill=color)
        d.text((x2 + 14, y - 15), label, fill=color, font=font(11))
    else:
        tip = x2 - 8
        d.polygon([(tip, y), (tip - 9, y - 4), (tip - 9, y + 4)], fill=color)
        d.text((x1 + 12, y - 15), label, fill=color, font=font(11))


# Activations
activation(X["ui"], 245, 1135)
activation(X["auth"], 290, 380)
activation(X["att"], 330, 620)
activation(X["exam"], 680, 1000)
activation(X["print"], 980, 1110)
activation(X["db"], 360, 1100)

# ===== sd Attendance =====
att_top, att_bot = 240, 630
d.rounded_rectangle([X["teacher"] - 50, att_top, X["db"] + 55, att_bot], radius=6, outline=FRAG_A_B, width=2)
d.rectangle([X["teacher"] - 50, att_top, X["teacher"] + 130, att_top + 22], fill=FRAG_A, outline=FRAG_A_B)
d.text((X["teacher"] - 42, att_top + 3), "sd  Attendance marking", fill=FRAG_A_B, font=font(12, True))

y = att_top + 40
G = 42

call(X["teacher"], X["ui"], y, "1: Select class, subject, session date / period", NAVY)
y += G
call(X["ui"], X["auth"], y, "2: GET roster  (Authorization: Bearer JWT)", PURPLE)
y += G
call(X["auth"], X["att"], y, "3: authorize(teacher) + verify assigned timetable/class", TEAL)
y += G
call(X["att"], X["db"], y, "4: load Enrollment for class/subject → student roster", NAVY)
y += 36
ret(X["db"], X["att"], y, "enrolled students list", BLUE)
y += 34
ret(X["att"], X["ui"], y, "roster + previous marks (if any)", TEAL)
y += 34
ret(X["ui"], X["teacher"], y, "display attendance sheet", NAVY)
y += G
call(X["teacher"], X["ui"], y, "5: Submit statuses {present | absent | late | excused}", NAVY)
y += G
call(X["ui"], X["att"], y, "6: POST /api/attendance/mark  (source: teacher_marked)", TEAL)
y += G
call(X["att"], X["db"], y, "7: upsert Attendance records {studentId, classId, date, status}", NAVY)
y += 36
ret(X["db"], X["att"], y, "saved attendance ids", BLUE)
y += 34
ret(X["att"], X["ui"], y, "summary counts (present/absent/late…)", TEAL)

# ===== sd Examination =====
ex_top, ex_bot = 655, 1145
d.rounded_rectangle([X["teacher"] - 50, ex_top, X["db"] + 55, ex_bot], radius=6, outline=FRAG_E_B, width=2)
d.rectangle([X["teacher"] - 50, ex_top, X["teacher"] + 145, ex_top + 22], fill=FRAG_E, outline=FRAG_E_B)
d.text((X["teacher"] - 42, ex_top + 3), "sd  Examination & print", fill=FRAG_E_B, font=font(12, True))

y = ex_top + 40
call(X["teacher"], X["ui"], y, "8: Create exam metadata (title, class, subject, schedule, delivery mode)", NAVY)
y += G
call(X["ui"], X["auth"], y, "9: POST /api/exams  (JWT teacher/admin)", PURPLE)
y += 36
call(X["auth"], X["exam"], y, "10: authorize → ExamService.create()", ORANGE)
y += G
call(X["exam"], X["db"], y, "11: store Exam document", NAVY)
y += 34
ret(X["db"], X["exam"], y, "examId", BLUE)

# opt AI
opt_top = y + 18
opt_bot = opt_top + 130
d.rounded_rectangle([X["exam"] - 40, opt_top, X["db"] + 45, opt_bot], radius=5, outline=FRAG_O_B, width=2)
d.rectangle([X["exam"] - 40, opt_top, X["exam"] + 175, opt_top + 20], fill=FRAG_O, outline=FRAG_O_B)
d.text((X["exam"] - 32, opt_top + 2), "opt  [AI question generation]", fill=FRAG_O_B, font=font(11, True))

y = opt_top + 34
call(X["ui"], X["exam"], y, "12: POST /api/exams/ai/generate-questions  (MCQ / T-F / essay)", ORANGE)
y += 38
call(X["exam"], X["db"], y, "13: Question.create drafts (editable by teacher)", NAVY)
y += 34
ret(X["db"], X["exam"], y, "questionIds (draft bank)", BLUE)

y = opt_bot + 24
call(X["teacher"], X["ui"], y, "14: Add/edit typed questions; publish exam", NAVY)
y += G
call(X["ui"], X["exam"], y, "15: save/publish questions  (descriptive · MCQ · true/false)", ORANGE)
y += 36
call(X["exam"], X["db"], y, "16: validate & persist Question set linked to examId", NAVY)
y += 34
ret(X["db"], X["exam"], y, "exam ready", BLUE)
y += G
call(X["teacher"], X["ui"], y, "17: Request printable question paper", NAVY)
y += G
call(X["ui"], X["print"], y, "18: generate exam PDF / print preview", RED)
y += 36
call(X["print"], X["db"], y, "19: read stored Exam + Questions", NAVY)
y += 34
ret(X["db"], X["print"], y, "exam content payload", BLUE)
y += 34
ret(X["print"], X["ui"], y, "PDF / print preview", RED)
y += 34
ret(X["ui"], X["teacher"], y, "20: Display / download printable paper", NAVY)

# Footer lifeline caps
for p in participants:
    x = p[4]
    d.rounded_rectangle([x - 58, LIFE_BOT + 2, x + 58, LIFE_BOT + 26], radius=4, fill=BOX_BG, outline=p[3], width=1)
    name = p[1].split("\n")[0]
    bb = d.textbbox((0, 0), name, font=font(10, True))
    d.text((x - (bb[2] - bb[0]) // 2, LIFE_BOT + 7), name, fill=p[3], font=font(10, True))

# Result note
d.rounded_rectangle([28, 1200, 1552, 1265], radius=8, fill="#FEF9E7", outline="#F5B041", width=2)
d.text((42, 1208), "Main result:", fill=ORANGE, font=font(13, True))
d.text(
    (140, 1208),
    "Attendance statuses are persisted per enrolled student; exams and question banks are stored once and reused for print/PDF.",
    fill=LINE,
    font=font(13),
)
d.text(
    (140, 1228),
    "AI generation is optional (Prototype 2) and always teacher-editable before publish.  Sources: attendance.routes.ts · exams.routes.ts · Question model",
    fill=GRAY,
    font=font(12),
)
d.text(
    (140, 1246),
    "Question types: descriptive, multiple-choice, true/false — printing uses the same stored examination content.",
    fill=GRAY,
    font=font(12),
)

img.save(OUT, "PNG", optimize=True)
print("SAVED", str(OUT).encode("unicode_escape").decode())
print("BYTES", OUT.stat().st_size)
print("DIM", img.size)
