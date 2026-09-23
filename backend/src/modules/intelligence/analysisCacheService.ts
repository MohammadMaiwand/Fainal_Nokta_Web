import { AnalysisCache } from '../../models/AnalysisCache';

export async function getCachedAnalysis(params: {
  analysisType: string;
  entityType: string;
  entityId: string;
  language?: string;
  userScope?: string;
}) {
  const cached = await AnalysisCache.findOne({
    analysisType: params.analysisType,
    entityType: params.entityType,
    entityId: params.entityId,
    language: params.language || '',
    userScope: params.userScope || '',
    isDeleted: false
  }).lean<any>();

  if (!cached) return null;
  if (cached.expiresAt && new Date(cached.expiresAt).getTime() < Date.now()) {
    return { ...cached, stale: true };
  }
  return { ...cached, stale: false };
}

export async function setCachedAnalysis(params: {
  analysisType: string;
  entityType: string;
  entityId: string;
  ruleVersion: number;
  inputDataVersion?: string;
  payload: Record<string, unknown>;
  language?: string;
  branchId?: string | null;
  userScope?: string;
  cacheDurationMinutes: number;
}) {
  const expiresAt = new Date(Date.now() + Math.max(1, params.cacheDurationMinutes) * 60 * 1000);
  return AnalysisCache.findOneAndUpdate(
    {
      analysisType: params.analysisType,
      entityType: params.entityType,
      entityId: params.entityId,
      language: params.language || '',
      userScope: params.userScope || ''
    },
    {
      $set: {
        ruleVersion: params.ruleVersion,
        inputDataVersion: params.inputDataVersion || '',
        payload: params.payload,
        branchId: params.branchId ?? null,
        generatedAt: new Date(),
        expiresAt,
        staleAt: null,
        isDeleted: false
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
}

export async function invalidateAnalysisCache(params: {
  analysisType?: string;
  entityType?: string;
  entityId?: string;
}) {
  const filter: Record<string, unknown> = { isDeleted: false };
  if (params.analysisType) filter.analysisType = params.analysisType;
  if (params.entityType) filter.entityType = params.entityType;
  if (params.entityId) filter.entityId = params.entityId;
  return AnalysisCache.updateMany(filter, { $set: { expiresAt: new Date(), staleAt: new Date() } });
}
