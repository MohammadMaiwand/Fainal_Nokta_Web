import { Notification } from '../models/Notification';
import { User } from '../models/User';
import { emailService } from './emailService';
import { smsService } from './smsService';

type DispatchChannel = 'in_app' | 'email' | 'sms';

type DispatchPayload = {
  title: string;
  message: string;
  recipientIds?: string[];
  recipientRoles?: string[];
  branchId?: string | null;
  channel?: DispatchChannel;
  recipientEmail?: string;
  recipientPhone?: string;
};

export class NotificationDispatchService {
  async send(payload: DispatchPayload) {
    const channel = payload.channel ?? 'in_app';
    if (channel === 'email') {
      const email = payload.recipientEmail ?? await this.resolveRecipientEmail(payload.recipientIds?.[0]);
      const result = await emailService.send({
        to: email ?? '',
        subject: payload.title,
        text: payload.message,
        html: `<p>${payload.message}</p>`
      });
      return { delivered: result.delivered, channel, reason: result.delivered ? undefined : (result as { reason?: string }).reason };
    }
    if (channel === 'sms') {
      const phone = payload.recipientPhone ?? await this.resolveRecipientPhone(payload.recipientIds?.[0]);
      const result = await smsService.send({ phone: phone ?? '', message: payload.message, purpose: 'notification' });
      return { delivered: result.delivered, channel, reason: result.delivered ? undefined : (result as { reason?: string }).reason };
    }

    await Notification.create({
      title: payload.title,
      description: payload.message,
      message: payload.message,
      publishStatus: 'published',
      branchId: payload.branchId ?? null,
      recipientIds: payload.recipientIds ?? [],
      recipientRoles: payload.recipientRoles ?? []
    });
    return { delivered: true, channel: 'in_app' };
  }

  private async resolveRecipientEmail(userId?: string) {
    if (!userId) return null;
    const user = await User.findById(userId).select('email').lean<{ email?: string }>();
    return user?.email ?? null;
  }

  private async resolveRecipientPhone(userId?: string) {
    if (!userId) return null;
    const user = await User.findById(userId).select('phone').lean<{ phone?: string }>();
    return user?.phone ?? null;
  }
}
