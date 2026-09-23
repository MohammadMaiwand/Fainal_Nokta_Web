import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const out = resolve(process.cwd(), 'ERD');
mkdirSync(out, { recursive: true });

// The schema source of truth is backend/src/models and modules/enterprise/enterprise.models.ts.
// Fields intentionally list identifiers, business keys, and all ObjectId references.
const groups = {
  'Identity & organization': [
    ['User', 'users', 'email UQ; role; branchId?→Branch; familyId?→Family; parentProfileId?→Parent; ownerProfileId?→Owner; classId?→Class; subjectId?→Subject; assignedTeacherId?→User; assignedSubjects[]→Subject; assignedClasses[]→Class'],
    ['SessionToken', 'session_tokens', 'userId→User; tokenHash UQ; revokedBy?→User'],
    ['Role', 'roles', 'key UQ; slug UQ; permissionKeys[]'],
    ['Permission', 'permissions', 'key UQ; module; action; UQ(module,action)'],
    ['AuditLog', 'audit_logs', 'actor→User; branchId?→Branch; action; metadata'],
    ['Branch', 'branches', 'code UQ; ownerId?→Owner; managerId?→User; deleteRequestedBy?→User; ownerDeleteApprovedBy?→User'],
    ['Owner', 'owners', 'userId UQ→User; branchIds[]→Branch'],
    ['Teacher', 'teachers', 'userId UQ→User; branchId?→Branch; teacherCode UQ; assignedSubjectIds[]→Subject; assignedClassIds[]→Class'],
    ['Parent', 'parents', 'userId UQ→User; branchId?→Branch; linkedStudentIds[]→Student'],
    ['Student', 'students', 'studentId UQ; rollNo UQ?; branchId?→Branch; classId→Class; subjectId→Subject; teacherId→User; familyId→Family; parentProfileId?→Parent'],
    ['Family', 'families', 'guardianEmail; students[]→Student'],
    ['FamilyLink', 'family_links', 'parentId→Parent; studentId→Student; UQ(parentId,studentId)']
  ],
  'Academic delivery': [
    ['Class', 'classes', 'classCode UQ; subjectId?→Subject; teacherId?→User; branchId?→Branch; assignedSubjects[]→Subject; assignedTeachers[]→User'],
    ['Subject', 'subjects', 'code UQ; branchId?→Branch; classId→Class; classIds[]→Class; teacher?→User'],
    ['Course', 'courses', 'branchId?→Branch; linkedClassId?→Class; instructor?→User; teacher?→User; subjects[]→Subject; createdBy?→User; updatedBy?→User'],
    ['Curriculum', 'curricula', 'branchId?→Branch; classId?→Class; subjectId?→Subject'],
    ['Enrollment', 'enrollments', 'studentId→Student; classId→Class; subjectId→Subject; teacherId→User; branchId?→Branch; UQ(studentId,classId,subjectId,academicYear)'],
    ['Timetable', 'timetable', 'branchId?→Branch; classId→Class; subjectId?→Subject; teacherId→User'],
    ['LearningResource', 'learning_resources', 'subjectId?→Subject; classId?→Class; branchId?→Branch; uploadedBy?→User'],
    ['Attendance', 'attendance', 'classId→Class; teacherId→User; studentId?→Student; userId?→User; timetableId?→Timetable; subjectId?→Subject; branchId?→Branch; policyId?→AttendancePolicy; markedBy?→User'],
    ['AttendancePolicy', 'attendance_policies', 'branchId?→Branch'],
    ['Book', 'books', 'branchId?→Branch'],
    ['StationerySale', 'stationery_sales', 'branchId?→Branch; bookId?→Book; studentId?→User; soldBy?→User']
  ],
  'Assessment & AI': [
    ['Exam', 'exams', 'examCode UQ; branchId?→Branch; subject→Subject; class→Class; teacherId→User'],
    ['Question', 'questions', 'examId→Exam; subjectId→Subject'],
    ['Result', 'results', 'student→User; exam→Exam; classId?→Class; subjectId?→Subject; teacherId?→User; gradedBy?→User; UQ(student,exam)'],
    ['ExamResult', 'exam_results', 'studentId→Student; examId→Exam; subjectId→Subject; publishedBy?→User; UQ(studentId,examId)'],
    ['AIResultInsight', 'ai_result_insights', 'studentId→User; examId→Exam; classId→Class; branchId?→Branch; subjectId?→Subject; resultId?→Result; UQ(studentId,examId)'],
    ['AIClassExamInsight', 'ai_class_exam_insights', 'examId→Exam; classId→Class; branchId?→Branch; UQ(examId,classId)'],
    ['EnterpriseTranscript', 'enterprise_transcripts', 'branchId?→Branch; studentId→Student; subjects[].subjectId→Subject; verificationCode UQ?'],
    ['EnterpriseOnlineExam', 'enterprise_online_exams', 'branchId?→Branch; classId→Class; subjectId→Subject; teacherId→User'],
    ['EnterpriseExamAttempt', 'enterprise_exam_attempts', 'examId→EnterpriseOnlineExam; studentId→Student; UQ(examId,studentId)'],
    ['EnterpriseAssignment', 'enterprise_assignments', 'branchId?→Branch; classId→Class; subjectId→Subject; teacherId→User'],
    ['EnterpriseAssignmentSubmission', 'enterprise_assignment_submissions', 'assignmentId→EnterpriseAssignment; studentId→Student; gradedBy?→User; UQ(assignmentId,studentId)'],
    ['EnterpriseCertificate', 'enterprise_certificates', 'branchId?→Branch; studentId→Student; signedBy?→User; verificationCode UQ']
  ],
  'Finance & payroll': [
    ['Payment', 'payments', 'invoiceNumber UQ; studentId?→Student; payeeUserId?→User; salaryRecordIds[]→SalaryRecord; branchId?→Branch; enrollmentId?→Enrollment; classId?→Class; subjectId?→Subject; teacherId?→User; collectedBy?→User'],
    ['Expense', 'expenses', 'branchId?→Branch; createdBy?→User'],
    ['FinanceEntry', 'finance_entries', 'branchId?→Branch; createdBy?→User'],
    ['Salary', 'salaries', 'employeeId→User; branchId?→Branch; paidBy?→User; approvedBy?→User; UQ(employeeId,monthKey)'],
    ['SalaryRecord', 'salary_records', 'userId→User; branchId?→Branch; createdBy?→User; UQ(userId,hijriYear,hijriMonth)'],
    ['SalarySetting', 'salary_settings', 'userId→User; branchId?→Branch; createdBy?→User; updatedBy?→User'],
    ['SalaryTransaction', 'salarytransactions', 'teacherId→User; studentId→Student; courseId?→Course; subjectId→Subject; classId→Class; branchId?→Branch; paymentId?→Payment; createdBy?→User; deletedBy?→User'],
    ['TaxRule', 'tax_rules', 'scope; thresholds; active'],
    ['TaxPercentageSetting', 'tax_percentage_settings', 'branchId?→Branch; createdBy?→User; updatedBy?→User']
  ],
  'Communication & operations': [
    ['Message', 'messages', 'senderId?→User; recipientId?→User; studentId?→Student; teacherId?→User; branchId?→Branch; parentMessageId?→Message; threadId?→Message'],
    ['StudentMessage', 'student_messages', 'branchId?→Branch; studentId→User; teacherId→User'],
    ['Notification', 'notifications', 'branchId?→Branch; classId?→Class; subjectId?→Subject; teacherId?→User; recipientIds[]→User; readBy[]→User'],
    ['Announcement', 'announcements', 'branchId?→Branch; publishedBy?→User'],
    ['Advertisement', 'advertisements', 'branchId?→Branch'],
    ['QrContact', 'qr_contacts', 'userId?→User; branchId?→Branch'],
    ['Report', 'reports', 'branchId?→Branch; generatedBy?→User'],
    ['LanguageSetting', 'language_settings', 'userId?→User; branchId?→Branch'],
    ['EnterpriseBackup', 'enterprise_backups', 'requestedBy?→User'],
    ['EnterpriseSecurityEvent', 'enterprise_security_events', 'userId?→User; type; riskScore']
  ]
};

const esc = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const cards = [];
let y = 140;
for (const [group, entities] of Object.entries(groups)) {
  const rows = Math.ceil(entities.length / 3);
  cards.push(`<text x="45" y="${y - 22}" class="group">${esc(group)}</text>`);
  entities.forEach(([name, collection, fields], index) => {
    const x = 45 + (index % 3) * 790;
    const cy = y + Math.floor(index / 3) * 180;
    const lines = fields.split('; ').map((field, line) => `<text x="${x + 18}" y="${cy + 76 + line * 17}" class="${field.includes('→') ? 'ref' : 'field'}">${esc(field)}</text>`).join('');
    cards.push(`<g><rect x="${x}" y="${cy}" width="750" height="155" rx="8" class="card"/><rect x="${x}" y="${cy}" width="750" height="47" rx="8" class="titlebar"/><text x="${x + 18}" y="${cy + 30}" class="entity">${esc(name)}</text><text x="${x + 280}" y="${cy + 30}" class="collection">[${esc(collection)}]</text><text x="${x + 18}" y="${cy + 64}" class="pk">PK  _id : ObjectId</text>${lines}</g>`);
  });
  y += rows * 180 + 56;
}

const height = y + 235;
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="2450" height="${height}" viewBox="0 0 2450 ${height}">
<style>
  text { font-family: Arial, "Segoe UI", sans-serif; fill:#172033 }
  .group { font-size:22px; font-weight:700; fill:#075985 }
  .card { fill:#fff; stroke:#94a3b8; stroke-width:1.5 }
  .titlebar { fill:#e0f2fe }
  .entity { font-size:17px; font-weight:700 }
  .collection { font-size:14px; fill:#475569 }
  .pk { font-size:13px; font-weight:700; fill:#9a3412 }
  .field { font-size:12px }
  .ref { font-size:12px; fill:#1d4ed8 }
  .note { font-size:13px; fill:#334155 }
</style>
<rect width="100%" height="100%" fill="#f8fafc"/>
<text x="45" y="48" font-size="28" font-weight="700">Nokta Academy — MongoDB/Mongoose Entity Relationship Diagram</text>
<text x="45" y="76" class="note">Reference map from application schemas • Blue: ObjectId reference • ? optional/null • [] array reference • UQ unique constraint</text>
<text x="45" y="100" class="note">Every collection has _id:ObjectId. Base-schema collections also include createdAt, updatedAt, isDeleted and deletedBy?→User; common fields are not repeated.</text>
${cards.join('\n')}
<rect x="45" y="${height - 190}" width="2360" height="145" rx="8" fill="#eff6ff" stroke="#93c5fd"/>
<text x="65" y="${height - 160}" class="group">Relationship semantics and integrity</text>
<text x="65" y="${height - 132}" class="note">A scalar ref means 0..1 or 1 parent per child (required fields omit ?); the inverse cardinality is 0..N unless unique. A [] ref represents application-managed M:N.</text>
<text x="65" y="${height - 106}" class="note">MongoDB does not enforce foreign keys or cascades. These are Mongoose references only; deletion and referential integrity must be enforced by application services.</text>
<text x="65" y="${height - 80}" class="note">Important model distinctions: Result.student, AIResultInsight.studentId, StudentMessage.studentId, and StationerySale.studentId reference User; ExamResult and most academic records reference Student.</text>
</svg>`;

writeFileSync(resolve(out, 'ERD Database.svg'), svg, 'utf8');
writeFileSync(resolve(out, 'schema-catalog.json'), JSON.stringify(groups, null, 2), 'utf8');
const mermaidEntities = Object.values(groups).flat().map(([name, collection]) =>
  `  ${name} {\n    ObjectId _id PK\n    string collection_${collection}\n  }`
);
const mermaidRelationships = [];
const relationships = [];
for (const entities of Object.values(groups)) {
  for (const [source, , fields] of entities) {
    for (const field of fields.split('; ')) {
      const match = field.match(/^([^→]+)→([A-Za-z]+)$/);
      if (!match) continue;
      const [, rawField, target] = match;
      const isArray = rawField.includes('[]');
      const isOptional = rawField.includes('?');
      mermaidRelationships.push(`  ${target} ${isArray ? '}o--o{' : isOptional ? 'o|--o{' : '||--o{'} ${source} : "${rawField}"`);
      relationships.push({ source, target, field: rawField, isArray, isOptional });
    }
  }
}
writeFileSync(resolve(out, 'ERD Database.mmd'), `erDiagram\n${mermaidEntities.join('\n')}\n\n${mermaidRelationships.join('\n')}\n`, 'utf8');

const chen = [];
const chenWidth = 5100;
const columns = 3;
const entityWidth = 1600;
let chenY = 170;
chen.push(`<text x="60" y="62" class="heading">Nokta Academy — Complete Chen Entity-Relationship Diagram</text>`);
chen.push(`<text x="60" y="98" class="subtitle">Green rectangles = entities/collections • Pink ovals = attributes • Blue diamonds = relationships • Underlined labels = primary or unique keys • ? = optional • [] = multi-valued</text>`);
chen.push(`<text x="60" y="126" class="subtitle">All base-schema entities additionally contain _id:ObjectId (PK), createdAt, updatedAt, isDeleted, deletedAt, and deletedBy?→User. MongoDB references are application-level, not enforced foreign keys.</text>`);
for (const [group, entities] of Object.entries(groups)) {
  const sectionTop = chenY;
  const rows = Math.ceil(entities.length / columns);
  const sectionHeight = rows * 430 + 110;
  chen.push(`<rect x="35" y="${sectionTop}" width="${chenWidth - 70}" height="${sectionHeight}" class="section"/>`);
  chen.push(`<text x="65" y="${sectionTop + 38}" class="sectionTitle">${esc(group)}</text>`);
  entities.forEach(([name, collection, fieldText], i) => {
    const col = i % columns;
    const row = Math.floor(i / columns);
    const x = 80 + col * entityWidth;
    const y = sectionTop + 75 + row * 430;
    const fields = fieldText.split('; ');
    const entityX = x + 555;
    const entityY = y + 165;
    chen.push(`<rect x="${entityX}" y="${entityY}" width="390" height="66" rx="3" class="entityBox"/>`);
    chen.push(`<text x="${entityX + 195}" y="${entityY + 28}" text-anchor="middle" class="entityName">${esc(name)}</text>`);
    chen.push(`<text x="${entityX + 195}" y="${entityY + 51}" text-anchor="middle" class="collectionName">[${esc(collection)}]</text>`);
    chen.push(`<line x1="${entityX + 195}" y1="${entityY}" x2="${entityX + 195}" y2="${y + 65}" class="link"/>`);
    chen.push(`<ellipse cx="${entityX + 195}" cy="${y + 47}" rx="165" ry="27" class="keyOval"/>`);
    chen.push(`<text x="${entityX + 195}" y="${y + 52}" text-anchor="middle" class="attribute keyText">_id : ObjectId (PK)</text>`);
    fields.slice(0, 10).forEach((field, f) => {
      const side = f % 2 === 0 ? -1 : 1;
      const fy = y + 275 + Math.floor(f / 2) * 62;
      const fx = entityX + 195 + side * 400;
      const ref = field.includes('→');
      chen.push(`<line x1="${entityX + (side < 0 ? 0 : 390)}" y1="${entityY + 33}" x2="${fx - side * 160}" y2="${fy}" class="link"/>`);
      chen.push(`<ellipse cx="${fx}" cy="${fy}" rx="170" ry="25" class="${ref ? 'refOval' : 'attributeOval'}"/>`);
      chen.push(`<text x="${fx}" y="${fy + 5}" text-anchor="middle" class="attribute">${esc(field)}</text>`);
    });
  });
  chenY += sectionHeight + 35;
}
const relationshipStart = chenY + 25;
const relationshipRows = Math.ceil(relationships.length / 3);
const relationshipHeight = relationshipRows * 135 + 110;
chen.push(`<rect x="35" y="${relationshipStart}" width="${chenWidth - 70}" height="${relationshipHeight}" class="relationshipSection"/>`);
chen.push(`<text x="65" y="${relationshipStart + 42}" class="sectionTitle">Relationship catalogue — every declared ObjectId reference</text>`);
relationships.forEach((rel, i) => {
  const col = i % 3;
  const row = Math.floor(i / 3);
  const x = 75 + col * 1665;
  const y = relationshipStart + 82 + row * 135;
  const cardinality = rel.isArray ? '0..N ↔ 0..N' : rel.isOptional ? '0..N ↔ 0..1' : '0..N ↔ 1';
  chen.push(`<rect x="${x}" y="${y + 27}" width="255" height="46" class="miniEntity"/><text x="${x + 127}" y="${y + 56}" text-anchor="middle" class="miniText">${esc(rel.source)}</text>`);
  chen.push(`<line x1="${x + 255}" y1="${y + 50}" x2="${x + 405}" y2="${y + 50}" class="link"/>`);
  chen.push(`<polygon points="${x + 480},${y + 12} ${x + 555},${y + 50} ${x + 480},${y + 88} ${x + 405},${y + 50}" class="relationshipDiamond"/>`);
  chen.push(`<text x="${x + 480}" y="${y + 55}" text-anchor="middle" class="relationshipText">references</text>`);
  chen.push(`<line x1="${x + 555}" y1="${y + 50}" x2="${x + 705}" y2="${y + 50}" class="link"/>`);
  chen.push(`<rect x="${x + 705}" y="${y + 27}" width="255" height="46" class="miniEntity"/><text x="${x + 832}" y="${y + 56}" text-anchor="middle" class="miniText">${esc(rel.target)}</text>`);
  chen.push(`<ellipse cx="${x + 480}" cy="${y + 112}" rx="165" ry="20" class="refOval"/><text x="${x + 480}" y="${y + 117}" text-anchor="middle" class="attribute">${esc(rel.field)} · ${cardinality}</text>`);
});
const chenHeight = relationshipStart + relationshipHeight + 55;
const chenSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${chenWidth}" height="${chenHeight}" viewBox="0 0 ${chenWidth} ${chenHeight}">
<style>
  text { font-family: Arial, "Segoe UI", sans-serif; fill:#172033 }
  .heading { font-size:32px; font-weight:700; fill:#0f172a } .subtitle { font-size:16px; fill:#334155 }
  .section { fill:#f0fdf4; stroke:#86efac; stroke-width:2 } .relationshipSection { fill:#eff6ff; stroke:#93c5fd; stroke-width:2 }
  .sectionTitle { font-size:24px; font-weight:700; fill:#166534 }
  .entityBox,.miniEntity { fill:#dcfce7; stroke:#15803d; stroke-width:2 } .entityName { font-size:20px; font-weight:700 } .collectionName { font-size:14px; fill:#475569 }
  .keyOval { fill:#fff7ed; stroke:#c2410c; stroke-width:2 } .attributeOval { fill:#fdf2f8; stroke:#db2777; stroke-width:1.5 } .refOval { fill:#eff6ff; stroke:#2563eb; stroke-width:1.5 }
  .attribute { font-size:13px } .keyText { font-weight:700; text-decoration:underline; font-size:14px } .link { stroke:#64748b; stroke-width:1.25 } .relationshipDiamond { fill:#dbeafe; stroke:#1d4ed8; stroke-width:2 } .relationshipText,.miniText { font-size:13px; font-weight:600 }
</style>
<rect width="100%" height="100%" fill="#ffffff"/>
${chen.join('\n')}
</svg>`;
writeFileSync(resolve(out, 'ERD Database Chen.svg'), chenSvg, 'utf8');
console.log(`Generated ERD Database.svg with ${Object.values(groups).flat().length} entities.`);
