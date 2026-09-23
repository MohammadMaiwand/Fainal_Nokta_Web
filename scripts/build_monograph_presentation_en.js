const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const root = path.resolve(__dirname, '..');
const templatePath = path.join(root, 'Monograph', 'ترجمه_شده', 'SE_Final_Year_Project_Presentation_Template.pptx');
const outputPath = path.join(root, 'Monograph', 'ترجمه_شده', 'Nokta_Academy_Management_System_Presentation_EN.pptx');
const EMU = 914400;

function esc(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function paragraphXml(text, { bullet = true, bold = false, size = 2200 } = {}) {
  const bulletXml = bullet ? '<a:buChar char="•"/>' : '<a:buNone/>';
  return `<a:p><a:pPr algn="l">${bulletXml}</a:pPr><a:r><a:rPr lang="en-US" sz="${size}" b="${bold ? 1 : 0}" dirty="0"><a:latin typeface="Calibri"/><a:ea typeface="Calibri"/><a:cs typeface="Calibri"/></a:rPr><a:t>${esc(text)}</a:t></a:r></a:p>`;
}

function textBodyXml(lines) {
  return `<p:txBody><a:bodyPr wrap="square" lIns="91440" tIns="45720" rIns="91440" bIns="45720"><a:spAutoFit/></a:bodyPr><a:lstStyle/>${lines.map((line) => paragraphXml(line)).join('')}</p:txBody>`;
}

function titleBodyXml(title) {
  return `<p:txBody><a:bodyPr/><a:lstStyle/>${paragraphXml(title, { bullet: false, bold: true, size: 3200 })}</p:txBody>`;
}

function replaceShapeText(slideXml, title, bodyLines) {
  let shapeIndex = 0;
  return slideXml.replace(/<p:sp\b[\s\S]*?<\/p:sp>/g, (shapeXml) => {
    if (!shapeXml.includes('<p:txBody>')) return shapeXml;
    shapeIndex += 1;
    let replacement = '<p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody>';
    if (shapeIndex === 1) replacement = titleBodyXml(title);
    if (shapeIndex === 2) replacement = textBodyXml(bodyLines);
    return shapeXml.replace(/<p:txBody>[\s\S]*?<\/p:txBody>/, replacement);
  });
}

function removeTemplatePlaceholders(slideXml) {
  const placeholders = [
    'Project title ',
    '1',
    'st',
    ' member',
    'member',
    ' name',
    'Father',
    '’s name',
    '2nd ',
    '3rd ',
    '4th ',
    'Supervisor name',
    'Date',
  ];
  let xml = slideXml;
  for (const text of placeholders) {
    xml = xml.replaceAll(`<a:t>${esc(text)}</a:t>`, '<a:t></a:t>');
  }
  return xml;
}

async function ensurePngContentType(zip) {
  const file = '[Content_Types].xml';
  let xml = await zip.file(file).async('string');
  if (!xml.includes('Extension="png"')) {
    xml = xml.replace('</Types>', '<Default Extension="png" ContentType="image/png"/></Types>');
    zip.file(file, xml);
  }
}

function getRelId(relsXml) {
  const ids = [...relsXml.matchAll(/Id="rId(\d+)"/g)].map((match) => Number(match[1]));
  return `rId${Math.max(0, ...ids) + 1}`;
}

function imagePicXml(relId, id, name, xIn, yIn, wIn, hIn) {
  const x = Math.round(xIn * EMU);
  const y = Math.round(yIn * EMU);
  const w = Math.round(wIn * EMU);
  const h = Math.round(hIn * EMU);
  return `<p:pic><p:nvPicPr><p:cNvPr id="${id}" name="${esc(name)}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="${relId}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${w}" cy="${h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>`;
}

async function addImageToSlide(zip, slideNumber, imagePath, placement) {
  const slideFile = `ppt/slides/slide${slideNumber}.xml`;
  const relsFile = `ppt/slides/_rels/slide${slideNumber}.xml.rels`;
  const mediaName = `image_nokta_en_${slideNumber}.png`;
  const mediaPath = `ppt/media/${mediaName}`;
  zip.file(mediaPath, fs.readFileSync(imagePath));

  let relsXml = zip.file(relsFile)
    ? await zip.file(relsFile).async('string')
    : '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
  const relId = getRelId(relsXml);
  relsXml = relsXml.replace('</Relationships>', `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${mediaName}"/></Relationships>`);
  zip.file(relsFile, relsXml);

  let slideXml = await zip.file(slideFile).async('string');
  slideXml = slideXml.replace('</p:spTree>', `${imagePicXml(relId, 800 + slideNumber, placement.name, placement.x, placement.y, placement.w, placement.h)}</p:spTree>`);
  zip.file(slideFile, slideXml);
}

const slides = [
  {
    title: 'Nokta Academy Management System',
    body: [
      '1st member: Mohammad Maiwand Osmani | Father name: Mohammad Zaman',
      '2nd member: Mohammad Khalid Sahil | Father name: Wali Mohammad',
      'Department: Software Engineering',
      'Faculty: Computer Science',
      'Supervisor: ________________________________',
      'Academic year: 2025 | Project duration: Two semesters',
    ],
  },
  {
    title: 'Nokta Academy Management System',
    body: [
      'Final Year Project Presentation',
      'An integrated web and mobile-oriented academic management platform',
      'Prepared for the Software Engineering Department',
      'Date: ________________________________',
    ],
  },
  {
    title: 'Nokta Academy Management System',
    body: [
      'Opening and greeting',
      'This presentation explains the project background, problem, research questions, objectives, design, implementation, testing, evaluation, and future work.',
      'The project focuses on digital transformation for Nokta Academy.',
    ],
  },
  {
    title: 'Introduction',
    body: [
      'Brief background of the problem: Nokta Academy used manual records, disconnected spreadsheets, delayed reporting, and scattered communication.',
      'Importance of the project: NAMS reduces manual work, improves data accuracy, strengthens financial transparency, and supports evidence-based decisions.',
      'Target users or beneficiaries: administration staff, teachers, students, parents, finance users, and system administrators.',
    ],
  },
  {
    title: 'Problem Statement',
    body: [
      'Clear statement of the problem: academic, administrative, and financial data were not managed through one centralized system.',
      'Real-world impact or relevance: manual processes caused duplicated records, delayed reports, weak communication, and possible financial errors.',
      'Why this problem needs a solution: the academy needs accurate records, fast reporting, role-based access, and transparent financial management.',
    ],
  },
  {
    title: 'Research Questions',
    body: [
      'How can Nokta Academy manage academic, administrative, and financial activities in one integrated system?',
      'Which functional and non-functional requirements are essential for an academy management system?',
      'How can the system improve data accuracy, reporting speed, communication, and financial transparency?',
      'How do users evaluate the usefulness, ease of use, and acceptance of the proposed system?',
    ],
  },
  {
    title: 'Research Objectives',
    body: [
      'To design and implement a web and mobile-oriented academy management system for Nokta Academy.',
      'To automate student enrollment, class and subject management, attendance, grading, notifications, and messaging.',
      'To manage fee payments, teacher payroll, tax calculation, and financial reporting.',
      'To apply role-based access control and permission management for secure system use.',
      'To evaluate user acceptance and the practical value of the system.',
    ],
  },
  {
    title: 'Scope of the Project',
    body: [
      'What the system covers: students, teachers, classes, subjects, attendance, exams, results, payments, payroll, reports, notifications, and permissions.',
      'What is excluded or limited: full AI deployment, large-scale cloud production, and external payment gateway integration are planned as future improvements.',
      'Target platform: React.js web application with mobile-ready components and backend APIs.',
    ],
  },
  {
    title: 'Methodology',
    body: [
      'SDLC model used: a hybrid methodology combining Agile Scrum with structured SDLC phases.',
      'Justification: Agile supports iterative improvement, while SDLC gives clear analysis, design, implementation, testing, and documentation steps.',
      'Project phases: problem analysis, requirement gathering, system design, database design, implementation, testing, evaluation, and final documentation.',
      'Data collection: questionnaire, workflow analysis, role analysis, and proposal review.',
    ],
  },
  {
    title: 'System Requirements',
    body: [
      'Functional requirements: login, user roles, student registration, teacher management, class and subject management, attendance, exams, results, payments, payroll, reports, notifications, and messaging.',
      'Non-functional requirements: security, usability, performance, maintainability, reliability, multilingual support, and responsive user interface.',
      'Security requirements: JWT authentication, role-based access, permission middleware, and protected API routes.',
    ],
  },
  {
    title: 'Use Case Diagram',
    body: [
      'Main actors: Super Admin, Administration, Teacher, Student, and Parent.',
      'Main use cases: manage students, classes, subjects, attendance, exams, payments, payroll, reports, messages, and permissions.',
      'Main interactions: each actor accesses only the features allowed by their role and permission keys.',
    ],
    image: { path: path.join(root, 'Monograph', 'diagrams', 'use_case_diagram.png'), x: 1.0, y: 3.25, w: 11.1, h: 3.7, name: 'Use Case Diagram' },
  },
  {
    title: 'System Architecture',
    body: [
      'High-level system design: layered architecture with user interface, API layer, business logic, database layer, security layer, and reporting layer.',
      'Frontend technologies: React.js, dashboards, forms, tables, charts, and multilingual interface.',
      'Backend technologies: Node.js, Express.js, REST APIs, validation, services, middleware, and reporting logic.',
      'Database and APIs: MongoDB with Mongoose models and protected API endpoints.',
    ],
    image: { path: path.join(root, 'Monograph', 'diagrams', 'system_architecture.png'), x: 1.0, y: 3.25, w: 11.1, h: 3.6, name: 'System Architecture' },
  },
  {
    title: 'Database Design',
    body: [
      'ERD: the database connects academic, financial, communication, and reporting data.',
      'Main entities: User, Student, TeacherProfile, Class, Subject, Payment, SalaryRecord, Attendance, ExamResult, and NotificationMessage.',
      'Relationships: MongoDB ObjectId references connect students with classes, subjects, teachers, payments, attendance, and results.',
    ],
    image: { path: path.join(root, 'Monograph', 'diagrams', 'database_erd.png'), x: 1.0, y: 3.25, w: 11.1, h: 3.7, name: 'Database ERD' },
  },
  {
    title: 'UI/UX Design',
    body: [
      'Sample wireframes or prototypes: role-based dashboards, student forms, teacher screens, payment screens, attendance pages, report views, and notification views.',
      'Design tools used: implementation-driven interface design using React components and reusable UI patterns.',
      'Principles followed: consistency, simplicity, readability, responsive layout, multilingual support, clear navigation, and fast access to common tasks.',
    ],
  },
  {
    title: 'Implementation',
    body: [
      'Screenshots or demo modules: student management, class and subject management, attendance, exams, payments, payroll, reports, messages, and dashboards.',
      'Technology stack: React.js, Node.js, Express.js, MongoDB, Mongoose, JWT, REST APIs, and chart/report components.',
      'Feature walkthrough: users log in, access role-based dashboards, manage records, process academic and financial operations, and generate reports.',
    ],
  },
  {
    title: 'Testing',
    body: [
      'Types of testing performed: unit testing, integration testing, system testing, validation testing, and user evaluation.',
      'Tools used: backend validation scripts, frontend checks, API testing, manual workflow testing, and user feedback forms.',
      'Results or feedback summary: key workflows such as login, permissions, payments, payroll, attendance, reports, and dashboards were verified.',
    ],
  },
  {
    title: 'Challenges and Solutions',
    body: [
      'Challenge: scattered academic and financial information. Solution: centralized data models and structured APIs.',
      'Challenge: different roles and access levels. Solution: role-based access control and permission keys.',
      'Challenge: payroll, commission, and tax calculation. Solution: dedicated payroll service and traceable calculation rules.',
      'Challenge: usability for different users. Solution: simple dashboards, multilingual interface, and responsive layouts.',
    ],
  },
  {
    title: 'Project Evaluation',
    body: [
      'How success was measured: questionnaire results, workflow coverage, functional completion, usability feedback, and system acceptance.',
      'Metrics or user feedback: from 100 stakeholders, 75 valid responses were selected; 64 respondents approved the project.',
      'Acceptance result: 85.33% approval rate.',
      'Lessons learned: real users need simple navigation, accurate data, secure access, and fast reporting more than decorative features.',
    ],
    image: { path: path.join(root, 'Monograph', 'diagrams', 'project_acceptance_chart.png'), x: 1.3, y: 3.4, w: 4.7, h: 2.6, name: 'Project Acceptance Chart' },
  },
  {
    title: 'Future Work',
    body: [
      'Suggested improvements: AI-based student performance analysis and early warning for academic risk.',
      'Features to add later: complete mobile application, parent portal improvements, SMS/WhatsApp/email notifications, and advanced analytics dashboards.',
      'Deployment plans: cloud deployment, automated backup, audit logs, production monitoring, and secure public access.',
    ],
  },
  {
    title: 'Conclusion',
    body: [
      'Summary of achievements: NAMS provides an integrated system for academic, administrative, financial, communication, and reporting workflows.',
      'Key takeaway: the system reduces manual work, improves data accuracy, increases financial transparency, and supports better decision-making.',
      'Project value: it offers a practical digital transformation model for private academies in Afghanistan.',
    ],
  },
  {
    title: 'References',
    body: [
      'Pressman, R. S., & Maxim, B. R. (2020). Software Engineering: A Practitioner’s Approach.',
      'Sommerville, I. (2016). Software Engineering.',
      'Bass, L., Clements, P., & Kazman, R. (2012). Software Architecture in Practice.',
      'Davis, F. D. (1989). Perceived usefulness, perceived ease of use, and user acceptance of information technology.',
      'ISO/IEC 25010:2011 and ISO/IEC/IEEE 29148:2018.',
      'Aldowah et al. (2019), Romero & Ventura (2020), DeLone & McLean (2003).',
    ],
  },
  {
    title: 'Q&A',
    body: [
      'Thank you for your attention.',
      'We are ready to answer your questions.',
    ],
  },
];

async function main() {
  const zip = await JSZip.loadAsync(fs.readFileSync(templatePath));
  await ensurePngContentType(zip);

  for (let i = 0; i < slides.length; i += 1) {
    const slideNumber = i + 1;
    const slideFile = `ppt/slides/slide${slideNumber}.xml`;
    let xml = await zip.file(slideFile).async('string');
    xml = replaceShapeText(xml, slides[i].title, slides[i].body);
    if (slideNumber === 1) xml = removeTemplatePlaceholders(xml);
    zip.file(slideFile, xml);
  }

  for (let i = 0; i < slides.length; i += 1) {
    if (slides[i].image && fs.existsSync(slides[i].image.path)) {
      await addImageToSlide(zip, i + 1, slides[i].image.path, slides[i].image);
    }
  }

  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
  fs.writeFileSync(outputPath, buffer);
  console.log(`Wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
