import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatJalaliDate } from '@/utils/date';
import { LinearBarcode } from '@/shared/print/LinearBarcode';
import type { ExamRecord, PrintMode } from '../services/examsService';
import { buildExamPrintSerial, detectTextDirection } from '../utils/textDirection';

type ExamPaperHeaderProps = {
  exam: ExamRecord;
  mode?: PrintMode | 'take';
  printedBy?: string;
  academyName?: string;
  /** When taking online, show student identity instead of blank lines */
  studentName?: string;
  studentId?: string;
  fatherName?: string;
  showBlanks?: boolean;
};

function blankLine(width = '7rem') {
  return (
    <span
      className="exam-print-blank inline-block border-b border-slate-800 align-bottom"
      style={{ minWidth: width, height: '1.05em' }}
    />
  );
}

export function ExamPaperHeader({
  exam,
  mode = 'student',
  printedBy = '',
  academyName,
  studentName,
  studentId,
  fatherName,
  showBlanks = true
}: ExamPaperHeaderProps) {
  const { t, i18n } = useTranslation();
  const brand = academyName || t('common.home_brand');
  const serial = useMemo(
    () => buildExamPrintSerial(exam._id, exam.examCode, exam.referenceCode),
    [exam._id, exam.examCode, exam.referenceCode]
  );
  const examDate = exam.date ? formatJalaliDate(exam.date, i18n.resolvedLanguage) : '—';
  const printedAt = formatJalaliDate(new Date(), i18n.resolvedLanguage);
  const categoryKey = `exams.category_${exam.category || 'weekly'}`;
  const modeLabel =
    mode === 'answer_key'
      ? t('exams.answer_key')
      : mode === 'with_space'
        ? t('exams.with_space')
        : mode === 'take'
          ? t('exams.student_paper')
          : t('exams.student_paper');

  const totalMarks = exam.totalMarks ?? '—';

  // 3-column order: subject → teacher → category, then date → duration → marks, etc.
  // Class (صنف) is intentionally omitted from the paper header.
  const metaCells: Array<{ label: string; value: string }> = [
    { label: t('exams.subject'), value: exam.subjectName || '—' },
    { label: t('exams.teacher'), value: exam.teacherName || '—' },
    { label: t('exams.category'), value: t(categoryKey) },
    { label: t('exams.date'), value: examDate },
    { label: t('exams.duration'), value: exam.durationMinutes ? String(exam.durationMinutes) : '—' },
    { label: t('exams.total_marks'), value: String(totalMarks) },
    { label: t('exams.passing_marks'), value: String(exam.passingMarks ?? '—') }
  ];
  if (exam.room) metaCells.push({ label: t('exams.room'), value: exam.room });
  if (exam.academicYear) metaCells.push({ label: t('exams.academic_year'), value: exam.academicYear });
  if (exam.category === 'book' && exam.bookName) {
    metaCells.push({
      label: t('exams.book_name'),
      value: exam.chapterRange ? `${exam.bookName} (${exam.chapterRange})` : exam.bookName
    });
  }

  return (
    <header className="exam-print-header">
      {/* Same official header line as academy financial report */}
      <div className="academy-financial-print-header exam-print-header-banner border border-slate-300 bg-white p-3 text-slate-900">
        <div className="academy-financial-header-grid">
          <div className="academy-financial-header-title flex items-center gap-2">
            <div className="academy-financial-print-logo" aria-label={brand}>
              N
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">{brand}</h1>
              <p className="text-[11px] text-slate-600">
                {t('exams.print_document_label')} | {modeLabel}
              </p>
            </div>
          </div>
          <div className="academy-financial-header-serial text-[11px] text-slate-700">
            <LinearBarcode value={serial} />
            <div className="academy-financial-serial-text">
              <p>{t('exams.print_serial')}</p>
              <p dir="ltr">{serial}</p>
            </div>
          </div>
          <div className="academy-financial-header-meta text-[11px] text-slate-700">
            <span>
              {t('finance.print_date')}: {printedAt}
            </span>
            <span>
              {t('print.printed_by')}: {printedBy || '—'}
            </span>
          </div>
        </div>
      </div>

      {exam.title ? <h2 className="exam-print-title">{exam.title}</h2> : null}

      <div className="exam-print-meta-grid">
        {metaCells.map((cell) => (
          <div key={cell.label}>
            <span>{cell.label}</span>
            <strong>{cell.value}</strong>
          </div>
        ))}
      </div>

      {(exam.instructions || exam.description) && (
        <div className="exam-print-instructions" dir={detectTextDirection(exam.instructions || exam.description)}>
          <strong>{t('exams.instructions')}:</strong>{' '}
          <span>{exam.instructions || exam.description}</span>
        </div>
      )}

      <div className="exam-print-student-row" dir="auto">
        <span className="exam-print-student-field">
          {t('exams.student_name')}:{' '}
          {showBlanks && !studentName ? blankLine('8rem') : <strong>{studentName || '—'}</strong>}
        </span>
        <span className="exam-print-student-field">
          {t('exams.father_name')}:{' '}
          {showBlanks && !fatherName ? blankLine('8rem') : <strong>{fatherName || '—'}</strong>}
        </span>
        <span className="exam-print-student-field">
          {t('exams.student_id')}:{' '}
          {showBlanks && !studentId ? blankLine('5.5rem') : <strong dir="ltr">{studentId || '—'}</strong>}
        </span>
        <span className="exam-print-student-field">
          {t('exams.signature')}: {showBlanks ? blankLine('6.5rem') : <strong>—</strong>}
        </span>
      </div>
    </header>
  );
}
