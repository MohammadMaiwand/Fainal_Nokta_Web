# -*- coding: utf-8 -*-
from pathlib import Path
import fitz
from docx import Document

root = Path(r"F:\Bcak_End_update_file-main\Nokta_V7 - Copy")
mono = next(p for p in root.iterdir() if p.is_dir() and (p / "exit.pdf").exists())

doc = fitz.open(str(mono / "exit.pdf"))

# Full TOC pages 11-18 and chapter starts
ranges = [(11, 18), (45, 55), (105, 114), (115, 122), (121, 130)]
parts = []
for start, end in ranges:
    for i in range(start - 1, min(end, doc.page_count)):
        parts.append(f"\n===== PAGE {i+1} =====\n" + doc.load_page(i).get_text("text"))
(mono / "_exit_detail.txt").write_text("\n".join(parts), encoding="utf-8")
print("wrote detail")

# Extract all chapter 3 section titles more carefully
c3 = []
for i in range(44, min(105, doc.page_count)):
    t = doc.load_page(i).get_text("text")
    for line in t.splitlines():
        s = line.strip()
        if s.startswith("3.") or s.startswith("CHAPTER 3") or s.startswith("4.") or s.startswith("CHAPTER 4"):
            if len(s) < 120 and not s.startswith("3.0") :
                c3.append(f"p{i+1}: {s}")
(mono / "_exit_ch3_4_lines.txt").write_text("\n".join(c3), encoding="utf-8")
print("ch3/4 lines", len(c3))

# Word files excluding temp
for f in sorted(mono.glob("*.docx")):
    if f.name.startswith("~$"):
        continue
    w = Document(str(f))
    lines = []
    heads = []
    for para in w.paragraphs:
        t = para.text.strip()
        if not t:
            continue
        style = para.style.name if para.style else ""
        lines.append(f"[{style}] {t}")
        if "Heading" in style or t.upper().startswith("CHAPTER") or t.startswith("فصل"):
            heads.append(f"[{style}] {t}")
    safe = "".join(c if ord(c) < 128 else "_" for c in f.stem)[:40]
    (mono / f"_docx_{safe}.txt").write_text("\n".join(lines), encoding="utf-8")
    (mono / f"_heads_{safe}.txt").write_text("\n".join(heads), encoding="utf-8")
    print("OK", safe, "paras", len(lines), "heads", len(heads))
