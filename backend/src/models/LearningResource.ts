import mongoose from 'mongoose';
import { createBaseSchema } from '../utils/schema';

const learningResourceSchema = createBaseSchema(
  {
    title: { type: String, required: true, trim: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null, index: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', default: null, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    type: { type: String, enum: ['document', 'video', 'link', 'assignment', 'book'], default: 'document' },
    accessRoles: [{ type: String, trim: true }],
    url: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true },
    published: { type: Boolean, default: true },
    offlineAvailable: { type: Boolean, default: false, index: true },
    localFilePath: { type: String, default: '', trim: true },
    downloadStatus: {
      type: String,
      enum: ['not_downloaded', 'downloaded', 'requires_internet', 'available_offline'],
      default: 'requires_internet',
      index: true
    },
    fileSize: { type: Number, default: 0, min: 0 },
    language: { type: String, enum: ['en', 'fa', 'ps', 'multilingual', ''], default: 'multilingual' },
    contentVersion: { type: String, default: '1', trim: true },
    checksum: { type: String, default: '', trim: true },
    requiredAppVersion: { type: String, default: '', trim: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard', 'foundational', 'advanced', ''], default: '' },
    topic: { type: String, default: '', trim: true, index: true },
    lastContentUpdateAt: { type: Date, default: null }
  },
  { collection: 'learning_resources' }
);

learningResourceSchema.index({ classId: 1, subjectId: 1, published: 1 });

export const LearningResource = mongoose.models.LearningResource ?? mongoose.model('LearningResource', learningResourceSchema);
