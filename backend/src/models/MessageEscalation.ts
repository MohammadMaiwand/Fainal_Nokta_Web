import mongoose from 'mongoose';
import { createBaseSchema } from '../utils/schema';

const messageEscalationSchema = createBaseSchema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', required: true, index: true },
    rootMessageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null, index: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    senderRole: { type: String, default: '', trim: true },
    senderName: { type: String, default: '', trim: true },
    responsibleUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    responsibleRole: { type: String, default: '', trim: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    unansweredCount: { type: Number, required: true, min: 1 },
    firstUnansweredAt: { type: Date, required: true },
    latestUnansweredAt: { type: Date, required: true },
    waitingDurationMinutes: { type: Number, default: 0 },
    priority: { type: String, enum: ['MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM', index: true },
    status: {
      type: String,
      enum: ['open', 'acknowledged', 'assigned', 'resolved', 'dismissed'],
      default: 'open',
      index: true
    },
    messagePreview: { type: String, default: '', trim: true, maxlength: 280 },
    alertKey: { type: String, default: 'intelligence.unanswered_message_alert', trim: true },
    alertData: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    acknowledgedAt: { type: Date, default: null },
    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assignedAt: { type: Date, default: null },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolutionNote: { type: String, default: '', trim: true },
    internalNote: { type: String, default: '', trim: true },
    ruleVersion: { type: Number, default: 1 }
  },
  { collection: 'message_escalations' }
);

messageEscalationSchema.index({ conversationId: 1, status: 1 });
messageEscalationSchema.index({ branchId: 1, status: 1, priority: 1, createdAt: -1 });
messageEscalationSchema.index({ responsibleUserId: 1, status: 1 });

export const MessageEscalation =
  mongoose.models.MessageEscalation ?? mongoose.model('MessageEscalation', messageEscalationSchema);
