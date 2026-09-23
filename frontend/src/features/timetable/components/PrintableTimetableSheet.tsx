import type { TFunction } from 'i18next';
import type { TimetablePrintSheet } from '@/features/timetable/services/timetableService';
import { LinearBarcode } from '@/shared/print/LinearBarcode';

const printDays = [
  { value: 6, labelKey: 'common.saturday', fallback: 'شنبه' },
  { value: 0, labelKey: 'common.sunday', fallback: 'یک‌شنبه' },
  { value: 1, labelKey: 'common.monday', fallback: 'دوشنبه' },
  { value: 2, labelKey: 'common.tuesday', fallback: 'سه‌شنبه' },
  { value: 3, labelKey: 'common.wednesday', fallback: 'چهارشنبه' },
  { value: 4, labelKey: 'common.thursday', fallback: 'پنج‌شنبه' }
];

interface PrintableTimetableSheetProps {
  sheet: TimetablePrintSheet;
  t: TFunction;
  serialNumber?: string;
  printedBy?: string;
}

interface PrintableTimetableSummaryProps {
  sheets: TimetablePrintSheet[];
  t: TFunction;
}

interface PrintableTimetableAllClassesProps {
  sheets: TimetablePrintSheet[];
  t: TFunction;
  serialNumber?: string;
  printedBy?: string;
}

export function PrintableTimetableSheet({ sheet, t, serialNumber, printedBy }: PrintableTimetableSheetProps) {
  const branchName = sheet.branchInfo?.name || t('common.academy', { defaultValue: 'Nokta Academy' });
  const className = sheet.classInfo.name || t('common.class', { defaultValue: 'صنف' });
  const dayGroups = printDays.map((day) => ({
    ...day,
    entries: sheet.entries
      .filter((entry) => Number(entry.dayOfWeek) === day.value)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  }));

  return (
    <section className="timetable-print-sheet" dir="rtl">
      <div className="timetable-document-header">
        <div className="timetable-document-brand"><span className="timetable-document-logo">N</span>{t('common.timetable', { defaultValue: 'تقسیم اوقات درسی' })}</div>
        <div className="timetable-document-serial">
          <LinearBarcode value={serialNumber || 'TIM-PENDING'} />
          <span>{serialNumber || 'در انتظار ایجاد سریال'}</span>
        </div>
        <div className="timetable-document-meta">چاپ‌کننده: {printedBy || '—'}<br />صفحه: ۱</div>
      </div>
      <table className="official-timetable-table">
        <thead>
          <tr>
            <th colSpan={7} className="sheet-main-title">{branchName}</th>
          </tr>
          <tr>
            <th colSpan={7} className="sheet-sub-title">{t('common.timetable', { defaultValue: 'تقسیم اوقات درسی' })}</th>
          </tr>
          <tr>
            <th colSpan={7} className="sheet-meta">
              {t('common.class', { defaultValue: 'صنف' })}: {className}
              {sheet.classInfo.code ? ` | ${t('common.code', { defaultValue: 'کود' })}: ${sheet.classInfo.code}` : ''}
              {sheet.classInfo.level ? ` | ${t('common.level', { defaultValue: 'سطح' })}: ${sheet.classInfo.level}` : ''}
              {sheet.classInfo.capacity ? ` | ${t('common.capacity', { defaultValue: 'ظرفیت' })}: ${sheet.classInfo.capacity}` : ''}
              {sheet.semester ? ` | ${t('common.semester', { defaultValue: 'سمستر' })}: ${sheet.semester}` : ''}
              {sheet.academicYear ? ` | ${t('common.academic_year', { defaultValue: 'سال تعلیمی' })}: ${sheet.academicYear}` : ''}
              {sheet.branchInfo?.city || sheet.branchInfo?.name ? ` | ${t('common.branch', { defaultValue: 'نمایندگی' })}: ${sheet.branchInfo?.city || sheet.branchInfo?.name}` : ''}
            </th>
          </tr>
          <tr>
            <th className="day-heading">{t('common.day', { defaultValue: 'روز هفته' })}</th>
            <th className="time-heading">{t('common.time', { defaultValue: 'ساعت' })}</th>
            <th>{t('common.subject', { defaultValue: 'مضمون' })}</th>
            <th>{t('common.teacher', { defaultValue: 'استاد' })}</th>
            <th>{t('common.class', { defaultValue: 'صنف' })}</th>
            <th>{t('common.start_time', { defaultValue: 'شروع' })}</th>
            <th>{t('common.end_time', { defaultValue: 'ختم' })}</th>
          </tr>
        </thead>
        <tbody>
          {dayGroups.flatMap((day) => {
            if (!day.entries.length) {
              return (
                <tr key={`empty-${day.value}`}>
                  <th className="day-cell">{t(day.labelKey, { defaultValue: day.fallback })}</th>
                  <td colSpan={6} className="timetable-empty-day-cell">{t('common.no_data', { defaultValue: 'درس ثبت نشده است' })}</td>
                </tr>
              );
            }
            return day.entries.map((entry, index) => (
              <tr key={entry._id}>
                {index === 0 ? <th rowSpan={day.entries.length} className="day-cell timetable-vertical-day">{t(day.labelKey, { defaultValue: day.fallback })}</th> : null}
                <td className="timetable-period-cell">{index + 1}</td>
                <td className="lesson-cell"><strong>{entry.subjectName}</strong></td>
                <td>{entry.teacherName || '—'}</td>
                <td>{entry.className || className}</td>
                <td dir="ltr">{entry.startTime}</td>
                <td dir="ltr">{entry.endTime}</td>
              </tr>
            ));
          })}
        </tbody>
      </table>
    </section>
  );
}

export function PrintableTimetableSummary({ sheets, t }: PrintableTimetableSummaryProps) {
  const totalEntries = sheets.reduce((sum, sheet) => sum + sheet.entries.length, 0);

  return (
    <section className="timetable-print-sheet timetable-summary-sheet" dir="rtl">
      <table className="official-timetable-table summary-table">
        <thead>
          <tr>
            <th colSpan={6} className="sheet-main-title">{t('common.timetable_summary', { defaultValue: 'خلاصه تقسیم اوقات' })}</th>
          </tr>
          <tr>
            <th colSpan={6} className="sheet-meta">
              {t('common.total_classes', { defaultValue: 'مجموع صنف‌ها' })}: {sheets.length}
              {' | '}
              {t('common.total', { defaultValue: 'مجموع' })}: {totalEntries}
            </th>
          </tr>
          <tr>
            <th>{t('common.class', { defaultValue: 'صنف' })}</th>
            <th>{t('common.code', { defaultValue: 'کود' })}</th>
            <th>{t('common.branch', { defaultValue: 'نمایندگی' })}</th>
            <th>{t('common.academic_year', { defaultValue: 'سال تعلیمی' })}</th>
            <th>{t('common.semester', { defaultValue: 'سمستر' })}</th>
            <th>{t('common.timetable_item', { defaultValue: 'درس‌ها' })}</th>
          </tr>
        </thead>
        <tbody>
          {sheets.map((sheet) => (
            <tr key={sheet.classInfo._id}>
              <td>{sheet.classInfo.name}</td>
              <td>{sheet.classInfo.code}</td>
              <td>{sheet.branchInfo?.name || sheet.branchInfo?.city}</td>
              <td>{sheet.academicYear}</td>
              <td>{sheet.semester}</td>
              <td>{sheet.entries.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function PrintableTimetableAllClasses({ sheets, t, serialNumber, printedBy }: PrintableTimetableAllClassesProps) {
  const rows = sheets
    .flatMap((sheet) =>
      sheet.entries.map((entry) => ({
        ...entry,
        className: entry.className || sheet.classInfo.name,
        dayOfWeek: Number(entry.dayOfWeek)
      }))
    )
    .sort((a, b) => {
      const dayOrder = printDays.findIndex((day) => day.value === a.dayOfWeek) - printDays.findIndex((day) => day.value === b.dayOfWeek);
      return dayOrder || a.startTime.localeCompare(b.startTime) || a.className.localeCompare(b.className);
    });

  return (
    <section className="timetable-all-classes-sheet" dir="rtl">
      <div className="timetable-document-header">
        <div className="timetable-document-brand"><span className="timetable-document-logo">N</span>{t('common.timetable', { defaultValue: 'تقسیم اوقات درسی' })}</div>
        <div className="timetable-document-serial">
          <LinearBarcode value={serialNumber || 'TIM-PENDING'} />
          <span>{serialNumber || 'در انتظار ایجاد سریال'}</span>
        </div>
        <div className="timetable-document-meta">چاپ‌کننده: {printedBy || '—'}<br />{t('common.all_classes', { defaultValue: 'همه صنف‌ها' })}</div>
      </div>
      <table className="official-timetable-table timetable-all-classes-table">
        <thead>
          <tr>
            <th>{t('common.day', { defaultValue: 'روز' })}</th>
            <th>{t('common.time', { defaultValue: 'وقت' })}</th>
            <th>{t('common.class', { defaultValue: 'صنف' })}</th>
            <th>{t('common.subject', { defaultValue: 'مضمون' })}</th>
            <th>{t('common.teacher', { defaultValue: 'استاد' })}</th>
            <th>{t('common.room', { defaultValue: 'اتاق' })}</th>
          </tr>
        </thead>
        <tbody>
          {printDays.flatMap((day) => {
            const dayRows = rows.filter((entry) => entry.dayOfWeek === day.value);
            if (!dayRows.length) {
              return (
                <tr key={`empty-${day.value}`}>
                  <td className="day-cell">{t(day.labelKey, { defaultValue: day.fallback })}</td>
                  <td colSpan={5} className="timetable-empty-day-cell">{t('common.no_data', { defaultValue: 'درس ثبت نشده است' })}</td>
                </tr>
              );
            }
            return dayRows.map((entry) => (
              <tr key={`${entry._id}-${entry.dayOfWeek}`}>
                <td className="day-cell">{t(day.labelKey, { defaultValue: day.fallback })}</td>
                <td dir="ltr">{entry.startTime} - {entry.endTime}</td>
                <td>{entry.className}</td>
                <td>{entry.subjectName}</td>
                <td>{entry.teacherName}</td>
                <td>{entry.room || '—'}</td>
              </tr>
            ));
          })}
        </tbody>
      </table>
      <p className="timetable-page-number" aria-label="شماره صفحه" />
    </section>
  );
}
