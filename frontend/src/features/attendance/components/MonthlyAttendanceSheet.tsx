import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getHardCopyAttendanceColumns, getJalaliMonthName } from '@/features/attendance/utils/jalaliSchoolDays';
import { formatJalaliDate, formatJalaliDateLong } from '@/utils/date';
import { LinearBarcode } from '@/shared/print/LinearBarcode';

export type AttendanceSheetStudent = {
  _id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  fatherName?: string;
  studentId?: string;
  phone?: string;
  className?: string;
};

type MonthlyAttendanceSheetProps = {
  className: string;
  year: number;
  month: number;
  students: AttendanceSheetStudent[];
  /** Minimum numbered rows (blank rows padded after students). */
  minRows?: number;
  serialNumber?: string;
  blankOnly?: boolean;
};

function studentFirstName(student: AttendanceSheetStudent) {
  const first = String(student.firstName || '').trim();
  if (first) return first;
  const full = String(student.name || '').trim();
  if (!full) return '';
  return full.split(/\s+/)[0] || full;
}

export function MonthlyAttendanceSheet({
  className,
  year,
  month,
  students,
  minRows = 19,
  serialNumber,
  blankOnly = false
}: MonthlyAttendanceSheetProps) {
  const { t, i18n } = useTranslation();
  const dayColumns = useMemo(() => getHardCopyAttendanceColumns(4), []);
  const monthLabel = getJalaliMonthName(month);
  const printedAt = useMemo(() => {
    const now = new Date();
    const slash = formatJalaliDate(now, i18n.resolvedLanguage);
    const long = formatJalaliDateLong(now, i18n.resolvedLanguage);
    return { slash, long };
  }, [i18n.resolvedLanguage]);

  const rows = useMemo(() => {
    const list = blankOnly ? [] : students.map((student) => ({ ...student }));
    const pad = Math.max(0, minRows - list.length);
    for (let i = 0; i < pad; i += 1) {
      list.push({
        _id: `blank-${i}`,
        name: '',
        firstName: '',
        lastName: '',
        fatherName: '',
        studentId: '',
        phone: ''
      });
    }
    return list;
  }, [blankOnly, minRows, students]);

  return (
    <div className="attendance-hard-sheet bg-white p-2 text-black" dir="rtl">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="attendance-print-date text-right">
          {t('attendance.sheet_print_date', { defaultValue: 'تاریخ چاپ' })}: {printedAt.long || printedAt.slash}
          {printedAt.slash ? ` (${printedAt.slash})` : ''}
          <br />
          سریال ورق: {serialNumber || 'در انتظار ایجاد سریال'}
        </div>
        <LinearBarcode value={serialNumber || 'ATT-PENDING'} className="w-28" />
        <span />
      </div>

      <div className="attendance-sheet-header mb-2 grid grid-cols-3 items-center gap-2 font-bold">
        <p className="attendance-sheet-meta text-center">
          {t('attendance.sheet_year', { defaultValue: 'سال' })} ({year || '……'})
        </p>
        <p className="attendance-sheet-title text-center">
          {t('attendance.sheet_title', { defaultValue: 'حاضری صنف' })}{' '}
          {className ? (
            <span>({className})</span>
          ) : (
            <span className="attendance-handwrite-field" aria-label="نام صنف برای نوشتن دستی" />
          )}
        </p>
        <p className="attendance-sheet-meta text-center">
          {t('attendance.sheet_month', { defaultValue: 'ماه' })} ({monthLabel || '……'})
        </p>
      </div>

      <div className="overflow-x-auto table-shell">
        <table className="attendance-month-grid print-table border-collapse">
          <colgroup>
            <col className="attendance-col-num" />
            <col className="attendance-col-name" />
            <col className="attendance-col-father" />
            <col className="attendance-col-reg" />
            <col className="attendance-col-phone" />
            {dayColumns.map((day) => (
              <col key={`col-${day.key}`} className="attendance-col-day" />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th rowSpan={2} className="attendance-row-head attendance-cell-center attendance-head-label border border-black">
                <span className="attendance-row-label">{t('attendance.sheet_row', { defaultValue: 'شماره' })}</span>
              </th>
              <th colSpan={4} className="attendance-cell-center attendance-identity-title border border-black">
                {t('attendance.sheet_identity', { defaultValue: 'شهرت' })}
              </th>
              {dayColumns.map((day, index) => (
                <th
                  key={day.key}
                  rowSpan={2}
                  className="attendance-day-head attendance-cell-center border border-black"
                  style={{ backgroundColor: day.color, background: day.color }}
                  data-day-color={day.color}
                  data-day-index={index}
                >
                  <span className="attendance-day-label">{day.weekday}</span>
                </th>
              ))}
            </tr>
            <tr>
              <th className="attendance-cell-center attendance-head-label border border-black">
                {t('attendance.sheet_name', { defaultValue: 'اسم' })}
              </th>
              <th className="attendance-cell-center attendance-head-label border border-black">
                {t('attendance.sheet_father', { defaultValue: 'ولد' })}
              </th>
              <th className="attendance-cell-center attendance-head-label border border-black">
                {t('attendance.sheet_reg', { defaultValue: 'ثبت نام' })}
              </th>
              <th className="attendance-cell-center attendance-head-label border border-black">
                <span className="attendance-phone-heading">
                  {t('attendance.sheet_contact', { defaultValue: 'شماره' })}
                  <br />
                  {t('attendance.sheet_phone', { defaultValue: 'تماس' })}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((student, index) => {
              const isBlank = String(student._id).startsWith('blank-');
              return (
                <tr key={student._id} data-print-row>
                  <td className="attendance-cell-center attendance-row-number border border-black font-semibold">
                    {index + 1}
                  </td>
                  <td className="attendance-cell-center attendance-name-text border border-black whitespace-nowrap">
                    {isBlank ? '' : studentFirstName(student)}
                  </td>
                  <td className="attendance-cell-center attendance-name-text border border-black whitespace-nowrap">
                    {isBlank ? '' : student.fatherName || ''}
                  </td>
                  <td className="attendance-cell-center attendance-body-text border border-black whitespace-nowrap">
                    {isBlank ? '' : student.studentId || ''}
                  </td>
                  <td className="attendance-cell-center attendance-body-text border border-black whitespace-nowrap" dir="ltr">
                    {isBlank ? '' : student.phone || ''}
                  </td>
                  {dayColumns.map((day) => (
                    <td
                      key={`${student._id}-${day.key}`}
                      className="attendance-day-cell attendance-cell-center border border-black"
                      style={{ backgroundColor: day.color, background: day.color }}
                      data-day-color={day.color}
                    >
                      &nbsp;
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 border-t border-black pt-1 text-left text-[10px] font-semibold">صفحه ۱ از ۱</p>
    </div>
  );
}
