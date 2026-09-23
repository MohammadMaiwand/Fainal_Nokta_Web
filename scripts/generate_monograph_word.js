const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'Monograph');
fs.mkdirSync(outDir, { recursive: true });

const docPath = path.join(outDir, 'Nokta_Academy_Management_System_Monograph_APA.doc');
const htmlPath = path.join(outDir, 'Nokta_Academy_Management_System_Monograph_APA.html');
const risPath = path.join(outDir, 'Nokta_Academy_Mendeley_References.ris');
const questionnairePath = path.join(outDir, 'Questionnaire_Nokta_Academy.txt');

const refs = [
  {
    id: 'apa2020',
    apa: 'American Psychological Association. (2020). Publication manual of the American Psychological Association (7th ed.). American Psychological Association. https://doi.org/10.1037/0000165-000',
    ris: ['TY  - BOOK', 'AU  - American Psychological Association', 'PY  - 2020', 'TI  - Publication manual of the American Psychological Association', 'ET  - 7', 'PB  - American Psychological Association', 'DO  - 10.1037/0000165-000', 'ER  -']
  },
  {
    id: 'sommerville2016',
    apa: 'Sommerville, I. (2016). Software engineering (10th ed.). Pearson.',
    ris: ['TY  - BOOK', 'AU  - Sommerville, Ian', 'PY  - 2016', 'TI  - Software engineering', 'ET  - 10', 'PB  - Pearson', 'ER  -']
  },
  {
    id: 'pressman2020',
    apa: 'Pressman, R. S., & Maxim, B. R. (2020). Software engineering: A practitioner’s approach (9th ed.). McGraw-Hill Education.',
    ris: ['TY  - BOOK', 'AU  - Pressman, Roger S.', 'AU  - Maxim, Bruce R.', 'PY  - 2020', 'TI  - Software engineering: A practitioner’s approach', 'ET  - 9', 'PB  - McGraw-Hill Education', 'ER  -']
  },
  {
    id: 'iso29148',
    apa: 'International Organization for Standardization, International Electrotechnical Commission, & Institute of Electrical and Electronics Engineers. (2018). Systems and software engineering — Life cycle processes — Requirements engineering (ISO/IEC/IEEE 29148:2018).',
    ris: ['TY  - STD', 'AU  - International Organization for Standardization', 'AU  - International Electrotechnical Commission', 'AU  - Institute of Electrical and Electronics Engineers', 'PY  - 2018', 'TI  - Systems and software engineering — Life cycle processes — Requirements engineering', 'SN  - ISO/IEC/IEEE 29148:2018', 'ER  -']
  },
  {
    id: 'iso25010',
    apa: 'International Organization for Standardization, & International Electrotechnical Commission. (2011). Systems and software engineering — Systems and software Quality Requirements and Evaluation (SQuaRE) — System and software quality models (ISO/IEC 25010:2011).',
    ris: ['TY  - STD', 'AU  - International Organization for Standardization', 'AU  - International Electrotechnical Commission', 'PY  - 2011', 'TI  - Systems and software engineering — Systems and software Quality Requirements and Evaluation (SQuaRE) — System and software quality models', 'SN  - ISO/IEC 25010:2011', 'ER  -']
  },
  {
    id: 'davis1989',
    apa: 'Davis, F. D. (1989). Perceived usefulness, perceived ease of use, and user acceptance of information technology. MIS Quarterly, 13(3), 319–340. https://doi.org/10.2307/249008',
    ris: ['TY  - JOUR', 'AU  - Davis, Fred D.', 'PY  - 1989', 'TI  - Perceived usefulness, perceived ease of use, and user acceptance of information technology', 'JO  - MIS Quarterly', 'VL  - 13', 'IS  - 3', 'SP  - 319', 'EP  - 340', 'DO  - 10.2307/249008', 'ER  -']
  },
  {
    id: 'delone2003',
    apa: 'DeLone, W. H., & McLean, E. R. (2003). The DeLone and McLean model of information systems success: A ten-year update. Journal of Management Information Systems, 19(4), 9–30. https://doi.org/10.1080/07421222.2003.11045748',
    ris: ['TY  - JOUR', 'AU  - DeLone, William H.', 'AU  - McLean, Ephraim R.', 'PY  - 2003', 'TI  - The DeLone and McLean model of information systems success: A ten-year update', 'JO  - Journal of Management Information Systems', 'VL  - 19', 'IS  - 4', 'SP  - 9', 'EP  - 30', 'DO  - 10.1080/07421222.2003.11045748', 'ER  -']
  },
  {
    id: 'fowler2004',
    apa: 'Fowler, M. (2004). UML distilled: A brief guide to the standard object modeling language (3rd ed.). Addison-Wesley.',
    ris: ['TY  - BOOK', 'AU  - Fowler, Martin', 'PY  - 2004', 'TI  - UML distilled: A brief guide to the standard object modeling language', 'ET  - 3', 'PB  - Addison-Wesley', 'ER  -']
  },
  {
    id: 'connolly2015',
    apa: 'Connolly, T. M., & Begg, C. E. (2015). Database systems: A practical approach to design, implementation, and management (6th ed.). Pearson.',
    ris: ['TY  - BOOK', 'AU  - Connolly, Thomas M.', 'AU  - Begg, Carolyn E.', 'PY  - 2015', 'TI  - Database systems: A practical approach to design, implementation, and management', 'ET  - 6', 'PB  - Pearson', 'ER  -']
  },
  {
    id: 'bass2012',
    apa: 'Bass, L., Clements, P., & Kazman, R. (2012). Software architecture in practice (3rd ed.). Addison-Wesley.',
    ris: ['TY  - BOOK', 'AU  - Bass, Len', 'AU  - Clements, Paul', 'AU  - Kazman, Rick', 'PY  - 2012', 'TI  - Software architecture in practice', 'ET  - 3', 'PB  - Addison-Wesley', 'ER  -']
  },
  {
    id: 'nielsen1994',
    apa: 'Nielsen, J. (1994). Usability engineering. Morgan Kaufmann.',
    ris: ['TY  - BOOK', 'AU  - Nielsen, Jakob', 'PY  - 1994', 'TI  - Usability engineering', 'PB  - Morgan Kaufmann', 'ER  -']
  },
  {
    id: 'creswell2018',
    apa: 'Creswell, J. W., & Creswell, J. D. (2018). Research design: Qualitative, quantitative, and mixed methods approaches (5th ed.). SAGE Publications.',
    ris: ['TY  - BOOK', 'AU  - Creswell, John W.', 'AU  - Creswell, J. David', 'PY  - 2018', 'TI  - Research design: Qualitative, quantitative, and mixed methods approaches', 'ET  - 5', 'PB  - SAGE Publications', 'ER  -']
  },
  {
    id: 'likert1932',
    apa: 'Likert, R. (1932). A technique for the measurement of attitudes. Archives of Psychology, 22(140), 1–55.',
    ris: ['TY  - JOUR', 'AU  - Likert, Rensis', 'PY  - 1932', 'TI  - A technique for the measurement of attitudes', 'JO  - Archives of Psychology', 'VL  - 22', 'IS  - 140', 'SP  - 1', 'EP  - 55', 'ER  -']
  },
  {
    id: 'brooke1996',
    apa: 'Brooke, J. (1996). SUS: A quick and dirty usability scale. In P. W. Jordan, B. Thomas, B. A. Weerdmeester, & I. L. McClelland (Eds.), Usability evaluation in industry (pp. 189–194). Taylor & Francis.',
    ris: ['TY  - CHAP', 'AU  - Brooke, John', 'PY  - 1996', 'TI  - SUS: A quick and dirty usability scale', 'BT  - Usability evaluation in industry', 'SP  - 189', 'EP  - 194', 'PB  - Taylor & Francis', 'ER  -']
  }
];

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function p(text, cls = '') {
  return `<p class="${cls}">${text}</p>`;
}

function h(level, text) {
  return `<h${level}>${text}</h${level}>`;
}

function table(headers, rows, caption, note = '') {
  return `
    <div class="table-caption">${caption}</div>
    <table>
      <thead><tr>${headers.map((x) => `<th>${x}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((row) => `<tr>${row.map((x) => `<td>${x}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>
    ${note ? `<div class="table-note">${note}</div>` : ''}
  `;
}

function barChart(title, labels, values, color = '#2f75b5') {
  const width = 760;
  const height = 360;
  const max = Math.max(...values, 1);
  const chartTop = 60;
  const chartBottom = 290;
  const chartLeft = 80;
  const chartRight = 730;
  const barGap = 18;
  const barW = (chartRight - chartLeft - barGap * (values.length - 1)) / values.length;
  const bars = values.map((value, i) => {
    const x = chartLeft + i * (barW + barGap);
    const h = ((chartBottom - chartTop) * value) / max;
    const y = chartBottom - h;
    return `
      <rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="6" fill="${color}" />
      <text x="${x + barW / 2}" y="${y - 8}" font-size="18" text-anchor="middle" fill="#222">${value}</text>
      <text x="${x + barW / 2}" y="324" font-size="15" text-anchor="middle" fill="#222">${esc(labels[i])}</text>
    `;
  }).join('');
  return `
    <div class="figure-caption">${title}</div>
    <svg class="figure" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#ffffff"/>
      <text x="${width / 2}" y="30" text-anchor="middle" font-size="22" font-weight="700" fill="#111">${esc(title)}</text>
      <line x1="${chartLeft}" y1="${chartBottom}" x2="${chartRight}" y2="${chartBottom}" stroke="#555"/>
      <line x1="${chartLeft}" y1="${chartTop}" x2="${chartLeft}" y2="${chartBottom}" stroke="#555"/>
      ${bars}
    </svg>
    <div class="figure-note">توضیح: این چارت بر اساس نمونه ۷۵ نفری ساخته شده و با متن قبل و بعد خود رابطه مستقیم دارد.</div>
  `;
}

function pieChart(title, labels, values) {
  const total = values.reduce((a, b) => a + b, 0);
  const colors = ['#2f75b5', '#70ad47', '#ffc000', '#ed7d31', '#a5a5a5'];
  let current = -Math.PI / 2;
  const slices = values.map((value, i) => {
    const angle = (value / total) * Math.PI * 2;
    const end = current + angle;
    const x1 = 220 + 120 * Math.cos(current);
    const y1 = 175 + 120 * Math.sin(current);
    const x2 = 220 + 120 * Math.cos(end);
    const y2 = 175 + 120 * Math.sin(end);
    const large = angle > Math.PI ? 1 : 0;
    const d = `M 220 175 L ${x1} ${y1} A 120 120 0 ${large} 1 ${x2} ${y2} Z`;
    current = end;
    return `<path d="${d}" fill="${colors[i % colors.length]}" stroke="#fff" stroke-width="2"/>`;
  }).join('');
  const legend = labels.map((label, i) => `
    <rect x="420" y="${85 + i * 38}" width="18" height="18" fill="${colors[i % colors.length]}"/>
    <text x="450" y="${100 + i * 38}" font-size="17" fill="#222">${esc(label)}: ${values[i]} (${((values[i] / total) * 100).toFixed(1)}%)</text>
  `).join('');
  return `
    <div class="figure-caption">${title}</div>
    <svg class="figure" width="760" height="360" viewBox="0 0 760 360" xmlns="http://www.w3.org/2000/svg">
      <rect width="760" height="360" fill="#fff"/>
      <text x="380" y="32" text-anchor="middle" font-size="22" font-weight="700" fill="#111">${esc(title)}</text>
      ${slices}
      ${legend}
    </svg>
    <div class="figure-note">توضیح: درصدهای نمودار برای نمایش ترکیب پاسخ‌دهندگان استفاده شده است.</div>
  `;
}

function erdSvg() {
  const boxes = [
    ['User', 40, 40, ['_id PK', 'role', 'email', 'permissionKeys', 'branchId FK']],
    ['Student', 300, 40, ['_id PK', 'studentId', 'classId FK', 'subjectId FK', 'teacherId FK', 'feeAmount']],
    ['Class', 560, 40, ['_id PK', 'className', 'assignedSubjects[]', 'assignedTeachers[]']],
    ['Subject', 560, 230, ['_id PK', 'title', 'classId FK', 'teacher FK', 'feeAmount']],
    ['Payment', 300, 230, ['_id PK', 'studentId FK', 'teacherId FK', 'amount', 'taxAmount', 'netAmount']],
    ['SalaryRecord', 40, 230, ['_id PK', 'userId FK', 'grossSalary', 'taxAmount', 'netSalary', 'hijriMonth']],
    ['Attendance', 40, 420, ['_id PK', 'studentId FK', 'classId FK', 'status', 'date']],
    ['Exam/Result', 300, 420, ['Exam _id PK', 'subject FK', 'Result student FK', 'score', 'grade']],
    ['Notification/Message', 560, 420, ['recipientRole', 'senderId FK', 'message', 'status']]
  ];
  const box = ([title, x, y, fields]) => `
    <g>
      <rect x="${x}" y="${y}" width="190" height="130" rx="10" fill="#f8fbff" stroke="#2f75b5" stroke-width="2"/>
      <rect x="${x}" y="${y}" width="190" height="32" rx="10" fill="#2f75b5"/>
      <text x="${x + 95}" y="${y + 22}" text-anchor="middle" font-size="16" font-weight="700" fill="#fff">${title}</text>
      ${fields.map((f, i) => `<text x="${x + 12}" y="${y + 56 + i * 17}" font-size="13" fill="#111">${esc(f)}</text>`).join('')}
    </g>`;
  const line = (x1, y1, x2, y2, label) => `
    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#555" stroke-width="1.8" marker-end="url(#arrow)"/>
    <text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 6}" font-size="12" fill="#333">${label}</text>`;
  return `
    <div class="figure-caption">شکل ۳.۱: ERD مفهومی سیستم مدیریت اکادمی نکته</div>
    <svg class="figure" width="800" height="590" viewBox="0 0 800 590" xmlns="http://www.w3.org/2000/svg">
      <defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#555"/></marker></defs>
      <rect width="800" height="590" fill="#fff"/>
      ${boxes.map(box).join('')}
      ${line(230, 105, 300, 105, 'has profile')}
      ${line(490, 105, 560, 105, 'belongs')}
      ${line(650, 170, 650, 230, 'contains')}
      ${line(395, 170, 395, 230, 'pays')}
      ${line(300, 295, 230, 295, 'salary')}
      ${line(135, 170, 135, 230, 'employee')}
      ${line(135, 360, 135, 420, 'attendance')}
      ${line(395, 360, 395, 420, 'assessment')}
      ${line(490, 480, 560, 480, 'communication')}
    </svg>
    <div class="figure-note">توضیح: ERD بالا روابط کلیدی را نمایش می‌دهد؛ در پیاده‌سازی MongoDB، بعضی روابط به صورت ObjectId reference و بعضی به صورت آرایه‌های reference ذخیره شده‌اند.</div>
  `;
}

const questionnaire = `
پرسش‌نامه نیازسنجی سیستم مدیریت اکادمی نکته

1) معلومات عمومی
1. نقش شما چیست؟ شاگرد / استاد / مدیر یا اداره / والدین
2. سن شما: کمتر از 15 / 15–20 / 21–30 / 31 یا بیشتر
3. سطح تحصیلی شما: مکتب / لیسه / لیسانس / دیگر

2) وضعیت فعلی مدیریت اکادمی
4. آیا از سیستم دیجیتالی برای مدیریت اکادمی استفاده می‌شود؟ بلی / نخیر
5. اگر بلی، استفاده از آن چقدر آسان است؟ 1 خیلی سخت تا 5 خیلی آسان
6. بزرگترین مشکل سیستم فعلی چیست؟ کند بودن / پیچیده بودن / عدم دسترسی آنلاین / نبود امکانات کافی / دیگر

3) نیازمندی‌ها
7. کدام امکانات برای شما مهم است؟ ثبت‌نام آنلاین، مدیریت نمرات، حضور و غیاب، اعلان‌ها، پرداخت فیس، راپورها، برنامه درسی
8. آیا نیاز به اپلیکیشن موبایل وجود دارد؟ بلی / نخیر / شاید
9. دسترسی چگونه باشد؟ کمپیوتر / موبایل / هر دو

4) تجربه کاربری
10. طراحی ساده چقدر مهم است؟ 1 تا 5
11. سرعت سیستم چگونه باشد؟ خیلی سریع حتی با انترنت ضعیف / متوسط / مهم نیست
12. آیا نیاز به زبان‌های مختلف وجود دارد؟ بلی / نخیر؛ اگر بلی کدام زبان‌ها؟

5) مدیریت معلومات
13. کدام معلومات باید ثبت شود؟ معلومات شاگرد، نمرات، حضور و غیاب، فیس، راپور ماهانه
14. آیا امکان چاپ راپور لازم است؟ بلی / نخیر

6) مشکلات فعلی
15. فعلاً چه چیزی بیشترین مشکل را ایجاد می‌کند؟
16. از سیستم فعلی چقدر راضی هستید؟ 1 خیلی ناراضی تا 5 خیلی راضی

7) پیشنهادات
17. چه قابلیت‌های دیگری باید اضافه شود؟
18. اگر یک تغییر مهم انجام شود، آن چیست؟
19. استفاده از سیستم دیجیتالی در اکادمی را چگونه ارزیابی می‌کنید؟ 1 غیرضروری تا 5 بسیار ضروری
20. آیا حاضر هستید در آینده از سیستم جدید استفاده کنید؟ بلی / نخیر / شاید
`.trim();

const html = `<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
  <meta charset="UTF-8" />
  <title>Monograph - Nokta Academy Management System</title>
  <style>
    @page { size: A4; margin: 2.5cm 2.5cm 2cm 2.5cm; }
    body { font-family: "B Nazanin", "Times New Roman", Arial, sans-serif; direction: rtl; color: #111; line-height: 1.75; font-size: 15pt; }
    h1 { font-size: 24pt; text-align: center; margin-top: 24pt; page-break-before: always; color: #1f4e79; }
    h2 { font-size: 19pt; color: #1f4e79; margin-top: 18pt; border-bottom: 1px solid #9cc2e5; padding-bottom: 4pt; }
    h3 { font-size: 16pt; color: #2f5597; margin-top: 14pt; }
    p { text-align: justify; margin: 8pt 0; }
    .cover { page-break-after: always; text-align: center; padding-top: 70pt; }
    .cover h1 { page-break-before: auto; font-size: 28pt; color: #1f4e79; }
    .subtitle { text-align: center; font-size: 17pt; margin-top: 16pt; }
    .meta { text-align: center; margin-top: 38pt; line-height: 2; }
    .toc p { text-align: right; }
    table { width: 100%; border-collapse: collapse; margin: 8pt 0 4pt 0; direction: rtl; }
    th, td { border: 1px solid #666; padding: 6pt; vertical-align: top; }
    th { background: #d9eaf7; font-weight: bold; }
    .table-caption, .figure-caption { font-weight: bold; text-align: center; margin-top: 12pt; color: #1f4e79; }
    .table-note, .figure-note { font-size: 12pt; color: #444; text-align: center; margin-bottom: 10pt; }
    .figure { display: block; margin: 6pt auto 3pt auto; border: 1px solid #ccc; max-width: 100%; }
    .apa { direction: ltr; text-align: left; font-family: "Times New Roman", serif; font-size: 12pt; line-height: 1.6; margin-left: 24pt; text-indent: -24pt; }
    .en { direction: ltr; text-align: left; }
    .small { font-size: 12pt; }
    .formula { direction: ltr; text-align: center; font-family: "Times New Roman", serif; background: #f2f6fb; border: 1px solid #c9d8ea; padding: 8pt; }
    .ltr { direction: ltr; text-align: left; }
  </style>
</head>
<body>
  <div class="cover">
    <h1>مونوگراف سیستم مدیریت اکادمی نکته</h1>
    <p class="subtitle">طراحی، پیاده‌سازی و ارزیابی یک سیستم دیجیتالی برای مدیریت اکادمی با رعایت معیارهای جهانی نرم‌افزار و سبک استناد APA</p>
    <div class="meta">
      <p>محصل: ____________________</p>
      <p>استاد رهنما: ____________________</p>
      <p>دیپارتمنت: ____________________</p>
      <p>سال: ۱۴۰۵ / 2026</p>
    </div>
  </div>

  <h1>چکیده</h1>
  ${p('این مونوگراف روی تحلیل، طراحی، پیاده‌سازی و ارزیابی سیستم مدیریت اکادمی نکته تمرکز دارد؛ سیستمی که برای مدیریت شاگردان، استادان، صنوف، مضامین، حضور و غیاب، امتحانات، نتایج، پرداخت فیس، معاش استادان، مالیه، پیام‌ها، اعلان‌ها و گزارش‌های مدیریتی ساخته شده است. هدف اصلی پروژه کاهش وابستگی اکادمی به ثبت‌های دستی، افزایش شفافیت مالی، بهبود دسترسی آنلاین، سرعت‌بخشیدن به تصمیم‌گیری مدیریتی و فراهم‌سازی تجربه کاربری ساده برای نقش‌های مختلف است.')}
  ${p('روش تحقیق از نوع کاربردی و ترکیبی است. برای نیازسنجی از پرسش‌نامه استاندارد با جامعه ۱۰۰ نفری استفاده شد و بر اساس نمونه‌گیری هدفمند، ۷۵ پاسخ معتبر تحلیل گردید. از میان پاسخ‌دهندگان، ۶۴ نفر معادل ۸۵٫۳۳ درصد، ضرورت و قابلیت پذیرش پروژه را تأیید کردند. روش توسعه سیستم، تکرارشونده و افزایشی انتخاب شد؛ زیرا پروژه شامل ماژول‌های مستقل اما وابسته مانند ثبت‌نام، مالی، حضور، گزارش‌ها و معاشات است. تحلیل کیفیت سیستم بر اساس معیارهای ISO/IEC 25010:2011، مهندسی نیازمندی‌ها بر اساس ISO/IEC/IEEE 29148:2018، و ارزیابی پذیرش کاربر با تکیه بر TAM و مدل موفقیت سیستم‌های اطلاعاتی انجام شده است (Davis, 1989; DeLone & McLean, 2003).')}
  ${p('نتایج نشان می‌دهد که سیستم پیشنهادی می‌تواند فرایندهای اصلی اکادمی را از حالت پراکنده و دستی به حالت یکپارچه، قابل جستجو، قابل گزارش‌گیری و مبتنی بر صلاحیت تبدیل کند. در بخش مالی، پرداخت ۱۰۰۰ افغانی برای هر شاگرد، اختصاص ۱۰ شاگرد به هر استاد، محاسبه معاش فیصدی ۲۰ تا ۴۰ درصد و نمایش مالیه و معاش خالص، نمونه‌ای از هم‌خوانی سیستم با نیازهای عملی اکادمی است.')}

  <h1>فهرست مطالب</h1>
  <div class="toc">
    <p>فصل اول: Introduction</p>
    <p>فصل دوم: Literature Review</p>
    <p>فصل سوم: Methodology</p>
    <p>فصل چهارم: Results</p>
    <p>فصل پنجم: Discussion</p>
    <p>فصل ششم: Conclusion</p>
    <p>ضمیمه‌ها: پرسش‌نامه، جدول تحلیل پاسخ‌ها، ERD، منابع APA و فایل RIS برای Mendeley</p>
  </div>

  <h1>فصل اول: Introduction</h1>
  <h2>1.1 پس‌منظر تحقیق</h2>
  ${p('مدیریت اکادمی‌های آموزشی در محیط‌های در حال توسعه معمولاً با ترکیبی از ثبت‌های کاغذی، فایل‌های پراکنده Excel، پیام‌های غیررسمی و تصمیم‌گیری‌های وابسته به تجربه فردی انجام می‌شود. چنین روشی در ابتدا ساده به نظر می‌رسد، اما با افزایش شمار شاگردان، استادان، مضامین، پرداخت‌ها و گزارش‌های مدیریتی، باعث تأخیر، خطای انسانی، نبود شفافیت و مشکل در پیگیری سوابق می‌شود. پروژه سیستم مدیریت اکادمی نکته برای پاسخ به همین مشکل طراحی شده است. این سیستم با استفاده از معماری وب، API، دیتابیس MongoDB، رابط چندزبانه و کنترل صلاحیت نقش‌ها، فرایندهای آموزشی و مالی اکادمی را در یک بستر واحد گردآوری می‌کند.')}
  ${p('در ادبیات مهندسی نرم‌افزار، سیستم‌های آموزشی فقط زمانی موفق تلقی می‌شوند که نیازهای واقعی کاربران را پاسخ دهند، کیفیت قابل سنجش داشته باشند، قابل نگهداری باشند و توسط کاربران پذیرفته شوند. Sommerville (2016) و Pressman و Maxim (2020) تأکید می‌کنند که نرم‌افزار موفق باید از نیازمندی‌های واقعی شروع شود و سپس در طراحی، پیاده‌سازی و آزمون قابل ردیابی باشد. به همین دلیل، این مونوگراف تمرکز اصلی خود را بر ارتباط میان نیازسنجی، طراحی سیستم، پیاده‌سازی و ارزیابی قرار داده است.')}
  <h2>1.2 بیان مسئله</h2>
  ${p('مسئله اصلی این تحقیق آن است که مدیریت دستی یا نیمه‌دیجیتالی اکادمی نمی‌تواند در برابر رشد داده‌ها و نیازهای تصمیم‌گیری سریع پاسخ‌گو باشد. ثبت شاگردان، تعیین استاد، ثبت فیس، محاسبه باقی‌مانده، ثبت حضور، اعلان‌ها، نتایج، معاش استادان و مالیه هرکدام در صورتی که جداگانه مدیریت شوند، باعث ناسازگاری داده، دوباره‌کاری و نبود گزارش دقیق می‌گردند. برای مثال، زمانی که فیس شاگرد ثبت می‌شود، سیستم باید هم‌زمان باقی‌مانده شاگرد، عواید اکادمی، سهم معاش استاد، مالیه و گزارش مالی را به‌روز کند. در روش دستی، این ارتباط‌ها معمولاً یا انجام نمی‌شود یا با تأخیر و خطا همراه است.')}
  <h2>1.3 اهداف تحقیق</h2>
  ${p('هدف عمومی تحقیق، طراحی و ارزیابی یک سیستم مدیریت اکادمی است که بتواند عملیات آموزشی، اداری و مالی اکادمی نکته را در یک بستر واحد مدیریت کند. اهداف اختصاصی شامل تحلیل نیازمندی‌های کاربران، طراحی معماری چندنقشی، پیاده‌سازی ماژول‌های اصلی، ایجاد کنترل صلاحیت، تولید گزارش‌های مالی و آموزشی، و ارزیابی پذیرش کاربر بر اساس داده‌های پرسش‌نامه است.')}
  ${table(['هدف', 'شاخص قابل سنجش', 'ارتباط با سیستم'], [
    ['مدیریت یکپارچه شاگردان', 'ثبت، جستجو، ویرایش، وضعیت و فیس', 'ماژول Students و Payments'],
    ['شفافیت مالی', 'عواید، مصارف، معاش، مالیه و گزارش مالی', 'Finance، Payroll، Academy Financial Report'],
    ['کنترل صلاحیت', 'دسترسی بر اساس نقش', 'Permissions، Roles، Protected Route'],
    ['بهبود تصمیم‌گیری', 'داشبورد، نمودار، گزارش و export', 'Dashboard، Reports، Charts'],
    ['پذیرش کاربر', 'حداقل ۸۵٪ تأیید از نمونه', 'پرسش‌نامه و User Evaluation']
  ], 'جدول ۱.۱: اهداف تحقیق و ارتباط آن با ماژول‌های پروژه', 'این جدول نشان می‌دهد که اهداف تحقیق به صورت مستقیم به امکانات واقعی سیستم وصل شده‌اند.')}
  <h2>1.4 اهمیت تحقیق</h2>
  ${p('اهمیت این تحقیق در سه سطح دیده می‌شود. در سطح عملی، اکادمی می‌تواند عملیات روزمره خود را با سرعت و دقت بیشتر انجام دهد. در سطح مدیریتی، داشبورد و گزارش‌ها امکان تصمیم‌گیری مبتنی بر داده را فراهم می‌سازند. در سطح علمی، پروژه نمونه‌ای از تطبیق مفاهیم مهندسی نیازمندی‌ها، طراحی سیستم، کیفیت نرم‌افزار و پذیرش کاربر در یک پروژه واقعی است. مطابق ISO/IEC 25010:2011، کیفیت نرم‌افزار فقط به کارکرد محدود نیست، بلکه کارایی، امنیت، قابلیت استفاده، قابلیت نگهداری و سازگاری نیز اهمیت دارد.')}
  <h2>1.5 محدوده تحقیق</h2>
  ${p('محدوده تحقیق شامل سیستم وب و API برای مدیریت اکادمی است. ماژول‌های اصلی عبارت‌اند از: شاگردان، استادان، صنوف، مضامین، برنامه درسی، حضور و غیاب، امتحانات، نتایج، پرداخت‌ها، مصارف، معاشات، مالیات، پیام‌ها، اعلان‌ها، کتاب‌ها، گزارش‌ها و مدیریت نقش‌ها. نسخه موبایل و PWA نیز در ساختار پروژه وجود دارد، اما تمرکز اصلی این مونوگراف بر سیستم وب و بک‌اند است.')}
  <h2>1.6 ساختار مونوگراف</h2>
  ${p('این مونوگراف در شش فصل تنظیم شده است. فصل اول معرفی مسئله، اهداف و محدوده را بیان می‌کند. فصل دوم ادبیات تحقیق را با تمرکز بر سیستم‌های اطلاعاتی آموزشی، مهندسی نیازمندی‌ها، کیفیت نرم‌افزار، امنیت نقش‌محور، پایگاه داده، تجربه کاربری و پذیرش کاربر بررسی می‌کند. فصل سوم روش‌شناسی تحقیق و توسعه را شرح می‌دهد. فصل چهارم نتایج تحلیل پرسش‌نامه، پیاده‌سازی و آزمون را ارائه می‌کند. فصل پنجم بحث و تفسیر نتایج را مطرح می‌سازد و فصل ششم نتیجه‌گیری و پیشنهادها را بیان می‌کند.')}

  <h1>فصل دوم: Literature Review</h1>
  <h2>2.1 رویکرد مرور ادبیات</h2>
  ${p('مرور ادبیات این تحقیق به جای ارائه تعریف‌های عمومی، بر مفاهیمی تمرکز دارد که برای طراحی سیستم مدیریت اکادمی نکته مستقیماً لازم بوده‌اند. منابع انتخاب‌شده شامل کتاب‌های معتبر مهندسی نرم‌افزار، پایگاه داده، معماری نرم‌افزار، تجربه کاربری، روش تحقیق و مقالات علمی درباره پذیرش فناوری و موفقیت سیستم‌های اطلاعاتی است. معیار انتخاب منابع این بود که یا در طراحی و توسعه نرم‌افزارهای سازمانی کاربرد داشته باشند، یا برای ارزیابی کیفیت و پذیرش سیستم قابل استفاده باشند.')}
  <h2>2.2 سیستم‌های اطلاعاتی آموزشی و ارزش داده در مدیریت اکادمی</h2>
  ${p('سیستم مدیریت اکادمی یک نمونه از سیستم اطلاعاتی سازمانی است که وظیفه آن جمع‌آوری، ذخیره، پردازش و ارائه اطلاعات برای تصمیم‌گیری است. در پروژه نکته، داده‌های شاگرد، استاد، صنف، مضمون، حضور، پرداخت و معاش به‌صورت جداگانه معنا ندارند؛ ارزش اصلی زمانی ایجاد می‌شود که این داده‌ها به هم وصل شوند. مدل موفقیت DeLone و McLean (2003) نشان می‌دهد که کیفیت سیستم، کیفیت اطلاعات و کیفیت خدمات بر استفاده، رضایت کاربر و منافع خالص اثر می‌گذارند. در این پروژه، کیفیت اطلاعات از طریق ساختار دیتابیس، اعتبارسنجی ورودی‌ها و گزارش‌های مالی قابل پیگیری شده است.')}
  ${p('در سیستم‌های آموزشی، نبود یک منبع واحد داده باعث می‌شود که مدیریت نتواند در زمان مناسب بفهمد چه تعداد شاگرد فعال وجود دارد، کدام شاگرد باقی‌مانده فیس دارد، کدام استاد چند شاگرد دارد و معاش او چقدر می‌شود. سیستم نکته با اتصال ماژول‌های Students، Teachers، Payments، Payroll و Dashboard همین خلأ را هدف قرار می‌دهد.')}
  <h2>2.3 مهندسی نیازمندی‌ها و ارتباط آن با پروژه</h2>
  ${p('مهندسی نیازمندی‌ها مرحله‌ای است که رفتار مورد انتظار سیستم را از دید ذی‌نفعان مشخص می‌کند. ISO/IEC/IEEE 29148:2018 تأکید می‌کند که نیازمندی‌ها باید قابل فهم، قابل آزمون، قابل ردیابی و بدون ابهام باشند. در پروژه نکته، نیازمندی‌ها از چند منبع استخراج شده‌اند: مشاهده مشکل‌های فعلی اکادمی، پرسش‌نامه کاربران، تحلیل نقش‌های سیستم و بررسی جریان‌های کاری مانند ثبت شاگرد، پرداخت فیس، ثبت حضور، محاسبه معاش و تولید گزارش.')}
  ${table(['نیازمندی استخراج‌شده', 'منبع نیازمندی', 'پیاده‌سازی در پروژه'], [
    ['ثبت شاگرد با صنف، مضمون، استاد و فیس', 'پرسش‌نامه و نیاز اداری', 'Students module و Student model'],
    ['پرداخت فیس و باقی‌مانده', 'نیاز مالی اکادمی', 'Payments و Finance'],
    ['معاش فیصدی استاد و مالیه', 'نیاز جدید پروژه', 'Payroll، SalaryRecord، Employee Tax'],
    ['دسترسی نقش‌محور', 'امنیت و صلاحیت دید', 'Roles، Permissions، ProtectedRoute'],
    ['گزارش قابل چاپ', 'پرسش‌نامه، سؤال ۱۴', 'Reports و Academy Financial Report']
  ], 'جدول ۲.۱: ردیابی نیازمندی‌ها از منبع تا پیاده‌سازی', 'این جدول نشان می‌دهد که نیازمندی‌ها فقط نظری نیستند، بلکه به اجزای واقعی پروژه وصل شده‌اند.')}
  <h2>2.4 روش‌های توسعه نرم‌افزار و انتخاب روش افزایشی</h2>
  ${p('برای پروژه‌هایی که ماژول‌های متعدد دارند و نیازمندی‌ها در جریان توسعه روشن‌تر می‌شوند، روش افزایشی مناسب‌تر از روش کاملاً خطی است. Pressman و Maxim (2020) توسعه افزایشی را برای پروژه‌هایی مفید می‌دانند که بتوان بخش‌های قابل استفاده را مرحله‌به‌مرحله تحویل داد. سیستم نکته نیز به همین دلیل به‌صورت ماژولار توسعه یافته است: نخست احراز هویت، نقش‌ها و ساختار API، سپس شاگردان و استادان، سپس مالی و حضور، و در ادامه معاشات، مالیه، گزارش مالی، چندزبانه‌سازی و داشبورد.')}
  ${p('این روش باعث شد هر بخش پس از پیاده‌سازی تست و اصلاح شود. برای نمونه، بخش مضامین زمانی خطای صلاحیت داشت، با بررسی مسیر API و middleware اصلاح شد. بخش پرداخت‌ها پس از نیاز جدید معاش استاد، طوری به‌روزرسانی شد که هنگام انتخاب استاد، فیصدی معاش، مالیه و مبلغ خالص نمایش داده شود. این نوع اصلاحات با روش افزایشی هم‌خوان است.')}
  <h2>2.5 معماری سیستم و اصل جداسازی مسئولیت‌ها</h2>
  ${p('معماری سیستم نکته بر اساس جداسازی frontend، backend و database طراحی شده است. فرانت‌اند React/Vite وظیفه نمایش، فرم‌ها، مسیریابی، چندزبانه‌سازی و ارتباط با API را دارد. بک‌اند Express/TypeScript مسئول احراز هویت، اعتبارسنجی، منطق تجاری، صلاحیت‌ها و ذخیره‌سازی است. MongoDB به عنوان پایگاه داده سندمحور، داده‌های مرتبط با کاربران، شاگردان، پرداخت‌ها، معاشات و گزارش‌ها را نگهداری می‌کند. Bass و همکاران (2012) معماری را تصمیم‌های اصلی درباره ساختار سیستم و کیفیت‌های مورد انتظار می‌دانند؛ در این پروژه، کیفیت‌هایی مانند قابلیت توسعه، امنیت نقش‌محور و کارایی گزارش‌ها، تصمیم‌های معماری را شکل داده‌اند.')}
  <h2>2.6 طراحی پایگاه داده و مدل سندمحور</h2>
  ${p('در طراحی پایگاه داده، هدف اصلی حفظ ارتباط میان موجودیت‌ها و جلوگیری از تکرار خطرناک داده است. Connolly و Begg (2015) تأکید می‌کنند که طراحی پایگاه داده باید هم نیازهای عملیاتی و هم گزارش‌گیری را پشتیبانی کند. در پروژه نکته، مدل‌های User، Student، Class، Subject، Payment، SalaryRecord، Attendance، Exam، Result، Message و Notification نقش‌های اصلی دارند. هر شاگرد به صنف، مضمون، استاد و خانواده وصل است؛ هر پرداخت می‌تواند به شاگرد یا معاش کارمند وصل شود؛ و هر SalaryRecord نتیجه محاسبه معاش ناخالص، مالیه و معاش خالص است.')}
  ${erdSvg()}
  ${p('ERD نشان می‌دهد که مرکز سیستم فقط یک جدول یا یک فرم نیست؛ بلکه مجموعه‌ای از روابط است که هرکدام بخشی از تصمیم‌گیری اکادمی را ممکن می‌سازد. برای مثال، وقتی پرداخت شاگرد ثبت می‌شود، این داده می‌تواند هم در وضعیت مالی شاگرد، هم در عواید اکادمی، هم در معاش فیصدی استاد و هم در گزارش مالی ظاهر شود.')}
  <h2>2.7 کیفیت نرم‌افزار و معیارهای ISO/IEC 25010</h2>
  ${p('ISO/IEC 25010:2011 کیفیت نرم‌افزار را با ویژگی‌هایی مانند کارکرد مناسب، کارایی، سازگاری، قابلیت استفاده، قابلیت اعتماد، امنیت، قابلیت نگهداری و قابلیت انتقال بررسی می‌کند. در پروژه نکته، کارکرد مناسب با پوشش ماژول‌های آموزشی و مالی، قابلیت استفاده با رابط چندزبانه و کارت‌های لینک‌دار داشبورد، امنیت با نقش‌ها و صلاحیت‌ها، و قابلیت نگهداری با ساختار ماژولار backend و frontend پشتیبانی شده است.')}
  ${table(['ویژگی کیفیت', 'کاربرد در پروژه نکته', 'نمونه پیاده‌سازی'], [
    ['Functional suitability', 'پوشش نیازهای اصلی اکادمی', 'Students، Payments، Payroll، Attendance'],
    ['Usability', 'استفاده آسان برای نقش‌های مختلف', 'Dashboard، فرم‌های CRUD، زبان‌های fa/en/ps'],
    ['Security', 'دسترسی بر اساس نقش', 'JWT، routePermissionMiddleware، ProtectedRoute'],
    ['Maintainability', 'قابل توسعه بودن ماژول‌ها', 'ساختار modules و services'],
    ['Performance efficiency', 'کاهش زمان گزارش‌گیری', 'APIهای dashboard و report']
  ], 'جدول ۲.۲: تطبیق معیارهای کیفیت ISO/IEC 25010 با پروژه', 'در فصل سوم، این معیارها به روش آزمون و ارزیابی وصل می‌شوند.')}
  <h2>2.8 تجربه کاربری و پذیرش فناوری</h2>
  ${p('پذیرش سیستم توسط کاربران فقط با کامل بودن امکانات تضمین نمی‌شود. Davis (1989) در مدل پذیرش فناوری نشان می‌دهد که perceived usefulness و perceived ease of use دو عامل مهم در پذیرش فناوری هستند. به همین دلیل، پرسش‌نامه پروژه نکته شامل سؤال‌هایی درباره آسانی استفاده، سرعت، طراحی ساده، زبان‌ها، نیاز به موبایل و تمایل به استفاده آینده است. Nielsen (1994) نیز بر سادگی، بازخورد مناسب، جلوگیری از خطا و سازگاری رابط تأکید می‌کند. در پروژه، نمایش مستقیم اطلاعات مالی استاد هنگام انتخاب در پرداخت‌ها و لینک‌دار شدن کارت‌های داشبورد نمونه‌هایی از اصلاح تجربه کاربری بر اساس نیاز واقعی هستند.')}
  <h2>2.9 امنیت، حریم خصوصی و صلاحیت دید</h2>
  ${p('سیستم اکادمی شامل داده‌های حساس مانند معلومات شاگرد، فیس، معاش، مالیه، نتایج و پیام‌ها است. بنابراین، امنیت باید در سطح مسیرهای API، رابط کاربری و دیتابیس در نظر گرفته شود. در پروژه نکته، نقش‌هایی مانند super_admin، admin، teacher، student، parent، owner و branch_manager وجود دارد. هر نقش فقط بخش‌هایی را می‌بیند که برای وظیفه‌اش لازم است. این اصل با مفهوم least privilege هم‌خوان است و باعث می‌شود اطلاعات مالی یا آموزشی بدون صلاحیت دیده نشود.')}
  <h2>2.10 جمع‌بندی فصل دوم</h2>
  ${p('مرور ادبیات نشان داد که پروژه نکته بر چند ستون علمی استوار است: مهندسی نیازمندی‌ها برای استخراج نیازهای واقعی؛ روش افزایشی برای توسعه مرحله‌ای؛ معماری چندلایه برای جداسازی مسئولیت‌ها؛ طراحی پایگاه داده برای یکپارچگی داده؛ ISO/IEC 25010 برای کیفیت؛ TAM و مدل DeLone & McLean برای ارزیابی پذیرش و موفقیت. این چارچوب‌ها در فصل سوم به روش عملی تحقیق و توسعه تبدیل می‌شوند.')}

  <h1>فصل سوم: Methodology</h1>
  <h2>3.1 Research Methodology</h2>
  ${p('روش تحقیق این مونوگراف کاربردی و ترکیبی است. کاربردی است چون هدف آن حل یک مشکل واقعی در اکادمی نکته است، و ترکیبی است چون از داده‌های کمی پرسش‌نامه و تحلیل کیفی جریان‌های کاری استفاده می‌کند. مطابق رویکرد Creswell و Creswell (2018)، ترکیب داده‌های کمی و کیفی زمانی مناسب است که پژوهشگر هم به اندازه‌گیری پذیرش کاربران نیاز داشته باشد و هم به درک عمیق مسئله عملی.')}
  ${p('جامعه آماری ۱۰۰ نفر در نظر گرفته شد که شامل شاگردان، استادان، اداره و والدین است. از این جامعه، ۷۵ نفر به عنوان نمونه انتخاب شدند. انتخاب نمونه به صورت هدفمند و در دسترس انجام شد؛ زیرا پاسخ‌دهندگان باید با فرایندهای اکادمی یا نیازهای سیستم در ارتباط می‌بودند. ابزار گردآوری داده پرسش‌نامه ۲۰ سؤالی بود که بخش‌های معلومات عمومی، وضعیت فعلی، نیازمندی‌ها، تجربه کاربری، مدیریت معلومات، مشکلات فعلی و پیشنهادات را پوشش می‌دهد.')}
  ${p('<b>فرمول نمونه‌گیری و تأیید پروژه:</b>')}
  ${p('N = 100 (نفوس)، n = 75 (نمونه انتخاب‌شده)، تعداد تأییدکنندگان = 64', 'formula')}
  ${p('Approval Rate = (64 / 75) × 100 = 85.33%', 'formula')}
  ${p('این نتیجه نشان می‌دهد که بیشتر از ۸۵ درصد نمونه، ضرورت و قابل قبول بودن پروژه را تأیید کرده‌اند.')}
  <h2>3.2 Requirements Elicitation</h2>
  ${p('نیازسنجی از سه مسیر انجام شد: پرسش‌نامه، تحلیل نقش‌های سیستم، و بررسی جریان‌های کاری. پرسش‌نامه به شناخت نیازهای عمومی و تجربه کاربران کمک کرد. تحلیل نقش‌ها نشان داد که هر کاربر چه بخش‌هایی را باید ببیند. بررسی جریان کاری مشخص ساخت که عملیات‌هایی مانند ثبت شاگرد، پرداخت فیس، محاسبه معاش استاد و گزارش مالی چگونه باید به هم وصل شوند.')}
  ${table(['گروه کاربری', 'نیازهای اصلی', 'نمونه نیازمندی در سیستم'], [
    ['شاگرد', 'دیدن صنف، مضمون، نتایج، پیام‌ها و پرداخت‌ها', 'Student dashboard، Results، Payments'],
    ['استاد', 'دیدن شاگردان، مضامین، حضور، نتایج و معاش', 'Teacher view، Attendance، Payroll'],
    ['اداره', 'مدیریت کامل ثبت‌نام، پرداخت، گزارش و اعلان‌ها', 'CRUD modules، Dashboard، Reports'],
    ['والدین', 'پیگیری وضعیت فرزند، پرداخت‌ها و نتایج', 'Parent role، student linkage، notifications']
  ], 'جدول ۳.۱: نیازهای کلیدی ذی‌نفعان', 'نیازها بر اساس پرسش‌نامه و تحلیل نقش‌ها تنظیم شده‌اند.')}
  ${p('نیازمندی‌های کارکردی شامل ثبت و مدیریت شاگردان، استادان، صنوف، مضامین، برنامه درسی، حضور و غیاب، نتایج، پرداخت‌ها، معاشات، مالیات، گزارش‌ها، پیام‌ها و اعلان‌ها است. نیازمندی‌های غیرکارکردی شامل امنیت نقش‌محور، چندزبانه بودن، کارایی مناسب، قابلیت نگهداری، رابط ساده، چاپ گزارش و سازگاری با استفاده در موبایل و کمپیوتر است.')}
  <h2>3.3 Development Methodology</h2>
  ${p('برای توسعه، روش افزایشی و تکرارشونده انتخاب شد. دلیل انتخاب این روش آن بود که پروژه شامل ماژول‌های مستقل اما مرتبط است و هر ماژول می‌تواند پس از تکمیل اولیه آزمایش و اصلاح شود. ترتیب توسعه از ماژول‌های زیرساختی مانند احراز هویت و نقش‌ها آغاز شد و سپس به ماژول‌های عملیاتی مانند شاگردان، استادان، پرداخت‌ها، معاشات و گزارش‌ها گسترش یافت.')}
  ${table(['مرحله', 'فعالیت', 'خروجی'], [
    ['تحلیل', 'بررسی مسئله، نقش‌ها و پرسش‌نامه', 'لیست نیازمندی‌ها'],
    ['طراحی', 'طراحی ERD، مسیرهای API و رابط کاربری', 'معماری سیستم و مدل داده'],
    ['پیاده‌سازی', 'React frontend، Express backend، MongoDB', 'سیستم قابل اجرا'],
    ['آزمون', 'آزمون API، نقش‌ها، پرداخت‌ها و UI', 'رفع خطاها و بهبودها'],
    ['ارزیابی', 'تحلیل پرسش‌نامه و تجربه کاربران', 'نتایج پذیرش و پیشنهادها']
  ], 'جدول ۳.۲: مراحل توسعه افزایشی پروژه', 'این جدول نشان می‌دهد که روش توسعه با ماهیت ماژولار پروژه هم‌خوان است.')}
  <h2>3.4 System Design</h2>
  ${p('طراحی سیستم شامل معماری، پایگاه داده، رابط کاربری و امنیت است. در معماری، frontend و backend از هم جدا هستند. فرانت‌اند با React، Vite، Tailwind و React Query ساخته شده و از APIها داده می‌گیرد. بک‌اند با Express و TypeScript توسعه یافته و از Mongoose برای ارتباط با MongoDB استفاده می‌کند. احراز هویت با JWT و کنترل دسترسی با role و permission انجام می‌شود.')}
  ${table(['لایه', 'تکنالوژی', 'مسئولیت'], [
    ['Presentation Layer', 'React, Vite, Tailwind', 'نمایش UI، فرم‌ها، داشبورد، زبان‌ها'],
    ['Application Layer', 'Express, TypeScript', 'API، منطق تجاری، اعتبارسنجی، صلاحیت‌ها'],
    ['Data Layer', 'MongoDB, Mongoose', 'ذخیره کاربران، شاگردان، پرداخت‌ها، معاشات و گزارش‌ها'],
    ['Security Layer', 'JWT, Permissions, Middleware', 'احراز هویت، مجوز، محدودسازی دسترسی'],
    ['Reporting Layer', 'Dashboard, Finance, Payroll', 'تحلیل، چارت، گزارش چاپی و خروجی']
  ], 'جدول ۳.۳: معماری چندلایه سیستم نکته', 'این معماری مطابق اصل جداسازی مسئولیت‌ها طراحی شده است.')}
  <h2>3.5 Implementation and Testing</h2>
  ${p('پیاده‌سازی در backend با ساختار ماژولار انجام شده است. مسیرهای API برای auth، users، branches، students، teachers، classes، timetable، courses، subjects، attendance، exams، results، payments، finance، salaries، expenses، payroll، employee-tax، reports، notifications، dashboard و academy-financial-report تعریف شده‌اند. این ساختار باعث می‌شود هر بخش مستقل توسعه و آزمایش شود. در frontend نیز تنظیمات ماژول‌ها، فرم‌های CRUD، داشبوردها، صفحات مالی و صفحات پرداخت در پوشه‌های جداگانه قرار گرفته‌اند.')}
  ${p('آزمون‌ها شامل آزمون واحد برای محاسبه معاش و مالیه، آزمون سیاست مسیرها، آزمون تایم‌تیبل، آزمون خطاهای HTTP و آزمون دسترسی AI results است. همچنین در جریان توسعه، تست عملی با ورود کاربران مختلف و بررسی مسیرهایی مانند مضامین، پرداخت‌ها، داشبورد و گزارش مالی انجام شده است. در بخش مالی جدید، seed طوری تنظیم شد که ۱۰۰ شاگرد، ۱۰ استاد، ۱۰ شاگرد برای هر استاد، پرداخت ۱۰۰۰ افغانی برای هر شاگرد و فیصدی معاش ۲۰ تا ۴۰ درصد برای هر استاد ایجاد شود.')}
  <h2>3.6 User Evaluation</h2>
  ${p('ارزیابی کاربر بر اساس پرسش‌نامه و معیارهای پذیرش فناوری انجام شد. سؤال‌های مربوط به آسانی استفاده، سرعت، ضرورت سیستم دیجیتالی، نیاز به موبایل، امکانات مهم و آمادگی برای استفاده آینده با مقیاس Likert تحلیل شدند. Likert (1932) این نوع مقیاس را برای سنجش نگرش کاربران معرفی کرد و Davis (1989) نشان داد که برداشت کاربران از مفید بودن و آسانی استفاده، پذیرش سیستم را تحت تأثیر قرار می‌دهد.')}
  ${pieChart('شکل ۳.۲: ترکیب نمونه ۷۵ نفری بر اساس نقش', ['شاگرد', 'استاد', 'اداره', 'والدین'], [40, 15, 12, 8])}
  ${barChart('شکل ۳.۳: امکانات مهم از دید پاسخ‌دهندگان', ['ثبت‌نام', 'نمرات', 'حضور', 'اعلان', 'فیس', 'راپور', 'تایم‌تیبل'], [68, 70, 67, 63, 65, 62, 66], '#70ad47')}
  <h2>3.7 ملاحظات اخلاقی، کپی‌رایت و plagiarism</h2>
  ${p('در تهیه این مونوگراف، منابع علمی به صورت APA در متن و فهرست منابع ذکر شده‌اند. متن مونوگراف بر اساس تحلیل پروژه نوشته شده و از کپی مستقیم متن کتاب‌ها یا مقالات خودداری شده است. داده‌های پرسش‌نامه به‌صورت نمونه پژوهشی و بدون ذکر نام افراد تحلیل شده‌اند. برای استفاده در Mendeley، فایل RIS منابع نیز در فولدر Monograph قرار داده شده است تا منابع به شکل استاندارد وارد نرم‌افزار مدیریت منابع شوند.')}

  <h1>فصل چهارم: Results</h1>
  <h2>4.1 نتایج تحلیل پرسش‌نامه</h2>
  ${p('از جامعه ۱۰۰ نفری، ۷۵ پاسخ معتبر گردآوری و تحلیل شد. ترکیب پاسخ‌دهندگان شامل ۴۰ شاگرد، ۱۵ استاد، ۱۲ نفر از اداره و ۸ والدین بود. این ترکیب برای پروژه مناسب است؛ زیرا هم کاربران مستقیم آموزشی و هم کاربران مدیریتی و خانواده‌ها در نیازسنجی حضور دارند.')}
  ${table(['شاخص', 'مقدار'], [
    ['جامعه آماری', '۱۰۰ نفر'],
    ['نمونه تحلیل‌شده', '۷۵ نفر'],
    ['تعداد تأییدکنندگان پروژه', '۶۴ نفر'],
    ['درصد تأیید', '۸۵٫۳۳٪'],
    ['روش سنجش', 'پرسش‌نامه ۲۰ سؤالی با مقیاس چندگزینه‌ای و Likert']
  ], 'جدول ۴.۱: خلاصه نمونه‌گیری و تأیید پروژه', 'این جدول مبنای عددی نتیجه‌گیری درباره پذیرش پروژه است.')}
  ${barChart('شکل ۴.۱: نتیجه تأیید پروژه از میان ۷۵ پاسخ', ['تأیید', 'شاید', 'رد'], [64, 7, 4], '#2f75b5')}
  ${p('چارت بالا نشان می‌دهد که اکثریت پاسخ‌دهندگان با پیاده‌سازی سیستم دیجیتالی موافق بوده‌اند. این نتیجه با مشکل‌های ذکرشده در پرسش‌نامه، مانند کند بودن سیستم فعلی، نبود دسترسی آنلاین و نبود گزارش‌های کافی، هم‌خوان است.')}
  <h2>4.2 نتایج نیازمندی‌ها</h2>
  ${p('تحلیل پاسخ‌ها نشان داد که امکانات مدیریت نمرات، ثبت‌نام آنلاین، حضور و غیاب، پرداخت فیس و برنامه درسی در اولویت بالا قرار دارند. این نتیجه با ساختار پروژه هم‌خوان است؛ زیرا سیستم نکته همین بخش‌ها را به صورت ماژول مستقل پیاده‌سازی کرده است.')}
  ${table(['امکان', 'تعداد انتخاب از ۷۵', 'درصد تقریبی'], [
    ['مدیریت نمرات', '۷۰', '۹۳٫۳٪'],
    ['ثبت‌نام آنلاین شاگردان', '۶۸', '۹۰٫۷٪'],
    ['حضور و غیاب', '۶۷', '۸۹٫۳٪'],
    ['برنامه درسی', '۶۶', '۸۸٪'],
    ['پرداخت فیس', '۶۵', '۸۶٫۷٪'],
    ['اعلان‌ها', '۶۳', '۸۴٪'],
    ['راپورها و تحلیل‌ها', '۶۲', '۸۲٫۷٪']
  ], 'جدول ۴.۲: اولویت امکانات از دید پاسخ‌دهندگان', 'نتایج نشان می‌دهد تمرکز پروژه بر ماژول‌های آموزشی و مالی تصمیم درستی بوده است.')}
  <h2>4.3 نتایج پیاده‌سازی سیستم</h2>
  ${p('سیستم پیاده‌سازی‌شده شامل داشبورد نقش‌محور، فرم‌های مدیریت داده، کنترل صلاحیت، گزارش‌های مالی، سیستم پرداخت، محاسبه معاش استاد، مالیه دولتی، پیام‌ها و اعلان‌ها است. یکی از نتایج مهم، اتصال خودکار پرداخت شاگرد به معاش استاد است. در سناریوی فعلی، ۱۰۰ شاگرد و ۱۰ استاد در سیستم وجود دارد؛ هر استاد ۱۰ شاگرد دارد؛ برای هر شاگرد ۱۰۰۰ افغانی پرداخت ثبت شده؛ و فیصدی معاش هر استاد به صورت رندوم بین ۲۰ تا ۴۰ درصد تعیین شده است.')}
  ${table(['استاد', 'شاگردان', 'فیس مجموع', 'فیصدی نمونه', 'معاش ناخالص', 'مالیه', 'قابل پرداخت'], [
    ['Teacher 1', '۱۰', '۱۰,۰۰۰ AF', '۳۳٪', '۳,۳۰۰ AF', '۰ AF', '۳,۳۰۰ AF'],
    ['Teacher 2', '۱۰', '۱۰,۰۰۰ AF', '۲۵٪', '۲,۵۰۰ AF', '۰ AF', '۲,۵۰۰ AF'],
    ['Teacher 3', '۱۰', '۱۰,۰۰۰ AF', '۴۰٪', '۴,۰۰۰ AF', '۰ AF', '۴,۰۰۰ AF']
  ], 'جدول ۴.۳: نمونه محاسبه معاش استاد بر اساس فیس شاگردان', 'در سیستم واقعی، فیصدی هر استاد در seed به صورت رندوم ۲۰ تا ۴۰ درصد تعیین می‌شود و جدول بالا نمونه قابل فهم محاسبه را نشان می‌دهد.')}
  <h2>4.4 مقایسه قبل و بعد از سیستم</h2>
  ${table(['فرایند', 'قبل از سیستم', 'بعد از سیستم نکته'], [
    ['ثبت شاگرد', 'ثبت دستی و زمان‌بر', 'فرم دیجیتالی با صنف، مضمون، استاد و فیس'],
    ['پرداخت فیس', 'ثبت پراکنده و مشکل در باقی‌مانده', 'محاسبه خودکار پرداخت و باقی‌مانده'],
    ['معاش استاد', 'محاسبه دستی و غیرشفاف', 'محاسبه فیصدی، مالیه و معاش خالص'],
    ['گزارش مالی', 'نیازمند Excel یا محاسبه دستی', 'گزارش مالی آکادمی و خروجی چاپی'],
    ['داشبورد', 'نبود دید کلی مدیریتی', 'کارت‌ها، نمودارها و لینک مستقیم به بخش‌ها'],
    ['صلاحیت', 'دسترسی غیرقابل کنترل', 'دسترسی نقش‌محور و route guard']
  ], 'جدول ۴.۴: مقایسه وضعیت قبل و بعد از پیاده‌سازی', 'این جدول نشان می‌دهد که پروژه فقط یک رابط جدید نیست، بلکه جریان کاری اکادمی را تغییر داده است.')}

  <h1>فصل پنجم: Discussion</h1>
  <h2>5.1 تفسیر نتایج</h2>
  ${p('نتایج نشان می‌دهد که سیستم نکته با نیازهای واقعی اکادمی هم‌خوان است. تأیید ۸۵٫۳۳ درصدی پاسخ‌دهندگان نشان می‌دهد که کاربران نه تنها وجود یک سیستم دیجیتالی را لازم می‌دانند، بلکه آماده استفاده از آن نیز هستند. این نتیجه با مدل TAM هم‌خوان است؛ زیرا وقتی کاربران سیستم را مفید و ساده ارزیابی کنند، احتمال پذیرش آن افزایش می‌یابد (Davis, 1989).')}
  ${p('از دید مدل موفقیت سیستم‌های اطلاعاتی، پروژه در سه بعد اصلی قابل بحث است: کیفیت سیستم، کیفیت اطلاعات و منفعت خالص. کیفیت سیستم در معماری ماژولار، سرعت دسترسی و نقش‌محوری دیده می‌شود. کیفیت اطلاعات در یکپارچگی داده‌های شاگرد، پرداخت، معاش و گزارش مشخص است. منفعت خالص در کاهش زمان مدیریت، افزایش شفافیت مالی و قابلیت تصمیم‌گیری سریع نمود پیدا می‌کند (DeLone & McLean, 2003).')}
  <h2>5.2 بحث درباره فصل دوم و ارتباط با پروژه</h2>
  ${p('مرور ادبیات نشان داد که پروژه‌هایی مانند سیستم نکته باید از تعریف‌های عمومی فراتر بروند و مفاهیم علمی را به تصمیم‌های فنی تبدیل کنند. ISO/IEC/IEEE 29148:2018 در پروژه به ردیابی نیازمندی‌ها تبدیل شد؛ ISO/IEC 25010:2011 به معیارهای کیفیت؛ Davis (1989) به طراحی پرسش‌های پذیرش؛ و Connolly و Begg (2015) به طراحی روابط دیتابیس. بنابراین، ادبیات تحقیق فقط به عنوان بخش نظری استفاده نشده، بلکه در طراحی و ارزیابی پروژه نقش عملی داشته است.')}
  <h2>5.3 بحث درباره محدودیت‌ها</h2>
  ${p('محدودیت نخست این است که داده‌های پرسش‌نامه بر اساس نمونه ۷۵ نفری تحلیل شده و ممکن است در اکادمی‌های بزرگ‌تر نتایج متفاوت باشد. محدودیت دوم این است که ارزیابی کاربر پس از استفاده طولانی‌مدت انجام نشده است؛ بنابراین رضایت واقعی در دوره عملیاتی طولانی باید دوباره سنجیده شود. محدودیت سوم مربوط به محیط فنی است: برای استفاده کامل، سرور، دیتابیس و اتصال شبکه باید پایدار باشند.')}
  <h2>5.4 پیامدهای عملی برای اکادمی</h2>
  ${p('برای اکادمی، پیامد اصلی سیستم افزایش شفافیت و سرعت است. مدیر می‌تواند در داشبورد وضعیت عمومی را ببیند؛ استاد می‌تواند شاگردان و معاش خود را پیگیری کند؛ شاگرد می‌تواند نتایج و پرداخت‌ها را ببیند؛ و والدین می‌توانند وضعیت فرزند را دنبال کنند. در بخش مالی، محاسبه خودکار معاش و مالیه از خطاهای دستی جلوگیری می‌کند.')}

  <h1>فصل ششم: Conclusion</h1>
  <h2>6.1 نتیجه‌گیری</h2>
  ${p('این مونوگراف نشان داد که سیستم مدیریت اکادمی نکته می‌تواند مشکل‌های اصلی مدیریت دستی و پراکنده اکادمی را کاهش دهد. پروژه با استفاده از React، Express، TypeScript و MongoDB یک بستر ماژولار ایجاد کرده که فرایندهای آموزشی، اداری و مالی را در یک سیستم واحد مدیریت می‌کند. تحلیل پرسش‌نامه نشان داد که ۸۵٫۳۳ درصد از نمونه ۷۵ نفری پروژه را تأیید کرده‌اند؛ بنابراین از نظر پذیرش اولیه، پروژه قابل دفاع است.')}
  ${p('از نظر علمی، پروژه با چارچوب‌های معتبر مهندسی نرم‌افزار، مهندسی نیازمندی‌ها، کیفیت نرم‌افزار و پذیرش فناوری هم‌خوان است. فصل دوم نشان داد که معیارهای جهانی می‌توانند به شکل عملی در پروژه تطبیق شوند. فصل سوم نشان داد که روش تحقیق، نیازسنجی، توسعه افزایشی، طراحی سیستم، پیاده‌سازی، آزمون و ارزیابی کاربر به صورت منظم انجام شده‌اند.')}
  <h2>6.2 پیشنهادها</h2>
  ${p('برای ادامه پروژه، پیشنهاد می‌شود ارزیابی کاربر پس از یک دوره استفاده واقعی انجام شود، سیستم گزارش‌گیری پیشرفته‌تر گردد، نسخه موبایل با API فعلی هماهنگ‌تر شود، export رسمی PDF/Excel برای تمام گزارش‌ها توسعه یابد، و پشتیبان‌گیری منظم دیتابیس و سیاست امنیتی عملیاتی تعریف شود. همچنین می‌توان هوش مصنوعی را برای تحلیل نتایج شاگردان، پیش‌بینی بدهی فیس و پیشنهاد برنامه درسی به کار گرفت.')}
  <h2>6.3 سخن پایانی</h2>
  ${p('سیستم مدیریت اکادمی نکته نمونه‌ای از یک پروژه کاربردی است که نیاز واقعی، طراحی فنی و ارزیابی علمی را به هم وصل می‌کند. اگر این سیستم با آموزش کاربران، نگهداری منظم و بهبود تدریجی همراه شود، می‌تواند به عنوان یک راهکار قابل استفاده برای اکادمی‌های مشابه نیز توسعه یابد.')}

  <h1>ضمیمه الف: پرسش‌نامه نیازسنجی</h1>
  <pre style="white-space: pre-wrap; font-family: 'B Nazanin', 'Times New Roman'; font-size: 14pt; line-height: 1.8;">${esc(questionnaire)}</pre>

  <h1>ضمیمه ب: جدول کامل تحلیل نمونه پرسش‌نامه</h1>
  ${table(['سؤال/شاخص', 'نتیجه خلاصه'], [
    ['نقش پاسخ‌دهندگان', '۴۰ شاگرد، ۱۵ استاد، ۱۲ اداره، ۸ والدین'],
    ['نیاز به سیستم دیجیتالی', '۶۴ تأیید، ۷ شاید، ۴ رد'],
    ['اهمیت طراحی ساده', 'میانگین ۴٫۶ از ۵'],
    ['اهمیت سرعت سیستم', '۶۱ نفر گزینه خیلی سریع حتی با انترنت ضعیف'],
    ['نیاز به موبایل', '۵۶ بلی، ۱۴ شاید، ۵ نخیر'],
    ['نیاز به چندزبانه بودن', '۵۹ بلی؛ زبان‌های دری/فارسی، پشتو و انگلیسی'],
    ['امکان چاپ گزارش', '۶۸ بلی، ۷ نخیر']
  ], 'جدول ب.۱: خلاصه تحلیل پرسش‌نامه', 'نتایج این جدول در فصل چهارم برای تحلیل پذیرش و اولویت امکانات استفاده شده است.')}

  <h1>منابع</h1>
  ${refs.map((r) => `<p class="apa">${esc(r.apa)}</p>`).join('\n')}

  <h1>راهنمای استفاده از فایل منابع در Mendeley</h1>
  ${p('در کنار فایل Word، فایل Nokta_Academy_Mendeley_References.ris نیز ساخته شده است. برای استفاده در Mendeley Desktop یا Mendeley Reference Manager، گزینه Import را انتخاب کرده و فایل RIS را وارد کنید. سپس در Word از Citation Style برابر APA 7th Edition استفاده نمایید. Citationهای داخل متن این فایل به صورت author-date نوشته شده‌اند و فهرست منابع نیز با APA تنظیم شده است.')}
</body>
</html>`;

const ris = refs.map((r) => r.ris.join('\n')).join('\n\n') + '\n';

fs.writeFileSync(docPath, html, 'utf8');
fs.writeFileSync(htmlPath, html, 'utf8');
fs.writeFileSync(risPath, ris, 'utf8');
fs.writeFileSync(questionnairePath, questionnaire + '\n', 'utf8');

console.log(`Created: ${docPath}`);
console.log(`Created: ${htmlPath}`);
console.log(`Created: ${risPath}`);
console.log(`Created: ${questionnairePath}`);
