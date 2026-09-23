import mongoose from 'mongoose';
import { createBaseSchema } from '../utils/schema';

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
    selectedOptionKey: { type: String, default: '', trim: true },
    booleanAnswer: { type: Boolean, default: null },
    descriptiveAnswer: { type: String, default: '', trim: true, maxlength: 20000 },
    autoAwardedMarks: { type: Number, default: 0, min: 0 },
    manualAwardedMarks: { type: Number, default: null },
    teacherFeedback: { type: String, default: '', trim: true },
    isGraded: { type: Boolean, default: false },
    gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    gradedAt: { type: Date, default: null }
  },
  { _id: true }
);

const examSubmissionSchema = createBaseSchema(
  {
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    studentUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    studentDocId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null, index: true },
    attemptNumber: { type: Number, default: 1, min: 1 },
    status: {
      type: String,
      enum: ['draft', 'in_progress', 'submitted', 'graded', 'released', 'reopened'],
      default: 'draft',
      index: true
    },
    startedAt: { type: Date, default: Date.now },
    lastSavedAt: { type: Date, default: Date.now },
    submittedAt: { type: Date, default: null },
    openedGoogleFormAt: { type: Date, default: null },
    answers: { type: [answerSchema], default: [] },
    autoGradedMarks: { type: Number, default: 0 },
    manuallyGradedMarks: { type: Number, default: 0 },
    totalObtainedMarks: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    passed: { type: Boolean, default: false },
    gradingStatus: {
      type: String,
      enum: ['not_started', 'partial', 'complete'],
      default: 'not_started'
    },
    gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    gradedAt: { type: Date, default: null },
    resultReleasedAt: { type: Date, default: null },
    submissionReference: { type: String, default: '', trim: true, index: true },
    resultId: { type: mongoose.Schema.Types.ObjectId, ref: 'Result', default: null }
  },
  { collection: 'exam_submissions' }
);

examSubmissionSchema.index({ examId: 1, studentUserId: 1, attemptNumber: 1 }, { unique: true });
examSubmissionSchema.index({ examId: 1, status: 1 });
examSubmissionSchema.index({ studentUserId: 1, status: 1, updatedAt: -1 });

export const ExamSubmission =
  mongoose.models.ExamSubmission ?? mongoose.model('ExamSubmission', examSubmissionSchema);
