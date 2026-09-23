import mongoose from 'mongoose';
import { createBaseSchema } from '../utils/schema';

const learningRecommendationSchema = createBaseSchema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    analysisId: { type: mongoose.Schema.Types.ObjectId, ref: 'AIResultInsight', default: null, index: true },
    resultId: { type: mongoose.Schema.Types.ObjectId, ref: 'Result', default: null, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null, index: true },
    resourceType: {
      type: String,
      enum: ['course', 'subject', 'lesson', 'chapter', 'book', 'exercise', 'assignment', 'quiz', 'video', 'document', 'learning_resource'],
      required: true,
      index: true
    },
    resourceId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    resourceTitle: { type: String, default: '', trim: true },
    resourceUrl: { type: String, default: '', trim: true },
    score: { type: Number, default: 0, index: true },
    reason: { type: String, default: '', trim: true },
    reasonKey: { type: String, default: '', trim: true },
    reasonData: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard', 'advanced', 'foundational', ''], default: '' },
    language: { type: String, enum: ['en', 'fa', 'ps', 'multilingual', ''], default: '' },
    offlineAvailable: { type: Boolean, default: false, index: true },
    behavior: { type: String, enum: ['advanced', 'enrichment', 'reinforce', 'remedial', ''], default: '' },
    status: {
      type: String,
      enum: ['active', 'assigned', 'dismissed', 'completed', 'hidden'],
      default: 'active',
      index: true
    },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assignedAt: { type: Date, default: null },
    dismissedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    dismissedAt: { type: Date, default: null },
    teacherNote: { type: String, default: '', trim: true },
    ruleVersion: { type: Number, default: 1 },
    source: { type: String, enum: ['automatic', 'teacher'], default: 'automatic' }
  },
  { collection: 'learning_recommendations' }
);

learningRecommendationSchema.index({ studentId: 1, status: 1, score: -1 });
learningRecommendationSchema.index({ analysisId: 1, resourceType: 1, resourceId: 1 });

export const LearningRecommendation =
  mongoose.models.LearningRecommendation ?? mongoose.model('LearningRecommendation', learningRecommendationSchema);
