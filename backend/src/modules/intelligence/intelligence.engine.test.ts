import { analyzeExamResultOffline } from './examAnalysisService';
import { classifyResultBand } from './resultBandService';
import { analyzeTrend, analyzeTopics, toPercentage } from './trendAnalysisService';
import { calculateEscalationPriority } from './messageEscalationService';
import { DEFAULT_INTELLIGENCE_SETTINGS, DEFAULT_RESULT_BANDS } from './defaults';
import { renderFeedbackMessage, renderUnansweredAlert } from './insightTemplateService';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

// Result bands
assert(classifyResultBand(95).code === 'EXCELLENT', '95% should be EXCELLENT');
assert(classifyResultBand(85).code === 'VERY_GOOD', '85% should be VERY_GOOD');
assert(classifyResultBand(75).code === 'GOOD', '75% should be GOOD');
assert(classifyResultBand(65).code === 'SATISFACTORY', '65% should be SATISFACTORY');
assert(classifyResultBand(55).code === 'NEEDS_IMPROVEMENT', '55% should be NEEDS_IMPROVEMENT');
assert(classifyResultBand(40).code === 'POOR', '40% should be POOR');

const customBands = DEFAULT_RESULT_BANDS.map((band) =>
  band.code === 'EXCELLENT' ? { ...band, minPercentage: 95 } : band
);
assert(classifyResultBand(92, customBands).code !== 'EXCELLENT', 'custom band boundary should apply');

// Trends
const strongUp = analyzeTrend({
  currentPercentage: 90,
  previousPercentages: [70],
  strongDelta: 15,
  moderateDelta: 5,
  minimumResults: 2
});
assert(strongUp.trendStatus === 'STRONG_IMPROVEMENT', 'large gain should be strong improvement');

const slightDown = analyzeTrend({
  currentPercentage: 70,
  previousPercentages: [76],
  strongDelta: 15,
  moderateDelta: 5,
  minimumResults: 2
});
assert(slightDown.trendStatus === 'SLIGHT_DECLINE', 'small drop should be slight decline');

const insufficient = analyzeTrend({
  currentPercentage: 80,
  previousPercentages: [],
  strongDelta: 15,
  moderateDelta: 5,
  minimumResults: 2
});
assert(insufficient.trendStatus === 'INSUFFICIENT_DATA', 'no history should be insufficient');

// Topics
const topics = analyzeTopics({
  items: [
    { topic: 'fractions', earned: 2, maximum: 10 },
    { topic: 'algebra', earned: 9, maximum: 10 },
    { topic: 'fractions', earned: 1, maximum: 5 }
  ],
  strongThreshold: 80,
  acceptableThreshold: 65,
  weakThreshold: 55,
  criticalThreshold: 40
});
assert(topics.find((item) => item.topic === 'algebra')?.classification === 'strong', 'algebra should be strong');
assert(topics.find((item) => item.topic === 'fractions')?.classification === 'critical' || topics.find((item) => item.topic === 'fractions')?.classification === 'weak', 'fractions should be weak/critical');

assert(toPercentage(46, 50) === 92, 'percentage conversion should work');

// Offline exam analysis
const excellent = analyzeExamResultOffline({
  result: { score: 92, grade: 'A' },
  exam: { totalMarks: 100, subject: { title: 'Mathematics' } },
  student: {},
  previousResults: [{ score: 70, totalMarks: 100 }],
  attendanceRate: 90,
  topicItems: [
    { topic: 'algebra', earned: 18, maximum: 20 },
    { topic: 'equations', earned: 19, maximum: 20 }
  ],
  settings: DEFAULT_INTELLIGENCE_SETTINGS as any,
  language: 'en'
});
assert(excellent.resultBand === 'EXCELLENT', 'excellent band expected');
assert(excellent.strongAreas.includes('algebra'), 'strong topic should be listed only with evidence');
assert(excellent.feedbackMessage.toLowerCase().includes('mathematics'), 'feedback should mention subject');
assert(excellent.detailedTrendStatus === 'STRONG_IMPROVEMENT', 'trend should be strong improvement');
assert(excellent.offlineReady === true, 'analysis must be offline ready');

const low = analyzeExamResultOffline({
  result: { score: 45, grade: 'F' },
  exam: { totalMarks: 100, subject: { title: 'Mathematics' } },
  student: {},
  previousResults: [{ score: 60, totalMarks: 100 }],
  attendanceRate: 60,
  topicItems: [{ topic: 'fractions', earned: 2, maximum: 10 }],
  settings: DEFAULT_INTELLIGENCE_SETTINGS as any,
  language: 'fa'
});
assert(low.resultBand === 'POOR', 'low score should be POOR');
assert(low.weakAreas.includes('fractions'), 'weak topic with evidence should appear');
assert(low.feedbackMessage.includes('فیصد') || low.feedbackMessage.includes('مضمون'), 'Dari feedback expected');
assert(low.riskLevel === 'high', 'low score + low attendance should be high risk');

const noTopics = analyzeExamResultOffline({
  result: { score: 88, grade: 'B' },
  exam: { totalMarks: 100, subject: { title: 'Science' } },
  student: {},
  previousResults: [],
  settings: DEFAULT_INTELLIGENCE_SETTINGS as any,
  language: 'en'
});
assert(noTopics.strongAreas.length === 0, 'must not invent strong topics without mapping');
assert(noTopics.weakAreas.length === 0, 'must not invent weak topics without mapping');

// Message escalation priority
assert(
  calculateEscalationPriority({
    unansweredCount: 3,
    waitingMinutes: 10,
    threshold: 3,
    waitingHoursHigh: 24,
    waitingHoursCritical: 72
  }) === 'MEDIUM',
  '3 unanswered => MEDIUM'
);
assert(
  calculateEscalationPriority({
    unansweredCount: 4,
    waitingMinutes: 10,
    threshold: 3,
    waitingHoursHigh: 24,
    waitingHoursCritical: 72
  }) === 'HIGH',
  '4 unanswered => HIGH'
);
assert(
  calculateEscalationPriority({
    unansweredCount: 3,
    waitingMinutes: 80 * 60,
    threshold: 3,
    waitingHoursHigh: 24,
    waitingHoursCritical: 72,
    messagePriority: 'high'
  }) === 'CRITICAL',
  'urgent/high wait => CRITICAL'
);

const alertEn = renderUnansweredAlert(3, 'en');
assert(alertEn.includes('three') || alertEn.includes('3'), 'English unanswered alert');
const alertFa = renderUnansweredAlert(3, 'fa');
assert(alertFa.includes('سه') || alertFa.includes('۳') || alertFa.includes('3'), 'Dari unanswered alert');

const feedback = renderFeedbackMessage({
  band: 'EXCELLENT',
  language: 'fa',
  subject: 'ریاضی',
  percentage: 92,
  strongTopics: ['جبر']
});
assert(feedback.includes('۹۲') || feedback.includes('92'), 'Dari excellent feedback should include score');

console.log('intelligence engine unit tests passed');
