import mongoose from 'mongoose';
import { createBaseSchema } from '../utils/schema';

/**
 * Canonical Exam model — extended for online (Google Form) + in-person builder.
 * Legacy fields (examType midterm/final/quiz, status draft/published) remain for compatibility.
 */
const examSchema = createBaseSchema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true, maxlength: 4000 },
    instructions: { type: String, default: '', trim: true, maxlength: 8000 },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    academicYear: { type: String, default: '', trim: true },
    term: { type: String, default: '', trim: true },
    examLanguage: { type: String, enum: ['en', 'fa', 'ps', 'mixed', ''], default: '' },
    date: { type: Date, required: true },
    startTime: { type: String, default: '', match: /^$|^([01]\d|2[0-3]):[0-5]\d$/ },
    endTime: { type: String, default: '', match: /^$|^([01]\d|2[0-3]):[0-5]\d$/ },
    durationMinutes: { type: Number, default: 0, min: 0 },
    availableFrom: { type: Date, default: null },
    submissionDeadline: { type: Date, default: null },
    resultReleaseAt: { type: Date, default: null },
    room: { type: String, default: '', trim: true },
    totalMarks: { type: Number, default: 100, min: 0 },
    passingMarks: { type: Number, default: 40, min: 0 },
    // Legacy type kept for old records
    examType: { type: String, enum: ['midterm', 'final', 'quiz', 'weekly', 'monthly', 'book'], default: 'quiz' },
    // Spec categories
    category: { type: String, enum: ['weekly', 'monthly', 'book', 'midterm', 'final', 'quiz'], default: 'weekly', index: true },
    deliveryMethod: { type: String, enum: ['online', 'in_person'], default: 'online', index: true },
    bookName: { type: String, default: '', trim: true },
    chapterRange: { type: String, default: '', trim: true },
    referenceCode: { type: String, default: '', trim: true },
    examCode: { type: String, required: true, unique: true, trim: true },
    onlineExamUrl: { type: String, trim: true, default: '' },
    googleFormUrl: { type: String, trim: true, default: '' },
    googleFormEditUrl: { type: String, trim: true, default: '' },
    googleFormId: { type: String, trim: true, default: '' },
    googleResponseSheetId: { type: String, trim: true, default: '' },
    googleSyncStatus: { type: String, enum: ['none', 'pending', 'synced', 'error', 'manual'], default: 'none' },
    googleLastSyncedAt: { type: Date, default: null },
    googleLastError: { type: String, default: '', trim: true },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'published', 'active', 'completed', 'closed', 'cancelled', 'archived'],
      default: 'draft',
      index: true
    },
    isPublished: { type: Boolean, default: false, index: true },
    publishedAt: { type: Date, default: null },
    allowDraft: { type: Boolean, default: true },
    allowResume: { type: Boolean, default: true },
    allowEarlySubmit: { type: Boolean, default: true },
    allowAnswerChange: { type: Boolean, default: true },
    showResultImmediately: { type: Boolean, default: false },
    showCorrectAnswers: { type: Boolean, default: false },
    randomizeQuestions: { type: Boolean, default: false },
    randomizeOptions: { type: Boolean, default: false },
    maximumAttempts: { type: Number, default: 1, min: 1, max: 10 },
    lateSubmissionPolicy: { type: String, enum: ['deny', 'allow', 'allow_with_penalty'], default: 'deny' },
    gracePeriodMinutes: { type: Number, default: 0, min: 0 },
    accessCodeHash: { type: String, default: '', select: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    questionCount: { type: Number, default: 0, min: 0 },
    assignedStudentCount: { type: Number, default: 0, min: 0 },
    submissionCount: { type: Number, default: 0, min: 0 }
  },
  { collection: 'exams' }
);

examSchema.index({ date: 1, subject: 1 });
examSchema.index({ class: 1, status: 1 });
examSchema.index({ branchId: 1, category: 1, deliveryMethod: 1 });
examSchema.index({ teacherId: 1, status: 1, date: -1 });

export const Exam = mongoose.models.Exam ?? mongoose.model('Exam', examSchema);
