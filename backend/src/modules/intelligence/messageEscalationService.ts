import { Message } from '../../models/Message';
import { MessageEscalation } from '../../models/MessageEscalation';
import { NotificationDispatchService } from '../../services/notificationDispatchService';
import { AuditService } from '../../services/auditService';
import { getIntelligenceSettings } from './resultBandService';
import { renderUnansweredAlert } from './insightTemplateService';

const notificationDispatch = new NotificationDispatchService();
const auditService = new AuditService();

function resolveThreadId(message: any) {
  return String(message.threadId || message.parentMessageId || message._id);
}

function isHumanSender(message: any) {
  const role = String(message.senderRole || '').toLowerCase();
  if (!role || role === 'system' || role === 'automation' || role === 'bot') return false;
  if (message.isSystem || message.automated) return false;
  return true;
}

function isResponsibleReply(message: any, conversationRoot: any) {
  if (!isHumanSender(message)) return false;
  const rootSender = String(conversationRoot.senderId || '');
  const messageSender = String(message.senderId || '');
  if (rootSender && messageSender && rootSender === messageSender) return false;
  return true;
}

export function calculateEscalationPriority(params: {
  unansweredCount: number;
  waitingMinutes: number;
  messagePriority?: string;
  threshold: number;
  waitingHoursHigh: number;
  waitingHoursCritical: number;
}) {
  const waitingHours = params.waitingMinutes / 60;
  if (
    String(params.messagePriority || '').toLowerCase() === 'high' ||
    waitingHours >= params.waitingHoursCritical ||
    params.unansweredCount >= params.threshold + 3
  ) {
    return 'CRITICAL' as const;
  }
  if (params.unansweredCount >= params.threshold + 1 || waitingHours >= params.waitingHoursHigh) {
    return 'HIGH' as const;
  }
  return 'MEDIUM' as const;
}

export async function evaluateConversationEscalation(conversationId: string, language = 'en') {
  const root = await Message.findById(conversationId).lean<any>();
  if (!root || root.isDeleted) return null;

  const threadId = resolveThreadId(root);
  const settings = await getIntelligenceSettings(root.branchId ? String(root.branchId) : null);
  const threshold = Number(settings.unansweredMessageThreshold || 3);

  const messages = await Message.find({
    isDeleted: false,
    status: { $ne: 'closed' },
    $or: [{ _id: threadId }, { threadId }, { parentMessageId: threadId }]
  })
    .sort({ createdAt: 1 })
    .lean<any[]>();

  if (!messages.length) return null;

  let consecutiveIncoming = 0;
  let firstUnansweredAt: Date | null = null;
  let latestUnansweredAt: Date | null = null;
  let lastIncoming: any = null;

  for (const message of messages) {
    if (!isHumanSender(message)) continue;
    if (isResponsibleReply(message, root)) {
      consecutiveIncoming = 0;
      firstUnansweredAt = null;
      latestUnansweredAt = null;
      lastIncoming = null;
      continue;
    }
    consecutiveIncoming += 1;
    if (!firstUnansweredAt) firstUnansweredAt = new Date(message.createdAt);
    latestUnansweredAt = new Date(message.createdAt);
    lastIncoming = message;
  }

  const openEscalation = await MessageEscalation.findOne({
    conversationId: threadId,
    status: { $in: ['open', 'acknowledged', 'assigned'] },
    isDeleted: false
  });

  if (consecutiveIncoming < threshold || !firstUnansweredAt || !latestUnansweredAt || !lastIncoming) {
    if (openEscalation) {
      openEscalation.status = 'resolved';
      openEscalation.resolvedAt = new Date();
      openEscalation.resolutionNote = 'Auto-resolved: unanswered streak cleared';
      await openEscalation.save();
    }
    return openEscalation?.toObject?.() ?? null;
  }

  const waitingDurationMinutes = Math.max(
    0,
    Math.round((latestUnansweredAt.getTime() - firstUnansweredAt.getTime()) / 60000)
  );
  const priority = calculateEscalationPriority({
    unansweredCount: consecutiveIncoming,
    waitingMinutes: waitingDurationMinutes,
    messagePriority: lastIncoming.priority,
    threshold,
    waitingHoursHigh: settings.messageWaitingHoursHigh,
    waitingHoursCritical: settings.messageWaitingHoursCritical
  });

  const alertText = renderUnansweredAlert(consecutiveIncoming, language);
  const payload = {
    conversationId: threadId,
    rootMessageId: root._id,
    senderId: lastIncoming.senderId ?? root.senderId ?? null,
    senderRole: lastIncoming.senderRole || root.senderRole || '',
    senderName: lastIncoming.senderName || root.senderName || '',
    responsibleUserId: root.recipientId || root.teacherId || null,
    responsibleRole: root.recipientRole || '',
    branchId: root.branchId ?? null,
    unansweredCount: consecutiveIncoming,
    firstUnansweredAt,
    latestUnansweredAt,
    waitingDurationMinutes,
    priority,
    status: openEscalation?.status || 'open',
    messagePreview: String(lastIncoming.body || '').slice(0, 280),
    alertKey: 'intelligence.unanswered_message_alert',
    alertData: { count: consecutiveIncoming, text: alertText },
    ruleVersion: settings.ruleVersion
  };

  const escalation = await MessageEscalation.findOneAndUpdate(
    {
      conversationId: threadId,
      status: { $in: ['open', 'acknowledged', 'assigned'] },
      isDeleted: false
    },
    { $set: payload },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean<any>();

  if (!openEscalation) {
    await auditService.recordAction({
      actorId: 'system',
      branchId: root.branchId ? String(root.branchId) : null,
      action: 'MESSAGE_ESCALATION_CREATED',
      target: String(threadId),
      targetType: 'message_escalation',
      severity: priority === 'CRITICAL' ? 'critical' : 'warning',
      metadata: { unansweredCount: consecutiveIncoming, priority }
    });

    const recipientIds = [payload.responsibleUserId].filter(Boolean).map(String);
    if (recipientIds.length) {
      await notificationDispatch.send({
        title: 'Unanswered message alert',
        message: alertText,
        recipientIds,
        recipientRoles: ['admin', 'branch_manager', 'teacher', 'super_admin']
      });
    }
  }

  return escalation;
}

export async function evaluateMessageEscalationsForBranch(branchId?: string | null) {
  const filter: Record<string, unknown> = {
    isDeleted: false,
    status: { $in: ['unread', 'read'] },
    parentMessageId: null
  };
  if (branchId) filter.branchId = branchId;

  const roots = await Message.find(filter).sort({ updatedAt: -1 }).limit(40).select('_id').lean<any[]>();
  const results = [];
  for (const root of roots) {
    const escalation = await evaluateConversationEscalation(String(root._id));
    if (escalation && ['open', 'acknowledged', 'assigned'].includes(escalation.status)) {
      results.push(escalation);
    }
  }
  return results;
}

export async function resolveEscalationOnReply(messageId: string, actorId?: string | null) {
  const message = await Message.findById(messageId).lean<any>();
  if (!message) return null;
  const threadId = resolveThreadId(message);
  return evaluateConversationEscalation(threadId);
}

export async function acknowledgeEscalation(id: string, actorId: string) {
  return MessageEscalation.findOneAndUpdate(
    { _id: id, isDeleted: false },
    {
      $set: {
        status: 'acknowledged',
        acknowledgedAt: new Date(),
        acknowledgedBy: actorId
      }
    },
    { new: true }
  ).lean();
}

export async function assignEscalation(id: string, actorId: string, responsibleUserId: string) {
  return MessageEscalation.findOneAndUpdate(
    { _id: id, isDeleted: false },
    {
      $set: {
        status: 'assigned',
        responsibleUserId,
        assignedAt: new Date(),
        assignedBy: actorId
      }
    },
    { new: true }
  ).lean();
}

export async function resolveEscalation(id: string, actorId: string, note = '') {
  return MessageEscalation.findOneAndUpdate(
    { _id: id, isDeleted: false },
    {
      $set: {
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: actorId,
        resolutionNote: note
      }
    },
    { new: true }
  ).lean();
}
