import mongoose from 'mongoose';
import { createBaseSchema } from '../utils/schema';

const optionSchema = new mongoose.Schema(
  {
    key: { type: String, enum: ['A', 'B', 'C', 'D', 'true', 'false'], required: true },
    text: { type: String, trim: true, default: '' },
    isCorrect: { type: Boolean, default: false }
  },
  { _id: true }
);

const questionSchema = createBaseSchema(
  {
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    questionOrder: { type: Number, default: 1, min: 1, index: true },
    text: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['mcq', 'true_false', 'descriptive', 'short_answer', 'essay'],
      default: 'mcq',
      index: true
    },
    options: { type: [optionSchema], default: [] },
    // Legacy flat options still accepted on write and normalized
    correctAnswer: { type: mongoose.Schema.Types.Mixed, default: null },
    expectedAnswer: { type: String, default: '', trim: true },
    answerLengthHint: { type: String, default: '', trim: true },
    explanation: { type: String, default: '', trim: true },
    marks: { type: Number, default: 1, min: 0 },
    isRequired: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    topic: { type: String, trim: true, default: '', index: true },
    chapter: { type: String, trim: true, default: '' },
    lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Curriculum', default: null, index: true },
    learningOutcome: { type: String, trim: true, default: '' },
    skill: { type: String, trim: true, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { collection: 'questions' }
);

questionSchema.index({ examId: 1, questionOrder: 1 });
questionSchema.index({ examId: 1, subjectId: 1 });

export const Question = mongoose.models.Question ?? mongoose.model('Question', questionSchema);
