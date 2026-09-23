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
  TableRow,
  TextRun,
  WidthType,
} = require('docx');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'Monograph');
const diagramsDir = path.join(outDir, 'diagrams');
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(diagramsDir, { recursive: true });

const outputDocx = path.join(outDir, 'Nokta_Academy_Management_System_Monograph_EN_APA_REAL.docx');
const risPath = path.join(outDir, 'Nokta_Academy_Mendeley_References_EN.ris');
const citationMapPath = path.join(outDir, 'APA_Citation_Map_for_Mendeley_EN.md');

const inch = 1440;
const page = { width: 11906, height: 16838 };
const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lA9jNwAAAABJRU5ErkJggg==',
  'base64',
);

const refs = [
  {
    key: 'APA, 2020',
    apa: 'American Psychological Association. (2020). Publication manual of the American Psychological Association (7th ed.). American Psychological Association. https://doi.org/10.1037/0000165-000',
    ris: ['TY  - BOOK', 'AU  - American Psychological Association', 'PY  - 2020', 'TI  - Publication manual of the American Psychological Association', 'ET  - 7', 'PB  - American Psychological Association', 'DO  - 10.1037/0000165-000', 'ER  -'],
  },
  {
    key: 'Bass et al., 2012',
    apa: 'Bass, L., Clements, P., & Kazman, R. (2012). Software architecture in practice (3rd ed.). Addison-Wesley.',
    ris: ['TY  - BOOK', 'AU  - Bass, Len', 'AU  - Clements, Paul', 'AU  - Kazman, Rick', 'PY  - 2012', 'TI  - Software architecture in practice', 'ET  - 3', 'PB  - Addison-Wesley', 'ER  -'],
  },
  {
    key: 'Brooke, 1996',
    apa: 'Brooke, J. (1996). SUS: A quick and dirty usability scale. In P. W. Jordan, B. Thomas, B. A. Weerdmeester, & I. L. McClelland (Eds.), Usability evaluation in industry (pp. 189–194). Taylor & Francis.',
    ris: ['TY  - CHAP', 'AU  - Brooke, John', 'PY  - 1996', 'TI  - SUS: A quick and dirty usability scale', 'BT  - Usability evaluation in industry', 'SP  - 189', 'EP  - 194', 'PB  - Taylor & Francis', 'ER  -'],
  },
  {
    key: 'Connolly & Begg, 2015',
    apa: 'Connolly, T. M., & Begg, C. E. (2015). Database systems: A practical approach to design, implementation, and management (6th ed.). Pearson.',
    ris: ['TY  - BOOK', 'AU  - Connolly, Thomas M.', 'AU  - Begg, Carolyn E.', 'PY  - 2015', 'TI  - Database systems: A practical approach to design, implementation, and management', 'ET  - 6', 'PB  - Pearson', 'ER  -'],
  },
  {
    key: 'Creswell & Creswell, 2018',
    apa: 'Creswell, J. W., & Creswell, J. D. (2018). Research design: Qualitative, quantitative, and mixed methods approaches (5th ed.). SAGE Publications.',
    ris: ['TY  - BOOK', 'AU  - Creswell, John W.', 'AU  - Creswell, J. David', 'PY  - 2018', 'TI  - Research design: Qualitative, quantitative, and mixed methods approaches', 'ET  - 5', 'PB  - SAGE Publications', 'ER  -'],
  },
  {
    key: 'Davis, 1989',
    apa: 'Davis, F. D. (1989). Perceived usefulness, perceived ease of use, and user acceptance of information technology. MIS Quarterly, 13(3), 319–340. https://doi.org/10.2307/249008',
    ris: ['TY  - JOUR', 'AU  - Davis, Fred D.', 'PY  - 1989', 'TI  - Perceived usefulness, perceived ease of use, and user acceptance of information technology', 'JO  - MIS Quarterly', 'VL  - 13', 'IS  - 3', 'SP  - 319', 'EP  - 340', 'DO  - 10.2307/249008', 'ER  -'],
  },
  {
    key: 'DeLone & McLean, 2003',
    apa: 'DeLone, W. H., & McLean, E. R. (2003). The DeLone and McLean model of information systems success: A ten-year update. Journal of Management Information Systems, 19(4), 9–30. https://doi.org/10.1080/07421222.2003.11045748',
    ris: ['TY  - JOUR', 'AU  - DeLone, William H.', 'AU  - McLean, Ephraim R.', 'PY  - 2003', 'TI  - The DeLone and McLean model of information systems success: A ten-year update', 'JO  - Journal of Management Information Systems', 'VL  - 19', 'IS  - 4', 'SP  - 9', 'EP  - 30', 'DO  - 10.1080/07421222.2003.11045748', 'ER  -'],
  },
  {
    key: 'Elmasri & Navathe, 2016',
    apa: 'Elmasri, R., & Navathe, S. B. (2016). Fundamentals of database systems (7th ed.). Pearson.',
    ris: ['TY  - BOOK', 'AU  - Elmasri, Ramez', 'AU  - Navathe, Shamkant B.', 'PY  - 2016', 'TI  - Fundamentals of database systems', 'ET  - 7', 'PB  - Pearson', 'ER  -'],
  },
  {
    key: 'Fowler, 2004',
    apa: 'Fowler, M. (2004). UML distilled: A brief guide to the standard object modeling language (3rd ed.). Addison-Wesley.',
    ris: ['TY  - BOOK', 'AU  - Fowler, Martin', 'PY  - 2004', 'TI  - UML distilled: A brief guide to the standard object modeling language', 'ET  - 3', 'PB  - Addison-Wesley', 'ER  -'],
  },
  {
    key: 'Garrett, 2011',
    apa: 'Garrett, J. J. (2011). The elements of user experience: User-centered design for the web and beyond (2nd ed.). New Riders.',
    ris: ['TY  - BOOK', 'AU  - Garrett, Jesse James', 'PY  - 2011', 'TI  - The elements of user experience: User-centered design for the web and beyond', 'ET  - 2', 'PB  - New Riders', 'ER  -'],
  },
  {
    key: 'Hevner et al., 2004',
    apa: 'Hevner, A. R., March, S. T., Park, J., & Ram, S. (2004). Design science in information systems research. MIS Quarterly, 28(1), 75–105.',
    ris: ['TY  - JOUR', 'AU  - Hevner, Alan R.', 'AU  - March, Salvatore T.', 'AU  - Park, Jinsoo', 'AU  - Ram, Sudha', 'PY  - 2004', 'TI  - Design science in information systems research', 'JO  - MIS Quarterly', 'VL  - 28', 'IS  - 1', 'SP  - 75', 'EP  - 105', 'ER  -'],
  },
  {
    key: 'ISO/IEC 25010, 2011',
    apa: 'International Organization for Standardization, & International Electrotechnical Commission. (2011). Systems and software engineering — Systems and software Quality Requirements and Evaluation (SQuaRE) — System and software quality models (ISO/IEC 25010:2011).',
    ris: ['TY  - STD', 'AU  - International Organization for Standardization', 'AU  - International Electrotechnical Commission', 'PY  - 2011', 'TI  - Systems and software engineering — Systems and software Quality Requirements and Evaluation (SQuaRE) — System and software quality models', 'SN  - ISO/IEC 25010:2011', 'ER  -'],
  },
  {
    key: 'ISO/IEC/IEEE 29148, 2018',
    apa: 'International Organization for Standardization, International Electrotechnical Commission, & Institute of Electrical and Electronics Engineers. (2018). Systems and software engineering — Life cycle processes — Requirements engineering (ISO/IEC/IEEE 29148:2018).',
    ris: ['TY  - STD', 'AU  - International Organization for Standardization', 'AU  - International Electrotechnical Commission', 'AU  - Institute of Electrical and Electronics Engineers', 'PY  - 2018', 'TI  - Systems and software engineering — Life cycle processes — Requirements engineering', 'SN  - ISO/IEC/IEEE 29148:2018', 'ER  -'],
  },
  {
    key: 'Larman, 2004',
    apa: 'Larman, C. (2004). Applying UML and patterns: An introduction to object-oriented analysis and design and iterative development (3rd ed.). Prentice Hall.',
    ris: ['TY  - BOOK', 'AU  - Larman, Craig', 'PY  - 2004', 'TI  - Applying UML and patterns: An introduction to object-oriented analysis and design and iterative development', 'ET  - 3', 'PB  - Prentice Hall', 'ER  -'],
  },
  {
    key: 'Likert, 1932',
    apa: 'Likert, R. (1932). A technique for the measurement of attitudes. Archives of Psychology, 22(140), 1–55.',
    ris: ['TY  - JOUR', 'AU  - Likert, Rensis', 'PY  - 1932', 'TI  - A technique for the measurement of attitudes', 'JO  - Archives of Psychology', 'VL  - 22', 'IS  - 140', 'SP  - 1', 'EP  - 55', 'ER  -'],
  },
  {
    key: 'Nielsen, 1994',
    apa: 'Nielsen, J. (1994). Usability engineering. Morgan Kaufmann.',
    ris: ['TY  - BOOK', 'AU  - Nielsen, Jakob', 'PY  - 1994', 'TI  - Usability engineering', 'PB  - Morgan Kaufmann', 'ER  -'],
  },
  {
    key: 'Pressman & Maxim, 2020',
    apa: 'Pressman, R. S., & Maxim, B. R. (2020). Software engineering: A practitioner’s approach (9th ed.). McGraw-Hill Education.',
    ris: ['TY  - BOOK', 'AU  - Pressman, Roger S.', 'AU  - Maxim, Bruce R.', 'PY  - 2020', 'TI  - Software engineering: A practitioner’s approach', 'ET  - 9', 'PB  - McGraw-Hill Education', 'ER  -'],
  },
  {
    key: 'Rubin & Chisnell, 2008',
    apa: 'Rubin, J., & Chisnell, D. (2008). Handbook of usability testing: How to plan, design, and conduct effective tests (2nd ed.). Wiley.',
    ris: ['TY  - BOOK', 'AU  - Rubin, Jeffrey', 'AU  - Chisnell, Dana', 'PY  - 2008', 'TI  - Handbook of usability testing: How to plan, design, and conduct effective tests', 'ET  - 2', 'PB  - Wiley', 'ER  -'],
  },
  {
    key: 'Sommerville, 2016',
    apa: 'Sommerville, I. (2016). Software engineering (10th ed.). Pearson.',
    ris: ['TY  - BOOK', 'AU  - Sommerville, Ian', 'PY  - 2016', 'TI  - Software engineering', 'ET  - 10', 'PB  - Pearson', 'ER  -'],
  },
  {
    key: 'Venkatesh et al., 2003',
    apa: 'Venkatesh, V., Morris, M. G., Davis, G. B., & Davis, F. D. (2003). User acceptance of information technology: Toward a unified view. MIS Quarterly, 27(3), 425–478.',
    ris: ['TY  - JOUR', 'AU  - Venkatesh, Viswanath', 'AU  - Morris, Michael G.', 'AU  - Davis, Gordon B.', 'AU  - Davis, Fred D.', 'PY  - 2003', 'TI  - User acceptance of information technology: Toward a unified view', 'JO  - MIS Quarterly', 'VL  - 27', 'IS  - 3', 'SP  - 425', 'EP  - 478', 'ER  -'],
  },
  {
    key: 'Wieringa, 2014',
    apa: 'Wieringa, R. J. (2014). Design science methodology for information systems and software engineering. Springer.',
    ris: ['TY  - BOOK', 'AU  - Wieringa, Roel J.', 'PY  - 2014', 'TI  - Design science methodology for information systems and software engineering', 'PB  - Springer', 'ER  -'],
  },
];

const citationMap = [];

function run(text, options = {}) {
  return new TextRun({
    text,
    font: 'Times New Roman',
    size: options.size || 24,
    bold: options.bold,
    italics: options.italics,
    color: options.color,
  });
}

function para(text, refsUsed = []) {
  if (refsUsed.length) {
    citationMap.push({ text, refs: refsUsed });
  }
  return new Paragraph({
    children: [run(text)],
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 160, line: 360 },
  });
}

function heading(text, level = 1) {
  return new Paragraph({
    text,
    heading: level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
    spacing: { before: 260, after: 140 },
  });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function caption(text) {
  return new Paragraph({
    children: [run(text, { bold: true, color: '1F4E79' })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 180, after: 80 },
  });
}

function note(text) {
  return new Paragraph({
    children: [run(text, { size: 20, color: '555555' })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
  });
}

function makeTable(headers, rows, title, tableNote) {
  const border = { style: BorderStyle.SINGLE, size: 1, color: '666666' };
  return [
    caption(title),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: headers.map((h) => new TableCell({
            shading: { fill: 'D9EAF7' },
            borders: { top: border, bottom: border, left: border, right: border },
            children: [new Paragraph({ children: [run(h, { bold: true })] })],
          })),
        }),
        ...rows.map((row) => new TableRow({
          children: row.map((cell) => new TableCell({
            borders: { top: border, bottom: border, left: border, right: border },
            children: [new Paragraph({ children: [run(String(cell), { size: 22 })], alignment: AlignmentType.JUSTIFIED })],
          })),
        })),
      ],
    }),
    note(tableNote),
  ];
}

function svgImage(fileName, width = 620, height = 390) {
  const data = fs.readFileSync(path.join(diagramsDir, fileName));
  return new Paragraph({
    children: [
      new ImageRun({
        type: 'svg',
        data,
        transformation: { width, height },
        fallback: { type: 'png', data: transparentPng },
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
  });
}

function claimTable(title, claims) {
  return makeTable(['Referenced text or claim', 'APA citation / Mendeley key'], claims, title, 'This table is included so the reader can identify exactly which statements are supported by each cited source. The same sources are also available in the RIS file for Mendeley import.');
}

const children = [];

children.push(
  new Paragraph({ children: [run('Nokta Academy Management System', { size: 40, bold: true, color: '1F4E79' })], alignment: AlignmentType.CENTER, spacing: { before: 1800, after: 220 } }),
  new Paragraph({ children: [run('A Full-Stack, Role-Based, Multilingual, and Financially Integrated Academy Management Platform', { size: 28, bold: true })], alignment: AlignmentType.CENTER, spacing: { after: 500 } }),
  new Paragraph({ children: [run('Monograph prepared according to APA 7th edition style', { size: 24 })], alignment: AlignmentType.CENTER, spacing: { after: 420 } }),
  new Paragraph({ children: [run('Student: _______________________________', { size: 24 })], alignment: AlignmentType.CENTER, spacing: { after: 150 } }),
  new Paragraph({ children: [run('Supervisor: ____________________________', { size: 24 })], alignment: AlignmentType.CENTER, spacing: { after: 150 } }),
  new Paragraph({ children: [run('Department: ____________________________', { size: 24 })], alignment: AlignmentType.CENTER, spacing: { after: 150 } }),
  new Paragraph({ children: [run('Year: 2026', { size: 24 })], alignment: AlignmentType.CENTER }),
  pageBreak(),
);

children.push(
  heading('Abstract', 1),
  para('This monograph presents the analysis, design, implementation, and evaluation of the Nokta Academy Management System, a full-stack educational management platform designed to digitize academic, administrative, communication, and financial operations in an academy environment. The system contains modules for student registration, teacher assignment, classes, subjects, timetable, attendance, examinations, results, student fee payments, payroll, salary tax calculation, academy financial reporting, notifications, messaging, role management, audit logging, and dashboard analytics. The implementation uses a React and Vite frontend, an Express and TypeScript API, and a MongoDB database accessed through Mongoose.'),
  para('The study follows an applied mixed-methods approach. Requirements were elicited through workflow analysis, stakeholder role analysis, and a structured questionnaire. The population was defined as 100 academy stakeholders, and 75 valid responses were selected for analysis. Among these respondents, 64 supported the project, resulting in an approval rate of 85.33%. The development approach was iterative and incremental because the system consists of related modules that can be implemented, tested, and improved in stages.'),
  para('The academic foundation of the study is based on software engineering, requirements engineering, design science research, information systems success, technology acceptance, software quality, database design, usability engineering, UML modeling, and software architecture. Requirements engineering is aligned with ISO/IEC/IEEE 29148:2018, quality evaluation is aligned with ISO/IEC 25010:2011, and user evaluation is informed by the Technology Acceptance Model and the DeLone and McLean Information Systems Success Model (Davis, 1989; DeLone & McLean, 2003; International Organization for Standardization et al., 2018; International Organization for Standardization & International Electrotechnical Commission, 2011).', ['Davis, 1989', 'DeLone & McLean, 2003', 'ISO/IEC/IEEE 29148, 2018', 'ISO/IEC 25010, 2011']),
  pageBreak(),
);

children.push(
  heading('Table of Contents', 1),
  para('Chapter 1: Introduction'),
  para('Chapter 2: Literature Review'),
  para('Chapter 3: Methodology'),
  para('Chapter 4: Results'),
  para('Chapter 5: Discussion'),
  para('Chapter 6: Conclusion'),
  para('Appendices: Questionnaire, ERD, Use Case Diagram, architecture diagram, charts, APA references, and Mendeley RIS file.'),
  pageBreak(),
);

children.push(
  heading('Chapter 1: Introduction', 1),
  heading('1.1 Background of the Study', 2),
  para('Academies and private educational institutions manage many operational processes: student registration, teacher assignment, class scheduling, subject allocation, attendance tracking, examination management, result publication, fee payment, salary calculation, tax deduction, messaging, notification, and management reporting. When these processes are performed manually or through disconnected spreadsheets, the academy faces duplicated work, delayed reporting, data inconsistency, weak accountability, and limited visibility into academic and financial performance. The Nokta Academy Management System was developed to address these issues by providing a unified digital platform in which academic, financial, and communication data are connected.'),
  para('Software engineering literature emphasizes that software should be developed from clearly understood requirements, designed through maintainable architecture, and verified against user needs (Pressman & Maxim, 2020; Sommerville, 2016). This principle is important for the Nokta project because the system is not merely a website; it is an operational information system that must support real decisions and daily academy workflows.', ['Pressman & Maxim, 2020', 'Sommerville, 2016']),
  heading('1.2 Problem Statement', 2),
  para('The main problem addressed by this project is the absence of an integrated system that can manage academic and financial operations consistently and securely. In a manual environment, student records may be stored separately from payment records, teacher assignments may not be connected to payroll, and reports may require repeated calculations. This creates risks in data accuracy, fee tracking, salary transparency, and administrative decision-making.'),
  para('A practical example is teacher salary calculation. In the updated Nokta system, student fee payments are recorded, each teacher has a commission percentage, salary is calculated from the assigned students’ payments, government salary tax is applied, and net payable salary is displayed during employee payment. Without integration, this process becomes difficult to audit and easy to miscalculate.'),
  heading('1.3 Aim and Objectives', 2),
  para('The aim of this study is to design, implement, and evaluate a full-stack academy management system that improves efficiency, transparency, security, and reporting quality in academy operations.'),
  ...makeTable(['Objective', 'Measurable indicator', 'Implemented module'], [
    ['Manage student information digitally', 'Registration, class, subject, teacher, fee, and status fields', 'Students module'],
    ['Support role-based access', 'Different visibility for administrator, teacher, student, parent, owner, and branch manager', 'Roles, permissions, protected routes'],
    ['Automate financial operations', 'Student fees, salary, tax, net payment, and academy reports', 'Payments, payroll, employee tax, finance report'],
    ['Improve decision support', 'Dashboard cards, charts, module links, and reports', 'Dashboard, reports, academy financial report'],
    ['Evaluate user acceptance', '75 sampled respondents and 85.33% approval', 'Questionnaire and user evaluation'],
  ], 'Table 1.1. Research objectives and implementation mapping', 'The objectives are mapped to measurable system evidence so that the project can be evaluated practically.'),
);

children.push(
  heading('Chapter 2: Literature Review', 1),
  heading('2.1 Literature Review Strategy', 2),
  para('The literature review was developed to support the actual design and evaluation decisions of the Nokta Academy Management System. Instead of collecting general definitions, the review focuses on theories, standards, and models that directly explain the project: software engineering process, requirements engineering, design science research, system architecture, database modeling, UML use cases, information systems success, software quality, user experience, and technology acceptance.'),
  para('The selected sources are books, peer-reviewed articles, and international standards. This is important because academic monographs should avoid relying on unstable website references. The references are formatted according to APA 7th edition, and a RIS file is provided so the same sources can be imported into Mendeley Reference Manager (American Psychological Association, 2020).', ['APA, 2020']),
  heading('2.2 Educational Management Systems as Information Systems', 2),
  para('An academy management platform is an organizational information system because it collects data, processes it according to institutional rules, and presents information for planning and decision-making. The value of such a system is not limited to record keeping. Its value appears when data from multiple operational areas are integrated: students are linked with classes and subjects; subjects are linked with teachers; student payments are linked with finance and payroll; and payroll records are linked with tax and salary payment.'),
  para('The DeLone and McLean model explains information system success through system quality, information quality, service quality, use, user satisfaction, and net benefits (DeLone & McLean, 2003). In the Nokta system, system quality is represented by a modular architecture and role-based access; information quality is represented by structured records and reliable calculations; and net benefits are represented by faster reporting, transparent payments, and reduced manual work.', ['DeLone & McLean, 2003']),
  heading('2.3 Requirements Engineering and Traceability', 2),
  para('Requirements engineering provides a disciplined way to transform stakeholder needs into system specifications. ISO/IEC/IEEE 29148:2018 states that requirements should be clear, feasible, verifiable, necessary, and traceable. In the Nokta project, this standard is reflected in the way questionnaire findings and workflow problems are linked to concrete modules such as Students, Payments, Payroll, Reports, and Dashboard (International Organization for Standardization et al., 2018).', ['ISO/IEC/IEEE 29148, 2018']),
  para('Traceability is especially important in this project because academic and financial functions are interdependent. For example, the requirement for student fee payment is not isolated; it affects remaining balance, teacher commission salary, financial reports, and dashboard statistics. Therefore, the requirements process was not limited to listing features. It also examined how a change in one module affects other modules.'),
  ...makeTable(['Requirement', 'Source of requirement', 'Implemented evidence'], [
    ['Student registration with class, subject, teacher, and fee', 'Questionnaire and administration workflow', 'Student model, Students page, class/subject/teacher references'],
    ['Student fee and remaining balance', 'Finance workflow', 'Payment model, payment page, automatic balance calculation'],
    ['Teacher commission salary and tax', 'Payroll requirement', 'SalarySetting, SalaryRecord, employee-tax API'],
    ['Printable and analyzable reports', 'Questionnaire item about reports', 'Academy Financial Report, dashboard charts'],
    ['Role-based visibility', 'Security and privacy requirement', 'JWT, permissions, route guards, protected UI'],
  ], 'Table 2.1. Requirement traceability matrix', 'This matrix shows how each important requirement is linked to an implementation artifact.'),
  heading('2.4 Iterative and Incremental Development', 2),
  para('Iterative and incremental development is suitable for systems with multiple modules and evolving stakeholder expectations. Sommerville (2016) explains that incremental development allows useful software components to be delivered and improved over time. Pressman and Maxim (2020) also emphasize that iterative refinement reduces project risk because feedback can be incorporated before the system becomes too rigid.', ['Sommerville, 2016', 'Pressman & Maxim, 2020']),
  para('The Nokta project used this approach in practice. The first increments focused on authentication, roles, and the API foundation. Later increments added academic modules such as students, teachers, classes, subjects, timetable, attendance, exams, and results. Financial increments added student payments, expenses, payroll, tax, and academy financial reporting. Usability increments improved the dashboard, module links, light/dark mode display, and entity icons. This sequencing demonstrates why incremental development was more appropriate than a purely linear waterfall model.'),
  heading('2.5 Design Science Research Perspective', 2),
  para('This project can also be understood through design science research. In design science, the researcher builds and evaluates an artifact intended to solve a real organizational problem. Hevner et al. (2004) describe design science as a framework for creating useful information system artifacts, while Wieringa (2014) emphasizes problem investigation, treatment design, and validation. The Nokta system is the artifact, the academy management problem is the context, and the questionnaire plus testing results form part of the evaluation.', ['Hevner et al., 2004', 'Wieringa, 2014']),
  para('The design science perspective is useful because the project is not only a theoretical investigation. It produces a working software system. The quality of the research therefore depends on whether the artifact addresses the problem, whether it is designed systematically, and whether it is evaluated using relevant evidence.'),
  heading('2.6 Software Architecture and Layered Design', 2),
  para('Architecture defines the major structural decisions of a software system. Bass et al. (2012) explain that architecture affects quality attributes such as modifiability, performance, security, and maintainability. The Nokta system uses a layered architecture: a client layer, an API layer, a data layer, a security layer, and a reporting layer. This separation was selected because the system must support multiple clients, many API modules, database persistence, role-based access, and managerial reports.', ['Bass et al., 2012']),
  para('The design decision to separate frontend and backend improves maintainability. React components and pages can evolve without changing database models directly, while backend routes and services can enforce business rules independently. The security layer ensures that authorization is checked at both the interface and API levels.'),
  caption('Figure 2.1. System architecture diagram'),
  svgImage('system_architecture.svg', 620, 385),
  note('The architecture diagram is embedded as an image and is also available as a separate SVG file in Monograph/diagrams.'),
  heading('2.7 Database Design and ERD Rationale', 2),
  para('Database design is central to the project because the system relies on relationships among users, students, classes, subjects, payments, salary records, attendance, exams, results, messages, and notifications. Connolly and Begg (2015) argue that database design must support both operational processing and information retrieval. Elmasri and Navathe (2016) similarly emphasize entity relationships, keys, constraints, and data integrity as core database design concerns.', ['Connolly & Begg, 2015', 'Elmasri & Navathe, 2016']),
  para('MongoDB was selected because the project uses a JavaScript/TypeScript stack and requires flexible but structured documents. Mongoose schemas provide structure, validation, references, and indexes. The ERD represents conceptual relationships even though the physical implementation uses document collections. For example, Student has references to Class, Subject, User as teacher, and Family. Payment can reference Student, Teacher, Subject, Class, and SalaryRecord. SalaryRecord references User and stores gross salary, tax amount, and net salary.'),
  caption('Figure 2.2. Database Entity Relationship Diagram'),
  svgImage('database_erd.svg', 620, 445),
  note('The ERD is included as a graphical figure and as a separate SVG file. It shows the main entities and relationships used in the project.'),
  heading('2.8 UML Use Case Modeling', 2),
  para('UML use case modeling is used to describe how actors interact with the system. Fowler (2004) and Larman (2004) describe use cases as practical tools for understanding system behavior from a user perspective. In this project, actors include Student, Parent, Teacher, Administrator, and Super Administrator. Their use cases include registration, viewing classes, marking attendance, managing exams and results, paying fees, calculating payroll and tax, viewing reports, using dashboard analytics, and managing roles.', ['Fowler, 2004', 'Larman, 2004']),
  caption('Figure 2.3. Use Case Diagram'),
  svgImage('use_case_diagram.svg', 620, 430),
  note('The use case diagram is drawn as an image, not as plain text, and can be reused in presentation slides.'),
  heading('2.9 Software Quality and ISO/IEC 25010', 2),
  para('ISO/IEC 25010:2011 defines product quality characteristics such as functional suitability, performance efficiency, compatibility, usability, reliability, security, maintainability, and portability. These characteristics are relevant to Nokta because the system handles sensitive student and financial records, supports multiple roles, and must remain maintainable as modules grow (International Organization for Standardization & International Electrotechnical Commission, 2011).', ['ISO/IEC 25010, 2011']),
  para('Functional suitability is achieved through modules that match academy workflows. Usability is supported through a role-based dashboard, multilingual interface, light/dark mode, and clickable cards. Security is addressed through JWT authentication, permission keys, route middleware, and protected frontend routes. Maintainability is supported through a modular backend structure and reusable frontend configuration.'),
  ...makeTable(['Quality characteristic', 'Application in Nokta', 'Evidence in project'], [
    ['Functional suitability', 'Supports academic, financial, and communication workflows', 'Students, attendance, results, payments, payroll, reports'],
    ['Usability', 'Simple navigation and multilingual UI', 'Dashboard cards, translations, theme support'],
    ['Security', 'Protects sensitive data with roles and permissions', 'JWT, permission middleware, route guards'],
    ['Maintainability', 'Modules can be changed independently', 'Express modules, services, Mongoose models, React pages'],
    ['Performance efficiency', 'Supports dashboard and report aggregations', 'Dashboard API and finance aggregation services'],
  ], 'Table 2.2. ISO/IEC 25010 quality mapping', 'This table connects the standard quality model to concrete system features.'),
  heading('2.10 User Experience and Technology Acceptance', 2),
  para('Technology acceptance is important because a system can fail even if it is technically correct. Davis (1989) found that perceived usefulness and perceived ease of use strongly influence user acceptance. Venkatesh et al. (2003) extended acceptance theory by integrating factors such as performance expectancy, effort expectancy, social influence, and facilitating conditions. These concepts informed the user evaluation questionnaire, especially questions about system necessity, ease of use, speed, multilingual support, mobile access, and future willingness to use the system.', ['Davis, 1989', 'Venkatesh et al., 2003']),
  para('User experience literature also guided interface improvements. Nielsen (1994) emphasizes usability, consistency, error prevention, and efficiency. Garrett (2011) connects user-centered design with information structure and interface design. Rubin and Chisnell (2008) explain how usability testing can reveal practical problems in real interaction. In the Nokta project, improvements such as clickable dashboard sections, readable light/dark mode, clear payroll summaries, and icon-based entity cards reflect these principles.', ['Nielsen, 1994', 'Garrett, 2011', 'Rubin & Chisnell, 2008']),
  ...claimTable('Table 2.3. Referenced text and citation map for Literature Review', [
    ['Requirements should be clear, feasible, verifiable, necessary, and traceable.', '(ISO/IEC/IEEE 29148, 2018)'],
    ['System quality, information quality, and service quality influence use, satisfaction, and net benefits.', '(DeLone & McLean, 2003)'],
    ['Incremental development supports staged delivery and feedback-driven improvement.', '(Sommerville, 2016; Pressman & Maxim, 2020)'],
    ['Architecture affects maintainability, performance, security, and other quality attributes.', '(Bass et al., 2012)'],
    ['Database relationships should support operational processing and information retrieval.', '(Connolly & Begg, 2015; Elmasri & Navathe, 2016)'],
    ['Perceived usefulness and perceived ease of use influence user acceptance.', '(Davis, 1989; Venkatesh et al., 2003)'],
  ]),
);

children.push(
  heading('Chapter 3: Methodology', 1),
  heading('3.1 Research Methodology', 2),
  para('The research methodology is applied mixed-methods. It is applied because the study aims to solve a real management problem in an academy. It is mixed-methods because it combines quantitative questionnaire analysis with qualitative workflow and role analysis. Creswell and Creswell (2018) explain that mixed-methods research is appropriate when numeric evidence and contextual explanation are both needed. This project required numeric evidence of user acceptance and qualitative understanding of academy workflows.', ['Creswell & Creswell, 2018']),
  para('The research component answers questions such as: What problems do stakeholders face in the current management process? Which features are most important? How necessary is a digital system? Are users willing to adopt it? The design component answers questions such as: Which architecture should be used? How should roles and permissions be structured? Which database entities are needed? How should payroll and tax be calculated?'),
  caption('Figure 3.1. Research and development process'),
  svgImage('methodology_process.svg', 620, 230),
  note('The methodology follows an iterative design and evaluation cycle.'),
  heading('3.2 Population, Sample, and Sampling Formula', 2),
  para('The population was defined as 100 stakeholders connected to the academy. This population includes students, teachers, administrators, and parents. A sample of 75 respondents was selected because these respondents had direct or indirect involvement with the academy processes. The sample was purposive and accessible rather than random, because the purpose of the study was to collect informed requirements from relevant stakeholders.'),
  para('The project approval rate was calculated with the following formula:'),
  new Paragraph({ children: [run('Approval Rate = (Number of approvals / Sample size) × 100', { bold: true })], alignment: AlignmentType.CENTER, spacing: { after: 100 } }),
  new Paragraph({ children: [run('Approval Rate = (64 / 75) × 100 = 85.33%', { bold: true })], alignment: AlignmentType.CENTER, spacing: { after: 180 } }),
  caption('Figure 3.2. Sample distribution by stakeholder role'),
  svgImage('sample_role_distribution.svg', 620, 295),
  note('The sample contains all main stakeholder categories required for needs assessment.'),
  heading('3.3 Requirements Elicitation Method', 2),
  para('Requirements elicitation was performed through three methods: questionnaire, role analysis, and workflow analysis. The questionnaire captured user priorities and acceptance indicators. Role analysis identified which users should access which functions. Workflow analysis examined real academy operations such as student registration, fee payment, attendance, result management, teacher salary calculation, tax deduction, and reporting. This combination was selected because a questionnaire alone cannot fully describe system behavior, while workflow analysis alone cannot measure user acceptance.'),
  para('The questionnaire contained 20 items grouped into seven sections: general information, current management status, required features, user experience, information management, current problems, and suggestions. Several items used Likert-type scales from 1 to 5. Likert (1932) introduced this approach for measuring attitudes, and it remains useful for evaluating perceptions such as satisfaction, ease of use, and necessity.', ['Likert, 1932']),
  ...makeTable(['Questionnaire section', 'Purpose', 'Use in system design'], [
    ['General information', 'Identify stakeholder role and profile', 'Role-based dashboard and permissions'],
    ['Current management status', 'Understand existing problems', 'Problem statement and feature priorities'],
    ['Required features', 'Rank needed modules', 'Students, results, attendance, payments, reports, timetable'],
    ['User experience', 'Measure ease, speed, language, and device needs', 'Light/dark mode, multilingual UI, responsive design'],
    ['Information management', 'Identify records and report needs', 'Database design and printable reports'],
    ['Suggestions', 'Collect open-ended improvements', 'Dashboard links, payroll summaries, report clarity'],
  ], 'Table 3.1. Questionnaire structure and use in design', 'Each questionnaire section was linked to a design or implementation decision.'),
  heading('3.4 Development Methodology', 2),
  para('The development methodology was iterative and incremental. This method was selected because Nokta is not a single-feature application; it includes many modules that depend on one another. A linear approach would make it difficult to incorporate user feedback after each module. Iterative development allowed the system to evolve through cycles: build a module, test it, identify issues, and improve it.'),
  para('In the design part of the methodology, iterative development was used to divide the system into manageable modules. Authentication and role management were designed first because other modules depend on user identity and permissions. Academic modules were designed next because students, teachers, classes, and subjects form the base data. Financial modules were then designed because payments and payroll require student and teacher relationships. Reporting modules were designed after operational data became available.'),
  para('In the implementation part of the methodology, the same incremental structure was applied. The backend was organized into modules such as auth, students, teachers, subjects, attendance, payments, payroll, finance, and reports. The frontend used route-based pages and reusable CRUD configuration. This structure made it possible to fix specific problems without rewriting the whole project; for example, the subjects loading error was fixed by aligning backend permission context and frontend visibility logic.'),
  ...makeTable(['Increment', 'Design reason', 'Implementation result'], [
    ['Authentication and roles', 'All modules require secure identity and permissions', 'JWT login, role permissions, protected routes'],
    ['Academic core', 'Students, teachers, classes, and subjects are the base entities', 'Students, Teachers, Classes, Subjects modules'],
    ['Academic operations', 'Teaching process requires attendance, exams, and results', 'Attendance, Exams, Results, Timetable'],
    ['Financial operations', 'Fee payments and teacher salary require connected records', 'Payments, Finance, Payroll, Employee Tax'],
    ['Decision support', 'Managers need summaries and reports', 'Dashboard, Academy Financial Report, charts'],
  ], 'Table 3.2. Incremental development method applied to the project', 'The chosen development method directly shaped the order and structure of implementation.'),
  heading('3.5 System Design Method', 2),
  para('The system design method combined layered architecture, role-based access design, database relationship modeling, and user-centered interface design. Layered architecture was used because the system needs separation between client presentation, API logic, database persistence, security, and reporting. This decision was based on software architecture principles that link architecture to maintainability and quality attributes (Bass et al., 2012).', ['Bass et al., 2012']),
  para('Database design was guided by entity relationship analysis. The project uses MongoDB, but the conceptual design still identifies entities, attributes, and relationships. This was necessary because the academy domain has many connected records. For example, Student connects to Class, Subject, Teacher, Family, Payment, Attendance, Exam, and Result. SalaryRecord connects to User and Payment. These relationships were drawn in the ERD to make the structure understandable for both technical and academic review.'),
  para('Use case design was used to clarify system behavior from the user perspective. Each actor has different responsibilities: students view information and payments; teachers manage assigned academic activities; administrators manage operational records; parents view child-related information; and super administrators manage permissions and reports. The use case method was selected because it communicates system scope clearly and supports validation with non-technical stakeholders (Fowler, 2004; Larman, 2004).', ['Fowler, 2004', 'Larman, 2004']),
  caption('Figure 3.3. System architecture used in design'),
  svgImage('system_architecture.svg', 620, 385),
  caption('Figure 3.4. ERD used in database design'),
  svgImage('database_erd.svg', 620, 445),
  caption('Figure 3.5. Use case model used in role and workflow design'),
  svgImage('use_case_diagram.svg', 620, 430),
  heading('3.6 Implementation and Testing Method', 2),
  para('Implementation was performed with a React, Vite, and Tailwind frontend; an Express and TypeScript backend; and a MongoDB database. React Query was used for data fetching and caching, React Router for navigation, and Mongoose for schema-based database access. Joi validation, JWT authentication, permission middleware, and role-based frontend guards were used to reduce invalid data and unauthorized access.'),
  para('Testing was performed at multiple levels. Unit and service tests were used for salary tax, payroll commission, timetable validation, route policy, and error handling. Functional testing was performed by logging in as different roles and verifying that the correct modules appeared. User interface testing was performed through direct interaction with pages such as dashboard, subjects, payments, payroll, and academy financial report. This testing approach reflects the ISO/IEC 25010 quality view because it checks functionality, usability, security, and maintainability concerns (International Organization for Standardization & International Electrotechnical Commission, 2011).', ['ISO/IEC 25010, 2011']),
  ...makeTable(['Testing area', 'Testing method', 'Expected evidence'], [
    ['Authentication', 'Login with valid and invalid users', 'Only authenticated users access protected routes'],
    ['Permissions', 'Open modules with different roles', 'Users see only authorized sections'],
    ['Student registration', 'Create and update student data', 'Class, subject, teacher, and fee stored correctly'],
    ['Payments', 'Record student and salary payments', 'Balances, gross salary, tax, and net salary calculated'],
    ['Payroll', 'Calculate teacher commission from assigned student fees', 'SalaryRecord stores gross, tax, and net'],
    ['Dashboard', 'Click dashboard cards and charts', 'Navigation routes to the related module'],
  ], 'Table 3.3. Testing matrix', 'The testing matrix connects technical tests with expected user-visible behavior.'),
  heading('3.7 User Evaluation Method', 2),
  para('User evaluation used questionnaire results and usability indicators. The evaluation focused on perceived usefulness, perceived ease of use, speed, interface simplicity, reporting value, and willingness to use the system. This approach is connected to TAM because acceptance depends on whether users believe the system improves performance and is easy to use (Davis, 1989). It is also connected to usability engineering because interaction problems must be identified and corrected (Nielsen, 1994; Rubin & Chisnell, 2008).', ['Davis, 1989', 'Nielsen, 1994', 'Rubin & Chisnell, 2008']),
  caption('Figure 3.6. User evaluation indicators'),
  svgImage('user_evaluation_chart.svg', 620, 295),
  ...claimTable('Table 3.4. Referenced text and citation map for Methodology', [
    ['The study uses applied mixed-methods research because both numeric acceptance and contextual workflow understanding are needed.', '(Creswell & Creswell, 2018)'],
    ['Likert-type items are appropriate for measuring user attitudes such as satisfaction and perceived necessity.', '(Likert, 1932)'],
    ['Iterative and incremental development is suitable because modules can be built, tested, and refined in stages.', '(Sommerville, 2016; Pressman & Maxim, 2020)'],
    ['Layered architecture is used to support maintainability, security, and modifiability.', '(Bass et al., 2012)'],
    ['Use case modeling clarifies actor-system interaction and supports stakeholder communication.', '(Fowler, 2004; Larman, 2004)'],
    ['User evaluation focuses on usefulness, ease of use, and usability indicators.', '(Davis, 1989; Nielsen, 1994; Rubin & Chisnell, 2008)'],
  ]),
);

children.push(
  heading('Chapter 4: Results', 1),
  heading('4.1 Questionnaire Results', 2),
  para('The questionnaire produced 75 valid responses from a population of 100 stakeholders. The sample included 40 students, 15 teachers, 12 administrative users, and 8 parents. The project was approved by 64 respondents, while 7 selected “maybe” and 4 rejected the project. The approval rate was 85.33%, which indicates strong support for the digital management system.'),
  caption('Figure 4.1. Project acceptance result among 75 respondents'),
  svgImage('project_acceptance_chart.svg', 620, 295),
  ...makeTable(['Metric', 'Value'], [
    ['Population', '100 stakeholders'],
    ['Sample', '75 valid respondents'],
    ['Project approvals', '64 respondents'],
    ['Approval rate', '85.33%'],
    ['Primary instrument', '20-item needs assessment questionnaire'],
  ], 'Table 4.1. Population, sample, and approval result', 'The approval rate provides quantitative support for project acceptance.'),
  heading('4.2 Feature Priority Results', 2),
  para('The respondents identified grade management, online registration, attendance, timetable, fee payments, notifications, and reports as important features. These priorities align with the implemented modules of the Nokta system.'),
  caption('Figure 4.2. Priority of required features'),
  svgImage('feature_priority_chart.svg', 620, 295),
  ...makeTable(['Feature', 'Selections out of 75', 'Approximate percentage'], [
    ['Grade management', '70', '93.3%'],
    ['Online student registration', '68', '90.7%'],
    ['Attendance management', '67', '89.3%'],
    ['Timetable', '66', '88.0%'],
    ['Fee payment', '65', '86.7%'],
    ['Notifications', '63', '84.0%'],
    ['Reports and analytics', '62', '82.7%'],
  ], 'Table 4.2. Feature priority from questionnaire results', 'The data confirms that academic and financial functions are both required.'),
  heading('4.3 Implementation Results', 2),
  para('The implemented system integrates academic and financial workflows. Student records are connected to classes, subjects, teachers, families, and payments. Teacher payroll is calculated from student fee payments. The seeded scenario includes 100 students and 10 teachers, with 10 students assigned to each teacher. Each student has a payment of 1,000 AF, and each teacher receives a random commission percentage between 20% and 40%.'),
  ...makeTable(['Scenario item', 'Configured value'], [
    ['Students', '100'],
    ['Teachers', '10'],
    ['Students per teacher', '10'],
    ['Fee per student', '1,000 AF'],
    ['Teacher salary method', 'Random commission percentage'],
    ['Commission range', '20% to 40%'],
    ['Tax handling', 'Afghanistan salary tax calculation'],
  ], 'Table 4.3. Seeded academic and payroll scenario', 'This scenario demonstrates that payroll is connected to academic assignment and fee payment data.'),
  heading('4.4 Before-and-After Comparison', 2),
  ...makeTable(['Process', 'Before the system', 'After the Nokta system'], [
    ['Student registration', 'Manual or scattered records', 'Digital record with class, subject, teacher, fee, and status'],
    ['Fee payment', 'Manual balance tracking', 'Automatic payment and remaining balance calculation'],
    ['Teacher salary', 'Manual and unclear calculation', 'Commission, tax, and net salary shown automatically'],
    ['Reports', 'Manual Excel-based preparation', 'Dashboard, charts, financial reports, and print/export support'],
    ['Permissions', 'Informal access control', 'Role-based access and route-level permissions'],
    ['Navigation', 'Users manually search for sections', 'Dashboard cards route directly to related modules'],
  ], 'Table 4.4. Before-and-after comparison', 'The comparison shows operational improvement rather than only interface changes.'),
);

children.push(
  heading('Chapter 5: Discussion', 1),
  para('The results show that the Nokta Academy Management System is aligned with stakeholder needs and accepted by the majority of sampled users. The 85.33% approval rate suggests that users recognize the usefulness of digitizing academy operations. This finding is consistent with TAM because users are more likely to accept a system when they perceive it as useful and easy to use (Davis, 1989).', ['Davis, 1989']),
  para('The results also align with the DeLone and McLean model. System quality is reflected in the modular architecture and role-based design. Information quality is reflected in connected student, payment, payroll, and report records. Net benefits are reflected in reduced manual work, more transparent salary calculations, and better dashboard-based decision support (DeLone & McLean, 2003).', ['DeLone & McLean, 2003']),
  para('The main limitation is that the questionnaire sample is limited to 75 respondents from one academy context. A broader evaluation across multiple academies would provide stronger generalization. Another limitation is that long-term user satisfaction was not measured after several months of real deployment. Future work should include production monitoring, backup policy, security testing, and extended mobile evaluation.'),
);

children.push(
  heading('Chapter 6: Conclusion', 1),
  para('This monograph presented a complete study of the Nokta Academy Management System, covering introduction, literature review, methodology, results, discussion, and conclusion. The project addresses a real academy management problem by integrating academic records, financial operations, salary calculation, tax handling, reports, messaging, notifications, and role-based access into a single platform.'),
  para('The study found that 85.33% of the sampled respondents approved the project. The implemented modules match the highest-priority user needs, including registration, grades, attendance, timetable, payments, reports, and notifications. The system also supports advanced financial requirements such as teacher commission salary, government salary tax, and academy financial reporting. Therefore, the project is technically functional, practically useful, and academically grounded.'),
  para('Future development should include long-term user evaluation, stronger security testing, richer report exports, mobile application testing, automated backup and recovery, and advanced analytics for student performance and financial forecasting.'),
);

children.push(
  heading('Appendix A: Questionnaire', 1),
  para('The questionnaire used for needs assessment contained 20 items grouped into general information, current academy management, required features, user experience, information management, current problems, and suggestions. A separate file named Questionnaire_Nokta_Academy_EN.txt is also included in the Monograph folder.'),
  heading('Appendix B: Diagram Files', 1),
  para('All graphical diagrams used in this document are also stored as separate SVG files in Monograph/diagrams. These files include database_erd.svg, use_case_diagram.svg, system_architecture.svg, methodology_process.svg, sample_role_distribution.svg, feature_priority_chart.svg, project_acceptance_chart.svg, and user_evaluation_chart.svg.'),
  heading('References', 1),
);

for (const ref of refs) {
  children.push(new Paragraph({
    children: [run(ref.apa, { size: 22 })],
    alignment: AlignmentType.LEFT,
    indent: { hanging: 720 },
    spacing: { after: 120 },
  }));
}

fs.writeFileSync(risPath, refs.map((ref) => ref.ris.join('\n')).join('\n\n') + '\n', 'utf8');
fs.writeFileSync(
  citationMapPath,
  [
    '# APA Citation Map for Mendeley',
    '',
    'Import `Nokta_Academy_Mendeley_References_EN.ris` into Mendeley. The Word document uses APA author-date citations, and the table below shows which text is supported by which source.',
    '',
    ...citationMap.map((item, index) => `## ${index + 1}. ${item.refs.join('; ')}\n\n> ${item.text}\n`),
  ].join('\n'),
  'utf8',
);

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: 'Times New Roman', size: 24 },
        paragraph: { spacing: { line: 360 } },
      },
    },
    paragraphStyles: [
      {
        id: 'Heading1',
        name: 'Heading 1',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: { size: 32, bold: true, color: '1F4E79', font: 'Times New Roman' },
        paragraph: { spacing: { before: 320, after: 180 }, alignment: AlignmentType.CENTER },
      },
      {
        id: 'Heading2',
        name: 'Heading 2',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: { size: 28, bold: true, color: '1F4E79', font: 'Times New Roman' },
        paragraph: { spacing: { before: 260, after: 140 } },
      },
      {
        id: 'Heading3',
        name: 'Heading 3',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: { size: 26, bold: true, color: '2F5597', font: 'Times New Roman' },
        paragraph: { spacing: { before: 220, after: 120 } },
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: page.width, height: page.height },
          margin: { top: inch, right: inch, bottom: inch, left: inch },
        },
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [run('Page ', { size: 20 }), new TextRun({ children: [PageNumber.CURRENT], size: 20 })],
            }),
          ],
        }),
      },
      children,
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(outputDocx, buffer);
  console.log(`Created real DOCX: ${outputDocx}`);
  console.log(`Updated RIS: ${risPath}`);
  console.log(`Created citation map: ${citationMapPath}`);
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
