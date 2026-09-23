const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  ImageRun,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableOfContents,
  TableRow,
  TextRun,
  WidthType,
} = require('docx');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'Monograph');
const diagramsDir = path.join(outDir, 'diagrams_dari');
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(diagramsDir, { recursive: true });

const outputDocx = path.join(outDir, 'Last_Mono_Expanded_Dari.docx');
const outputRis = path.join(outDir, 'Last_Mono_Expanded_Dari_Mendeley_References.ris');
const citationMapPath = path.join(outDir, 'Last_Mono_Expanded_Dari_Citation_Map.md');
const inch = 1440;
const citationRecords = [];

function writeSvg(name, content) {
  fs.writeFileSync(path.join(diagramsDir, name), content, 'utf8');
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function diagramBox(title, x, y, lines, color = '#2563eb', w = 230, h = 140) {
  return `
    <g>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="#ffffff" stroke="${color}" stroke-width="2.5"/>
      <rect x="${x}" y="${y}" width="${w}" height="34" rx="12" fill="${color}"/>
      <text x="${x + w / 2}" y="${y + 23}" text-anchor="middle" font-size="16" font-weight="700" fill="#fff">${esc(title)}</text>
      ${lines.map((l, i) => `<text x="${x + w - 12}" y="${y + 58 + i * 19}" text-anchor="end" font-size="13.5" fill="#111827">${esc(l)}</text>`).join('')}
    </g>`;
}

function createDariDiagrams() {
  writeSvg('architecture_dari.svg', `
  <svg xmlns="http://www.w3.org/2000/svg" width="1100" height="620" viewBox="0 0 1100 620">
    <defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#475569"/></marker></defs>
    <rect width="1100" height="620" fill="#fff"/>
    <text x="550" y="42" text-anchor="middle" font-size="28" font-weight="700" fill="#0f172a">معماری سیستم مدیریت اکادمی نکته</text>
    ${diagramBox('لایه کاربر', 70, 105, ['اپلیکیشن ویب React', 'نسخه موبایل / Flutter', 'رابط چندزبانه'], '#2563eb')}
    ${diagramBox('لایه API', 435, 105, ['Node.js و Express.js', 'اعتبارسنجی و منطق تجارتی', 'سرویس‌ها و مسیرها'], '#16a34a')}
    ${diagramBox('لایه دیتابیس', 800, 105, ['MongoDB', 'Mongoose Models', 'ذخیره معلومات اکادمی'], '#ea580c')}
    ${diagramBox('لایه امنیت', 250, 345, ['JWT Authentication', 'Role-Based Access', 'Permission Middleware'], '#7c3aed')}
    ${diagramBox('لایه راپوردهی', 620, 345, ['داشبوردها', 'مالی، معاشات، مالیه', 'چارت‌ها و چاپ راپور'], '#be123c')}
    <line x1="300" y1="170" x2="435" y2="170" stroke="#475569" stroke-width="2.5" marker-end="url(#arrow)"/>
    <line x1="665" y1="170" x2="800" y2="170" stroke="#475569" stroke-width="2.5" marker-end="url(#arrow)"/>
    <line x1="520" y1="245" x2="365" y2="345" stroke="#475569" stroke-width="2.5" marker-end="url(#arrow)"/>
    <line x1="580" y1="245" x2="730" y2="345" stroke="#475569" stroke-width="2.5" marker-end="url(#arrow)"/>
    <text x="550" y="550" text-anchor="middle" font-size="18" fill="#334155">ماژول‌ها: شاگردان، استادان، صنف‌ها، مضامین، حضور، نتایج، پرداخت‌ها، معاشات، گزارش‌ها، پیام‌ها و اعلان‌ها</text>
  </svg>`);

  writeSvg('erd_dari.svg', `
  <svg xmlns="http://www.w3.org/2000/svg" width="1180" height="850" viewBox="0 0 1180 850">
    <defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#475569"/></marker></defs>
    <rect width="1180" height="850" fill="#f8fafc"/>
    <text x="590" y="42" text-anchor="middle" font-size="28" font-weight="700" fill="#0f172a">ERD دیتابیس سیستم مدیریت اکادمی نکته</text>
    ${diagramBox('User / کاربر', 60, 90, ['_id کلید اصلی', 'نام، ایمیل، نقش', 'صلاحیت‌ها', 'branchId'], '#2563eb')}
    ${diagramBox('Student / شاگرد', 350, 90, ['studentId', 'classId', 'subjectId', 'teacherId', 'feeAmount'], '#16a34a')}
    ${diagramBox('Class / صنف', 640, 90, ['className', 'assignedSubjects', 'assignedTeachers', 'capacity'], '#ea580c')}
    ${diagramBox('Subject / مضمون', 910, 90, ['title, code', 'classId', 'teacher', 'feeAmount'], '#7c3aed')}
    ${diagramBox('Payment / پرداخت', 350, 315, ['studentId', 'teacherId', 'amount', 'taxAmount', 'netAmount'], '#dc2626')}
    ${diagramBox('SalaryRecord / معاش', 60, 315, ['userId', 'grossSalary', 'taxAmount', 'netSalary', 'hijriMonth'], '#0f766e')}
    ${diagramBox('Attendance / حاضری', 60, 555, ['studentId', 'classId', 'status', 'date'], '#64748b')}
    ${diagramBox('ExamResult / نتیجه', 350, 555, ['student', 'exam', 'score', 'grade'], '#0891b2')}
    ${diagramBox('Message / پیام', 640, 555, ['senderId', 'recipientIds', 'body', 'status'], '#be123c')}
    <line x1="290" y1="162" x2="350" y2="162" stroke="#475569" stroke-width="2" marker-end="url(#arrow)"/>
    <line x1="580" y1="162" x2="640" y2="162" stroke="#475569" stroke-width="2" marker-end="url(#arrow)"/>
    <line x1="870" y1="162" x2="910" y2="162" stroke="#475569" stroke-width="2" marker-end="url(#arrow)"/>
    <line x1="455" y1="230" x2="455" y2="315" stroke="#475569" stroke-width="2" marker-end="url(#arrow)"/>
    <line x1="350" y1="385" x2="290" y2="385" stroke="#475569" stroke-width="2" marker-end="url(#arrow)"/>
    <line x1="165" y1="455" x2="165" y2="555" stroke="#475569" stroke-width="2" marker-end="url(#arrow)"/>
    <line x1="455" y1="455" x2="455" y2="555" stroke="#475569" stroke-width="2" marker-end="url(#arrow)"/>
    <line x1="580" y1="625" x2="640" y2="625" stroke="#475569" stroke-width="2" marker-end="url(#arrow)"/>
  </svg>`);

  writeSvg('use_case_dari.svg', `
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="820" viewBox="0 0 1200 820">
    <rect width="1200" height="820" fill="#ffffff"/>
    <text x="600" y="42" text-anchor="middle" font-size="28" font-weight="700" fill="#0f172a">Use Case Diagram سیستم مدیریت اکادمی نکته</text>
    <rect x="220" y="80" width="760" height="665" rx="18" fill="#f8fafc" stroke="#94a3b8" stroke-width="2"/>
    <text x="600" y="112" text-anchor="middle" font-size="18" font-weight="700" fill="#334155">محدوده سیستم</text>
    ${diagramBox('شاگرد', 35, 150, ['دیدن تقسیم اوقات', 'دیدن نتایج', 'دیدن پرداخت‌ها'], '#2563eb', 150, 120)}
    ${diagramBox('والدین', 35, 430, ['پیگیری فرزند', 'دیدن نتایج', 'دیدن فیس'], '#16a34a', 150, 120)}
    ${diagramBox('استاد', 1010, 150, ['حاضری', 'نتایج', 'معاش'], '#7c3aed', 150, 120)}
    ${diagramBox('اداره', 1010, 430, ['ثبت شاگرد', 'پرداخت‌ها', 'گزارش‌ها'], '#ea580c', 150, 120)}
    ${diagramBox('سوپر ادمین', 1010, 635, ['نقش‌ها', 'صلاحیت‌ها', 'تمام گزارش‌ها'], '#dc2626', 150, 120)}
    ${diagramBox('ثبت و مدیریت شاگردان', 310, 145, [''], '#2563eb', 230, 60)}
    ${diagramBox('صنف و مضمون', 310, 230, [''], '#2563eb', 230, 60)}
    ${diagramBox('حضور و غیاب', 310, 315, [''], '#2563eb', 230, 60)}
    ${diagramBox('امتحان و نتایج', 310, 400, [''], '#2563eb', 230, 60)}
    ${diagramBox('پرداخت فیس', 310, 485, [''], '#2563eb', 230, 60)}
    ${diagramBox('پیام و اعلان', 310, 570, [''], '#2563eb', 230, 60)}
    ${diagramBox('مدیریت استادان', 650, 145, [''], '#0f766e', 230, 60)}
    ${diagramBox('تقسیم اوقات', 650, 230, [''], '#0f766e', 230, 60)}
    ${diagramBox('معاش و مالیه', 650, 315, [''], '#0f766e', 230, 60)}
    ${diagramBox('راپورهای مالی', 650, 400, [''], '#0f766e', 230, 60)}
    ${diagramBox('داشبورد تحلیلی', 650, 485, [''], '#0f766e', 230, 60)}
    ${diagramBox('کنترول نقش و صلاحیت', 650, 570, [''], '#0f766e', 230, 60)}
  </svg>`);

  writeSvg('class_diagram_dari.svg', `
  <svg xmlns="http://www.w3.org/2000/svg" width="1180" height="820" viewBox="0 0 1180 820">
    <rect width="1180" height="820" fill="#f8fafc"/>
    <text x="590" y="42" text-anchor="middle" font-size="28" font-weight="700" fill="#0f172a">Class Diagram مدل‌ها و سرویس‌های اصلی</text>
    ${diagramBox('User', 50, 90, ['_id', 'name', 'email', 'role', 'permissionKeys'], '#2563eb', 245, 185)}
    ${diagramBox('Student', 340, 90, ['studentId', 'classId', 'subjectId', 'teacherId', 'feeAmount'], '#16a34a', 245, 185)}
    ${diagramBox('TeacherProfile', 630, 90, ['teacherId', 'assignedClasses', 'assignedSubjects', 'percentageRate'], '#7c3aed', 245, 185)}
    ${diagramBox('Payment', 920, 90, ['paymentFor', 'studentId', 'teacherId', 'amount', 'netAmount'], '#dc2626', 245, 185)}
    ${diagramBox('ClassModel', 50, 330, ['className', 'assignedSubjects', 'assignedTeachers', 'capacity'], '#ea580c', 245, 185)}
    ${diagramBox('Subject', 340, 330, ['title', 'code', 'classId', 'teacher', 'feeAmount'], '#0f766e', 245, 185)}
    ${diagramBox('SalaryRecord', 630, 330, ['userId', 'grossSalary', 'taxAmount', 'netSalary'], '#0891b2', 245, 185)}
    ${diagramBox('PayrollService', 920, 330, ['sumCommissionBase()', 'calculateSalaryRecord()', 'calculateTax()'], '#be123c', 245, 185)}
    ${diagramBox('Attendance', 195, 575, ['studentId', 'classId', 'status', 'date'], '#64748b', 245, 160)}
    ${diagramBox('ExamResult', 485, 575, ['student', 'exam', 'score', 'grade'], '#9333ea', 245, 160)}
    ${diagramBox('NotificationMessage', 775, 575, ['senderId', 'recipientIds', 'body', 'status'], '#f59e0b', 245, 160)}
  </svg>`);

  writeSvg('methodology_dari.svg', `
  <svg xmlns="http://www.w3.org/2000/svg" width="1100" height="380" viewBox="0 0 1100 380">
    <rect width="1100" height="380" fill="#fff"/>
    <text x="550" y="40" text-anchor="middle" font-size="26" font-weight="700" fill="#0f172a">میتودولوژی تحقیق و توسعه</text>
    ${diagramBox('تحلیل مشکل', 45, 140, ['بررسی وضعیت فعلی'], '#2563eb', 190, 82)}
    ${diagramBox('نیازسنجی', 260, 140, ['پرسشنامه و جریان کار'], '#16a34a', 190, 82)}
    ${diagramBox('طراحی سیستم', 475, 140, ['معماری، ERD، UI'], '#ea580c', 190, 82)}
    ${diagramBox('پیاده‌سازی', 690, 140, ['React، Express، MongoDB'], '#7c3aed', 190, 82)}
    ${diagramBox('ارزیابی', 905, 140, ['تست و نظریات کاربران'], '#dc2626', 190, 82)}
  </svg>`);
}

const references = JSON.parse(fs.readFileSync(path.join(outDir, 'Last_Mono_Expanded_Mendeley_References.ris'), 'utf8')
  ? '[]'
  : '[]');

const refsApa = [
  'Aldowah, H., Al-Samarraie, H., & Fauzy, W. M. (2019). Educational data mining and learning analytics for 21st century higher education: A review and synthesis. Telematics and Informatics, 37, 13–49. https://doi.org/10.1016/j.tele.2019.01.007',
  'Al-Samarraie, H., & Saeed, N. (2022). Understanding the adoption of smart educational systems: A systematic literature review. Education and Information Technologies, 27(1), 611–639. https://doi.org/10.1007/s10639-021-10711-3',
  'American Psychological Association. (2020). Publication manual of the American Psychological Association (7th ed.). American Psychological Association. https://doi.org/10.1037/0000165-000',
  'Bass, L., Clements, P., & Kazman, R. (2012). Software architecture in practice (3rd ed.). Addison-Wesley.',
  'Brooke, J. (1996). SUS: A quick and dirty usability scale. In P. W. Jordan, B. Thomas, B. A. Weerdmeester, & I. L. McClelland (Eds.), Usability evaluation in industry (pp. 189–194). Taylor & Francis.',
  'Connolly, T. M., & Begg, C. E. (2015). Database systems: A practical approach to design, implementation, and management (6th ed.). Pearson.',
  'Creswell, J. W., & Creswell, J. D. (2018). Research design: Qualitative, quantitative, and mixed methods approaches (5th ed.). SAGE Publications.',
  'Davis, F. D. (1989). Perceived usefulness, perceived ease of use, and user acceptance of information technology. MIS Quarterly, 13(3), 319–340. https://doi.org/10.2307/249008',
  'Delen, D. (2010). A comparative analysis of machine learning techniques for student retention management. Decision Support Systems, 49(4), 498–506. https://doi.org/10.1016/j.dss.2010.06.003',
  'DeLone, W. H., & McLean, E. R. (2003). The DeLone and McLean model of information systems success: A ten-year update. Journal of Management Information Systems, 19(4), 9–30. https://doi.org/10.1080/07421222.2003.11045748',
  'Dikert, K., Paasivaara, M., & Lassenius, C. (2016). Challenges and success factors for large-scale agile transformations: A systematic literature review. Journal of Systems and Software, 119, 87–108. https://doi.org/10.1016/j.jss.2016.06.013',
  'Fowler, M. (2004). UML distilled: A brief guide to the standard object modeling language (3rd ed.). Addison-Wesley.',
  'Garrett, J. J. (2011). The elements of user experience: User-centered design for the web and beyond (2nd ed.). New Riders.',
  'Hevner, A. R., March, S. T., Park, J., & Ram, S. (2004). Design science in information systems research. MIS Quarterly, 28(1), 75–105.',
  'International Organization for Standardization, & International Electrotechnical Commission. (2011). Systems and software engineering — Systems and software Quality Requirements and Evaluation (SQuaRE) — System and software quality models (ISO/IEC 25010:2011).',
  'International Organization for Standardization, International Electrotechnical Commission, & Institute of Electrical and Electronics Engineers. (2018). Systems and software engineering — Life cycle processes — Requirements engineering (ISO/IEC/IEEE 29148:2018).',
  'Likert, R. (1932). A technique for the measurement of attitudes. Archives of Psychology, 22(140), 1–55.',
  'Nielsen, J. (1994). Usability engineering. Morgan Kaufmann.',
  'Pressman, R. S., & Maxim, B. R. (2020). Software engineering: A practitioner’s approach (9th ed.). McGraw-Hill Education.',
  'Romero, C., & Ventura, S. (2020). Educational data mining and learning analytics: An updated survey. WIREs Data Mining and Knowledge Discovery, 10(3), e1355. https://doi.org/10.1002/widm.1355',
  'Siemens, G. (2013). Learning analytics: The emergence of a discipline. American Behavioral Scientist, 57(10), 1380–1400. https://doi.org/10.1177/0002764213498851',
  'Sommerville, I. (2016). Software engineering (10th ed.). Pearson.',
  'Venkatesh, V., Morris, M. G., Davis, G. B., & Davis, F. D. (2003). User acceptance of information technology: Toward a unified view. MIS Quarterly, 27(3), 425–478.',
];

function r(text, opts = {}) {
  return new TextRun({
    text,
    font: opts.english ? 'Times New Roman' : 'B Nazanin',
    size: opts.size ?? 24,
    bold: opts.bold,
    italics: opts.italics,
    color: opts.color,
  });
}

function p(text, cites = []) {
  if (cites.length) citationRecords.push({ text, cites });
  return new Paragraph({
    children: [r(text)],
    alignment: AlignmentType.RIGHT,
    spacing: { after: 150, line: 360 },
  });
}

function pEn(text) {
  return new Paragraph({
    children: [r(text, { english: true, size: 22 })],
    alignment: AlignmentType.LEFT,
    indent: { hanging: 720 },
    spacing: { after: 120 },
  });
}

function h1(text) { return new Paragraph({ text, heading: HeadingLevel.HEADING_1, alignment: AlignmentType.RIGHT, spacing: { before: 300, after: 180 } }); }
function h2(text) { return new Paragraph({ text, heading: HeadingLevel.HEADING_2, alignment: AlignmentType.RIGHT, spacing: { before: 220, after: 140 } }); }
function h3(text) { return new Paragraph({ text, heading: HeadingLevel.HEADING_3, alignment: AlignmentType.RIGHT, spacing: { before: 180, after: 120 } }); }
function pb() { return new Paragraph({ children: [new PageBreak()] }); }
function cap(text) { return new Paragraph({ children: [r(text, { bold: true, color: '1F4E79' })], alignment: AlignmentType.CENTER, spacing: { before: 140, after: 80 } }); }
function note(text) { return new Paragraph({ children: [r(text, { size: 20, color: '555555' })], alignment: AlignmentType.CENTER, spacing: { after: 120 } }); }

function table(headers, rows, title, tableNote = '') {
  const border = { style: BorderStyle.SINGLE, size: 1, color: '666666' };
  return [
    cap(title),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: headers.map((x) => new TableCell({ shading: { fill: 'D9EAF7' }, borders: { top: border, bottom: border, left: border, right: border }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [r(x, { bold: true })] })] })) }),
        ...rows.map((row) => new TableRow({ children: row.map((x) => new TableCell({ borders: { top: border, bottom: border, left: border, right: border }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [r(String(x), { size: 21 })] })] })) })),
      ],
    }),
    tableNote ? note(tableNote) : new Paragraph(''),
  ];
}

function img(name, width = 620, height = 380) {
  const data = fs.readFileSync(path.join(diagramsDir, name));
  return new Paragraph({
    children: [new ImageRun({ type: 'png', data, transformation: { width, height } })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 160 },
  });
}

async function main() {
  createDariDiagrams();
  for (const svg of ['architecture_dari.svg', 'erd_dari.svg', 'use_case_dari.svg', 'class_diagram_dari.svg', 'methodology_dari.svg']) {
    await sharp(path.join(diagramsDir, svg)).png().toFile(path.join(diagramsDir, svg.replace(/\.svg$/i, '.png')));
  }
  for (const name of ['project_acceptance_chart.png', 'feature_priority_chart.png', 'user_evaluation_chart.png']) {
    fs.copyFileSync(path.join(outDir, 'diagrams', name), path.join(diagramsDir, name));
  }

  const c = [];
  c.push(
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 900, after: 180 }, children: [r('پوهنتون کابل', { bold: true, size: 32 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 180 }, children: [r('پوهنځی کمپیوتر ساینس', { bold: true, size: 30 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 420 }, children: [r('دیپارتمنت انجینری نرم‌افزار', { bold: true, size: 28 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 280 }, children: [r('سیستم مدیریت اکادمی نکته', { bold: true, size: 40, color: '1F4E79' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 420 }, children: [r('مونوگراف نهایی پروژه', { bold: true, size: 30 })] }),
    ...table(['محصل', 'نام پدر', 'دیپارتمنت', 'سال تحصیلی', 'مدت پروژه'], [
      ['محمد میوند عثمانی', 'محمد زمان', 'انجینری نرم‌افزار', '۲۰۲۵', 'دو سمستر'],
      ['محمد خالد ساحل', 'ولی محمد', 'انجینری نرم‌افزار', '۲۰۲۵', 'دو سمستر'],
    ], 'معلومات محصلین', 'مدت پروژه از ۲۰۲۵/۱۰/۱۵ الی ۲۰۲۶/۰۵/۰۴ در نظر گرفته شده است.'),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 300 }, children: [r('استاد رهنما: ________________________________', { size: 24 })] }),
    pb(),
  );

  c.push(
    h1('چکیده'),
    p('اکادمی نکته با مشکلات اداری و آموزشی مانند ثبت‌های دستی، فایل‌های پراکنده، تأخیر در راپوردهی، ضعف در ارتباطات، و نبود شفافیت مالی روبه‌رو است. این مونوگراف سیستم مدیریت اکادمی نکته یا NAMS را معرفی می‌کند؛ یک پلتفرم یکپارچه ویب و موبایل‌محور که برای خودکارسازی ثبت‌نام شاگردان، مدیریت صنف‌ها و مضامین، حضور و غیاب، نمرات، اعلان‌ها، پرداخت فیس، معاش استادان، محاسبه مالیه، راپوردهی، و کنترول صلاحیت‌ها طراحی شده است. سیستم با استفاده از Node.js، Express.js، MongoDB، React.js و ساختار آماده برای موبایل ساخته شده و همچنان زمینه را برای تحلیل‌های هوش مصنوعی و بررسی عملکرد شاگردان آماده می‌سازد. میتودولوژی پروژه ترکیبی از Agile Scrum و مراحل منظم SDLC است. نیازمندی‌ها از طریق پرسشنامه، تحلیل جریان کاری، تحلیل نقش‌ها و بررسی پروپوزل جمع‌آوری شده است. از جامعه ۱۰۰ نفری، ۷۵ پاسخ معتبر انتخاب شد که از میان آن‌ها ۶۴ نفر پروژه را تأیید کردند؛ یعنی ۸۵.۳۳ درصد. طراحی سیستم شامل معماری، Use Case، Class Diagram، ERD دیتابیس، نیازمندی‌های کارکردی و غیرکارکردی، امنیت و تست است. نتایج نشان می‌دهد که NAMS می‌تواند کارهای دستی را کم سازد، دقت معلومات را بلند ببرد، ارتباطات را منظم کند، شفافیت مالی را تقویت نماید و تصمیم‌گیری مبتنی بر داده را برای اکادمی ممکن سازد.'),
    pb(),
    h1('فهرست مطالب'),
    new TableOfContents('فهرست مطالب', { hyperlink: true, headingStyleRange: '1-3' }),
    p('یادداشت: بعد از باز کردن سند در Microsoft Word، روی فهرست مطالب راست‌کلیک کرده و گزینه Update Field را انتخاب کنید.'),
    pb(),
    h1('فهرست شکل‌ها'),
    ...table(['شماره شکل', 'عنوان'], [
      ['شکل ۳.۱', 'Use Case Diagram سیستم مدیریت اکادمی نکته'],
      ['شکل ۴.۱', 'معماری لایه‌ای NAMS'],
      ['شکل ۴.۲', 'ERD دیتابیس'],
      ['شکل ۴.۳', 'Class Diagram'],
      ['شکل ۴.۴', 'جریان کاری Agile-SDLC'],
    ], 'فهرست شکل‌ها', 'تمام شکل‌ها به صورت PNG داخل Word درج شده و نسخه جداگانه آن‌ها نیز در فولدر diagrams_dari موجود است.'),
    h1('فهرست جدول‌ها'),
    ...table(['شماره جدول', 'عنوان'], [
      ['جدول ۱.۱', 'همخوانی سوالات تحقیق و اهداف'],
      ['جدول ۲.۱', 'مقایسه سیستم‌های موجود'],
      ['جدول ۳.۱', 'میتودولوژی نیازسنجی'],
      ['جدول ۳.۲', 'نیازمندی‌های کارکردی'],
      ['جدول ۳.۳', 'نیازمندی‌های غیرکارکردی'],
      ['جدول ۴.۱', 'تکنالوژی‌های استفاده‌شده و دلیل انتخاب'],
    ], 'فهرست جدول‌ها', 'جدول‌ها به صورت واقعی Word Table ساخته شده و قابل ویرایش هستند.'),
    pb(),
    h1('فهرست اختصارات'),
    ...table(['اختصار', 'معنی'], [
      ['AI', 'هوش مصنوعی'],
      ['API', 'رابط برنامه‌نویسی اپلیکیشن'],
      ['CRUD', 'ایجاد، خواندن، ویرایش، حذف'],
      ['DBMS', 'سیستم مدیریت دیتابیس'],
      ['ERD', 'دیاگرام رابطه موجودیت‌ها'],
      ['FR', 'نیازمندی کارکردی'],
      ['JWT', 'توکن احراز هویت JSON'],
      ['LMS', 'سیستم مدیریت یادگیری'],
      ['NAMS', 'سیستم مدیریت اکادمی نکته'],
      ['NFR', 'نیازمندی غیرکارکردی'],
      ['RBAC', 'کنترول دسترسی بر اساس نقش'],
      ['SDLC', 'چرخه حیات توسعه سیستم'],
      ['UI', 'رابط کاربر'],
      ['UX', 'تجربه کاربر'],
    ], 'فهرست اختصارات', 'اختصارات مهم پروژه به شکل الفبایی تنظیم شده‌اند.'),
    pb(),
  );

  c.push(
    h1('فصل اول: مقدمه'),
    h2('۱.۱ پس‌منظر تحقیق'),
    p('تحول دیجیتالی برای نهادهای آموزشی به یک نیاز جدی تبدیل شده است؛ زیرا مدیریت معلومات دقیق، سرعت در کارهای اداری، شفافیت مالی، و ارتباطات منظم بدون یک سیستم دیجیتالی دشوار می‌باشد. در بسیاری از نهادهای آموزشی در کشورهای در حال توسعه، از جمله افغانستان، هنوز هم ثبت‌نام، تقسیم اوقات، پرداخت فیس، نمرات و حضور و غیاب به شکل کاغذی یا در فایل‌های جداگانه انجام می‌شود. این روش در ابتدا ساده معلوم می‌شود، اما وقتی تعداد شاگردان، استادان، پرداخت‌ها و گزارش‌ها زیاد شود، باعث خطا، تکرار کار و تأخیر در تصمیم‌گیری می‌گردد. تحقیقات در بخش Learning Analytics و Educational Data Mining نشان می‌دهد که معلومات آموزشی زمانی ارزشمند می‌شود که به شکل منظم جمع‌آوری و به معلومات قابل استفاده تبدیل شود (Aldowah et al., 2019; Romero & Ventura, 2020).', ['Aldowah et al., 2019', 'Romero & Ventura, 2020']),
    p('سیستم مدیریت اکادمی نکته به عنوان یک پلتفرم یکپارچه طراحی شده است تا عملیات آموزشی، اداری، ارتباطی و مالی اکادمی را در یک محیط واحد مدیریت کند. این سیستم ثبت‌نام شاگردان، صنف‌ها، مضامین، حاضری، امتحانات، نتایج، اعلان‌ها، پرداخت‌ها، معاش استادان، مالیه، گزارش مالی و داشبورد مدیریتی را پشتیبانی می‌کند. این بخش دقیقاً با پروپوزل پروژه همخوان است که هدف آن ساخت یک سیستم آنلاین ویب و موبایل با Node.js، Express.js، MongoDB، React.js و Flutter-ready access است.'),
    p('از نگاه انجینری نرم‌افزار، اهمیت پروژه در این است که یک مشکل واقعی اکادمی را به یک سیستم قابل استفاده تبدیل می‌کند. ادبیات انجینری نرم‌افزار تأکید می‌کند که سیستم موفق باید بر اساس نیازمندی‌های واضح ساخته شود، معماری قابل نگهداری داشته باشد، و با تست و ارزیابی بررسی گردد (Pressman & Maxim, 2020; Sommerville, 2016).', ['Pressman & Maxim, 2020', 'Sommerville, 2016']),
    h2('۱.۲ بیان مشکل'),
    p('اکادمی نکته به دلیل نبود یک سیستم مرکزی دیجیتالی با مشکلات مختلف اداری و آموزشی روبه‌رو است. عملیات مهم مانند ثبت شاگردان، مدیریت حضور، نمرات، تقسیم اوقات، پرداخت فیس، محاسبه معاش استادان و گزارش‌دهی یا به شکل دستی انجام می‌شود یا در فایل‌های جداگانه نگهداری می‌گردد. این پراکندگی باعث ناسازگاری معلومات، دوباره‌کاری، تأخیر در راپوردهی و کاهش شفافیت می‌شود.'),
    p('مشکل دوم ارتباطات است. شاگردان، استادان، والدین و اداره به یک پلتفرم مشترک برای اعلان‌ها، تقسیم اوقات، نتایج، پیام‌ها و بازخورد علمی نیاز دارند. نبود چنین پلتفرمی باعث می‌شود اطلاع‌رسانی دیر انجام شود یا معلومات از بین برود. تحقیقات سیستم‌های معلوماتی نشان می‌دهد که کیفیت سیستم و کیفیت معلومات در رضایت کاربران و موفقیت سیستم نقش مهم دارد (DeLone & McLean, 2003; Venkatesh et al., 2003).', ['DeLone & McLean, 2003', 'Venkatesh et al., 2003']),
    p('مشکل سوم نبود تحلیل علمی از عملکرد شاگردان است. در پروپوزل ذکر شده بود که سیستم باید زمینه تحلیل هوش مصنوعی و پیش‌بینی عملکرد شاگردان را فراهم کند. در این پروژه، تمرکز اصلی روی مدیریت و ساختار داده است، اما دیتابیس و ماژول‌های نتایج، حضور و تقسیم اوقات زمینه لازم را برای توسعه آینده AI فراهم می‌سازد.'),
    h2('۱.۳ اهداف تحقیق'),
    h3('۱.۳.۱ هدف عمومی'),
    p('هدف عمومی این پروژه طراحی، توسعه و پیاده‌سازی یک سیستم یکپارچه ویب و موبایل‌محور برای اکادمی نکته است که عملیات آموزشی، اداری، ارتباطی و مالی را خودکار ساخته و زمینه تحلیل‌های هوش مصنوعی و حمایت شخصی‌سازی‌شده از یادگیری را آماده سازد.'),
    h3('۱.۳.۲ اهداف اختصاصی'),
    ...table(['سوال تحقیق', 'هدف همخوان', 'شواهد در پروژه'], [
      ['چگونه سیستم آنلاین یکپارچه می‌تواند کارایی عملیاتی و یادگیری شخصی‌سازی‌شده را بهتر سازد؟', 'ساخت پلتفرم مرکزی برای مدیریت آموزشی، اداری، مالی و داده‌های تحلیلی', 'معماری، داشبورد، ماژول‌ها، مدل داده و ارزیابی'],
      ['کدام ناکارایی‌های فعلی با دیجیتالی‌سازی حل می‌شود؟', 'تحلیل جریان‌های دستی و مشکلات فعلی', 'Problem Statement، Requirements و نتایج پرسشنامه'],
      ['تحلیل‌های AI چگونه می‌تواند نظارت علمی را بهتر کند؟', 'آماده‌سازی داده‌های ساختارمند برای AI آینده', 'معلومات شاگرد، حاضری، نتایج و تقسیم اوقات'],
      ['بهترین روش برای ارتباطات و شفافیت مالی چیست؟', 'پیاده‌سازی پیام‌ها، اعلان‌ها، پرداخت‌ها، معاشات، مالیه و گزارش‌ها', 'ماژول‌های Messages، Payments، Payroll، Finance'],
      ['چگونه Node.js، MongoDB، React و Flutter پلتفرم قابل نگهداری می‌سازند؟', 'طراحی معماری لایه‌ای و ماژولار', 'Architecture Diagram و Technology Stack'],
    ], 'جدول ۱.۱: همخوانی سوالات تحقیق و اهداف', 'این جدول نشان می‌دهد که هر سوال پروپوزل با یک هدف و یک بخش عملی پروژه وصل شده است.'),
    h2('۱.۴ محدوده و محدودیت‌ها'),
    p('محدوده پروژه شامل سیستم ویب با API، ساختار آماده برای موبایل، مدیریت نقش‌ها، ثبت شاگردان، استادان، صنف‌ها، مضامین، تقسیم اوقات، حضور، امتحانات، نتایج، پیام‌ها، اعلان‌ها، پرداخت فیس، معاش استادان، مالیه، گزارش مالی و داشبورد است. کاربران هدف شامل سوپر ادمین، اداره، استاد، شاگرد، والدین، مالک و مدیر شعبه می‌باشند.'),
    p('محدودیت پروژه این است که ارزیابی آن بر اساس جامعه ۱۰۰ نفری و نمونه ۷۵ نفری انجام شده است. بخش AI به شکل کامل مدل پیش‌بینی عملیاتی نشده، اما ساختار داده برای توسعه آینده آن آماده شده است. همچنان استقرار کامل در cloud و ارزیابی بلندمدت در چند اکادمی خارج از محدوده فعلی است.'),
    h2('۱.۵ اهمیت پروژه'),
    p('اهمیت عملی پروژه در کاهش کارهای دستی، افزایش دقت معلومات، شفافیت مالی و سرعت در تصمیم‌گیری است. اهمیت علمی پروژه در این است که مفاهیم انجینری نرم‌افزار، نیازسنجی، طراحی دیتابیس، امنیت، تجربه کاربر و پذیرش فناوری را در یک پروژه واقعی تطبیق می‌کند. اهمیت اجتماعی آن در کمک به دیجیتالی‌سازی سکتور آموزش خصوصی در افغانستان است.'),
    h2('۱.۶ ساختار گزارش'),
    p('فصل اول مقدمه، مشکل، اهداف، محدوده و اهمیت پروژه را بیان می‌کند. فصل دوم ادبیات تحقیق، سیستم‌های مشابه، تکنالوژی‌های جدید و خلاهای تحقیق را بررسی می‌کند. فصل سوم نیازمندی‌ها، میتودولوژی نیازسنجی، نیازمندی‌های کارکردی و غیرکارکردی، Use Case و نیازهای داده را توضیح می‌دهد. فصل چهارم طراحی سیستم، معماری، ERD، Class Diagram، UI/UX، الگوریتم‌ها، امنیت و تست را بیان می‌کند. فصل‌های بعدی نتایج، بحث، نتیجه‌گیری و ضمیمه‌ها را شامل می‌شود.'),
    pb(),
  );

  c.push(
    h1('فصل دوم: مرور ادبیات تحقیق'),
    h2('۲.۱ مفاهیم و اصطلاحات کلیدی'),
    p('مرور ادبیات این پروژه بر مفاهیمی تمرکز دارد که با خود پروژه رابطه مستقیم دارند. سیستم مدیریت اکادمی یک سیستم معلوماتی آموزشی است؛ یعنی فقط یک وب‌سایت نیست، بلکه داده‌های عملیاتی، علمی، مالی و ارتباطی را جمع‌آوری و پردازش می‌کند. مدل موفقیت سیستم‌های معلوماتی DeLone و McLean برای این پروژه مهم است، زیرا کیفیت سیستم، کیفیت معلومات، استفاده، رضایت کاربر و منفعت نهایی را بررسی می‌کند (DeLone & McLean, 2003).', ['DeLone & McLean, 2003']),
    p('Learning Analytics و Educational Data Mining نیز با پروژه رابطه مستقیم دارند؛ چون در پروپوزل بخش AI و تحلیل عملکرد شاگردان ذکر شده است. تحقیقات نشان می‌دهد که معلومات آموزشی وقتی به شکل منظم ذخیره شود می‌تواند برای تشخیص خطر افت تحصیلی، پیشنهادات آموزشی و تصمیم‌گیری مدیریتی استفاده شود (Aldowah et al., 2019; Romero & Ventura, 2020).', ['Aldowah et al., 2019', 'Romero & Ventura, 2020']),
    p('مهندسی نیازمندی‌ها یکی از بخش‌های اصلی پروژه است. استاندارد ISO/IEC/IEEE 29148:2018 بیان می‌کند که نیازمندی‌ها باید واضح، قابل تست، ضروری و قابل ردیابی باشند. در NAMS، نیازمندی‌ها از پروپوزل، پرسشنامه، جریان کاری و بررسی پروژه استخراج شده و به ماژول‌های واقعی وصل شده‌اند (International Organization for Standardization et al., 2018).', ['ISO/IEC/IEEE 29148, 2018']),
    h2('۲.۲ بررسی سیستم‌های مشابه'),
    p('برای فهم بهتر جایگاه NAMS، سیستم‌های مشابه مانند Moodle، Google Classroom، Canvas، openSIS و Fedena بررسی شدند. این سیستم‌ها امکانات مفید دارند، اما هرکدام برای تمام نیازهای اکادمی نکته کافی نیستند. بعضی بیشتر روی محتوای درسی تمرکز دارند، بعضی روی ثبت شاگردان، و بعضی نیاز به تنظیمات یا مصرف زیاد دارند. NAMS تلاش می‌کند مدیریت آموزشی، مالی، معاشات، مالیه، گزارش‌ها و صلاحیت‌ها را در یک سیستم محلی و قابل فهم یکجا بسازد.'),
    ...table(['سیستم', 'امکانات', 'نقاط قوت', 'محدودیت', 'پاسخ NAMS'], [
      ['Moodle', 'مدیریت کورس و آزمون', 'قوی برای آموزش آنلاین', 'ضعیف در معاشات و مالیه محلی', 'اضافه کردن مالی، معاش و گزارش اکادمی'],
      ['Google Classroom', 'صنف آنلاین و وظایف', 'ساده و قابل دسترس', 'مدیریت کامل اکادمی ندارد', 'ثبت شاگرد، پرداخت، داشبورد و گزارش'],
      ['Canvas LMS', 'کورس، نمرات، ادغام‌ها', 'رابط خوب و امکانات زیاد', 'برای اکادمی کوچک پیچیده است', 'طراحی محلی و ساده‌تر'],
      ['openSIS', 'معلومات شاگردان و حضور', 'برای ثبت شاگردان خوب است', 'معاش فیصدی و مالیه ندارد', 'اضافه کردن Payroll و Tax'],
      ['NAMS', 'آموزشی، مالی، معاشات، نقش‌ها، داشبورد', 'همخوان با نیاز اکادمی نکته', 'AI پیش‌بینی هنوز آینده است', 'سیستم اختصاصی و قابل توسعه'],
    ], 'جدول ۲.۱: مقایسه سیستم‌های موجود', 'این جدول نشان می‌دهد چرا ساخت سیستم اختصاصی برای اکادمی نکته منطقی است.'),
    p('بعد از جدول بالا روشن می‌شود که NAMS یک تکرار ساده از سیستم‌های موجود نیست. ارزش اصلی آن در یکپارچه‌سازی جریان‌های کاری محلی است: ثبت شاگرد، پرداخت فیس، محاسبه معاش استاد، مالیه، گزارش مالی و داشبورد.'),
    h2('۲.۳ تکنالوژی‌ها و روندهای جدید'),
    p('یکی از روندهای جدید در تکنالوژی آموزشی، حرکت از ابزارهای جداگانه به سمت سیستم‌های هوشمند و یکپارچه است. این سیستم‌ها داده، داشبورد، تحلیل، ارتباطات و شخصی‌سازی را یکجا می‌سازند. Learning Analytics نشان می‌دهد که نهادها می‌توانند از داده‌های شاگردان برای نظارت بر پیشرفت و تشخیص خطر علمی استفاده کنند (Ifenthaler & Yau, 2020; Siemens, 2013).', ['Ifenthaler & Yau, 2020', 'Siemens, 2013']),
    p('انتخاب تکنالوژی‌های پروژه نیز با این روند همخوان است. Node.js و Express.js برای ساخت APIهای سریع و ماژولار مناسب‌اند. MongoDB برای ذخیره‌سازی انعطاف‌پذیر داده‌های آموزشی مناسب است. React.js برای رابط کاربری پویا و پاسخگو استفاده شده و Flutter در پروپوزل برای دسترسی موبایل در نظر گرفته شده است. معماری لایه‌ای باعث می‌شود بخش‌ها جدا باشند و نگهداری سیستم آسان‌تر شود (Bass et al., 2012).', ['Bass et al., 2012']),
    h2('۲.۴ خلاهای تحقیق و پروژه'),
    p('مرور ادبیات و بررسی سیستم‌های مشابه چند خلا را نشان می‌دهد. نخست، بسیاری از سیستم‌ها یا روی آموزش آنلاین تمرکز دارند یا روی ثبت شاگردان، اما جریان مالی، معاشات و مالیه را به شکل محلی و یکپارچه پشتیبانی نمی‌کنند. دوم، AI و Learning Analytics به داده‌های منظم نیاز دارد، در حالی که روش‌های دستی چنین داده‌ای تولید نمی‌کند. سوم، سیستم‌های آماده معمولاً برای نیازهای زبانی، مالی و اداری افغانستان تنظیم نشده‌اند.'),
    ...table(['خلا', 'شواهد', 'پاسخ پروژه'], [
      ['پراکندگی جریان آموزشی و مالی', 'سیستم‌های موجود بیشتر بخش‌بندی‌شده‌اند', 'یکپارچه‌سازی شاگرد، پرداخت، معاش، گزارش'],
      ['ضعف داده برای AI', 'AI به داده منظم نیاز دارد', 'ذخیره حضور، نتایج، پرداخت و تقسیم اوقات'],
      ['نیاز به شفافیت مالی محلی', 'پروپوزل روی مالی تأکید دارد', 'پرداخت، معاش، مالیه و گزارش مالی'],
      ['دسترسی نقش‌محور', 'داده‌های حساس باید محدود شوند', 'JWT، RBAC و Permission'],
      ['پذیرش کاربر', 'سیستم باید ساده و مفید باشد', 'داشبورد لینک‌دار، زبان‌ها، UX بهتر'],
    ], 'جدول ۲.۲: خلاهای ادبیات و پاسخ NAMS', 'این جدول خلاهای علمی و عملی را به راه‌حل پروژه وصل می‌کند.'),
    h2('۲.۵ شفافیت مالی و مدیریت اکادمی'),
    p('شفافیت مالی یکی از مهم‌ترین بخش‌های NAMS است. در بسیاری از اکادمی‌ها، پرداخت فیس، معاش استاد، مصارف و گزارش مالی جداگانه محاسبه می‌شود. این کار باعث خطای مالی و نبود اعتماد می‌شود. در NAMS، پرداخت شاگرد به معاش استاد، مالیه و گزارش مالی وصل است؛ یعنی یک پرداخت می‌تواند در چند بخش سیستم اثر داشته باشد. این کار کیفیت معلومات و تصمیم‌گیری را بهتر می‌سازد (DeLone & McLean, 2003).', ['DeLone & McLean, 2003']),
    h2('۲.۶ امنیت و صلاحیت دید'),
    p('سیستم معلومات حساس مانند پروفایل شاگرد، نمرات، حاضری، پرداخت‌ها، معاش استادان و مالیه را ذخیره می‌کند. به همین دلیل امنیت باید در طراحی اصلی سیستم شامل باشد. معیار ISO/IEC 25010 امنیت را یکی از خصوصیات کیفیت نرم‌افزار می‌داند (International Organization for Standardization & International Electrotechnical Commission, 2011). در NAMS، امنیت با JWT، RBAC، صلاحیت مسیرها و محافظت فرانت‌اند تطبیق شده است.', ['ISO/IEC 25010, 2011']),
    h2('۲.۷ تجربه کاربر و پذیرش سیستم'),
    p('پذیرش سیستم زمانی بیشتر می‌شود که کاربران سیستم را مفید و آسان بدانند. Davis (1989) در مدل TAM نشان می‌دهد که perceived usefulness و perceived ease of use روی پذیرش فناوری اثر دارد. در NAMS، سادگی داشبورد، لینک‌دار بودن کارت‌ها، خوانایی لایت/دارک مود و چندزبانه بودن رابط کاربری برای همین هدف استفاده شده است.', ['Davis, 1989']),
    h2('۲.۸ رعایت کپی‌رایت و جلوگیری از پلیجرزم'),
    p('در این مونوگراف، منابع علمی برای پشتیبانی از ادعاها استفاده شده، اما متن به شکل اختصاصی برای پروژه نوشته شده است. نقل مستقیم بدون ضرورت استفاده نشده و تمام بخش‌هایی که به کتاب، مقاله یا استاندارد تکیه دارند، citation دارند. منابع به شکل APA تنظیم شده و فایل RIS برای Mendeley آماده شده است (American Psychological Association, 2020).', ['APA, 2020']),
    pb(),
  );

  c.push(
    h1('فصل سوم: تحلیل نیازمندی‌ها'),
    h2('۳.۱ میتودولوژی نیازسنجی'),
    p('نیازمندی‌های سیستم از طریق پرسشنامه، تحلیل جریان کاری، تحلیل نقش‌ها، بررسی پروپوزل و بررسی خود پروژه جمع‌آوری شد. این روش ترکیبی انتخاب شد چون سیستم فقط یک صفحه ساده نیست؛ بلکه شامل جریان‌های آموزشی، مالی، ارتباطی و امنیتی است. پرسشنامه نشان می‌دهد کاربران چه می‌خواهند، تحلیل جریان کاری نشان می‌دهد کارها چگونه انجام می‌شوند، و تحلیل نقش‌ها مشخص می‌سازد که هر کاربر به کدام بخش دسترسی داشته باشد.'),
    p('از نگاه تحقیق، روش استفاده‌شده applied mixed-methods است. این روش برای پروژه مناسب است چون هم داده عددی لازم بود و هم توضیح کیفی جریان کار. از ۱۰۰ نفر جامعه، ۷۵ نفر انتخاب شد و ۶۴ نفر پروژه را تأیید کردند. این نتیجه نشان می‌دهد که نیاز به سیستم دیجیتالی از دید کاربران جدی است. Creswell و Creswell (2018) بیان می‌کنند که mixed-methods زمانی مناسب است که تحقیق به هر دو نوع داده کمی و کیفی نیاز داشته باشد.', ['Creswell & Creswell, 2018']),
    ...table(['روش نیازسنجی', 'دلیل استفاده', 'خروجی'], [
      ['پرسشنامه', 'سنجش نیاز و پذیرش کاربران', '۷۵ پاسخ معتبر و اولویت امکانات'],
      ['تحلیل جریان کاری', 'فهم کارهای واقعی اکادمی', 'نیازهای ثبت، پرداخت، حاضری، معاش'],
      ['تحلیل نقش‌ها', 'تعیین صلاحیت دید', 'RBAC و Protected Routes'],
      ['بررسی پروپوزل', 'همخوانی با سوالات و اهداف اصلی', 'Research Question Alignment'],
      ['بررسی پروژه', 'وصل کردن متن مونوگراف با پیاده‌سازی واقعی', 'ERD، API، ماژول‌ها و تست‌ها'],
    ], 'جدول ۳.۱: میتودولوژی نیازسنجی', 'این جدول نشان می‌دهد که نیازمندی‌ها از چند منبع جمع‌آوری شده‌اند.'),
    p('بعد از جدول دیده می‌شود که تنها پرسشنامه برای این پروژه کافی نبود. اگر فقط پرسشنامه استفاده می‌شد، ارتباط میان پرداخت شاگرد و معاش استاد واضح نمی‌شد. اگر فقط کد بررسی می‌شد، نیاز و پذیرش کاربران معلوم نمی‌گردید. به همین دلیل روش ترکیبی بهترین انتخاب بود.'),
    h2('۳.۲ نیازمندی‌های کارکردی'),
    ...table(['کد', 'نیازمندی', 'اولویت', 'منبع', 'روش بررسی'], [
      ['FR-001', 'سیستم باید ثبت و مدیریت شاگردان را با صنف، مضمون، استاد و فیس فراهم کند.', 'بلند', 'پرسشنامه و جریان کاری', 'CRUD و تست API'],
      ['FR-002', 'سیستم باید پروفایل استاد و فیصدی معاش او را مدیریت کند.', 'بلند', 'جریان مالی', 'UI و Payroll test'],
      ['FR-003', 'سیستم باید صنف‌ها، مضامین و تقسیم اوقات را مدیریت کند.', 'بلند', 'نیاز آموزشی', 'تست عملی'],
      ['FR-004', 'سیستم باید حضور و غیاب شاگردان را ثبت کند.', 'بلند', 'پرسشنامه', 'Functional test'],
      ['FR-005', 'سیستم باید امتحان‌ها، نمرات و نتایج را مدیریت کند.', 'بلند', 'پروپوزل', 'Result test'],
      ['FR-006', 'سیستم باید پرداخت فیس و باقی‌مانده را محاسبه کند.', 'بلند', 'نیاز مالی', 'Payment test'],
      ['FR-007', 'سیستم باید معاش استاد را از فیس شاگردان مربوطه محاسبه کند.', 'بلند', 'نیاز پروژه', 'Payroll test'],
      ['FR-008', 'سیستم باید مالیه، معاش ناخالص و قابل پرداخت را نمایش دهد.', 'بلند', 'شفافیت مالی', 'Tax test'],
      ['FR-009', 'داشبورد باید لینک مستقیم به بخش‌های مربوطه داشته باشد.', 'متوسط', 'UX feedback', 'Navigation test'],
      ['FR-010', 'سیستم باید پیام، اعلان، گزارش و چاپ گزارش را پشتیبانی کند.', 'متوسط', 'پرسشنامه', 'UI/report test'],
    ], 'جدول ۳.۲: نیازمندی‌های کارکردی', 'نیازمندی‌ها به شکل قابل تست نوشته شده‌اند تا با معیار مهندسی نیازمندی‌ها همخوان باشند.'),
    p('این جدول نشان می‌دهد که هر نیازمندی یک منبع و روش بررسی دارد. این کار باعث می‌شود نیازمندی‌ها قابل ردیابی باشند و در دفاع مونوگراف بتوان نشان داد که هر بخش چرا ساخته شده است.'),
    h2('۳.۳ نیازمندی‌های غیرکارکردی'),
    ...table(['کد', 'دسته', 'نیازمندی', 'روش بررسی'], [
      ['NFR-001', 'کارایی', 'سیستم باید در عملیات عادی پاسخ سریع داشته باشد.', 'بررسی API و UI'],
      ['NFR-002', 'امنیت', 'سیستم باید JWT و Role-Based Access را تطبیق کند.', 'تست صلاحیت'],
      ['NFR-003', 'قابلیت استفاده', 'سیستم باید داشبورد واضح، لایت/دارک مود خوانا و زبان‌های لازم داشته باشد.', 'ارزیابی کاربر'],
      ['NFR-004', 'قابلیت نگهداری', 'کد باید ماژولار و قابل توسعه باشد.', 'Code review'],
      ['NFR-005', 'اعتمادپذیری', 'محاسبات مالی باید تکرارپذیر و قابل بررسی باشد.', 'Payroll/payment test'],
      ['NFR-006', 'سازگاری', 'سیستم باید در ویب و موبایل قابل استفاده باشد.', 'Responsive test'],
      ['NFR-007', 'محلی‌سازی', 'سیستم باید دری/فارسی، پشتو و انگلیسی را پشتیبانی کند.', 'Translation test'],
      ['NFR-008', 'تمامیت داده', 'رابطه شاگرد، صنف، مضمون، استاد و پرداخت باید حفظ شود.', 'Database validation'],
    ], 'جدول ۳.۳: نیازمندی‌های غیرکارکردی', 'این جدول بعد از توضیح کیفیت سیستم آمده تا نشان دهد کیفیت فقط ظاهر سیستم نیست.'),
    p('نیازمندی‌های غیرکارکردی برای پروژه بسیار مهم است؛ زیرا سیستم معلومات حساس آموزشی و مالی را ذخیره می‌کند. اگر سیستم امن نباشد یا قابل نگهداری نباشد، حتی با داشتن امکانات زیاد هم موفق نمی‌شود.'),
    h2('۳.۴ Use Case Model'),
    p('قبل از نمایش Use Case Diagram باید دانست که سیستم برای چند نوع کاربر طراحی شده است. شاگرد باید نتایج، تقسیم اوقات و پرداخت خود را ببیند. استاد باید شاگردان مربوطه، حاضری، نتایج و معاش خود را ببیند. اداره باید ثبت و گزارش را مدیریت کند. والدین باید معلومات فرزند را پیگیری کنند. سوپر ادمین باید نقش‌ها، صلاحیت‌ها و گزارش‌های عمومی را کنترول کند.'),
    cap('شکل ۳.۱: Use Case Diagram سیستم مدیریت اکادمی نکته'),
    img('use_case_dari.png', 620, 430),
    note('این دیاگرام نشان می‌دهد هر نقش با کدام بخش سیستم تعامل دارد.'),
    p('بعد از مشاهده دیاگرام روشن می‌شود که چرا صلاحیت دید یا RBAC ضروری است. اگر همه کاربران همه بخش‌ها را ببینند، معلومات شاگردان، معاشات و پرداخت‌ها افشا می‌شود. پس Use Case مستقیماً به طراحی امنیت و صلاحیت وصل است.'),
    h2('۳.۵ نیازمندی‌های داده'),
    p('سیستم به داده‌های ساختارمند درباره کاربران، شاگردان، استادان، صنف‌ها، مضامین، حاضری، امتحانات، نتایج، پرداخت‌ها، معاشات، مصارف، پیام‌ها و اعلان‌ها نیاز دارد. حساسیت داده‌ها بالا است؛ چون شامل معلومات شخصی شاگردان، نمرات، پرداخت‌ها، معاش و مالیه می‌باشد.'),
    p('داده‌های سیستم همچنان برای بخش AI آینده مهم است. پیش‌بینی عملکرد شاگرد بدون داده منظم ممکن نیست. وقتی سیستم حاضری، نمرات، مضمون، استاد و پرداخت‌ها را منظم ذخیره کند، در آینده می‌توان از همین داده‌ها برای تشخیص خطر افت تحصیلی یا پیشنهادات آموزشی استفاده کرد.'),
    h2('۳.۶ میتودولوژی تحقیق'),
    p('میتودولوژی تحقیق در این پروژه applied mixed-methods است. دلیل استفاده این است که پروژه هم به شواهد عددی نیاز داشت و هم به تحلیل عمیق جریان کاری. بخش کمی شامل پرسشنامه و محاسبه ۸۵.۳۳ درصد تأیید پروژه است. بخش کیفی شامل تحلیل جریان کاری، نقش‌ها، نیازهای مالی و ساختار پروژه است.'),
    h2('۳.۷ میتودولوژی طراحی'),
    p('میتودولوژی طراحی ترکیبی از Agile Scrum و SDLC است. Agile برای تغییرات و بهبودهای مرحله‌ای مناسب بود؛ مثل اصلاح بخش مضامین، اصلاح نمایش لایت/دارک مود، اضافه شدن معاش استاد و لینک‌دار شدن داشبورد. SDLC برای ساختار آکادمیک لازم بود؛ یعنی تحلیل نیازمندی، طراحی، پیاده‌سازی، تست، نتیجه و نگهداری.'),
    cap('شکل ۳.۲: میتودولوژی تحقیق و توسعه'),
    img('methodology_dari.png', 620, 230),
    note('این شکل نشان می‌دهد پروژه به شکل مرحله‌ای و قابل بازگشت توسعه یافته است.'),
    p('بعد از این شکل واضح می‌شود که پروژه به شکل یک خط مستقیم پیش نرفته است. بازخورد کاربران و تست‌ها باعث تغییر در طراحی و پیاده‌سازی شده است. همین موضوع دلیل انتخاب Hybrid Agile-SDLC را قوی‌تر می‌سازد.'),
    pb(),
  );

  c.push(
    h1('فصل چهارم: طراحی سیستم'),
    h2('۴.۱ طراحی معماری'),
    p('معماری سیستم به شکل لایه‌ای طراحی شده است. لایه کاربر شامل React web app و دسترسی موبایل است. لایه API با Node.js و Express.js کار می‌کند. لایه دیتابیس MongoDB و Mongoose models را شامل می‌شود. لایه امنیت JWT، نقش‌ها و صلاحیت‌ها را کنترول می‌کند. لایه گزارش‌دهی داشبوردها، معاشات، مالیات و گزارش مالی را تولید می‌کند. این جداسازی باعث می‌شود سیستم قابل توسعه و قابل نگهداری باشد (Bass et al., 2012).', ['Bass et al., 2012']),
    cap('شکل ۴.۱: معماری سیستم مدیریت اکادمی نکته'),
    img('architecture_dari.png', 620, 385),
    note('شکل بالا معماری سیستم را به صورت تصویری نشان می‌دهد.'),
    p('بعد از شکل دیده می‌شود که هر لایه مسئولیت جدا دارد. فرانت‌اند با کاربر تعامل می‌کند، بک‌اند منطق و امنیت را تطبیق می‌کند، دیتابیس داده را ذخیره می‌کند و لایه گزارش‌دهی داده‌ها را برای تصمیم‌گیری آماده می‌سازد.'),
    ...table(['لایه', 'تکنالوژی', 'دلیل انتخاب'], [
      ['Frontend', 'React.js + Vite', 'رابط کاربری پویا و پاسخگو'],
      ['Backend', 'Node.js + Express.js', 'API سریع، ماژولار و قابل توسعه'],
      ['Database', 'MongoDB + Mongoose', 'ذخیره انعطاف‌پذیر داده‌های آموزشی'],
      ['Mobile', 'Flutter-ready structure', 'دسترسی شاگردان و استادان از موبایل'],
      ['Security', 'JWT + RBAC', 'کنترول ورود و صلاحیت دید'],
      ['Reporting', 'Dashboard + Reports', 'تصمیم‌گیری و شفافیت مالی'],
    ], 'جدول ۴.۱: تکنالوژی‌ها و دلیل انتخاب', 'این جدول توضیح می‌دهد که انتخاب تکنالوژی با هدف‌های پروپوزل همخوان است.'),
    h2('۴.۲ طراحی دیتابیس'),
    p('طراحی دیتابیس بر اساس رابطه میان شاگرد، استاد، صنف، مضمون، پرداخت، معاش، حضور، نتیجه و پیام انجام شده است. اگرچه MongoDB دیتابیس سندمحور است، اما در پروژه از ObjectId references استفاده شده تا رابطه‌ها حفظ شود. این کار برای گزارش‌دهی و محاسبات مالی بسیار مهم است (Connolly & Begg, 2015).', ['Connolly & Begg, 2015']),
    cap('شکل ۴.۲: ERD دیتابیس'),
    img('erd_dari.png', 620, 445),
    note('ERD نشان می‌دهد که موجودیت‌ها چگونه با هم رابطه دارند.'),
    p('بعد از ERD معلوم می‌شود که پرداخت شاگرد فقط یک عدد ساده نیست؛ پرداخت به شاگرد، استاد، صنف، مضمون، معاش و گزارش مالی وصل است. همین رابطه‌ها باعث می‌شود سیستم بتواند گزارش دقیق تولید کند.'),
    h2('۴.۳ Class Diagram'),
    p('Class Diagram ساختار مدل‌ها و سرویس‌های اصلی سیستم را نشان می‌دهد. ERD بیشتر روی داده تمرکز دارد، اما Class Diagram نشان می‌دهد کدام مدل یا سرویس چه مسئولیتی دارد. برای مثال، PayrollService مسئول محاسبه معاش و مالیه است، در حالی که Payment فقط معلومات پرداخت را نگهداری می‌کند.'),
    cap('شکل ۴.۳: Class Diagram مدل‌ها و سرویس‌های اصلی'),
    img('class_diagram_dari.png', 620, 430),
    note('این دیاگرام کمک می‌کند رابطه میان مدل‌ها و منطق تجارتی بهتر فهمیده شود.'),
    p('بعد از Class Diagram واضح می‌شود که منطق سیستم نباید در صفحات UI پراکنده باشد. منطق‌هایی مثل معاش و مالیه باید در سرویس‌های بک‌اند باشد تا قابل تست و قابل استفاده مجدد باشد.'),
    h2('۴.۴ طراحی UI/UX'),
    p('طراحی UI/UX بر اساس سادگی، نقش‌محوری، چندزبانه بودن، خوانایی در لایت و دارک مود، و مسیر واضح در داشبورد انجام شده است. کارت‌های داشبورد لینک‌دار شده‌اند تا کاربر با کلیک مستقیم وارد بخش مربوطه شود. این کار perceived ease of use را بهتر می‌سازد که در مدل TAM برای پذیرش سیستم مهم است (Davis, 1989).', ['Davis, 1989']),
    h2('۴.۵ طراحی الگوریتم معاش استاد'),
    p('یکی از مهم‌ترین الگوریتم‌های سیستم، محاسبه معاش استاد است. سیستم شاگردان مربوط به استاد را پیدا می‌کند، پرداخت‌های ماه مربوطه را جمع می‌زند، فیصدی معاش استاد را تطبیق می‌کند، معاش ناخالص را محاسبه می‌کند، مالیه را کم می‌کند و معاش خالص را نشان می‌دهد.'),
    new Paragraph({ alignment: AlignmentType.LEFT, spacing: { after: 160 }, children: [r('Pseudocode: totalFee = sum(assignedStudentPayments); grossSalary = totalFee × percentage / 100; tax = calculateTax(grossSalary); netSalary = grossSalary - tax;', { bold: true, english: true })] }),
    p('این الگوریتم باعث می‌شود معاش استاد شفاف و قابل بررسی باشد. وقتی ۱۰ شاگرد برای هر استاد و ۱۰۰۰ افغانی برای هر شاگرد ثبت شود، سیستم می‌تواند معاش هر استاد را بر اساس فیصدی ۲۰ تا ۴۰ درصد محاسبه کند.'),
    h2('۴.۶ طراحی امنیت'),
    p('امنیت سیستم بر اساس JWT authentication، RBAC، middleware صلاحیت، protected routes و validation ورودی‌ها طراحی شده است. هدف این است که هر نقش فقط بخش مربوط به خودش را ببیند. این موضوع برای حفاظت از معلومات شاگردان، پرداخت‌ها، معاشات و مالیات ضروری است.'),
    h2('۴.۷ استراتژی تست'),
    p('تست سیستم شامل Unit Test، Integration Test، System Test و User Acceptance Test است. Unit Test برای محاسبه مالیه، معاش و validation استفاده می‌شود. Integration Test برای جریان‌هایی مثل ثبت شاگرد، پرداخت فیس و تولید گزارش استفاده می‌شود. UAT برای بررسی استفاده کاربران واقعی از داشبورد، پرداخت‌ها، حضور، نتایج و گزارش‌ها انجام می‌شود.'),
    pb(),
  );

  c.push(
    h1('فصل پنجم: نتایج و بحث'),
    p('قبل از بررسی چارت پذیرش پروژه، باید ساختار نمونه یادآوری شود. جامعه آماری ۱۰۰ نفر در نظر گرفته شد و از میان آن ۷۵ پاسخ معتبر تحلیل گردید. از این تعداد، ۶۴ نفر پروژه را تأیید کردند. این نشان می‌دهد که نیاز به سیستم دیجیتالی از دید کاربران جدی است.'),
    cap('شکل ۵.۱: نتیجه پذیرش پروژه'),
    img('project_acceptance_chart.png', 620, 295),
    note('چارت نشان می‌دهد که ۸۵.۳۳ درصد نمونه پروژه را تأیید کرده‌اند.'),
    p('بعد از چارت دیده می‌شود که اکثریت کاربران با پروژه موافق هستند. این پاسخ به سوال اصلی تحقیق کمک می‌کند؛ زیرا نشان می‌دهد کاربران باور دارند سیستم یکپارچه می‌تواند کارایی اکادمی را بهتر سازد.'),
    cap('شکل ۵.۲: اولویت امکانات مورد نیاز'),
    img('feature_priority_chart.png', 620, 295),
    note('این چارت امکانات مهم از دید پاسخ‌دهندگان را نشان می‌دهد.'),
    p('چارت امکانات نشان می‌دهد که ثبت‌نام، نمرات، حاضری، پرداخت فیس، اعلان‌ها، گزارش‌ها و تقسیم اوقات برای کاربران مهم است. این موارد با ماژول‌های ساخته‌شده در پروژه همخوانی دارد.'),
    cap('شکل ۵.۳: شاخص‌های ارزیابی کاربر'),
    img('user_evaluation_chart.png', 620, 295),
    note('این چارت شاخص‌هایی مثل مفید بودن، آسانی استفاده، سرعت، رابط کاربری و گزارش‌دهی را نشان می‌دهد.'),
    p('نتایج ارزیابی کاربر نشان می‌دهد که سیستم از نظر مفید بودن و آسانی استفاده قابل قبول است. این نتیجه با مدل TAM همخوان است، چون پذیرش فناوری به مفید بودن و آسان بودن سیستم وابسته است (Davis, 1989).', ['Davis, 1989']),
    ...table(['سوال تحقیق', 'جواب پیدا شده در پروژه'], [
      ['سیستم آنلاین یکپارچه چگونه کارایی و یادگیری شخصی را بهتر می‌کند؟', 'با مرکزی‌سازی داده‌های علمی، مالی، ارتباطی و آماده‌سازی داده برای AI.'],
      ['کدام ناکارایی‌ها با دیجیتالی‌سازی حل می‌شود؟', 'ثبت دستی، پرداخت پراکنده، گزارش دیرهنگام، ارتباط ضعیف و معاش نامشخص.'],
      ['AI چگونه نظارت علمی را بهتر می‌کند؟', 'با استفاده آینده از داده‌های حاضری، نتایج، تقسیم اوقات و معلومات شاگرد.'],
      ['بهترین روش برای ارتباط و شفافیت مالی چیست؟', 'پیام‌ها، اعلان‌ها، پرداخت‌ها، معاشات، مالیه و گزارش مالی.'],
      ['تکنالوژی‌ها چگونه سیستم قابل نگهداری می‌سازند؟', 'با معماری لایه‌ای، API ماژولار، دیتابیس سندمحور و UI React.'],
    ], 'جدول ۵.۱: جواب سوالات تحقیق', 'این جدول نشان می‌دهد که به تمام سوالات پروپوزل جواب داده شده است.'),
    h1('فصل ششم: نتیجه‌گیری و پیشنهادها'),
    p('سیستم مدیریت اکادمی نکته توانست ایده پروپوزل را به یک پروژه عملی انجینری نرم‌افزار تبدیل کند. سیستم عملیات آموزشی، اداری، مالی، ارتباطی و گزارش‌دهی را در یک پلتفرم مرکزی جمع می‌کند. پروژه با اهداف پروپوزل همخوان است، زیرا از Node.js، Express.js، MongoDB، React.js و ساختار آماده برای موبایل استفاده می‌کند و زمینه AI را نیز فراهم می‌سازد.'),
    p('سیستم کارایی عملیاتی را با کم کردن کارهای دستی، وصل کردن ماژول‌ها و تولید گزارش بهتر می‌کند. شفافیت مالی از طریق پرداخت فیس، محاسبه معاش استاد، مالیه و گزارش مالی تقویت شده است. ارتباطات از طریق پیام‌ها و اعلان‌ها بهتر شده و داده‌های ساختارمند برای تحلیل‌های آینده آماده گردیده است.'),
    p('برای کارهای آینده پیشنهاد می‌شود ماژول AI پیش‌بینی عملکرد شاگرد تکمیل شود، ارزیابی بلندمدت با کاربران واقعی انجام شود، سیستم در cloud امن مستقر گردد، backup و recovery تقویت شود و اپلیکیشن Flutter برای استفاده روزمره شاگردان و استادان تکمیل گردد.'),
    h1('ضمیمه الف: بخش‌های تخنیکی'),
    p('برخی جزئیات تخنیکی که برای تکمیل پروژه مهم است اما در متن اصلی باعث طولانی شدن بحث می‌شود، در ضمیمه ذکر می‌گردد. این موارد شامل ماژول‌های API، الگوریتم معاش، تست‌ها و ساختار کد است.'),
    ...table(['بخش تخنیکی', 'توضیح'], [
      ['Backend Modules', 'auth, users, students, teachers, classes, subjects, attendance, exams, results, payments, payroll, finance, reports'],
      ['Frontend Modules', 'dashboard, resources, payments, finance, payroll, reports, messages, notifications'],
      ['Core Algorithm', 'محاسبه معاش استاد بر اساس پرداخت شاگردان و فیصدی معاش'],
      ['Security', 'JWT، RBAC، permission middleware و protected routes'],
      ['Testing', 'salary tax، payroll commission، route policy، timetable validation'],
    ], 'جدول ضمیمه الف.۱: بخش‌های تخنیکی', 'این جدول بخش‌هایی را نشان می‌دهد که در خود صفحات سیستم دیده نمی‌شود اما در ساختار پروژه مهم است.'),
    h1('منابع'),
  );

  for (const ref of refsApa) c.push(pEn(ref));

  c.push(
    h1('ضمیمه ب: Citation Map برای Mendeley'),
    p('فایل Last_Mono_Expanded_Dari_Mendeley_References.ris برای وارد کردن منابع در Mendeley آماده شده است. جدول زیر نشان می‌دهد هر متن کدام citation دارد. برای ساخت citation field واقعی در Word، منابع را در Mendeley وارد کرده و با Mendeley Cite citationهای داخل متن را insert یا replace کنید.'),
    ...table(['متن دارای منبع', 'Citation'], citationRecords.map((x) => [x.text.slice(0, 230) + (x.text.length > 230 ? '...' : ''), x.cites.join('; ')]), 'جدول ضمیمه ب.۱: نقشه Citation', 'این جدول برای کاهش خطر plagiarism و شفافیت منابع اضافه شده است.'),
  );

  fs.copyFileSync(path.join(outDir, 'Last_Mono_Expanded_Mendeley_References.ris'), path.join(outDir, 'Last_Mono_Expanded_Dari_Mendeley_References.ris'));
  fs.writeFileSync(path.join(outDir, 'Last_Mono_Expanded_Dari_Citation_Map.md'), citationRecords.map((x, i) => `## ${i + 1}. ${x.cites.join('; ')}\n\n> ${x.text}\n`).join('\n'), 'utf8');

  const doc = new Document({
    styles: {
      default: { document: { run: { font: 'B Nazanin', size: 24 }, paragraph: { spacing: { line: 360 } } } },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 32, bold: true, color: '1F4E79', font: 'B Nazanin' }, paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 320, after: 180 } } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 28, bold: true, color: '1F4E79', font: 'B Nazanin' }, paragraph: { alignment: AlignmentType.RIGHT, spacing: { before: 240, after: 140 } } },
        { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 26, bold: true, color: '2F5597', font: 'B Nazanin' }, paragraph: { alignment: AlignmentType.RIGHT, spacing: { before: 180, after: 120 } } },
      ],
    },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: inch, right: inch, bottom: inch, left: inch } } },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [r('صفحه ', { size: 20 }), new TextRun({ children: [PageNumber.CURRENT], size: 20 })] })] }) },
      children: c,
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputDocx, buffer);
  console.log(`Created: ${outputDocx}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
