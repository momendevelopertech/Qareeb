import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { pusherServer } from './pusher';
import { NotificationsEventsService } from './notifications-events.service';

const ROLE_MAP = {
    imam: ['super_admin', 'full_reviewer', 'imam_reviewer'],
    halqa: ['super_admin', 'full_reviewer', 'halqa_reviewer'],
    maintenance: ['super_admin', 'full_reviewer', 'maintenance_reviewer'],
} as const;

@Injectable()
export class NotificationsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly events: NotificationsEventsService,
    ) { }

    async createForType(type: 'imam' | 'halqa' | 'maintenance', referenceId: string, title: string, message: string, createdBy?: string) {
        const roles = [...ROLE_MAP[type]];
        const recipients = await this.prisma.admin.findMany({
            where: { role: { in: roles }, isActive: true },
            select: { id: true },
        });
        if (!recipients.length) return;
        await this.prisma.notification.createMany({
            data: recipients.map((r: { id: string }) => ({
                userId: r.id,
                type,
                referenceId,
                title,
                message: createdBy ? `${message} — ${createdBy}` : message,
            })),
        });

        // Fire real-time update to role channels (non-sensitive payload)
        const payload = {
            type: `${type}_created`,
            title,
            recordId: referenceId,
            createdAt: new Date().toISOString(),
            message,
            roles,
        };

        await this.events.publish(payload);

        if (pusherServer) {
            await Promise.all(roles.map((role) => pusherServer!.trigger(
                `role-${role}`,
                'notification',
                payload,
            )));
        }
    }

    async emitAction(
        type: 'imam' | 'halqa' | 'maintenance',
        action: 'created' | 'updated' | 'approved' | 'rejected',
        referenceId: string,
        title: string,
        message: string,
    ) {
        const roles = [...ROLE_MAP[type]];
        const recipients = await this.prisma.admin.findMany({
            where: { role: { in: roles }, isActive: true },
            select: { id: true },
        });
        if (recipients.length) {
            await this.prisma.notification.createMany({
                data: recipients.map((r: { id: string }) => ({
                    userId: r.id,
                    type,
                    referenceId,
                    title,
                    message,
                })),
            });
        }
        const payload = {
            type: `${type}_${action}`,
            title,
            message,
            recordId: referenceId,
            createdAt: new Date().toISOString(),
            roles,
        };

        await this.events.publish(payload);
        if (pusherServer) {
            await Promise.all(roles.map((role) => pusherServer!.trigger(`role-${role}`, 'notification', payload)));
        }
    }

    async list(userId: string, unreadOnly = true) {
        return this.prisma.notification.findMany({
            where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
    }

    async unreadCount(userId: string) {
        return this.prisma.notification.count({ where: { userId, isRead: false } });
    }

    async markRead(userId: string, id: string) {
        const notif = await this.prisma.notification.findUnique({ where: { id } });
        if (!notif || notif.userId !== userId) throw new ForbiddenException();
        return this.prisma.notification.update({ where: { id }, data: { isRead: true } });
    }

    async markAllRead(userId: string) {
        await this.prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
        return { success: true };
    }
}
