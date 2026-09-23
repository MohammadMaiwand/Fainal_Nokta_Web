import { IntelligenceSettings } from '../../models/IntelligenceSettings';
import {
  DEFAULT_INTELLIGENCE_SETTINGS,
  DEFAULT_RESULT_BANDS,
  type ResultBandCode
} from './defaults';

export type IntelligenceSettingsDoc = typeof DEFAULT_INTELLIGENCE_SETTINGS & {
  _id?: string;
  branchId?: string | null;
  ruleVersion: number;
};

export async function getIntelligenceSettings(branchId?: string | null): Promise<IntelligenceSettingsDoc> {
  const filter: Record<string, unknown> = { isDeleted: false };
  if (branchId) {
    filter.branchId = branchId;
  } else {
    filter.$or = [{ branchId: null }, { branchId: { $exists: false } }];
  }

  let settings = await IntelligenceSettings.findOne(filter).lean<any>();
  if (!settings && branchId) {
    settings = await IntelligenceSettings.findOne({
      isDeleted: false,
      $or: [{ branchId: null }, { branchId: { $exists: false } }]
    }).lean<any>();
  }

  if (!settings) {
    return { ...DEFAULT_INTELLIGENCE_SETTINGS, resultBands: [...DEFAULT_RESULT_BANDS] };
  }

  return {
    ...DEFAULT_INTELLIGENCE_SETTINGS,
    ...settings,
    resultBands: Array.isArray(settings.resultBands) && settings.resultBands.length
      ? settings.resultBands
      : [...DEFAULT_RESULT_BANDS],
    recommendationWeights: {
      ...DEFAULT_INTELLIGENCE_SETTINGS.recommendationWeights,
      ...(settings.recommendationWeights || {})
    }
  };
}

export function classifyResultBand(
  percentage: number,
  bands = DEFAULT_RESULT_BANDS
): (typeof DEFAULT_RESULT_BANDS)[number] {
  const active = bands.filter((band) => band.active !== false).sort((a, b) => b.minPercentage - a.minPercentage);
  const match = active.find((band) => percentage >= band.minPercentage && percentage <= band.maxPercentage);
  if (match) return match;
  return active[active.length - 1] ?? DEFAULT_RESULT_BANDS[DEFAULT_RESULT_BANDS.length - 1];
}

export function bandCodeFromPercentage(percentage: number, bands = DEFAULT_RESULT_BANDS): ResultBandCode {
  return classifyResultBand(percentage, bands).code;
}

export async function upsertIntelligenceSettings(params: {
  branchId?: string | null;
  patch: Record<string, unknown>;
  actorId?: string | null;
}) {
  const current = await getIntelligenceSettings(params.branchId ?? null);
  const nextVersion = Number(current.ruleVersion || 1) + 1;
  const filter = params.branchId
    ? { branchId: params.branchId, isDeleted: false }
    : { $or: [{ branchId: null }, { branchId: { $exists: false } }], isDeleted: false };

  return IntelligenceSettings.findOneAndUpdate(
    filter,
    {
      $set: {
        ...params.patch,
        ruleVersion: nextVersion,
        updatedBy: params.actorId ?? null,
        branchId: params.branchId ?? null
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
}
