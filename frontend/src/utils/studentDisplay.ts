function text(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return '';
}

function objectText(value: any, keys: string[]) {
  if (!value || typeof value !== 'object') return '';
  for (const key of keys) {
    const found = text(value[key]);
    if (found) return found;
  }
  return '';
}

function enrollment(item: any) {
  return item?.latestEnrollment ?? item?.enrollment ?? item?.activeEnrollment ?? {};
}

export function getStudentNumber(student: any) {
  return text(student?.studentDisplay?.studentNumber, student?.studentNumber, student?.rollNo, student?.studentId, student?.idNumber);
}

export function getStudentFullName(student: any) {
  return text(student?.studentDisplay?.fullName, student?.fullName, student?.name, [student?.firstName, student?.lastName].filter(Boolean).join(' '));
}

export function getClassName(student: any) {
  const activeEnrollment = enrollment(student);
  return text(
    student?.studentDisplay?.className,
    student?.className,
    objectText(student?.classId, ['className', 'name', 'title']),
    objectText(student?.class, ['className', 'name', 'title']),
    objectText(activeEnrollment?.classId, ['className', 'name', 'title']),
    activeEnrollment?.className
  );
}

export function getSubjectName(student: any) {
  const activeEnrollment = enrollment(student);
  return text(
    student?.studentDisplay?.subjectName,
    student?.subjectName,
    objectText(student?.subjectId, ['title', 'name']),
    objectText(student?.subject, ['title', 'name']),
    objectText(activeEnrollment?.subjectId, ['title', 'name']),
    activeEnrollment?.subjectName
  );
}

export function getTeacherName(student: any) {
  const activeEnrollment = enrollment(student);
  return text(
    student?.studentDisplay?.teacherName,
    student?.teacherName,
    objectText(student?.teacherId, ['name']),
    objectText(student?.teacher, ['name']),
    objectText(activeEnrollment?.teacherId, ['name']),
    activeEnrollment?.teacherName
  );
}

export function getGuardianPhone(student: any) {
  return text(
    student?.studentDisplay?.guardianPhone,
    student?.guardianPhone,
    student?.familyPhone,
    student?.parentProfileId?.guardianPhone,
    student?.familyId?.guardianPhone,
    student?.parent?.guardianPhone
  );
}

export function getStudentPhone(student: any) {
  return text(student?.studentDisplay?.studentPhone, student?.studentPhone, student?.phone, student?.whatsapp, student?.familyPhone);
}

export function getBranchName(student: any) {
  const activeEnrollment = enrollment(student);
  return text(
    student?.studentDisplay?.branchName,
    student?.branchName,
    objectText(student?.branchId, ['name', 'code', 'city']),
    objectText(activeEnrollment?.branchId, ['name', 'code', 'city'])
  );
}

export function getEnrollmentStatus(student: any) {
  const activeEnrollment = enrollment(student);
  return text(student?.studentDisplay?.enrollmentStatus, student?.enrollmentStatus, activeEnrollment?.status, student?.status, student?.accountStatus);
}
