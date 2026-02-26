import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
    constructor(private readonly prisma: PrismaService) { }

    private async resolveUserName(userId: string) {
        const admin = await this.prisma.admin.findUnique({
            where: { id: userId },
            select: { email: true },
        });
        return admin?.email || userId;
    }

    private async write(params: {
        userId: string;
        entityType: string;
        entityId: string;
        action: string;
        before?: any;
        after?: any;
    }) {
        const userName = await this.resolveUserName(params.userId);
        await this.prisma.auditLog.create({
            data: {
                adminId: params.userId,
                entityType: params.entityType,
                entityId: params.entityId,
                action: params.action,
                oldData: {
                    userId: params.userId,
                    userName,
                    snapshot: params.before ?? params.after ?? null,
                },
                ...(params.before || params.after
                    ? { newData: { before: params.before ?? null, after: params.after ?? null } }
                    : {}),
            },
        });
    }

    async logCreate(userId: string, entityType: string, entityId: string, data: any) {
        await this.write({ userId, entityType, entityId, action: 'create', after: data });
    }

    async logUpdate(userId: string, entityType: string, entityId: string, before: any, after: any) {
        await this.write({ userId, entityType, entityId, action: 'update', before, after });
    }

    async logDelete(userId: string, entityType: string, entityId: string, data: any) {
        await this.write({ userId, entityType, entityId, action: 'delete', before: data });
    }

    async logApprove(userId: string, entityType: string, entityId: string, data: any) {
        await this.write({ userId, entityType, entityId, action: 'approve', after: data });
    }

    async logReject(userId: string, entityType: string, entityId: string, data: any) {
        await this.write({ userId, entityType, entityId, action: 'reject', after: data });
    }
}
