import { useMemo, Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { formatJalaliDate } from '@/utils/date';
import type { ExamQuestion, ExamRecord, PrintMode } from '../services/examsService';
import { buildExamPrintSerial, detectTextDirection } from '../utils/textDirection';
import { ExamPaperHeader } from './ExamPaperHeader';

type ExamPrintSheetProps = {
  exam: ExamRecord;
  questions: ExamQuestion[];
  mode: PrintMode;
  printedBy?: string;
  academyName?: string;
};

function OptionBox({ checked }: { checked?: boolean }) {
  return (
    <span className={`exam-print-box ${checked ? 'is-correct' : ''}`} aria-hidden="true">
      {checked ? '✓' : ''}
    </span>
  );
}

export function ExamPrintSheet({ exam, questions, mode, printedBy = '', academyName }: ExamPrintSheetProps) {
  const { t, i18n } = useTranslation();
  const brand = academyName || t('common.home_brand');
  const serial = useMemo(
    () => buildExamPrintSerial(exam._id, exam.examCode, exam.referenceCode),
    [exam._id, exam.examCode, exam.referenceCode]
  );
  const printedAt = formatJalaliDate(new Date(), i18n.resolvedLanguage);
  const firstMcqIndex = questions.findIndex((item) => item.type === 'mcq');
  const firstTrueFalseIndex = questions.findIndex((item) => item.type === 'true_false');

  return (
    <article className="exam-print-sheet text-slate-900" data-print-root="exam-paper">
      <ExamPaperHeader exam={exam} mode={mode} academyName={brand} printedBy={printedBy} showBlanks />

      <section className="worksheet-print-shell exam-print-questions-shell border border-slate-300 bg-white p-4 print:rounded-none print:border print:bg-white print:p-3">
        <h2 className="exam-print-section-title mb-3 text-start text-lg font-bold text-slate-900">
          {t('exams.questions')}
        </h2>

        <div className="exam-print-questions">
          {questions.length === 0 && <p className="exam-print-empty">{t('exams.no_questions')}</p>}
          {questions.map((q, index) => {
            const dir = detectTextDirection(
              [q.text, ...(q.options || []).map((o) => o.text)].filter(Boolean).join(' ')
            );
            const qNum = index + 1;

            return (
              <Fragment key={q._id || `${qNum}`}>
                {index === firstMcqIndex ? (
                  <p className="exam-print-select-note exam-print-group-hint">{t('exams.select_one_mcq')}</p>
                ) : null}
                {index === firstTrueFalseIndex ? (
                  <p className="exam-print-select-note exam-print-group-hint">{t('exams.select_one_true_false')}</p>
                ) : null}

                <div
                  className="exam-print-question"
                  dir={dir}
                  data-text-dir={dir}
                  style={{ textAlign: dir === 'rtl' ? 'right' : 'left' }}
                >
                  <p className="exam-print-question-text">
                    <span className="exam-print-qnum" dir="ltr">
                      {qNum}.
                    </span>{' '}
                    {q.text}{' '}
                    <span className="exam-print-marks" dir="ltr">
                      ({q.marks} {t('exams.marks')})
                    </span>
                  </p>

                  {q.type === 'mcq' && (
                    <div className="exam-print-options-inline" dir={dir}>
                      {(q.options || []).map((opt) => {
                        const optDir = detectTextDirection(opt.text);
                        const showCorrect = mode === 'answer_key' && Boolean(opt.isCorrect);
                        return (
                          <span key={opt.key || opt.text} className="exam-print-option-inline" dir={optDir}>
                            <OptionBox checked={showCorrect} />
                            <span className="exam-print-option-key" dir="ltr">
                              {opt.key}.
                            </span>
                            <span className="exam-print-option-text">{opt.text}</span>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {q.type === 'true_false' && (
                    <div className="exam-print-options-inline" dir={dir}>
                      {(['true', 'false'] as const).map((value) => {
                        const showCorrect = mode === 'answer_key' && String(q.correctAnswer) === value;
                        return (
                          <span key={value} className="exam-print-option-inline">
                            <OptionBox checked={showCorrect} />
                            <span>{t(`exams.${value}`)}</span>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {(q.type === 'descriptive' || q.type === 'essay' || q.type === 'short_answer') && (
                    <>
                      {mode === 'answer_key' && q.expectedAnswer ? (
                        <p className="exam-print-answer-key" dir={detectTextDirection(q.expectedAnswer)}>
                          {t('exams.expected_answer')}: {q.expectedAnswer}
                        </p>
                      ) : null}
                      {(mode === 'with_space' || mode === 'student') && (
                        <div className={`exam-print-answer-space ${q.type === 'descriptive' ? 'tall' : ''}`} />
                      )}
                    </>
                  )}

                  {mode === 'with_space'
                    && q.type !== 'descriptive'
                    && q.type !== 'essay'
                    && q.type !== 'short_answer'
                    && q.type !== 'mcq'
                    && q.type !== 'true_false' && (
                    <div className="exam-print-answer-space short" />
                  )}
                </div>
              </Fragment>
            );
          })}
        </div>
      </section>

      <footer className="exam-print-running-footer" aria-hidden="false">
        <div className="exam-print-footer-inner">
          <span>
            {t('exams.print_serial')}: <strong dir="ltr">{serial}</strong>
          </span>
          <span>
            {t('exams.page')}: <span className="exam-print-page-counter" />
          </span>
          <span>{brand}</span>
          <span>
            {t('print.printed_at')}: {printedAt}
          </span>
          <span>
            {t('print.printed_by')}: {printedBy || '—'}
          </span>
        </div>
      </footer>
    </article>
  );
}
