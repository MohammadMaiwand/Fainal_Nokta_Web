import type { TrendStatus } from './defaults';

export type TrendAnalysis = {
  trendStatus: TrendStatus;
  previousPercentage: number | null;
  currentPercentage: number;
  difference: number | null;
  recentAverage: number | null;
  bestPercentage: number | null;
  lowestPercentage: number | null;
  consistency: 'high' | 'medium' | 'low' | 'unknown';
};

export function toPercentage(score: number, totalMarks = 100) {
  const total = Number(totalMarks) > 0 ? Number(totalMarks) : 100;
  return Math.round((Number(score) / total) * 1000) / 10;
}

export function analyzeTrend(params: {
  currentPercentage: number;
  previousPercentages: number[];
  strongDelta: number;
  moderateDelta: number;
  minimumResults: number;
}): TrendAnalysis {
  const history = params.previousPercentages.filter((value) => Number.isFinite(value));
  if (history.length + 1 < params.minimumResults || !history.length) {
    return {
      trendStatus: 'INSUFFICIENT_DATA',
      previousPercentage: null,
      currentPercentage: params.currentPercentage,
      difference: null,
      recentAverage: history.length ? Number((history.reduce((a, b) => a + b, 0) / history.length).toFixed(1)) : null,
      bestPercentage: history.length ? Math.max(...history, params.currentPercentage) : params.currentPercentage,
      lowestPercentage: history.length ? Math.min(...history, params.currentPercentage) : params.currentPercentage,
      consistency: 'unknown'
    };
  }

  const previous = history[0];
  const difference = Number((params.currentPercentage - previous).toFixed(1));
  let trendStatus: TrendStatus = 'STABLE';
  if (difference >= params.strongDelta) trendStatus = 'STRONG_IMPROVEMENT';
  else if (difference >= params.moderateDelta) trendStatus = 'MODERATE_IMPROVEMENT';
  else if (difference <= -params.strongDelta) trendStatus = 'STRONG_DECLINE';
  else if (difference <= -params.moderateDelta) trendStatus = 'SLIGHT_DECLINE';

  const series = [params.currentPercentage, ...history];
  const mean = series.reduce((a, b) => a + b, 0) / series.length;
  const variance = series.reduce((sum, value) => sum + (value - mean) ** 2, 0) / series.length;
  const stdDev = Math.sqrt(variance);
  const consistency = stdDev <= 5 ? 'high' : stdDev <= 12 ? 'medium' : 'low';

  return {
    trendStatus,
    previousPercentage: previous,
    currentPercentage: params.currentPercentage,
    difference,
    recentAverage: Number(mean.toFixed(1)),
    bestPercentage: Math.max(...series),
    lowestPercentage: Math.min(...series),
    consistency
  };
}

export type TopicPerformance = {
  topic: string;
  earned: number;
  maximum: number;
  percentage: number;
  classification: 'strong' | 'acceptable' | 'weak' | 'critical';
};

export function analyzeTopics(params: {
  items: Array<{ topic?: string | null; earned?: number; maximum?: number }>;
  strongThreshold: number;
  acceptableThreshold: number;
  weakThreshold: number;
  criticalThreshold: number;
}): TopicPerformance[] {
  const grouped = new Map<string, { earned: number; maximum: number }>();
  for (const item of params.items) {
    const topic = String(item.topic || '').trim();
    if (!topic) continue;
    const current = grouped.get(topic) ?? { earned: 0, maximum: 0 };
    current.earned += Number(item.earned || 0);
    current.maximum += Number(item.maximum || 0);
    grouped.set(topic, current);
  }

  return Array.from(grouped.entries()).map(([topic, values]) => {
    const percentage = values.maximum > 0 ? Math.round((values.earned / values.maximum) * 1000) / 10 : 0;
    let classification: TopicPerformance['classification'] = 'acceptable';
    if (percentage >= params.strongThreshold) classification = 'strong';
    else if (percentage < params.criticalThreshold) classification = 'critical';
    else if (percentage < params.weakThreshold) classification = 'weak';
    else if (percentage < params.acceptableThreshold) classification = 'weak';
    return {
      topic,
      earned: values.earned,
      maximum: values.maximum,
      percentage,
      classification
    };
  });
}
