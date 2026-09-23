import type { ResultBandCode, TrendStatus, ConfidenceLevel } from './defaults';

type TemplateLang = 'en' | 'fa' | 'ps';

const FEEDBACK: Record<ResultBandCode, Record<TemplateLang, string>> = {
  EXCELLENT: {
    en: 'Your result in {{subject}} was excellent. You achieved {{percentage}}%. {{strongTopics}} Continue this progress by studying the recommended advanced materials.',
    fa: 'نتیجه شما در مضمون {{subject}} عالی بوده است. شما {{percentage}} فیصد نمره به‌دست آورده‌اید. {{strongTopics}} برای ادامه پیشرفت، منابع پیشرفته پیشنهادی را مطالعه کنید.',
    ps: 'ستاسو پایله په {{subject}} کې غوره وه. تاسو {{percentage}}٪ نمرې ترلاسه کړې. {{strongTopics}} د پرمختګ د دوام لپاره وړاندیز شوي پرمختللي مواد ولولئ.'
  },
  VERY_GOOD: {
    en: 'Your result in {{subject}} was very good at {{percentage}}%. {{strongTopics}} Keep building on this strength with the next recommended lessons.',
    fa: 'نتیجه شما در مضمون {{subject}} بسیار خوب بوده و {{percentage}} فیصد است. {{strongTopics}} با درس‌های پیشنهادی بعدی این پیشرفت را ادامه دهید.',
    ps: 'ستاسو پایله په {{subject}} کې ډیره ښه وه او {{percentage}}٪ ده. {{strongTopics}} د راتلونکو وړاندیز شویو درسونو سره دا پرمختګ ته دوام ورکړئ.'
  },
  GOOD: {
    en: 'You achieved a good result in {{subject}} ({{percentage}}%). Stay consistent with weekly practice and the recommended enrichment materials.',
    fa: 'نتیجه خوب در مضمون {{subject}} به‌دست آوردید ({{percentage}} فیصد). تمرین هفتگی و منابع تقویتی پیشنهادی را ادامه دهید.',
    ps: 'تاسو په {{subject}} کې ښه پایله ترلاسه کړه ({{percentage}}٪). اونیز تمرین او وړاندیز شوي تقویتی مواد ته دوام ورکړئ.'
  },
  SATISFACTORY: {
    en: 'Your result in {{subject}} is satisfactory at {{percentage}}%. Focus on the suggested revision lessons to strengthen weaker areas.',
    fa: 'نتیجه شما در مضمون {{subject}} رضایت‌بخش و {{percentage}} فیصد است. روی درس‌های مروری پیشنهادی برای تقویت نقاط ضعیف تمرکز کنید.',
    ps: 'ستاسو پایله په {{subject}} کې قناعت‌بخښونکې ده او {{percentage}}٪ ده. د کمزورو برخو د پیاوړتیا لپاره وړاندیز شوي تکراري درسونو ته پام وکړئ.'
  },
  NEEDS_IMPROVEMENT: {
    en: 'Your current result in {{subject}} ({{percentage}}%) shows that some topics need more practice. {{weakTopics}} Review the recommended lessons and exercises, and ask your teacher for help when needed.',
    fa: 'نتیجه فعلی در مضمون {{subject}} ({{percentage}} فیصد) نشان می‌دهد که بعضی موضوعات به تمرین بیشتر نیاز دارد. {{weakTopics}} درس‌ها، تمرین‌ها و منابع پیشنهادی را مرور کنید و در صورت نیاز از استاد خود کمک بخواهید.',
    ps: 'اوسنۍ پایله په {{subject}} کې ({{percentage}}٪) ښيي چې ځینې موضوعات نورو تمرین ته اړتیا لري. {{weakTopics}} وړاندیز شوي درسونه او تمرینونه بیا وګورئ او که اړتیا وي له خپل ښوونکي څخه مرسته وغواړئ.'
  },
  POOR: {
    en: 'Your result in {{subject}} ({{percentage}}%) needs focused support. {{weakTopics}} Start with the foundational recommended materials and speak with your teacher about a short recovery plan.',
    fa: 'نتیجه شما در مضمون {{subject}} ({{percentage}} فیصد) به حمایت متمرکز نیاز دارد. {{weakTopics}} از منابع پایه‌ای پیشنهادی شروع کنید و با استاد خود درباره برنامه کوتاه بازیابی صحبت کنید.',
    ps: 'ستاسو پایله په {{subject}} کې ({{percentage}}٪) متمرکز ملاتړ ته اړتیا لري. {{weakTopics}} له وړاندیز شوي بنسټیزو موادو څخه پیل وکړئ او له خپل ښوونکي سره د لنډ رغونې پلان په اړه خبرې وکړئ.'
  }
};

const TREND_TEXT: Record<TrendStatus, Record<TemplateLang, string>> = {
  STRONG_IMPROVEMENT: {
    en: 'Strong improvement of {{difference}} percentage points compared with your previous comparable result.',
    fa: 'بهبود قوی به اندازه {{difference}} فیصد نسبت به نتیجه قابل‌مقایسه قبلی.',
    ps: 'د پخوانۍ پرتله‌کېدونکې پایلې په پرتله د {{difference}} فیصدي قوي پرمختګ.'
  },
  MODERATE_IMPROVEMENT: {
    en: 'Moderate improvement of {{difference}} percentage points compared with your previous comparable result.',
    fa: 'بهبود متوسط به اندازه {{difference}} فیصد نسبت به نتیجه قبلی قابل‌مقایسه.',
    ps: 'د پخوانۍ پرتله‌کېدونکې پایلې په پرتله د {{difference}} فیصدي منځنی پرمختګ.'
  },
  STABLE: {
    en: 'Your recent results are stable around your current level.',
    fa: 'نتایج اخیر شما در سطح فعلی پایدار است.',
    ps: 'ستاسو وروستۍ پایلې په اوسني کچه ثابتې دي.'
  },
  SLIGHT_DECLINE: {
    en: 'A slight decline of {{difference}} percentage points was detected compared with your previous result.',
    fa: 'کاهش خفیف به اندازه {{difference}} فیصد نسبت به نتیجه قبلی مشاهده شد.',
    ps: 'د پخوانۍ پایلې په پرتله د {{difference}} فیصدي لږ کموالی لیدل شوی.'
  },
  STRONG_DECLINE: {
    en: 'A strong decline of {{difference}} percentage points was detected. Extra revision is recommended.',
    fa: 'کاهش قوی به اندازه {{difference}} فیصد مشاهده شد. مرور بیشتر پیشنهاد می‌شود.',
    ps: 'د {{difference}} فیصدي قوي کموالی لیدل شوی. زیات تکرار وړاندیز کېږي.'
  },
  INSUFFICIENT_DATA: {
    en: 'There is not enough comparable history to determine a reliable trend.',
    fa: 'تاریخچه قابل‌مقایسه کافی برای تعیین روند معتبر وجود ندارد.',
    ps: 'د باوري رجحان د ټاکلو لپاره کافي پرتله‌کېدونکی تاریخچه نشته.'
  }
};

const ALERTS = {
  unanswered: {
    en: 'This user has sent {{count}} messages and has not received a reply.',
    fa: 'این استفاده‌کننده {{count}} پیام ارسال کرده است، اما هنوز پاسخی دریافت نکرده است.',
    ps: 'دې کارن {{count}} پیغامونه لیږلي دي، خو تر اوسه ځواب نه دی ترلاسه کړی.'
  },
  offline: {
    en: 'Offline information — last updated {{timestamp}}.',
    fa: 'اطلاعات آفلاین — آخرین به‌روزرسانی {{timestamp}}.',
    ps: 'آفلاین معلومات — وروستی تازه والی {{timestamp}}.'
  },
  insufficient: {
    en: 'There is not enough information to generate a reliable analysis.',
    fa: 'اطلاعات کافی برای تولید تحلیل معتبر وجود ندارد.',
    ps: 'د باوري تحلیل د جوړولو لپاره کافي معلومات نشته.'
  }
};

function applyTemplate(template: string, data: Record<string, string | number | undefined>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = data[key];
    return value === undefined || value === null ? '' : String(value);
  }).replace(/\s+/g, ' ').trim();
}

export function renderFeedbackMessage(params: {
  band: ResultBandCode;
  language?: string;
  subject: string;
  percentage: number;
  strongTopics?: string[];
  weakTopics?: string[];
}) {
  const lang = (['en', 'fa', 'ps'].includes(String(params.language)) ? params.language : 'en') as TemplateLang;
  const strongTopics = params.strongTopics?.length
    ? lang === 'en'
      ? `Your strongest topics were ${params.strongTopics.join(', ')}.`
      : lang === 'fa'
        ? `قوی‌ترین موضوعات شما ${params.strongTopics.join('، ')} بودند.`
        : `ستاسو پیاوړي موضوعات ${params.strongTopics.join('، ')} وو.`
    : '';
  const weakTopics = params.weakTopics?.length
    ? lang === 'en'
      ? `Areas needing revision: ${params.weakTopics.join(', ')}.`
      : lang === 'fa'
        ? `موضوعات نیازمند تمرین: ${params.weakTopics.join('، ')}.`
        : `تمرین ته اړتیا لرونکي موضوعات: ${params.weakTopics.join('، ')}.`
    : '';

  return applyTemplate(FEEDBACK[params.band][lang], {
    subject: params.subject,
    percentage: params.percentage,
    strongTopics,
    weakTopics
  });
}

export function renderTrendMessage(params: {
  trend: TrendStatus;
  language?: string;
  difference?: number;
}) {
  const lang = (['en', 'fa', 'ps'].includes(String(params.language)) ? params.language : 'en') as TemplateLang;
  return applyTemplate(TREND_TEXT[params.trend][lang], {
    difference: Math.abs(Number(params.difference ?? 0))
  });
}

export function renderUnansweredAlert(count: number, language?: string) {
  const lang = (['en', 'fa', 'ps'].includes(String(language)) ? language : 'en') as TemplateLang;
  return applyTemplate(ALERTS.unanswered[lang], { count });
}

export function renderOfflineStatus(timestamp: string, language?: string) {
  const lang = (['en', 'fa', 'ps'].includes(String(language)) ? language : 'en') as TemplateLang;
  return applyTemplate(ALERTS.offline[lang], { timestamp });
}

export function renderInsufficientData(language?: string) {
  const lang = (['en', 'fa', 'ps'].includes(String(language)) ? language : 'en') as TemplateLang;
  return ALERTS.insufficient[lang];
}

export function confidenceFromEvidence(params: {
  historyCount: number;
  hasTopicMapping: boolean;
  hasAttendance: boolean;
  minimumForTrend: number;
}): ConfidenceLevel {
  let score = 0;
  if (params.historyCount >= params.minimumForTrend) score += 2;
  else if (params.historyCount >= 1) score += 1;
  if (params.hasTopicMapping) score += 2;
  if (params.hasAttendance) score += 1;
  if (score >= 4) return 'HIGH';
  if (score >= 2) return 'MEDIUM';
  if (score >= 1) return 'LOW';
  return 'INSUFFICIENT_DATA';
}
