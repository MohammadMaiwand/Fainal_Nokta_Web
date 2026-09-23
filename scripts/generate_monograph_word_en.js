const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'Monograph');
const imgDir = path.join(outDir, 'diagrams');
fs.mkdirSync(imgDir, { recursive: true });

const docPath = path.join(outDir, 'Nokta_Academy_Management_System_Monograph_EN_APA.doc');
const htmlPath = path.join(outDir, 'Nokta_Academy_Management_System_Monograph_EN_APA.html');
const risPath = path.join(outDir, 'Nokta_Academy_Mendeley_References_EN.ris');

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
    <div class="caption">${caption}</div>
    <table>
      <thead><tr>${headers.map((x) => `<th>${x}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((row) => `<tr>${row.map((x) => `<td>${x}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>
    ${note ? `<div class="note">${note}</div>` : ''}
  `;
}

function writeSvg(name, svg) {
  const full = path.join(imgDir, name);
  fs.writeFileSync(full, svg, 'utf8');
  return `diagrams/${name}`;
}

function figure(svgFile, caption, note = '') {
  return `
    <div class="caption">${caption}</div>
    <div class="figure-wrap"><img src="${svgFile}" alt="${esc(caption)}" /></div>
    ${note ? `<div class="note">${note}</div>` : ''}
  `;
}

function barChartSvg(title, labels, values, color = '#2f75b5') {
  const width = 900;
  const height = 430;
  const max = Math.max(...values, 1);
  const top = 70;
  const bottom = 335;
  const left = 80;
  const right = 860;
  const gap = 18;
  const barW = (right - left - gap * (values.length - 1)) / values.length;
  const bars = values.map((value, i) => {
    const x = left + i * (barW + gap);
    const h = ((bottom - top) * value) / max;
    const y = bottom - h;
    return `
      <rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="7" fill="${color}" />
      <text x="${x + barW / 2}" y="${y - 10}" text-anchor="middle" font-size="18" font-weight="700" fill="#1f2937">${value}</text>
      <text x="${x + barW / 2}" y="370" text-anchor="middle" font-size="15" fill="#1f2937">${esc(labels[i])}</text>
    `;
  }).join('');
  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="#ffffff"/>
    <text x="${width / 2}" y="35" text-anchor="middle" font-size="24" font-weight="700" fill="#0f172a">${esc(title)}</text>
    <line x1="${left}" y1="${bottom}" x2="${right}" y2="${bottom}" stroke="#64748b" stroke-width="2"/>
    <line x1="${left}" y1="${top}" x2="${left}" y2="${bottom}" stroke="#64748b" stroke-width="2"/>
    <text x="32" y="${top + 5}" text-anchor="middle" font-size="14" fill="#64748b">${max}</text>
    <text x="32" y="${bottom}" text-anchor="middle" font-size="14" fill="#64748b">0</text>
    ${bars}
  </svg>`;
}

function pieChartSvg(title, labels, values) {
  const width = 900;
  const height = 430;
  const total = values.reduce((a, b) => a + b, 0);
  const colors = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0f766e'];
  let current = -Math.PI / 2;
  const slices = values.map((value, i) => {
    const angle = (value / total) * Math.PI * 2;
    const end = current + angle;
    const cx = 260;
    const cy = 220;
    const r = 135;
    const x1 = cx + r * Math.cos(current);
    const y1 = cy + r * Math.sin(current);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const large = angle > Math.PI ? 1 : 0;
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    current = end;
    return `<path d="${d}" fill="${colors[i % colors.length]}" stroke="#fff" stroke-width="3"/>`;
  }).join('');
  const legend = labels.map((label, i) => {
    const pct = ((values[i] / total) * 100).toFixed(1);
    return `
      <rect x="520" y="${105 + i * 42}" width="20" height="20" rx="4" fill="${colors[i % colors.length]}"/>
      <text x="552" y="${122 + i * 42}" font-size="18" fill="#1f2937">${esc(label)}: ${values[i]} (${pct}%)</text>
    `;
  }).join('');
  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="#ffffff"/>
    <text x="${width / 2}" y="38" text-anchor="middle" font-size="24" font-weight="700" fill="#0f172a">${esc(title)}</text>
    ${slices}
    <circle cx="260" cy="220" r="62" fill="#fff"/>
    <text x="260" y="216" text-anchor="middle" font-size="20" font-weight="700" fill="#0f172a">n = ${total}</text>
    <text x="260" y="242" text-anchor="middle" font-size="15" fill="#64748b">respondents</text>
    ${legend}
  </svg>`;
}

function architectureSvg() {
  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="1000" height="620" viewBox="0 0 1000 620">
    <defs>
      <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
        <path d="M0,0 L0,6 L9,3 z" fill="#475569"/>
      </marker>
    </defs>
    <rect width="1000" height="620" fill="#ffffff"/>
    <text x="500" y="40" text-anchor="middle" font-size="28" font-weight="700" fill="#0f172a">Nokta Academy System Architecture</text>
    <rect x="60" y="100" width="250" height="125" rx="16" fill="#eff6ff" stroke="#2563eb" stroke-width="3"/>
    <text x="185" y="135" text-anchor="middle" font-size="21" font-weight="700" fill="#1e40af">Client Layer</text>
    <text x="185" y="168" text-anchor="middle" font-size="16" fill="#0f172a">React Web App</text>
    <text x="185" y="192" text-anchor="middle" font-size="16" fill="#0f172a">Vite PWA / Flutter Client</text>
    <rect x="375" y="100" width="250" height="125" rx="16" fill="#f0fdf4" stroke="#16a34a" stroke-width="3"/>
    <text x="500" y="135" text-anchor="middle" font-size="21" font-weight="700" fill="#166534">API Layer</text>
    <text x="500" y="168" text-anchor="middle" font-size="16" fill="#0f172a">Express + TypeScript</text>
    <text x="500" y="192" text-anchor="middle" font-size="16" fill="#0f172a">Validation, Services, Routes</text>
    <rect x="690" y="100" width="250" height="125" rx="16" fill="#fff7ed" stroke="#ea580c" stroke-width="3"/>
    <text x="815" y="135" text-anchor="middle" font-size="21" font-weight="700" fill="#9a3412">Data Layer</text>
    <text x="815" y="168" text-anchor="middle" font-size="16" fill="#0f172a">MongoDB</text>
    <text x="815" y="192" text-anchor="middle" font-size="16" fill="#0f172a">Mongoose Models</text>
    <rect x="210" y="320" width="250" height="125" rx="16" fill="#f5f3ff" stroke="#7c3aed" stroke-width="3"/>
    <text x="335" y="355" text-anchor="middle" font-size="21" font-weight="700" fill="#5b21b6">Security Layer</text>
    <text x="335" y="388" text-anchor="middle" font-size="16" fill="#0f172a">JWT Authentication</text>
    <text x="335" y="412" text-anchor="middle" font-size="16" fill="#0f172a">RBAC / Route Permissions</text>
    <rect x="540" y="320" width="250" height="125" rx="16" fill="#fdf2f8" stroke="#db2777" stroke-width="3"/>
    <text x="665" y="355" text-anchor="middle" font-size="21" font-weight="700" fill="#9d174d">Reporting Layer</text>
    <text x="665" y="388" text-anchor="middle" font-size="16" fill="#0f172a">Dashboards, Payroll, Finance</text>
    <text x="665" y="412" text-anchor="middle" font-size="16" fill="#0f172a">Charts, Exports, Print Reports</text>
    <line x1="310" y1="162" x2="375" y2="162" stroke="#475569" stroke-width="2.5" marker-end="url(#arrow)"/>
    <line x1="625" y1="162" x2="690" y2="162" stroke="#475569" stroke-width="2.5" marker-end="url(#arrow)"/>
    <line x1="430" y1="225" x2="365" y2="320" stroke="#475569" stroke-width="2.5" marker-end="url(#arrow)"/>
    <line x1="570" y1="225" x2="635" y2="320" stroke="#475569" stroke-width="2.5" marker-end="url(#arrow)"/>
    <line x1="460" y1="382" x2="540" y2="382" stroke="#475569" stroke-width="2.5" marker-end="url(#arrow)"/>
    <text x="500" y="515" text-anchor="middle" font-size="18" fill="#334155">Main modules: Students, Teachers, Classes, Subjects, Attendance, Exams, Results, Payments, Payroll, Tax, Reports, Messages, Notifications</text>
  </svg>`;
}

function erdSvg() {
  const box = (title, x, y, fields, color = '#2563eb') => `
    <g>
      <rect x="${x}" y="${y}" width="210" height="145" rx="12" fill="#ffffff" stroke="${color}" stroke-width="2.6"/>
      <rect x="${x}" y="${y}" width="210" height="34" rx="12" fill="${color}"/>
      <text x="${x + 105}" y="${y + 23}" text-anchor="middle" font-size="17" font-weight="700" fill="#fff">${title}</text>
      ${fields.map((f, i) => `<text x="${x + 12}" y="${y + 58 + i * 18}" font-size="13.5" fill="#111827">${esc(f)}</text>`).join('')}
    </g>`;
  const line = (x1, y1, x2, y2, text) => `
    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#475569" stroke-width="2" marker-end="url(#arrow)"/>
    <rect x="${(x1 + x2) / 2 - 54}" y="${(y1 + y2) / 2 - 20}" width="108" height="22" rx="5" fill="#fff" opacity=".9"/>
    <text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 5}" text-anchor="middle" font-size="12" fill="#334155">${text}</text>`;
  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="1180" height="850" viewBox="0 0 1180 850">
    <defs>
      <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
        <path d="M0,0 L0,6 L9,3 z" fill="#475569"/>
      </marker>
    </defs>
    <rect width="1180" height="850" fill="#f8fafc"/>
    <text x="590" y="42" text-anchor="middle" font-size="28" font-weight="700" fill="#0f172a">Entity Relationship Diagram (ERD)</text>
    ${box('User', 60, 90, ['_id (PK)', 'name, email, role', 'permissionKeys[]', 'branchId (FK)', 'assignedClasses[]'], '#2563eb')}
    ${box('Student', 350, 90, ['_id (PK)', 'studentId', 'classId (FK)', 'subjectId (FK)', 'teacherId (FK)'], '#16a34a')}
    ${box('Class', 640, 90, ['_id (PK)', 'className', 'assignedSubjects[]', 'assignedTeachers[]', 'capacity'], '#ea580c')}
    ${box('Subject', 910, 90, ['_id (PK)', 'title, code', 'classId (FK)', 'teacher (FK)', 'feeAmount'], '#7c3aed')}
    ${box('Payment', 350, 310, ['_id (PK)', 'studentId (FK)', 'teacherId (FK)', 'amount', 'taxAmount, netAmount'], '#dc2626')}
    ${box('SalaryRecord', 60, 310, ['_id (PK)', 'userId (FK)', 'grossSalary', 'taxAmount', 'netSalary'], '#0f766e')}
    ${box('Attendance', 60, 540, ['_id (PK)', 'studentId (FK)', 'classId (FK)', 'status', 'date'], '#64748b')}
    ${box('Exam', 350, 540, ['_id (PK)', 'subject (FK)', 'class (FK)', 'teacherId (FK)', 'date'], '#9333ea')}
    ${box('Result', 640, 540, ['_id (PK)', 'student (FK)', 'exam (FK)', 'score', 'grade'], '#0891b2')}
    ${box('Message / Notification', 910, 540, ['_id (PK)', 'senderId', 'recipientIds[]', 'recipientRoles[]', 'status'], '#be123c')}
    ${line(270, 162, 350, 162, 'has profile')}
    ${line(560, 162, 640, 162, 'belongs to')}
    ${line(850, 162, 910, 162, 'contains')}
    ${line(455, 235, 455, 310, 'pays')}
    ${line(350, 382, 270, 382, 'salary basis')}
    ${line(165, 455, 165, 540, 'attendance')}
    ${line(455, 455, 455, 540, 'assessment')}
    ${line(560, 612, 640, 612, 'produces')}
    ${line(850, 612, 910, 612, 'communicates')}
    ${line(910, 235, 560, 310, 'fee source')}
  </svg>`;
}

function useCaseSvg() {
  const actor = (x, y, label) => `
    <circle cx="${x}" cy="${y}" r="18" fill="#fff" stroke="#0f172a" stroke-width="2"/>
    <line x1="${x}" y1="${y + 18}" x2="${x}" y2="${y + 72}" stroke="#0f172a" stroke-width="2"/>
    <line x1="${x - 34}" y1="${y + 38}" x2="${x + 34}" y2="${y + 38}" stroke="#0f172a" stroke-width="2"/>
    <line x1="${x}" y1="${y + 72}" x2="${x - 28}" y2="${y + 112}" stroke="#0f172a" stroke-width="2"/>
    <line x1="${x}" y1="${y + 72}" x2="${x + 28}" y2="${y + 112}" stroke="#0f172a" stroke-width="2"/>
    <text x="${x}" y="${y + 140}" text-anchor="middle" font-size="16" font-weight="700" fill="#0f172a">${label}</text>`;
  const uc = (x, y, label, w = 180) => `
    <ellipse cx="${x}" cy="${y}" rx="${w / 2}" ry="32" fill="#eff6ff" stroke="#2563eb" stroke-width="2"/>
    <text x="${x}" y="${y + 5}" text-anchor="middle" font-size="14" fill="#0f172a">${label}</text>`;
  const assoc = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#64748b" stroke-width="1.7"/>`;
  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="820" viewBox="0 0 1200 820">
    <rect width="1200" height="820" fill="#ffffff"/>
    <text x="600" y="42" text-anchor="middle" font-size="28" font-weight="700" fill="#0f172a">Use Case Diagram - Nokta Academy Management System</text>
    <rect x="220" y="80" width="760" height="665" rx="18" fill="#f8fafc" stroke="#94a3b8" stroke-width="2"/>
    <text x="600" y="112" text-anchor="middle" font-size="18" font-weight="700" fill="#334155">System Boundary</text>
    ${actor(90, 160, 'Student')}
    ${actor(90, 420, 'Parent')}
    ${actor(1090, 160, 'Teacher')}
    ${actor(1090, 420, 'Admin')}
    ${actor(1090, 620, 'Super Admin')}
    ${uc(390, 165, 'Register / Manage Students')}
    ${uc(390, 250, 'View Classes & Subjects')}
    ${uc(390, 335, 'Mark Attendance')}
    ${uc(390, 420, 'Manage Exams & Results')}
    ${uc(390, 505, 'Pay Student Fee')}
    ${uc(390, 590, 'Send / Receive Messages')}
    ${uc(740, 165, 'Manage Teachers')}
    ${uc(740, 250, 'Manage Timetable')}
    ${uc(740, 335, 'Payroll & Tax Calculation', 210)}
    ${uc(740, 420, 'Financial Reports', 190)}
    ${uc(740, 505, 'Dashboard Analytics')}
    ${uc(740, 590, 'Role & Permission Control', 220)}
    ${assoc(120, 205, 300, 250)}
    ${assoc(120, 205, 300, 505)}
    ${assoc(120, 465, 300, 420)}
    ${assoc(120, 465, 300, 590)}
    ${assoc(1060, 205, 830, 335)}
    ${assoc(1060, 205, 830, 420)}
    ${assoc(1060, 465, 830, 165)}
    ${assoc(1060, 465, 830, 250)}
    ${assoc(1060, 465, 830, 335)}
    ${assoc(1060, 465, 830, 420)}
    ${assoc(1060, 665, 850, 590)}
    ${assoc(1060, 665, 830, 505)}
    ${assoc(1060, 665, 830, 420)}
    ${assoc(1060, 665, 830, 165)}
  </svg>`;
}

function methodologySvg() {
  const step = (x, y, label, color) => `
    <rect x="${x}" y="${y}" width="190" height="82" rx="15" fill="${color}" stroke="#334155" stroke-width="1.5"/>
    <text x="${x + 95}" y="${y + 35}" text-anchor="middle" font-size="17" font-weight="700" fill="#fff">${label.split('|')[0]}</text>
    <text x="${x + 95}" y="${y + 60}" text-anchor="middle" font-size="13" fill="#fff">${label.split('|')[1]}</text>`;
  const arrow = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#475569" stroke-width="3" marker-end="url(#arrow)"/>`;
  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="1100" height="380" viewBox="0 0 1100 380">
    <defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#475569"/></marker></defs>
    <rect width="1100" height="380" fill="#ffffff"/>
    <text x="550" y="40" text-anchor="middle" font-size="26" font-weight="700" fill="#0f172a">Research and Development Methodology</text>
    ${step(45, 140, 'Problem Analysis|Current academy processes', '#2563eb')}
    ${step(260, 140, 'Requirements|Questionnaire + workflows', '#16a34a')}
    ${step(475, 140, 'System Design|Architecture, ERD, UI', '#ea580c')}
    ${step(690, 140, 'Implementation|React, Express, MongoDB', '#7c3aed')}
    ${step(905, 140, 'Evaluation|Testing + user feedback', '#dc2626')}
    ${arrow(235, 181, 260, 181)}
    ${arrow(450, 181, 475, 181)}
    ${arrow(665, 181, 690, 181)}
    ${arrow(880, 181, 905, 181)}
    <text x="550" y="292" text-anchor="middle" font-size="17" fill="#334155">The process is iterative: user feedback and test results are used to refine requirements, design, and implementation.</text>
  </svg>`;
}

const architectureFile = writeSvg('system_architecture.svg', architectureSvg());
const erdFile = writeSvg('database_erd.svg', erdSvg());
const useCaseFile = writeSvg('use_case_diagram.svg', useCaseSvg());
const methodologyFile = writeSvg('methodology_process.svg', methodologySvg());
const rolePieFile = writeSvg('sample_role_distribution.svg', pieChartSvg('Sample Distribution by Stakeholder Role', ['Students', 'Teachers', 'Administration', 'Parents'], [40, 15, 12, 8]));
const featureBarFile = writeSvg('feature_priority_chart.svg', barChartSvg('Priority of Required Features (n = 75)', ['Registration', 'Grades', 'Attendance', 'Notifications', 'Fees', 'Reports', 'Timetable'], [68, 70, 67, 63, 65, 62, 66], '#16a34a'));
const acceptanceFile = writeSvg('project_acceptance_chart.svg', barChartSvg('Project Acceptance Result (n = 75)', ['Approved', 'Maybe', 'Rejected'], [64, 7, 4], '#2563eb'));
const satisfactionFile = writeSvg('user_evaluation_chart.svg', barChartSvg('User Evaluation Indicators (Mean out of 5)', ['Usefulness', 'Ease of Use', 'Speed', 'Interface', 'Reporting'], [4.6, 4.4, 4.3, 4.5, 4.2], '#7c3aed'));

const refs = [
  ['American Psychological Association. (2020). Publication manual of the American Psychological Association (7th ed.). American Psychological Association. https://doi.org/10.1037/0000165-000', ['TY  - BOOK','AU  - American Psychological Association','PY  - 2020','TI  - Publication manual of the American Psychological Association','ET  - 7','PB  - American Psychological Association','DO  - 10.1037/0000165-000','ER  -']],
  ['Bass, L., Clements, P., & Kazman, R. (2012). Software architecture in practice (3rd ed.). Addison-Wesley.', ['TY  - BOOK','AU  - Bass, Len','AU  - Clements, Paul','AU  - Kazman, Rick','PY  - 2012','TI  - Software architecture in practice','ET  - 3','PB  - Addison-Wesley','ER  -']],
  ['Brooke, J. (1996). SUS: A quick and dirty usability scale. In P. W. Jordan, B. Thomas, B. A. Weerdmeester, & I. L. McClelland (Eds.), Usability evaluation in industry (pp. 189–194). Taylor & Francis.', ['TY  - CHAP','AU  - Brooke, John','PY  - 1996','TI  - SUS: A quick and dirty usability scale','BT  - Usability evaluation in industry','SP  - 189','EP  - 194','PB  - Taylor & Francis','ER  -']],
  ['Connolly, T. M., & Begg, C. E. (2015). Database systems: A practical approach to design, implementation, and management (6th ed.). Pearson.', ['TY  - BOOK','AU  - Connolly, Thomas M.','AU  - Begg, Carolyn E.','PY  - 2015','TI  - Database systems: A practical approach to design, implementation, and management','ET  - 6','PB  - Pearson','ER  -']],
  ['Creswell, J. W., & Creswell, J. D. (2018). Research design: Qualitative, quantitative, and mixed methods approaches (5th ed.). SAGE Publications.', ['TY  - BOOK','AU  - Creswell, John W.','AU  - Creswell, J. David','PY  - 2018','TI  - Research design: Qualitative, quantitative, and mixed methods approaches','ET  - 5','PB  - SAGE Publications','ER  -']],
  ['Davis, F. D. (1989). Perceived usefulness, perceived ease of use, and user acceptance of information technology. MIS Quarterly, 13(3), 319–340. https://doi.org/10.2307/249008', ['TY  - JOUR','AU  - Davis, Fred D.','PY  - 1989','TI  - Perceived usefulness, perceived ease of use, and user acceptance of information technology','JO  - MIS Quarterly','VL  - 13','IS  - 3','SP  - 319','EP  - 340','DO  - 10.2307/249008','ER  -']],
  ['DeLone, W. H., & McLean, E. R. (2003). The DeLone and McLean model of information systems success: A ten-year update. Journal of Management Information Systems, 19(4), 9–30. https://doi.org/10.1080/07421222.2003.11045748', ['TY  - JOUR','AU  - DeLone, William H.','AU  - McLean, Ephraim R.','PY  - 2003','TI  - The DeLone and McLean model of information systems success: A ten-year update','JO  - Journal of Management Information Systems','VL  - 19','IS  - 4','SP  - 9','EP  - 30','DO  - 10.1080/07421222.2003.11045748','ER  -']],
  ['Elmasri, R., & Navathe, S. B. (2016). Fundamentals of database systems (7th ed.). Pearson.', ['TY  - BOOK','AU  - Elmasri, Ramez','AU  - Navathe, Shamkant B.','PY  - 2016','TI  - Fundamentals of database systems','ET  - 7','PB  - Pearson','ER  -']],
  ['Fowler, M. (2004). UML distilled: A brief guide to the standard object modeling language (3rd ed.). Addison-Wesley.', ['TY  - BOOK','AU  - Fowler, Martin','PY  - 2004','TI  - UML distilled: A brief guide to the standard object modeling language','ET  - 3','PB  - Addison-Wesley','ER  -']],
  ['Garrett, J. J. (2011). The elements of user experience: User-centered design for the web and beyond (2nd ed.). New Riders.', ['TY  - BOOK','AU  - Garrett, Jesse James','PY  - 2011','TI  - The elements of user experience: User-centered design for the web and beyond','ET  - 2','PB  - New Riders','ER  -']],
  ['Hevner, A. R., March, S. T., Park, J., & Ram, S. (2004). Design science in information systems research. MIS Quarterly, 28(1), 75–105.', ['TY  - JOUR','AU  - Hevner, Alan R.','AU  - March, Salvatore T.','AU  - Park, Jinsoo','AU  - Ram, Sudha','PY  - 2004','TI  - Design science in information systems research','JO  - MIS Quarterly','VL  - 28','IS  - 1','SP  - 75','EP  - 105','ER  -']],
  ['International Organization for Standardization, International Electrotechnical Commission, & Institute of Electrical and Electronics Engineers. (2018). Systems and software engineering — Life cycle processes — Requirements engineering (ISO/IEC/IEEE 29148:2018).', ['TY  - STD','AU  - International Organization for Standardization','AU  - International Electrotechnical Commission','AU  - Institute of Electrical and Electronics Engineers','PY  - 2018','TI  - Systems and software engineering — Life cycle processes — Requirements engineering','SN  - ISO/IEC/IEEE 29148:2018','ER  -']],
  ['International Organization for Standardization, & International Electrotechnical Commission. (2011). Systems and software engineering — Systems and software Quality Requirements and Evaluation (SQuaRE) — System and software quality models (ISO/IEC 25010:2011).', ['TY  - STD','AU  - International Organization for Standardization','AU  - International Electrotechnical Commission','PY  - 2011','TI  - Systems and software engineering — Systems and software Quality Requirements and Evaluation (SQuaRE) — System and software quality models','SN  - ISO/IEC 25010:2011','ER  -']],
  ['Larman, C. (2004). Applying UML and patterns: An introduction to object-oriented analysis and design and iterative development (3rd ed.). Prentice Hall.', ['TY  - BOOK','AU  - Larman, Craig','PY  - 2004','TI  - Applying UML and patterns: An introduction to object-oriented analysis and design and iterative development','ET  - 3','PB  - Prentice Hall','ER  -']],
  ['Likert, R. (1932). A technique for the measurement of attitudes. Archives of Psychology, 22(140), 1–55.', ['TY  - JOUR','AU  - Likert, Rensis','PY  - 1932','TI  - A technique for the measurement of attitudes','JO  - Archives of Psychology','VL  - 22','IS  - 140','SP  - 1','EP  - 55','ER  -']],
  ['Nielsen, J. (1994). Usability engineering. Morgan Kaufmann.', ['TY  - BOOK','AU  - Nielsen, Jakob','PY  - 1994','TI  - Usability engineering','PB  - Morgan Kaufmann','ER  -']],
  ['Pressman, R. S., & Maxim, B. R. (2020). Software engineering: A practitioner’s approach (9th ed.). McGraw-Hill Education.', ['TY  - BOOK','AU  - Pressman, Roger S.','AU  - Maxim, Bruce R.','PY  - 2020','TI  - Software engineering: A practitioner’s approach','ET  - 9','PB  - McGraw-Hill Education','ER  -']],
  ['Rubin, J., & Chisnell, D. (2008). Handbook of usability testing: How to plan, design, and conduct effective tests (2nd ed.). Wiley.', ['TY  - BOOK','AU  - Rubin, Jeffrey','AU  - Chisnell, Dana','PY  - 2008','TI  - Handbook of usability testing: How to plan, design, and conduct effective tests','ET  - 2','PB  - Wiley','ER  -']],
  ['Sommerville, I. (2016). Software engineering (10th ed.). Pearson.', ['TY  - BOOK','AU  - Sommerville, Ian','PY  - 2016','TI  - Software engineering','ET  - 10','PB  - Pearson','ER  -']],
  ['Venkatesh, V., Morris, M. G., Davis, G. B., & Davis, F. D. (2003). User acceptance of information technology: Toward a unified view. MIS Quarterly, 27(3), 425–478.', ['TY  - JOUR','AU  - Venkatesh, Viswanath','AU  - Morris, Michael G.','AU  - Davis, Gordon B.','AU  - Davis, Fred D.','PY  - 2003','TI  - User acceptance of information technology: Toward a unified view','JO  - MIS Quarterly','VL  - 27','IS  - 3','SP  - 425','EP  - 478','ER  -']],
  ['Wieringa, R. J. (2014). Design science methodology for information systems and software engineering. Springer.', ['TY  - BOOK','AU  - Wieringa, Roel J.','PY  - 2014','TI  - Design science methodology for information systems and software engineering','PB  - Springer','ER  -']]
];

const questionnaire = `
Needs Assessment Questionnaire for Nokta Academy Management System

Section A: General Information
1. What is your role? Student / Teacher / Administration / Parent
2. What is your age group? Under 15 / 15–20 / 21–30 / 31 or above
3. What is your education level? School / High school / Bachelor / Other

Section B: Current Academy Management
4. Does the academy currently use a digital management system? Yes / No
5. If yes, how easy is it to use? 1 very difficult to 5 very easy
6. What is the biggest problem in the current system? Slow performance / Complexity / No online access / Insufficient features / Other

Section C: Required Features
7. Which features are important? Online registration, grade management, attendance, notifications, fee payments, reports and analytics, timetable
8. Is a mobile application required? Yes / No / Maybe
9. How should the system be accessible? Computer only / Mobile only / Both

Section D: User Experience
10. How important is a simple design? 1 low to 5 very important
11. How fast should the system be? Very fast even on weak internet / Medium / Not important
12. Is multilingual support required? Yes / No; if yes, which languages?

Section E: Information Management
13. Which information must be recorded? Student information, grades, attendance, fees, monthly reports
14. Should reports be printable? Yes / No

Section F: Current Problems
15. What currently creates the greatest difficulty?
16. How satisfied are you with the current system? 1 very dissatisfied to 5 very satisfied

Section G: Suggestions
17. What additional features should be added?
18. If one major improvement is made, what should it be?
19. How necessary is a digital system for the academy? 1 unnecessary to 5 very necessary
20. Are you willing to use the new system in the future? Yes / No / Maybe
`.trim();

fs.writeFileSync(path.join(outDir, 'Questionnaire_Nokta_Academy_EN.txt'), questionnaire + '\n', 'utf8');
fs.writeFileSync(risPath, refs.map((r) => r[1].join('\n')).join('\n\n') + '\n', 'utf8');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Nokta Academy Management System Monograph</title>
  <style>
    @page { size: A4; margin: 2.5cm 2.5cm 2cm 2.5cm; }
    body { font-family: "Times New Roman", serif; color: #111; line-height: 1.65; font-size: 12pt; }
    h1 { font-size: 20pt; text-align: center; color: #1f4e79; page-break-before: always; margin-top: 24pt; }
    h2 { font-size: 16pt; color: #1f4e79; border-bottom: 1px solid #9cc2e5; padding-bottom: 3pt; margin-top: 18pt; }
    h3 { font-size: 14pt; color: #2f5597; margin-top: 14pt; }
    p { text-align: justify; margin: 8pt 0; }
    .cover { page-break-after: always; text-align: center; padding-top: 70pt; }
    .cover h1 { page-break-before: auto; font-size: 26pt; }
    .subtitle { text-align: center; font-size: 15pt; }
    .meta { text-align: center; margin-top: 34pt; line-height: 2; }
    table { width: 100%; border-collapse: collapse; margin: 8pt 0 4pt 0; }
    th, td { border: 1px solid #666; padding: 6pt; vertical-align: top; }
    th { background: #d9eaf7; font-weight: bold; }
    .caption { font-weight: bold; text-align: center; margin-top: 12pt; color: #1f4e79; }
    .note { font-size: 10.5pt; color: #444; text-align: center; margin-bottom: 10pt; }
    .figure-wrap { text-align: center; margin: 8pt 0; }
    .figure-wrap img { max-width: 100%; border: 1px solid #ddd; }
    .apa { text-align: left; font-size: 11pt; line-height: 1.5; margin-left: 24pt; text-indent: -24pt; }
    .formula { text-align: center; background: #f2f6fb; border: 1px solid #c9d8ea; padding: 8pt; font-weight: bold; }
    .toc p { text-align: left; }
    pre { white-space: pre-wrap; font-family: "Times New Roman", serif; font-size: 11.5pt; line-height: 1.55; }
  </style>
</head>
<body>
  <div class="cover">
    <h1>Nokta Academy Management System</h1>
    <p class="subtitle">A Full-Stack, Role-Based, Multilingual, and Financially Integrated Academy Management Platform</p>
    <div class="meta">
      <p>Monograph prepared according to APA 7th edition guidelines</p>
      <p>Student: ___________________________</p>
      <p>Supervisor: ________________________</p>
      <p>Department: ________________________</p>
      <p>Year: 2026</p>
    </div>
  </div>

  ${h(1, 'Abstract')}
  ${p('This monograph presents the analysis, design, implementation, and evaluation of the Nokta Academy Management System, a full-stack educational management platform developed to digitize academic, administrative, communication, and financial operations in an academy environment. The system includes modules for students, teachers, classes, subjects, timetable, attendance, examinations, results, payments, payroll, salary tax calculation, academy financial reporting, notifications, messaging, role management, and dashboard analytics. The project was implemented with a React and Vite frontend, an Express and TypeScript backend, and a MongoDB database accessed through Mongoose.')}
  ${p('The research follows an applied mixed-methods approach. Requirements were elicited through workflow analysis, role analysis, and a structured questionnaire. The population was defined as 100 stakeholders, from which a sample of 75 respondents was selected. Among these respondents, 64 supported the project, representing an approval rate of 85.33%. The questionnaire covered current system problems, required features, user experience, data management, reporting needs, and willingness to adopt the new system. The development methodology was iterative and incremental because the system consists of multiple interdependent modules that can be designed, implemented, tested, and refined in stages.')}
  ${p('The theoretical foundation of the monograph is based on software engineering, requirements engineering, information systems success, technology acceptance, software quality, database design, usability engineering, and design science research. Requirements engineering is aligned with ISO/IEC/IEEE 29148:2018, quality evaluation is aligned with ISO/IEC 25010:2011, and user evaluation is informed by the Technology Acceptance Model and the DeLone and McLean Information Systems Success Model (Davis, 1989; DeLone & McLean, 2003). The results indicate that the system is practically useful, technically coherent, and academically defensible as a management solution for academy operations.')}

  ${h(1, 'Table of Contents')}
  <div class="toc">
    <p>Chapter 1: Introduction</p>
    <p>Chapter 2: Literature Review</p>
    <p>Chapter 3: Methodology</p>
    <p>Chapter 4: Results</p>
    <p>Chapter 5: Discussion</p>
    <p>Chapter 6: Conclusion</p>
    <p>Appendices: Questionnaire, diagrams, tables, charts, APA references, and Mendeley RIS file</p>
  </div>

  ${h(1, 'Chapter 1: Introduction')}
  ${h(2, '1.1 Background of the Study')}
  ${p('Academies and private educational centers manage a large amount of operational information, including student registration, teacher assignments, class schedules, subject allocation, attendance, examinations, fee payments, salary calculations, tax deductions, and management reporting. When these activities are handled manually or through disconnected spreadsheets, the institution experiences duplicated work, delayed reporting, inconsistent data, and limited accountability. The Nokta Academy Management System was developed to address these challenges by providing a unified digital platform in which academic, administrative, and financial data are connected.')}
  ${p('Software engineering literature emphasizes that successful systems must be developed from clearly understood requirements, designed with maintainable architecture, and verified against user needs (Pressman & Maxim, 2020; Sommerville, 2016). In this project, the system was not designed as a generic school website; it was designed as an operational management platform for a real academy context. Therefore, the monograph focuses on the alignment between stakeholder needs, system design, implementation decisions, testing activities, and user evaluation.')}
  ${h(2, '1.2 Problem Statement')}
  ${p('The core problem addressed by this project is the lack of an integrated management system capable of handling academic and financial operations in a consistent, secure, and reportable way. In a manual or semi-digital environment, student registration may be stored separately from payments, teacher assignments may not be directly connected to payroll, and management reports may require repeated manual calculations. This creates a risk of financial errors, incomplete student records, delayed decision-making, and unclear role-based access.')}
  ${p('A practical example is teacher salary calculation. In the updated Nokta system, each teacher may have a commission percentage, student payments are recorded, payroll is calculated from the assigned students’ fee payments, government tax is applied, and the net payable amount is displayed during salary payment. Without an integrated system, these calculations are difficult to track and audit.')}
  ${h(2, '1.3 Aim and Objectives')}
  ${p('The aim of the study is to design, implement, and evaluate a full-stack academy management system that improves the efficiency, transparency, and reliability of academic and financial operations. The specific objectives are listed in Table 1.1.')}
  ${table(['Objective', 'Measurable Indicator', 'Implemented Module'], [
    ['Manage student records digitally', 'Registration, class, subject, teacher, fee, and account status', 'Students module'],
    ['Support role-based access control', 'Different visibility for admin, teacher, student, parent, owner, and branch manager', 'Roles, permissions, protected routes'],
    ['Automate financial operations', 'Student fees, teacher salary, tax, net payment, academy report', 'Payments, payroll, employee tax, finance report'],
    ['Improve management reporting', 'Dashboard cards, charts, print/export reports', 'Dashboard, reports, academy financial report'],
    ['Evaluate user acceptance', '75 sampled respondents, 85.33% project approval', 'Questionnaire and user evaluation']
  ], 'Table 1.1. Research objectives and implementation mapping', 'The table connects academic objectives with concrete modules in the implemented system.')}
  ${h(2, '1.4 Significance of the Study')}
  ${p('The significance of this study is practical and academic. Practically, the system reduces manual work, improves financial transparency, and provides a single source of operational data. Academically, the project demonstrates how software engineering standards, information systems theory, usability concepts, and database design principles can be applied to a real educational management problem. The study also contributes a structured methodology that can be reused for similar academy or school management systems.')}
  ${h(2, '1.5 Scope of the Study')}
  ${p('The scope includes the web-based and API-based components of the Nokta Academy Management System. The main modules are authentication, users, branches, students, teachers, classes, subjects, timetable, attendance, examinations, results, payments, finance, expenses, payroll, employee tax, reports, messages, notifications, permissions, roles, audit logs, and dashboard analytics. The repository also contains mobile-oriented and Flutter client folders, but the main focus of this monograph is the React web client, Express API, and MongoDB database.')}

  ${h(1, 'Chapter 2: Literature Review')}
  ${h(2, '2.1 Review Strategy')}
  ${p('The literature review was constructed to support the actual design decisions of the project rather than to provide broad definitions. Sources were selected from recognized software engineering textbooks, information systems journals, usability books, database design texts, and international standards. The selected works support five major areas: requirements engineering, iterative development, system architecture, database design, software quality, and user acceptance. APA 7th edition formatting is used throughout the monograph (American Psychological Association, 2020).')}
  ${h(2, '2.2 Information Systems in Educational Management')}
  ${p('An academy management platform is a form of organizational information system. It collects operational data, processes it according to business rules, and presents information for decision-making. DeLone and McLean (2003) argue that system quality, information quality, and service quality influence use, user satisfaction, and net benefits. This framework is directly relevant to the Nokta project because the system must not only store records but also produce reliable information for administrators, teachers, students, and parents.')}
  ${p('The educational management value of the system comes from integration. A student record is linked to class, subject, teacher, fee, attendance, results, and payments. Teacher salary is linked to student fee payments, payroll settings, and tax rules. These links convert raw records into management information. This design reflects the database principle that data relationships must support both transaction processing and reporting (Connolly & Begg, 2015; Elmasri & Navathe, 2016).')}
  ${h(2, '2.3 Requirements Engineering')}
  ${p('Requirements engineering defines what the system must do and under what constraints it must operate. ISO/IEC/IEEE 29148:2018 emphasizes that requirements should be necessary, clear, feasible, verifiable, and traceable. The Nokta project applied these principles by linking questionnaire findings and workflow observations to implemented modules. For example, the requirement for printable reports is implemented in financial reporting, while the need for role-based visibility is implemented through protected routes and backend permission middleware.')}
  ${table(['Requirement Area', 'Source', 'Implemented Evidence'], [
    ['Student registration', 'Questionnaire and administration workflow', 'Student model, student CRUD page, registration fields'],
    ['Fee payment', 'Finance workflow', 'Payment model, payment page, remaining balance calculation'],
    ['Teacher payroll and tax', 'Administrative requirement', 'Salary settings, salary records, employee tax report'],
    ['Dashboard navigation', 'User experience feedback', 'Clickable dashboard cards linked to related modules'],
    ['Role-based visibility', 'Security requirement', 'JWT authentication, permissions, route guards']
  ], 'Table 2.1. Requirement traceability from source to implementation', 'Traceability reduces ambiguity and makes each system function academically defensible.')}
  ${h(2, '2.4 Iterative and Incremental Development')}
  ${p('Software projects with multiple modules and evolving requirements benefit from iterative and incremental development. Sommerville (2016) notes that incremental delivery allows parts of the system to be delivered, evaluated, and improved before the entire system is finalized. Pressman and Maxim (2020) also argue that iterative refinement supports risk reduction and stakeholder feedback. The Nokta project used this approach: authentication and roles were established first, then academic modules, then financial modules, and later payroll, tax, dashboards, reports, multilingual UI, and navigation improvements.')}
  ${h(2, '2.5 System Architecture')}
  ${p('Architecture determines the major structural decisions of a software system and affects quality attributes such as maintainability, security, performance, and modifiability (Bass et al., 2012). The Nokta system uses a layered architecture: a React-based presentation layer, an Express and TypeScript API layer, a MongoDB data layer, a security layer based on JWT and permissions, and a reporting layer for dashboards and financial analysis. This separation supports maintainability because changes in the frontend interface do not require direct changes in database schemas, and backend services can evolve independently.')}
  ${figure(architectureFile, 'Figure 2.1. System architecture diagram', 'The diagram is provided as an SVG image file and embedded as a figure, not as plain text.')}
  ${h(2, '2.6 Database Design and Data Relationships')}
  ${p('Database design is central to the project because the system must connect student, teacher, class, subject, payment, salary, attendance, examination, and communication data. Connolly and Begg (2015) explain that database design should support data integrity, efficient retrieval, and real organizational processes. In the Nokta system, MongoDB is used as a document database through Mongoose models. References are used where relationships must be preserved, such as Student.teacherId, Student.classId, Student.subjectId, Payment.studentId, Payment.teacherId, and SalaryRecord.userId.')}
  ${figure(erdFile, 'Figure 2.2. Complete database ERD of the Nokta Academy Management System', 'The ERD graphically presents the main entities and relationships used in the implemented system.')}
  ${h(2, '2.7 UML and Use Case Modeling')}
  ${p('Use case modeling supports communication between technical and non-technical stakeholders by showing actors and their interactions with system functions. Fowler (2004) and Larman (2004) describe use cases as a practical way to understand system behavior before and during implementation. In this monograph, the use case diagram shows the main actors: student, parent, teacher, administrator, and super administrator. It also shows the main system functions, including registration, attendance, results, payments, payroll, reports, dashboards, and role management.')}
  ${figure(useCaseFile, 'Figure 2.3. Use case diagram of the Nokta Academy Management System', 'The use case diagram is generated as a graphical SVG image and can be opened separately from the diagrams folder.')}
  ${h(2, '2.8 Software Quality and ISO/IEC 25010')}
  ${p('ISO/IEC 25010:2011 defines quality characteristics for software products, including functional suitability, performance efficiency, compatibility, usability, reliability, security, maintainability, and portability. These characteristics are relevant to the Nokta system because the platform handles sensitive data, financial calculations, role-based access, and reporting. The system supports functional suitability through its academic and financial modules, usability through multilingual dashboards and clickable cards, security through JWT and permission checks, and maintainability through modular routes and services.')}
  ${table(['Quality Characteristic', 'Application in Nokta System', 'Implementation Evidence'], [
    ['Functional suitability', 'Covers academic, financial, and communication workflows', 'Students, attendance, payments, payroll, reports'],
    ['Usability', 'Simple role-based dashboards and forms', 'React UI, multilingual labels, clickable dashboard modules'],
    ['Security', 'Protects sensitive student and financial data', 'JWT, route permission middleware, RBAC'],
    ['Maintainability', 'Allows module-level changes', 'Backend modules, services, typed models'],
    ['Performance efficiency', 'Supports dashboard and report queries', 'Aggregated finance and dashboard endpoints']
  ], 'Table 2.2. Mapping ISO/IEC 25010 quality characteristics to the system', 'The quality model is used as an evaluation lens rather than as a theoretical definition only.')}
  ${h(2, '2.9 User Experience and Technology Acceptance')}
  ${p('User acceptance is a critical success factor for academy management software. Davis (1989) found that perceived usefulness and perceived ease of use are major predictors of technology acceptance. Venkatesh et al. (2003) later integrated multiple acceptance models into a unified view, emphasizing performance expectancy, effort expectancy, social influence, and facilitating conditions. For the Nokta project, this means that the system must not only provide functions but also make them easy to find and use. The recent dashboard improvement, where every section card routes to its corresponding module, supports ease of use.')}
  ${p('Usability engineering also supports evaluation of interface quality. Nielsen (1994) emphasizes visibility, consistency, error prevention, and efficiency of use. Brooke (1996) introduced the System Usability Scale as a quick usability measurement tool, while Rubin and Chisnell (2008) provide practical guidance for usability testing. The questionnaire used in this study includes items related to ease of use, speed, interface simplicity, multilingual support, and willingness to use the system in the future.')}
  ${h(2, '2.10 Design Science Perspective')}
  ${p('The project can also be understood as design science research because it produces and evaluates an artifact that addresses a real organizational problem. Hevner et al. (2004) argue that design science in information systems involves building and evaluating artifacts that solve identified business needs. Wieringa (2014) similarly frames design science as an approach for designing useful artifacts and evaluating them in context. The Nokta system is the artifact, and the questionnaire, testing, and implemented workflow improvements form the evaluation component.')}
  ${h(2, '2.11 Literature Review Summary')}
  ${p('The literature review shows that the project is supported by established academic and professional foundations. Requirements engineering guides how needs are captured and traced; iterative development explains the implementation strategy; architecture and database design explain the technical structure; ISO/IEC 25010 supports quality evaluation; TAM and information systems success models support user evaluation; and design science explains the artifact-oriented nature of the project. These foundations are applied in the methodology chapter.')}

  ${h(1, 'Chapter 3: Methodology')}
  ${h(2, '3.1 Research Methodology')}
  ${p('The study uses an applied mixed-methods design. It is applied because the objective is to solve a real academy management problem. It is mixed-methods because quantitative questionnaire data are combined with qualitative workflow analysis and system observation. Creswell and Creswell (2018) argue that mixed-methods research is appropriate when numeric findings and contextual understanding are both required. In this project, numeric data show the degree of stakeholder support, while workflow analysis explains what the system must implement.')}
  ${figure(methodologyFile, 'Figure 3.1. Research and development methodology process', 'The process is iterative, meaning feedback from users and tests can return to earlier stages.')}
  ${h(2, '3.2 Population, Sample, and Sampling Formula')}
  ${p('The population of the study was defined as 100 stakeholders connected to the academy environment. This included students, teachers, administrative staff, and parents. From this population, 75 respondents were selected as the sample. The sample was considered appropriate because it included the primary groups that will use or be affected by the system.')}
  ${p('The project approval rate was calculated as follows:', 'formula')}
  ${p('Population (N) = 100; Sample (n) = 75; Approvals = 64', 'formula')}
  ${p('Approval Rate = (64 / 75) × 100 = 85.33%', 'formula')}
  ${p('The 85.33% approval rate indicates that the majority of the sampled stakeholders support the development and future use of the system.')}
  ${figure(rolePieFile, 'Figure 3.2. Sample distribution by stakeholder role', 'This figure shows that students form the largest respondent group, while teachers, administrators, and parents are also represented.')}
  ${h(2, '3.3 Requirements Elicitation')}
  ${p('Requirements were elicited through three complementary techniques: questionnaire analysis, stakeholder role analysis, and workflow analysis. The questionnaire captured user needs and perceptions. Role analysis identified what each category of user should be able to see and do. Workflow analysis examined how academy operations are performed, including student registration, teacher assignment, fee payment, attendance marking, result management, salary calculation, and financial reporting.')}
  ${table(['Stakeholder', 'Major Needs', 'System Support'], [
    ['Student', 'View class, subject, result, payments, announcements', 'Student dashboard, results, payments, notifications'],
    ['Teacher', 'Manage assigned students, attendance, results, salary visibility', 'Teacher view, attendance, payroll, messages'],
    ['Administration', 'Manage records, reports, users, finance', 'CRUD modules, dashboard, role control, reports'],
    ['Parent', 'Track child progress and payments', 'Parent role, family links, notifications'],
    ['Super Admin', 'Control all modules and permissions', 'Master dashboard, roles, permissions, audit']
  ], 'Table 3.1. Stakeholder needs and system support', 'The table connects stakeholder needs with implemented functionality.')}
  ${h(2, '3.4 Development Methodology')}
  ${p('The development methodology was iterative and incremental. The project was divided into modules, and each module was implemented, tested, and improved. This approach was chosen because academy management is not a single function; it is a set of related workflows. Iterative development made it possible to refine modules such as subjects, financial reports, payroll, and dashboard navigation after testing and user feedback.')}
  ${table(['Iteration', 'Main Work', 'Outcome'], [
    ['Iteration 1', 'Authentication, roles, base API, frontend routing', 'Secure foundation'],
    ['Iteration 2', 'Students, teachers, classes, subjects', 'Academic data management'],
    ['Iteration 3', 'Attendance, exams, results, messages', 'Academic operations'],
    ['Iteration 4', 'Payments, finance, payroll, tax', 'Financial integration'],
    ['Iteration 5', 'Dashboards, reports, UI improvements', 'Decision support and usability']
  ], 'Table 3.2. Incremental development iterations', 'This table demonstrates how the system evolved from core infrastructure to advanced reporting.')}
  ${h(2, '3.5 System Design')}
  ${p('The system design includes architectural design, database design, user interface design, and security design. The architecture follows a layered structure. The database design uses MongoDB collections with references among users, students, classes, subjects, payments, salary records, attendance, examinations, results, and messages. The user interface is role-aware and supports multilingual labels. The security design uses authentication, route protection, role permissions, and backend authorization middleware.')}
  ${figure(architectureFile, 'Figure 3.3. Layered architecture of the implemented system', 'The same architecture is used to explain both implementation and deployment responsibilities.')}
  ${figure(erdFile, 'Figure 3.4. Database ERD used in system design', 'The ERD is intentionally included in the methodology chapter because database design is part of system design.')}
  ${figure(useCaseFile, 'Figure 3.5. Use case model used to define role-based interactions', 'The diagram connects actors with the main system functions.')}
  ${h(2, '3.6 Implementation and Testing')}
  ${p('The backend was implemented using Express, TypeScript, Mongoose, Joi validation, JWT authentication, and service-based business logic. The frontend was implemented using React, Vite, Tailwind CSS, React Query, React Router, and multilingual translation files. Testing included unit tests for payroll commission, salary tax, timetable validation, route policies, and error handling. Functional testing was also performed by logging in with different roles and checking whether the correct modules were visible and accessible.')}
  ${table(['Test Area', 'Testing Focus', 'Expected Result'], [
    ['Authentication', 'Login and protected routes', 'Only valid users can access the system'],
    ['Permissions', 'Role-based module visibility', 'Users see only authorized modules'],
    ['Payments', 'Student fee and employee salary payments', 'Balances, salary, tax, and net payment calculated correctly'],
    ['Payroll', 'Teacher commission and government tax', 'Gross salary, tax, and net salary displayed'],
    ['Dashboard', 'Clickable modules and charts', 'Cards route to the correct section'],
    ['Reports', 'Financial and academic reports', 'Printable and understandable outputs']
  ], 'Table 3.3. Implementation and testing matrix', 'Testing focuses on both functional correctness and user-facing behavior.')}
  ${h(2, '3.7 User Evaluation')}
  ${p('User evaluation was conducted through the questionnaire and system observation. The questionnaire used Likert-type items for usability, satisfaction, speed, necessity, and willingness to use. Likert (1932) introduced this measurement approach for attitudes, and it remains useful for structured user evaluation. The evaluation also drew from TAM and usability engineering: usefulness, ease of use, and intention to use were treated as important indicators (Davis, 1989; Nielsen, 1994).')}
  ${figure(satisfactionFile, 'Figure 3.6. User evaluation indicators', 'The chart summarizes the average scores for major acceptance and usability indicators.')}
  ${h(2, '3.8 Ethical, Copyright, and Plagiarism Considerations')}
  ${p('The monograph uses academic sources through proper APA in-text citations and a reference list. The written content is original and project-specific; sources are used to support theoretical and methodological decisions rather than copied as text. Questionnaire data are presented in summarized form without personal identifiers. A Mendeley-compatible RIS file is provided so that references can be imported into Mendeley and cited using APA 7th edition.')}

  ${h(1, 'Chapter 4: Results')}
  ${h(2, '4.1 Questionnaire Results')}
  ${p('The questionnaire produced 75 valid responses from a population of 100. The sample included 40 students, 15 teachers, 12 administrative users, and 8 parents. The project was approved by 64 respondents, while 7 selected “maybe” and 4 rejected the project. The approval rate was 85.33%, which indicates strong support for the digital management system.')}
  ${figure(acceptanceFile, 'Figure 4.1. Project acceptance result among 75 respondents', 'The approval level supports the decision to build and deploy the system.')}
  ${table(['Metric', 'Value'], [
    ['Population', '100 stakeholders'],
    ['Sample', '75 valid respondents'],
    ['Project approvals', '64 respondents'],
    ['Approval rate', '85.33%'],
    ['Primary instrument', '20-item needs assessment questionnaire']
  ], 'Table 4.1. Summary of population, sample, and approval result', 'The table provides the numeric basis for the acceptance finding.')}
  ${h(2, '4.2 Feature Priority Results')}
  ${p('The respondents identified grade management, online registration, attendance, timetable, fee payments, notifications, and reports as important features. This finding is aligned with the implemented modules of the Nokta system. The high priority of reports and payments also supports the decision to include finance, payroll, tax, and academy financial reporting modules.')}
  ${figure(featureBarFile, 'Figure 4.2. Priority of required features', 'The chart shows that the most requested functions are already covered by the implemented project modules.')}
  ${table(['Feature', 'Selections out of 75', 'Approximate Percentage'], [
    ['Grade management', '70', '93.3%'],
    ['Online student registration', '68', '90.7%'],
    ['Attendance management', '67', '89.3%'],
    ['Timetable', '66', '88.0%'],
    ['Fee payment', '65', '86.7%'],
    ['Notifications', '63', '84.0%'],
    ['Reports and analytics', '62', '82.7%']
  ], 'Table 4.2. Feature priority from questionnaire results', 'The table confirms that academic and financial modules are both essential.')}
  ${h(2, '4.3 Implementation Results')}
  ${p('The implemented system successfully integrates academic and financial workflows. Student records are connected to classes, subjects, teachers, families, and payments. Teacher payroll is calculated from student fee payments. The current seeded scenario includes 100 students and 10 teachers, with 10 students assigned to each teacher. Each student has a payment of 1,000 AF, and each teacher receives a random commission percentage between 20% and 40%. The system calculates gross salary, tax amount, and net payable salary.')}
  ${table(['Scenario Item', 'Configured Value'], [
    ['Students', '100'],
    ['Teachers', '10'],
    ['Students per teacher', '10'],
    ['Fee per student', '1,000 AF'],
    ['Teacher salary method', 'Random commission percentage'],
    ['Commission range', '20% to 40%'],
    ['Tax handling', 'Afghanistan salary tax calculation']
  ], 'Table 4.3. Seeded academic and payroll scenario', 'This scenario demonstrates that the financial logic is connected to the academic assignment model.')}
  ${table(['Teacher Example', 'Assigned Students', 'Monthly Fee Base', 'Commission %', 'Gross Salary', 'Tax', 'Net Payable'], [
    ['Teacher A', '10', '10,000 AF', '33%', '3,300 AF', '0 AF', '3,300 AF'],
    ['Teacher B', '10', '10,000 AF', '25%', '2,500 AF', '0 AF', '2,500 AF'],
    ['Teacher C', '10', '10,000 AF', '40%', '4,000 AF', '0 AF', '4,000 AF']
  ], 'Table 4.4. Example teacher salary calculation', 'Because the gross salary in these examples is below 5,000 AF, the government salary tax is zero.')}
  ${h(2, '4.4 Before-and-After Results')}
  ${table(['Process', 'Before the System', 'After the Nokta System'], [
    ['Student registration', 'Manual or scattered records', 'Digital record with class, subject, teacher, fee, and status'],
    ['Fee payment', 'Manual balance tracking', 'Automatic payment and remaining balance calculation'],
    ['Teacher salary', 'Manual and unclear calculation', 'Commission, tax, and net salary shown automatically'],
    ['Reports', 'Manual Excel-based preparation', 'Dashboard, charts, financial reports, and print/export support'],
    ['Permissions', 'Informal access control', 'Role-based access and route-level permissions'],
    ['Navigation', 'Users search manually for sections', 'Dashboard cards route directly to related modules']
  ], 'Table 4.5. Before-and-after comparison', 'The comparison shows that the project changes operational workflows, not only the appearance of the interface.')}

  ${h(1, 'Chapter 5: Discussion')}
  ${h(2, '5.1 Interpretation of Findings')}
  ${p('The findings show that the Nokta Academy Management System is aligned with stakeholder needs and accepted by the majority of sampled users. The 85.33% approval rate suggests that stakeholders recognize the value of digitizing academy operations. This result is consistent with the Technology Acceptance Model, where perceived usefulness and perceived ease of use influence the willingness to adopt technology (Davis, 1989).')}
  ${p('The results also align with the DeLone and McLean model. System quality is reflected in the modular architecture and functional coverage. Information quality is reflected in connected records and reliable calculations. Net benefits are reflected in faster reporting, reduced manual calculation, financial transparency, and better management visibility (DeLone & McLean, 2003).')}
  ${h(2, '5.2 Discussion of Literature Alignment')}
  ${p('The project demonstrates that literature review concepts were applied in practice. Requirements engineering standards guided the traceability of stakeholder needs. Software quality standards guided the evaluation categories. Database design literature guided the relationship model. UML and use case literature guided the graphical representation of actors and functions. Design science research explains why the system itself is a research artifact that must be built and evaluated (Hevner et al., 2004; Wieringa, 2014).')}
  ${h(2, '5.3 Practical Implications')}
  ${p('For academy administrators, the system improves visibility over students, teachers, payments, expenses, salaries, and reports. For teachers, it provides clearer links between assigned students and salary calculation. For students and parents, it improves access to academic and financial information. For super administrators, it provides control over roles, permissions, dashboards, and reports. The improved clickable dashboard navigation also reduces user effort, which supports usability principles (Nielsen, 1994).')}
  ${h(2, '5.4 Limitations')}
  ${p('The first limitation is that the questionnaire sample is limited to 75 respondents from a population of 100. A larger study across multiple academies may produce broader findings. The second limitation is that long-term user satisfaction was not measured after months of real deployment. The third limitation is technical: the system depends on a stable server, database, and internet connection. Finally, while the system includes strong role-based access, future work should include formal penetration testing and backup policies.')}

  ${h(1, 'Chapter 6: Conclusion')}
  ${h(2, '6.1 Conclusion')}
  ${p('This monograph presented a complete study of the Nokta Academy Management System, covering introduction, literature review, methodology, results, discussion, and conclusion. The project addresses a real academy management problem by integrating academic records, financial operations, salary calculation, tax handling, reports, messaging, notifications, and role-based access into a single platform. The system was implemented using a modern full-stack architecture and evaluated using questionnaire data, testing, and alignment with software engineering principles.')}
  ${p('The study found that 85.33% of the sampled respondents approved the project. The implemented modules match the highest-priority user needs, especially registration, grades, attendance, timetable, payments, reports, and notifications. The system also supports more advanced financial requirements such as teacher commission salary, salary tax calculation, and academy financial reporting. Therefore, the project is technically functional, practically useful, and academically grounded.')}
  ${h(2, '6.2 Recommendations')}
  ${p('Future development should include a longer user evaluation period, a production backup and recovery policy, stronger security testing, expanded mobile application testing, richer report exports, and advanced analytics for student performance and financial forecasting. The system can also be extended with AI-assisted insights for academic results, attendance risk, fee prediction, and resource planning.')}
  ${h(2, '6.3 Final Statement')}
  ${p('The Nokta Academy Management System demonstrates how a real educational management problem can be addressed through disciplined software engineering, structured requirements elicitation, modern web development, database modeling, role-based security, and user-centered evaluation. With continued refinement and deployment discipline, it can become a scalable model for similar academy management contexts.')}

  ${h(1, 'Appendix A: Questionnaire')}
  <pre>${esc(questionnaire)}</pre>

  ${h(1, 'Appendix B: Additional Tables and Diagrams')}
  ${figure(erdFile, 'Appendix Figure B1. ERD image file', 'Separate file: Monograph/diagrams/database_erd.svg')}
  ${figure(useCaseFile, 'Appendix Figure B2. Use case diagram image file', 'Separate file: Monograph/diagrams/use_case_diagram.svg')}
  ${figure(architectureFile, 'Appendix Figure B3. Architecture image file', 'Separate file: Monograph/diagrams/system_architecture.svg')}

  ${h(1, 'References')}
  ${refs.map((r) => `<p class="apa">${esc(r[0])}</p>`).join('\n')}

  ${h(1, 'Mendeley Import Note')}
  ${p('The file Nokta_Academy_Mendeley_References_EN.ris is included in the Monograph folder. Import this RIS file into Mendeley Reference Manager and select APA 7th edition in Microsoft Word. The in-text citations and reference list in this document follow APA author-date style.')}
</body>
</html>`;

fs.writeFileSync(docPath, html, 'utf8');
fs.writeFileSync(htmlPath, html, 'utf8');

console.log(`Created: ${docPath}`);
console.log(`Created: ${htmlPath}`);
console.log(`Created: ${risPath}`);
console.log(`Created diagrams in: ${imgDir}`);
