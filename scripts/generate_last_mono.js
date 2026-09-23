const fs = require('fs');
const path = require('path');
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
const diagramsDir = path.join(outDir, 'diagrams');
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(diagramsDir, { recursive: true });

const outputDocx = path.join(outDir, 'Last_Mono.docx');
const outputRis = path.join(outDir, 'Last_Mono_Mendeley_References.ris');
const citationMap = path.join(outDir, 'Last_Mono_Citation_Map.md');

const inch = 1440;
const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lA9jNwAAAABJRU5ErkJggg==',
  'base64',
);

function svgImage(fileName, width = 620, height = 380) {
  const data = fs.readFileSync(path.join(diagramsDir, fileName));
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 160 },
    children: [
      new ImageRun({
        type: 'svg',
        data,
        transformation: { width, height },
        fallback: { type: 'png', data: transparentPng },
      }),
    ],
  });
}

const references = [
  ['Aldowah et al., 2019', 'Aldowah, H., Al-Samarraie, H., & Fauzy, W. M. (2019). Educational data mining and learning analytics for 21st century higher education: A review and synthesis. Telematics and Informatics, 37, 13–49. https://doi.org/10.1016/j.tele.2019.01.007', ['TY  - JOUR', 'AU  - Aldowah, Hanan', 'AU  - Al-Samarraie, Hosam', 'AU  - Fauzy, W. M.', 'PY  - 2019', 'TI  - Educational data mining and learning analytics for 21st century higher education: A review and synthesis', 'JO  - Telematics and Informatics', 'VL  - 37', 'SP  - 13', 'EP  - 49', 'DO  - 10.1016/j.tele.2019.01.007', 'ER  -']],
  ['Al-Samarraie & Saeed, 2022', 'Al-Samarraie, H., & Saeed, N. (2022). Understanding the adoption of smart educational systems: A systematic literature review. Education and Information Technologies, 27(1), 611–639. https://doi.org/10.1007/s10639-021-10711-3', ['TY  - JOUR', 'AU  - Al-Samarraie, Hosam', 'AU  - Saeed, N.', 'PY  - 2022', 'TI  - Understanding the adoption of smart educational systems: A systematic literature review', 'JO  - Education and Information Technologies', 'VL  - 27', 'IS  - 1', 'SP  - 611', 'EP  - 639', 'DO  - 10.1007/s10639-021-10711-3', 'ER  -']],
  ['APA, 2020', 'American Psychological Association. (2020). Publication manual of the American Psychological Association (7th ed.). American Psychological Association. https://doi.org/10.1037/0000165-000', ['TY  - BOOK', 'AU  - American Psychological Association', 'PY  - 2020', 'TI  - Publication manual of the American Psychological Association', 'ET  - 7', 'PB  - American Psychological Association', 'DO  - 10.1037/0000165-000', 'ER  -']],
  ['Bass et al., 2012', 'Bass, L., Clements, P., & Kazman, R. (2012). Software architecture in practice (3rd ed.). Addison-Wesley.', ['TY  - BOOK', 'AU  - Bass, Len', 'AU  - Clements, Paul', 'AU  - Kazman, Rick', 'PY  - 2012', 'TI  - Software architecture in practice', 'ET  - 3', 'PB  - Addison-Wesley', 'ER  -']],
  ['Brooke, 1996', 'Brooke, J. (1996). SUS: A quick and dirty usability scale. In P. W. Jordan, B. Thomas, B. A. Weerdmeester, & I. L. McClelland (Eds.), Usability evaluation in industry (pp. 189–194). Taylor & Francis.', ['TY  - CHAP', 'AU  - Brooke, John', 'PY  - 1996', 'TI  - SUS: A quick and dirty usability scale', 'BT  - Usability evaluation in industry', 'SP  - 189', 'EP  - 194', 'PB  - Taylor & Francis', 'ER  -']],
  ['Connolly & Begg, 2015', 'Connolly, T. M., & Begg, C. E. (2015). Database systems: A practical approach to design, implementation, and management (6th ed.). Pearson.', ['TY  - BOOK', 'AU  - Connolly, Thomas M.', 'AU  - Begg, Carolyn E.', 'PY  - 2015', 'TI  - Database systems: A practical approach to design, implementation, and management', 'ET  - 6', 'PB  - Pearson', 'ER  -']],
  ['Creswell & Creswell, 2018', 'Creswell, J. W., & Creswell, J. D. (2018). Research design: Qualitative, quantitative, and mixed methods approaches (5th ed.). SAGE Publications.', ['TY  - BOOK', 'AU  - Creswell, John W.', 'AU  - Creswell, J. David', 'PY  - 2018', 'TI  - Research design: Qualitative, quantitative, and mixed methods approaches', 'ET  - 5', 'PB  - SAGE Publications', 'ER  -']],
  ['Davis, 1989', 'Davis, F. D. (1989). Perceived usefulness, perceived ease of use, and user acceptance of information technology. MIS Quarterly, 13(3), 319–340. https://doi.org/10.2307/249008', ['TY  - JOUR', 'AU  - Davis, Fred D.', 'PY  - 1989', 'TI  - Perceived usefulness, perceived ease of use, and user acceptance of information technology', 'JO  - MIS Quarterly', 'VL  - 13', 'IS  - 3', 'SP  - 319', 'EP  - 340', 'DO  - 10.2307/249008', 'ER  -']],
  ['Delen, 2010', 'Delen, D. (2010). A comparative analysis of machine learning techniques for student retention management. Decision Support Systems, 49(4), 498–506. https://doi.org/10.1016/j.dss.2010.06.003', ['TY  - JOUR', 'AU  - Delen, Dursun', 'PY  - 2010', 'TI  - A comparative analysis of machine learning techniques for student retention management', 'JO  - Decision Support Systems', 'VL  - 49', 'IS  - 4', 'SP  - 498', 'EP  - 506', 'DO  - 10.1016/j.dss.2010.06.003', 'ER  -']],
  ['DeLone & McLean, 2003', 'DeLone, W. H., & McLean, E. R. (2003). The DeLone and McLean model of information systems success: A ten-year update. Journal of Management Information Systems, 19(4), 9–30. https://doi.org/10.1080/07421222.2003.11045748', ['TY  - JOUR', 'AU  - DeLone, William H.', 'AU  - McLean, Ephraim R.', 'PY  - 2003', 'TI  - The DeLone and McLean model of information systems success: A ten-year update', 'JO  - Journal of Management Information Systems', 'VL  - 19', 'IS  - 4', 'SP  - 9', 'EP  - 30', 'DO  - 10.1080/07421222.2003.11045748', 'ER  -']],
  ['Dikert et al., 2016', 'Dikert, K., Paasivaara, M., & Lassenius, C. (2016). Challenges and success factors for large-scale agile transformations: A systematic literature review. Journal of Systems and Software, 119, 87–108. https://doi.org/10.1016/j.jss.2016.06.013', ['TY  - JOUR', 'AU  - Dikert, Kim', 'AU  - Paasivaara, Maria', 'AU  - Lassenius, Casper', 'PY  - 2016', 'TI  - Challenges and success factors for large-scale agile transformations: A systematic literature review', 'JO  - Journal of Systems and Software', 'VL  - 119', 'SP  - 87', 'EP  - 108', 'DO  - 10.1016/j.jss.2016.06.013', 'ER  -']],
  ['Fowler, 2004', 'Fowler, M. (2004). UML distilled: A brief guide to the standard object modeling language (3rd ed.). Addison-Wesley.', ['TY  - BOOK', 'AU  - Fowler, Martin', 'PY  - 2004', 'TI  - UML distilled: A brief guide to the standard object modeling language', 'ET  - 3', 'PB  - Addison-Wesley', 'ER  -']],
  ['Hevner et al., 2004', 'Hevner, A. R., March, S. T., Park, J., & Ram, S. (2004). Design science in information systems research. MIS Quarterly, 28(1), 75–105.', ['TY  - JOUR', 'AU  - Hevner, Alan R.', 'AU  - March, Salvatore T.', 'AU  - Park, Jinsoo', 'AU  - Ram, Sudha', 'PY  - 2004', 'TI  - Design science in information systems research', 'JO  - MIS Quarterly', 'VL  - 28', 'IS  - 1', 'SP  - 75', 'EP  - 105', 'ER  -']],
  ['Ifenthaler & Yau, 2020', 'Ifenthaler, D., & Yau, J. Y.-K. (2020). Utilising learning analytics for study success: Reflections on current empirical findings. Research and Practice in Technology Enhanced Learning, 15, Article 17. https://doi.org/10.1186/s41039-020-00138-1', ['TY  - JOUR', 'AU  - Ifenthaler, Dirk', 'AU  - Yau, Jane Yin-Kim', 'PY  - 2020', 'TI  - Utilising learning analytics for study success: Reflections on current empirical findings', 'JO  - Research and Practice in Technology Enhanced Learning', 'VL  - 15', 'DO  - 10.1186/s41039-020-00138-1', 'ER  -']],
  ['ISO/IEC 25010, 2011', 'International Organization for Standardization, & International Electrotechnical Commission. (2011). Systems and software engineering — Systems and software Quality Requirements and Evaluation (SQuaRE) — System and software quality models (ISO/IEC 25010:2011).', ['TY  - STD', 'AU  - International Organization for Standardization', 'AU  - International Electrotechnical Commission', 'PY  - 2011', 'TI  - Systems and software engineering — Systems and software Quality Requirements and Evaluation (SQuaRE) — System and software quality models', 'SN  - ISO/IEC 25010:2011', 'ER  -']],
  ['ISO/IEC/IEEE 29148, 2018', 'International Organization for Standardization, International Electrotechnical Commission, & Institute of Electrical and Electronics Engineers. (2018). Systems and software engineering — Life cycle processes — Requirements engineering (ISO/IEC/IEEE 29148:2018).', ['TY  - STD', 'AU  - International Organization for Standardization', 'AU  - International Electrotechnical Commission', 'AU  - Institute of Electrical and Electronics Engineers', 'PY  - 2018', 'TI  - Systems and software engineering — Life cycle processes — Requirements engineering', 'SN  - ISO/IEC/IEEE 29148:2018', 'ER  -']],
  ['Likert, 1932', 'Likert, R. (1932). A technique for the measurement of attitudes. Archives of Psychology, 22(140), 1–55.', ['TY  - JOUR', 'AU  - Likert, Rensis', 'PY  - 1932', 'TI  - A technique for the measurement of attitudes', 'JO  - Archives of Psychology', 'VL  - 22', 'IS  - 140', 'SP  - 1', 'EP  - 55', 'ER  -']],
  ['Nielsen, 1994', 'Nielsen, J. (1994). Usability engineering. Morgan Kaufmann.', ['TY  - BOOK', 'AU  - Nielsen, Jakob', 'PY  - 1994', 'TI  - Usability engineering', 'PB  - Morgan Kaufmann', 'ER  -']],
  ['Pressman & Maxim, 2020', 'Pressman, R. S., & Maxim, B. R. (2020). Software engineering: A practitioner’s approach (9th ed.). McGraw-Hill Education.', ['TY  - BOOK', 'AU  - Pressman, Roger S.', 'AU  - Maxim, Bruce R.', 'PY  - 2020', 'TI  - Software engineering: A practitioner’s approach', 'ET  - 9', 'PB  - McGraw-Hill Education', 'ER  -']],
  ['Romero & Ventura, 2020', 'Romero, C., & Ventura, S. (2020). Educational data mining and learning analytics: An updated survey. WIREs Data Mining and Knowledge Discovery, 10(3), e1355. https://doi.org/10.1002/widm.1355', ['TY  - JOUR', 'AU  - Romero, Cristóbal', 'AU  - Ventura, Sebastián', 'PY  - 2020', 'TI  - Educational data mining and learning analytics: An updated survey', 'JO  - WIREs Data Mining and Knowledge Discovery', 'VL  - 10', 'IS  - 3', 'DO  - 10.1002/widm.1355', 'ER  -']],
  ['Siemens, 2013', 'Siemens, G. (2013). Learning analytics: The emergence of a discipline. American Behavioral Scientist, 57(10), 1380–1400. https://doi.org/10.1177/0002764213498851', ['TY  - JOUR', 'AU  - Siemens, George', 'PY  - 2013', 'TI  - Learning analytics: The emergence of a discipline', 'JO  - American Behavioral Scientist', 'VL  - 57', 'IS  - 10', 'SP  - 1380', 'EP  - 1400', 'DO  - 10.1177/0002764213498851', 'ER  -']],
  ['Sommerville, 2016', 'Sommerville, I. (2016). Software engineering (10th ed.). Pearson.', ['TY  - BOOK', 'AU  - Sommerville, Ian', 'PY  - 2016', 'TI  - Software engineering', 'ET  - 10', 'PB  - Pearson', 'ER  -']],
  ['Venkatesh et al., 2003', 'Venkatesh, V., Morris, M. G., Davis, G. B., & Davis, F. D. (2003). User acceptance of information technology: Toward a unified view. MIS Quarterly, 27(3), 425–478.', ['TY  - JOUR', 'AU  - Venkatesh, Viswanath', 'AU  - Morris, Michael G.', 'AU  - Davis, Gordon B.', 'AU  - Davis, Fred D.', 'PY  - 2003', 'TI  - User acceptance of information technology: Toward a unified view', 'JO  - MIS Quarterly', 'VL  - 27', 'IS  - 3', 'SP  - 425', 'EP  - 478', 'ER  -']],
];

const citationRecords = [];
function r(text, opts = {}) { return new TextRun({ text, font: 'Times New Roman', size: opts.size ?? 24, bold: opts.bold, italics: opts.italics, color: opts.color }); }
function p(text, cites = []) {
  if (cites.length) citationRecords.push({ text, cites });
  return new Paragraph({ children: [r(text)], alignment: AlignmentType.JUSTIFIED, spacing: { after: 150, line: 360 } });
}
function h1(text) { return new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 180 } }); }
function h2(text) { return new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 220, after: 140 } }); }
function h3(text) { return new Paragraph({ text, heading: HeadingLevel.HEADING_3, spacing: { before: 180, after: 120 } }); }
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
        new TableRow({ children: headers.map((x) => new TableCell({ shading: { fill: 'D9EAF7' }, borders: { top: border, bottom: border, left: border, right: border }, children: [new Paragraph({ children: [r(x, { bold: true })] })] })) }),
        ...rows.map((row) => new TableRow({ children: row.map((x) => new TableCell({ borders: { top: border, bottom: border, left: border, right: border }, children: [new Paragraph({ children: [r(String(x), { size: 21 })], alignment: AlignmentType.JUSTIFIED })] })) })),
      ],
    }),
    tableNote ? note(tableNote) : new Paragraph(''),
  ];
}

function image(file, width = 620, height = 380) {
  const svg = fs.readFileSync(path.join(diagramsDir, file));
  return new Paragraph({
    children: [new ImageRun({ type: 'svg', data: svg, transformation: { width, height }, fallback: { type: 'png', data: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lA9jNwAAAABJRU5ErkJggg==', 'base64') } })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 160 },
  });
}

const children = [];
children.push(
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 900, after: 180 }, children: [r('Kabul University', { bold: true, size: 32 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 180 }, children: [r('Computer Science Faculty', { bold: true, size: 30 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 420 }, children: [r('Software Engineering Department', { bold: true, size: 28 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 280 }, children: [r('Nokta Academy Management System', { bold: true, size: 40, color: '1F4E79' })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 420 }, children: [r('Final Project Monograph', { bold: true, size: 30 })] }),
  ...table(['Student', 'Father name', 'Department', 'Educational year', 'Project duration'], [
    ['Mohammad Maiwand Osmani', 'Mohammad Zaman', 'Software Engineering', '2025', 'Two semesters'],
    ['Mohammad Khalid Sahil', 'Wali Mohammad', 'Software Engineering', '2025', 'Two semesters'],
  ], 'Student Details', 'Project period: 2025/10/15 to 2026/05/04.'),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 300 }, children: [r('Supervisor: ________________________________', { size: 24 })] }),
  pb(),
);

children.push(
  h1('ABSTRACT'),
  p('Nokta Academy currently faces academic and administrative inefficiencies caused by fragmented manual records, disconnected spreadsheets, delayed reporting, limited communication, and weak financial transparency. This monograph presents the Nokta Academy Management System (NAMS), an integrated web and mobile-oriented platform designed to automate student enrollment, class and subject management, attendance, grading, notifications, fee payments, teacher payroll, tax calculation, reporting, and role-based access. The project uses a modern full-stack architecture built with Node.js, Express.js, MongoDB, React.js, and mobile-ready application components. It also prepares the foundation for AI-based learning analytics and student performance monitoring. The methodology combines Agile Scrum with structured SDLC phases. Requirements were gathered through questionnaire-based needs assessment, workflow analysis, and role analysis. From a population of 100 stakeholders, 75 valid responses were selected, and 64 respondents approved the project, producing an 85.33% acceptance rate. The system was designed through architecture modeling, use case modeling, database ERD, functional and non-functional requirement specification, and security design. The expected and achieved results show that NAMS can reduce manual work, improve data accuracy, centralize communication, strengthen financial accountability, and support evidence-based decision-making. The project contributes a context-aware digital transformation model for private academies in Afghanistan while following software engineering standards, APA citation practices, and Mendeley-compatible reference management.'),
  pb(),
  h1('TABLE OF CONTENTS'),
  new TableOfContents('Table of Contents', { hyperlink: true, headingStyleRange: '1-3' }),
  p('Note: In Microsoft Word, right-click the table of contents and choose “Update Field” after final editing.'),
  pb(),
  h1('LIST OF FIGURES'),
  ...table(['Figure', 'Title'], [
    ['Figure 3.1', 'Use Case Diagram for Nokta Academy Management System'],
    ['Figure 4.1', 'Layered Architecture of NAMS'],
    ['Figure 4.2', 'Entity-Relationship Diagram'],
    ['Figure 4.3', 'Methodology and SDLC-Agile Workflow'],
    ['Figure 5.1', 'Project Acceptance Result'],
    ['Figure 5.2', 'Feature Priority Chart'],
  ], 'List of Figures', 'In Word, this list may be converted to an automatic Table of Figures by applying Caption style to figure titles and using References > Insert Table of Figures.'),
  h1('LIST OF TABLES'),
  ...table(['Table', 'Title'], [
    ['Table 1.1', 'Research Objectives and Alignment With Proposal'],
    ['Table 2.1', 'Comparison of Existing Systems'],
    ['Table 3.1', 'Functional Requirements'],
    ['Table 3.2', 'Non-Functional Requirements'],
    ['Table 4.1', 'Technology Stack and Justification'],
    ['Table 4.2', 'Core Relational/Document Schema'],
  ], 'List of Tables', 'Tables are formatted as real Word tables and can be edited directly.'),
  pb(),
  h1('LIST OF ABBREVIATIONS'),
  ...table(['Abbreviation', 'Meaning'], [
    ['AI', 'Artificial Intelligence'],
    ['API', 'Application Programming Interface'],
    ['CRUD', 'Create, Read, Update, Delete'],
    ['DBMS', 'Database Management System'],
    ['ERD', 'Entity Relationship Diagram'],
    ['FR', 'Functional Requirement'],
    ['IEEE', 'Institute of Electrical and Electronics Engineers'],
    ['JWT', 'JSON Web Token'],
    ['LMS', 'Learning Management System'],
    ['NAMS', 'Nokta Academy Management System'],
    ['NFR', 'Non-Functional Requirement'],
    ['RBAC', 'Role-Based Access Control'],
    ['SDLC', 'System Development Life Cycle'],
    ['UI', 'User Interface'],
    ['UX', 'User Experience'],
  ], 'List of Abbreviations', 'Project-specific abbreviations are listed alphabetically.'),
  pb(),
);

children.push(
  h1('CHAPTER 1: INTRODUCTION'),
  h2('1.1 Background'),
  p('Digital transformation has become a central strategy for educational institutions that need accurate data, faster administration, transparent finance, and better communication. In many developing contexts, including Afghanistan, academies still depend on paper files, handwritten ledgers, or disconnected spreadsheets for enrollment, scheduling, payment tracking, grades, and attendance. These tools may appear simple at the beginning, but they become unreliable when student numbers, teacher assignments, financial transactions, and reporting obligations increase. Research on learning analytics and educational data mining shows that educational data becomes valuable when it is collected consistently and transformed into actionable information (Aldowah et al., 2019; Romero & Ventura, 2020).', ['Aldowah et al., 2019', 'Romero & Ventura, 2020']),
  p('The Nokta Academy Management System is designed as an integrated web and mobile-oriented platform that centralizes academic, administrative, and financial operations. It supports student registration, class and subject management, attendance, exams, results, notifications, payments, teacher salary, tax calculation, academy financial reports, and dashboards. This integration responds directly to the proposal’s main idea: developing a modern online academy platform with Node.js, Express.js, MongoDB, React.js, Flutter-oriented access, and AI-ready analytics.'),
  p('The system also reflects the global movement toward smart educational systems. Smart educational platforms are not limited to online content delivery; they involve data-driven administration, user-centered design, real-time communication, and analytics-supported decision-making (Al-Samarraie & Saeed, 2022; Siemens, 2013). In NAMS, dashboard analytics, financial reporting, and student performance modules provide a foundation for future AI features such as risk detection and personalized recommendations.', ['Al-Samarraie & Saeed, 2022', 'Siemens, 2013']),
  p('From a software engineering perspective, the project is also important because it translates a proposal into a working artifact. The project uses an iterative structure, modular APIs, role-based access, MongoDB schemas, and React-based interfaces. Software engineering literature emphasizes that successful systems should be developed from clear requirements, designed with maintainable architecture, and tested against expected behavior (Pressman & Maxim, 2020; Sommerville, 2016).', ['Pressman & Maxim, 2020', 'Sommerville, 2016']),
  h2('1.2 Problem Statement'),
  p('Nokta Academy experiences several academic and administrative inefficiencies due to the absence of a centralized digital management system. Essential operations such as student enrollment, attendance tracking, grading, timetable management, salary calculation, fee collection, and reporting are difficult to control when they are handled through manual documents or separate spreadsheets. This fragmentation creates data inconsistency, duplicate effort, delayed reporting, and weak transparency.'),
  p('The second major problem is communication. Students, teachers, parents, and administrators need a common platform for schedules, results, announcements, messages, and academic feedback. Without such a platform, updates may be delayed or lost. Educational technology literature identifies communication and timely feedback as important components of effective digital learning environments (DeLone & McLean, 2003; Venkatesh et al., 2003).', ['DeLone & McLean, 2003', 'Venkatesh et al., 2003']),
  p('The third problem is the lack of data-driven academic monitoring. The proposal highlights AI-powered analytics and student performance prediction. Although the current implementation focuses mainly on management and reporting, its data model creates the foundation for later AI modules. Learning analytics research shows that student records, performance data, attendance, and interaction data can support early risk detection and personalized learning support when collected systematically (Delen, 2010; Ifenthaler & Yau, 2020).', ['Delen, 2010', 'Ifenthaler & Yau, 2020']),
  h2('1.3 Objectives'),
  h3('1.3.1 General Objective'),
  p('To design, develop, and implement an integrated web-mobile academy management system for Nokta Academy using modern JavaScript-based technologies that automates academic, administrative, communication, and financial operations while preparing a foundation for AI-based analytics and personalized learning support.'),
  h3('1.3.2 Specific Objectives'),
  ...table(['No.', 'Specific objective', 'Alignment with proposal/project'], [
    ['1', 'To analyze existing manual and digital management gaps through literature review, questionnaire, and workflow analysis.', 'Matches research questions about current inefficiencies.'],
    ['2', 'To design a layered and modular architecture using Node.js/Express, MongoDB, React, and mobile-ready components.', 'Matches technology objective and maintainability need.'],
    ['3', 'To implement academic modules for students, teachers, classes, subjects, timetable, attendance, exams, and results.', 'Matches academic automation objective.'],
    ['4', 'To implement administrative and financial modules for payments, payroll, salary tax, expenses, reports, and dashboards.', 'Matches financial transparency objective.'],
    ['5', 'To apply RBAC, JWT authentication, and permission-based visibility for secure access.', 'Matches security and centralized data requirement.'],
    ['6', 'To evaluate user acceptance using a 75-respondent sample from a 100-person population.', 'Matches methodology and evaluation requirement.'],
  ], 'Table 1.1: Research Objectives and Alignment With Proposal', 'The objectives are rewritten to remain fully consistent with the proposal and the completed project.'),
  h2('1.4 Scope and Limitations'),
  h3('1.4.1 Scope (Inclusions)'),
  p('The scope includes a web-based academy management system with API support and mobile-ready design. Included features are authentication, user roles, student registration, teacher management, class and subject management, timetable, attendance, exams, results, notifications, messages, fee payments, expenses, payroll, salary tax, financial reports, dashboards, and audit-related visibility. Target users include super administrators, administrators, teachers, students, parents, owners, and branch managers. Data includes student profiles, academic records, attendance, fees, salary records, tax values, messages, and notifications.'),
  h3('1.4.2 Limitations (Exclusions)'),
  p('The system is designed for Nokta Academy and similar academies, but its evaluation was limited to a 100-person population with 75 sampled respondents. The AI analytics component is prepared conceptually and structurally, but advanced machine learning prediction is a future enhancement rather than the central evaluated component. Production deployment, national-level integration, and long-term multi-academy performance benchmarking are outside the current project scope.'),
  h2('1.5 Significance of the Project'),
  p('The project is practically significant because it reduces manual work, improves data consistency, and creates transparent financial workflows. It is academically significant because it applies software engineering, requirements engineering, database design, user acceptance, and learning analytics literature to a real project. It is socially significant because it supports digital capacity building in Afghanistan’s education sector. It is personally significant for the developers because it demonstrates end-to-end software engineering skills from proposal to implementation and evaluation.'),
  h2('1.6 Organization of the Report'),
  p('Chapter 1 introduces the background, problem, objectives, scope, limitations, and significance. Chapter 2 reviews literature and related systems. Chapter 3 presents requirements analysis, including elicitation method, functional requirements, non-functional requirements, use cases, and data requirements. Chapter 4 explains system design, including architecture, database design, UI/UX, algorithms, security, and testing strategy. Later chapters summarize implementation results, discussion, conclusion, and appendices.'),
);

children.push(
  h1('CHAPTER 2: LITERATURE REVIEW'),
  h2('2.1 Concepts and Definitions'),
  p('This literature review focuses on concepts that directly support the proposal and implementation of NAMS. An academy management system is treated as an educational information system, not merely as a website. It integrates operational data, academic records, communication, finance, and reporting. The DeLone and McLean model is relevant because it evaluates information systems through system quality, information quality, service quality, use, user satisfaction, and net benefits (DeLone & McLean, 2003).', ['DeLone & McLean, 2003']),
  p('Learning analytics and educational data mining are also relevant because the proposal includes AI-based analytics and performance monitoring. Aldowah et al. (2019) and Romero and Ventura (2020) show that educational data can support decision-making, risk detection, and learning improvement when it is collected and analyzed systematically. For NAMS, this means that student attendance, grades, payments, and timetable data should be stored in a way that supports future analysis.', ['Aldowah et al., 2019', 'Romero & Ventura, 2020']),
  p('Requirements engineering is the process of discovering, documenting, validating, and managing stakeholder needs. ISO/IEC/IEEE 29148:2018 is used as a standard reference because it emphasizes clear, testable, necessary, and traceable requirements. In NAMS, requirements are traced from the proposal, questionnaire, and workflow problems to implemented modules such as Students, Payments, Payroll, Reports, Dashboard, and Role Management (International Organization for Standardization et al., 2018).', ['ISO/IEC/IEEE 29148, 2018']),
  p('Software quality is evaluated using ISO/IEC 25010:2011, which includes functional suitability, usability, security, performance efficiency, reliability, maintainability, compatibility, and portability. This standard is important because NAMS handles sensitive academic and financial data, so quality must include security and maintainability in addition to visible features (International Organization for Standardization & International Electrotechnical Commission, 2011).', ['ISO/IEC 25010, 2011']),
  h2('2.2 Related Work/Existing Systems'),
  p('Existing educational platforms provide useful lessons but do not fully satisfy the localized needs of Nokta Academy. Learning management systems such as Moodle and Canvas focus strongly on course content and learning delivery, while student information systems such as PowerSchool and openSIS focus on institutional records. Google Classroom is simple and widely used for class communication, but it does not provide integrated academy finance, salary tax, local payroll, or custom role-based workflows. NAMS fills this gap by combining academic management, communication, financial transparency, payroll, and reporting in one context-aware platform.'),
  ...table(['System', 'Features', 'Technology/Type', 'Pros', 'Cons', 'Gap addressed by NAMS'], [
    ['Moodle', 'Courses, assignments, quizzes, LMS tools', 'PHP-based LMS', 'Strong learning content management', 'Not focused on local academy finance and payroll', 'Adds finance, payroll, tax, and local workflows'],
    ['Google Classroom', 'Class posts, assignments, file sharing', 'Cloud education platform', 'Simple and accessible', 'Limited institutional management and reporting', 'Adds student records, payments, payroll, dashboards'],
    ['Canvas LMS', 'Course management, grading, integrations', 'Cloud/enterprise LMS', 'Modern UI and integrations', 'Complex and not localized for small academies', 'Provides localized academy workflow'],
    ['openSIS', 'Student information, attendance, grades', 'Student information system', 'Good SIS foundation', 'Limited custom payroll and tax workflows', 'Adds integrated salary tax and financial reports'],
    ['Fedena', 'School ERP, attendance, finance', 'ERP-style system', 'Broad school operations', 'May require customization and licensing', 'Custom-built for Nokta Academy needs'],
    ['NAMS', 'Academic, finance, payroll, reports, roles, dashboards', 'Node.js, Express, MongoDB, React, Flutter-ready', 'Localized, modular, integrated', 'AI prediction still future enhancement', 'Directly addresses proposal objectives'],
  ], 'Table 2.1: Comparison of Existing Systems', 'The comparison shows why a custom system is justified for Nokta Academy.'),
  h2('2.3 Recent Trends and Technologies'),
  p('A major trend in educational technology is the movement from isolated digital tools to integrated smart education systems. Such systems combine data collection, dashboards, analytics, communication, and personalization. Learning analytics literature shows that institutions can use student data for monitoring progress and identifying academic risk (Ifenthaler & Yau, 2020; Siemens, 2013). The proposal’s AI direction is therefore consistent with recent educational technology trends.', ['Ifenthaler & Yau, 2020', 'Siemens, 2013']),
  p('The MERN-style technology stack is also consistent with modern scalable web development. Node.js and Express.js support asynchronous API development, MongoDB supports flexible document storage, and React supports interactive user interfaces. These tools match the proposal’s objective of building a scalable, maintainable, and responsive academy platform. From an architecture viewpoint, separating the client, API, data, and security layers improves maintainability and modifiability (Bass et al., 2012).', ['Bass et al., 2012']),
  p('Agile and SDLC hybrid development is another relevant trend. Agile supports feedback, iteration, and adaptive planning, while SDLC preserves structured documentation, requirement analysis, design, testing, deployment, and maintenance. Dikert et al. (2016) show that agile transformations require clear coordination and disciplined practices. For a two-person student team, combining Agile Scrum practices with SDLC phases provides both flexibility and academic documentation discipline.', ['Dikert et al., 2016']),
  h2('2.4 Research Gap Synthesis'),
  p('The literature and related systems show four main gaps addressed by NAMS. First, many systems focus either on learning management or student records, but not on integrated academic-financial workflows. Second, existing tools are often not localized for Afghan academy operations, payroll expectations, multilingual needs, and local financial reporting. Third, many small academies lack real-time dashboards and role-based visibility. Fourth, AI and learning analytics require structured data, but manual systems do not collect data consistently enough for future prediction and recommendation.'),
  p('NAMS addresses these gaps by combining student records, teacher assignments, timetable, attendance, results, payments, salary calculation, tax, reports, messaging, notifications, and role-based dashboards. The system does not claim to replace all enterprise LMS products; rather, it fills a context-specific gap for Nokta Academy and similar institutions.'),
);

children.push(
  h1('CHAPTER 3: REQUIREMENTS ANALYSIS'),
  h2('3.1 Requirements Elicitation Methodology'),
  p('Requirements were elicited through questionnaire, workflow analysis, role analysis, and review of the original proposal. The questionnaire contained 20 items covering stakeholder role, current system problems, required features, user experience, data management, reporting needs, and willingness to use the future system. The population was 100 stakeholders, and 75 valid responses were selected. Among them, 64 supported the project, giving an approval rate of 85.33%. This supports the proposal’s claim that Nokta Academy needs a centralized digital platform.'),
  p('The elicitation method follows applied mixed-methods reasoning. Quantitative questionnaire results show priority and acceptance, while qualitative workflow analysis explains how processes such as enrollment, attendance, grading, payment, salary, and reporting should work. Mixed-methods research is appropriate when a project needs both numeric evidence and contextual understanding (Creswell & Creswell, 2018).', ['Creswell & Creswell, 2018']),
  h2('3.2 Functional Requirements'),
  ...table(['ID', 'Requirement', 'Priority', 'Source', 'Verification'], [
    ['FR-001', 'The system shall allow authorized users to create and manage student profiles with class, subject, teacher, and fee information.', 'High', 'Proposal + questionnaire', 'CRUD and integration test'],
    ['FR-002', 'The system shall manage teacher profiles, assigned classes, assigned subjects, and salary percentage settings.', 'High', 'Workflow analysis', 'Unit and UI test'],
    ['FR-003', 'The system shall manage classes, subjects, and timetable records.', 'High', 'Academic workflow', 'API and UI test'],
    ['FR-004', 'The system shall record attendance for students and support attendance reporting.', 'High', 'Questionnaire', 'Functional test'],
    ['FR-005', 'The system shall manage exams, grades, and student results.', 'High', 'Proposal', 'Functional test'],
    ['FR-006', 'The system shall record student fee payments and update remaining balance.', 'High', 'Finance workflow', 'Payment test'],
    ['FR-007', 'The system shall calculate teacher salary based on assigned student payments and commission percentage.', 'High', 'Project update requirement', 'Payroll calculation test'],
    ['FR-008', 'The system shall calculate government salary tax and show gross salary, tax amount, and net payable salary.', 'High', 'Financial transparency requirement', 'Tax service test'],
    ['FR-009', 'The system shall provide role-based dashboards with clickable links to related modules.', 'Medium', 'UX feedback', 'Navigation test'],
    ['FR-010', 'The system shall support notifications, messages, reports, and printable academy financial reports.', 'Medium', 'Questionnaire + proposal', 'UI and report test'],
  ], 'Table 3.1: Functional Requirements', 'Functional requirements are written in verifiable form and aligned with the proposal.'),
  h2('3.3 Non-Functional Requirements'),
  ...table(['ID', 'Category', 'Requirement', 'Verification'], [
    ['NFR-001', 'Performance', 'The system should respond within approximately 2 seconds for common dashboard and CRUD operations under normal academy load.', 'Manual/API performance check'],
    ['NFR-002', 'Security', 'The system shall enforce JWT authentication and role-based authorization for protected modules.', 'Security access test'],
    ['NFR-003', 'Usability', 'The system shall provide clear navigation, readable light/dark mode, and role-specific dashboards.', 'User evaluation'],
    ['NFR-004', 'Maintainability', 'The system shall be organized into modular backend routes/services and reusable frontend components.', 'Code review'],
    ['NFR-005', 'Reliability', 'Financial calculations shall be repeatable and auditable through stored payment and salary records.', 'Payroll and payment tests'],
    ['NFR-006', 'Compatibility', 'The system shall support web access and mobile-ready design, with Flutter/mobile extension support.', 'Responsive UI test'],
    ['NFR-007', 'Localization', 'The system shall support multilingual interface needs, especially English, Dari/Farsi, and Pashto.', 'Translation test'],
    ['NFR-008', 'Data integrity', 'The system shall maintain relationships among student, class, subject, teacher, payment, and salary records.', 'Database validation'],
  ], 'Table 3.2: Non-Functional Requirements', 'NFR categories are aligned with ISO/IEC 25010 quality characteristics.'),
  h2('3.4 Use Case Model'),
  p('The use case model identifies the main actors and their interactions with NAMS. Students access schedules, results, payments, and messages. Teachers manage assigned academic activities and view salary-related information. Administrators manage academic records, payments, reports, and notifications. Parents view child-related academic and payment information. Super administrators manage users, roles, permissions, audit-related sections, and system-wide reporting.'),
  cap('Figure 3.1: Use Case Diagram for Nokta Academy Management System'),
  image('use_case_diagram.svg', 620, 430),
  h2('3.5 Data Requirements'),
  p('The system requires structured data for users, students, teachers, classes, subjects, timetable, attendance, exams, results, payments, salary settings, salary records, expenses, notifications, messages, and audit logs. Data sensitivity is high for student records, payments, salaries, and tax values. Therefore, the system must use authentication, authorization, input validation, and controlled visibility. Data volume in the current seeded scenario includes 100 students, 10 teachers, 10 students per teacher, and 1,000 AF payment per student.'),
);

children.push(
  h1('CHAPTER 4: SYSTEM DESIGN'),
  h2('4.1 Design Methodology'),
  p('The design methodology combines Agile Scrum and SDLC. Agile Scrum was used to divide work into increments and support feedback. SDLC was used to preserve academic structure: requirement analysis, system design, implementation, testing, deployment planning, and maintenance planning. This hybrid approach matches the proposal and is suitable for a two-member team because it balances flexibility with documentation.'),
  cap('Figure 4.3: Hybrid Agile-SDLC Workflow'),
  image('methodology_process.svg', 620, 230),
  h2('4.2 Architectural Design'),
  p('NAMS uses a layered web architecture. The presentation layer is built with React.js and Vite. The API layer uses Node.js and Express.js. The data layer uses MongoDB with Mongoose schemas. The security layer uses JWT authentication, RBAC, permission keys, and protected routes. The reporting layer includes dashboard analytics, finance aggregation, payroll reports, and academy financial reports. This architecture supports scalability and maintainability as recommended in software architecture literature (Bass et al., 2012).', ['Bass et al., 2012']),
  cap('Figure 4.1: Layered Architecture of NAMS'),
  image('system_architecture.svg', 620, 385),
  ...table(['Layer', 'Technology', 'Version/Type', 'Justification'], [
    ['Frontend', 'React.js + Vite', 'React 18 / Vite 5', 'Responsive and component-based web UI'],
    ['Backend', 'Node.js + Express.js', 'Node 22 / Express 4', 'Scalable API and service-based architecture'],
    ['Database', 'MongoDB + Mongoose', 'MongoDB document DB', 'Flexible educational data modeling'],
    ['Mobile', 'Flutter / mobile-ready frontend', 'Flutter-ready project structure', 'Cross-platform student/teacher access'],
    ['Security', 'JWT + RBAC', 'Token and permission-based', 'Secure role-based access'],
    ['Reporting', 'Dashboard + Recharts + backend aggregation', 'Charts and reports', 'Decision support and transparency'],
    ['AI-readiness', 'Python/TensorFlow.js-ready design', 'Future module', 'Performance prediction and recommendations'],
  ], 'Table 4.1: Technology Stack and Justification', 'The technology stack is aligned with the proposal and current implementation.'),
  h2('4.3 Database Design'),
  p('The database design is based on MongoDB collections represented conceptually through an ERD. Although MongoDB is a document database, the system uses references to preserve relationships among core entities. Student records reference class, subject, teacher, and family. Payment records reference student, teacher, class, subject, and salary records. SalaryRecord stores gross salary, tax, net salary, month, and payment status. This supports both operational transactions and management reports (Connolly & Begg, 2015).', ['Connolly & Begg, 2015']),
  cap('Figure 4.2: Entity-Relationship Diagram'),
  image('database_erd.svg', 620, 445),
  ...table(['Collection', 'Key fields', 'Relationships'], [
    ['users', '_id, name, email, role, branchId, salaryType, percentageRate', 'Teacher/admin/student accounts and role access'],
    ['students', '_id, studentId, classId, subjectId, teacherId, feeAmount, paidAmount', 'Links students to academic and financial records'],
    ['classes', '_id, className, assignedSubjects, assignedTeachers', 'Groups students and subjects'],
    ['subjects', '_id, title, classId, teacher, feeAmount', 'Connects teacher and class'],
    ['payments', '_id, studentId, teacherId, amount, taxAmount, netAmount', 'Tracks student fees and salary payments'],
    ['salary_records', '_id, userId, grossSalary, taxAmount, netSalary', 'Stores payroll calculation result'],
    ['attendance', '_id, studentId, classId, status, date', 'Tracks attendance'],
    ['results', '_id, student, exam, score, grade', 'Stores academic performance'],
  ], 'Table 4.2: Core Relational/Document Schema', 'The schema table summarizes how MongoDB collections support the ERD.'),
  h2('4.4 Detailed Design'),
  h3('4.4.1 UI/UX Design'),
  p('The UI/UX design focuses on simplicity, role-specific navigation, multilingual labels, light/dark mode readability, and dashboard-based access. Dashboard cards are clickable and route users to their related modules. This decision reduces navigation effort and supports perceived ease of use, which is important for user acceptance (Davis, 1989; Nielsen, 1994).', ['Davis, 1989', 'Nielsen, 1994']),
  h3('4.4.2 Algorithm Design'),
  p('The most important algorithmic logic is teacher salary calculation. For each teacher, the system identifies assigned students, sums the student fee payments in the selected month, applies the teacher’s commission percentage, calculates gross salary, applies government salary tax, and returns net payable salary.'),
  new Paragraph({ alignment: AlignmentType.LEFT, spacing: { after: 160 }, children: [r('Pseudocode: totalFee = sum(payments of assigned students); grossSalary = totalFee × commissionPercentage / 100; taxAmount = calculateAfghanistanSalaryTax(grossSalary); netSalary = grossSalary - taxAmount;', { bold: true })] }),
  p('The complexity of this calculation depends mainly on the number of assigned students and payments in the period. With indexing on studentId, teacherId, and paymentDate, the query remains efficient for academy-scale data.'),
  h2('4.5 Security Design'),
  p('Security is designed through JWT-based authentication, role-based access control, backend permission middleware, frontend protected routes, and validation of user input. Sensitive data includes student profiles, salary records, tax calculations, payment information, and user credentials. The system follows the principle of least privilege: each role sees only the sections required for its responsibility.'),
  h2('4.6 Testing Strategy'),
  p('Testing includes unit tests, integration tests, system tests, and User Acceptance Testing. Unit tests focus on salary calculation, tax calculation, timetable validation, and permission policies. Integration tests focus on API workflows such as student creation, payment recording, salary calculation, and dashboard loading. UAT focuses on whether administrators, teachers, students, and parents can complete their expected workflows without confusion.'),
);

children.push(
  h1('CHAPTER 5: RESULTS AND DISCUSSION'),
  p('The questionnaire result shows that 64 out of 75 respondents approved the project, producing an 85.33% approval rate. This result supports the proposal’s claim that Nokta Academy requires a centralized digital management system.'),
  cap('Figure 5.1: Project Acceptance Result'),
  image('project_acceptance_chart.svg', 620, 295),
  p('The feature priority results show high demand for grade management, online registration, attendance, timetable, fee payment, notifications, and reports. These results align directly with implemented modules.'),
  cap('Figure 5.2: Feature Priority Chart'),
  image('feature_priority_chart.svg', 620, 295),
  p('The discussion shows that NAMS addresses the proposal’s main problem: fragmented academic and administrative processes. It also supports the main research question by showing how an integrated online system can improve operational efficiency and create a foundation for personalized learning. The AI component remains a future enhancement, but the system already stores the structured data required for analytics.'),
);

children.push(
  h1('CHAPTER 6: CONCLUSION AND RECOMMENDATIONS'),
  p('The Nokta Academy Management System successfully converts the proposal idea into a working software engineering project. It integrates academic, administrative, financial, communication, and reporting functions in a centralized platform. The project aligns with the proposal’s objectives by using Node.js, Express.js, MongoDB, React.js, and mobile-ready design principles, while also preparing for AI-based analytics.'),
  p('Future work should complete the AI performance prediction module, conduct longer-term user evaluation, deploy the system on secure cloud infrastructure, strengthen backup and disaster recovery, and expand the Flutter mobile application for daily student and teacher use.'),
  h1('REFERENCES'),
);

for (const [, apa] of references) {
  children.push(new Paragraph({ children: [r(apa, { size: 22 })], alignment: AlignmentType.LEFT, indent: { hanging: 720 }, spacing: { after: 120 } }));
}

children.push(
  h1('APPENDIX A: Citation Map for Mendeley'),
  p('The file Last_Mono_Mendeley_References.ris is provided for Mendeley import. The citation map below explains which statements are supported by which source. Mendeley Cite can be used in Word to replace the visible APA text citations with Mendeley-managed citation fields.'),
  ...table(['Referenced claim/text', 'Citation'], citationRecords.slice(0, 25).map((x) => [x.text.slice(0, 260) + (x.text.length > 260 ? '...' : ''), x.cites.join('; ')]), 'APA/Mendeley Citation Map', 'This table helps the supervisor see exactly which text is supported by which academic source.'),
);

fs.writeFileSync(outputRis, references.map((r) => r[2].join('\n')).join('\n\n') + '\n', 'utf8');
fs.writeFileSync(citationMap, citationRecords.map((x, i) => `## ${i + 1}. ${x.cites.join('; ')}\n\n> ${x.text}\n`).join('\n'), 'utf8');

const doc = new Document({
  styles: {
    default: {
      document: { run: { font: 'Times New Roman', size: 24 }, paragraph: { spacing: { line: 360 } } },
    },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 32, bold: true, color: '1F4E79', font: 'Times New Roman' }, paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 320, after: 180 } } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 28, bold: true, color: '1F4E79', font: 'Times New Roman' }, paragraph: { spacing: { before: 240, after: 140 } } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 26, bold: true, color: '2F5597', font: 'Times New Roman' }, paragraph: { spacing: { before: 180, after: 120 } } },
    ],
  },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: inch, right: inch, bottom: inch, left: inch } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [r('Page ', { size: 20 }), new TextRun({ children: [PageNumber.CURRENT], size: 20 })] })] }) },
    children,
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(outputDocx, buffer);
  console.log(`Created: ${outputDocx}`);
  console.log(`Created: ${outputRis}`);
  console.log(`Created: ${citationMap}`);
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
