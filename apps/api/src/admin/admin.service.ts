import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
    constructor(private readonly prisma: PrismaService) { }

    async getDashboardStats() {
        // Pending counts
        const [pendingImams, pendingHalaqat, pendingMaintenance] = await Promise.all([
            this.prisma.imam.count({ where: { status: 'pending' } }),
            this.prisma.halqa.count({ where: { status: 'pending' } }),
            this.prisma.maintenanceRequest.count({ where: { status: 'pending' } }),
        ]);

        // Total counts
        const [totalImams, totalHalaqat, totalMaintenance] = await Promise.all([
            this.prisma.imam.count(),
            this.prisma.halqa.count(),
            this.prisma.maintenanceRequest.count(),
        ]);

        // By governorate — aggregate across all entities
        const imamsByGov = await this.prisma.imam.groupBy({
            by: ['governorate'],
            _count: { id: true },
            where: { status: 'approved' },
        });

        const byGovernorate = imamsByGov.map((g: { governorate: string; _count: { id: number } }) => ({
            name: g.governorate,
            count: g._count.id,
        }));

        // Last 30 days submissions
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentImams = await this.prisma.imam.findMany({
            where: { createdAt: { gte: thirtyDaysAgo } },
            select: { createdAt: true },
        });

        const recentHalaqat = await this.prisma.halqa.findMany({
            where: { createdAt: { gte: thirtyDaysAgo } },
            select: { createdAt: true },
        });

        const recentMaintenance = await this.prisma.maintenanceRequest.findMany({
            where: { createdAt: { gte: thirtyDaysAgo } },
            select: { createdAt: true },
        });

        // Group by date
        const dateMap = new Map<string, number>();
        [...recentImams, ...recentHalaqat, ...recentMaintenance].forEach((item) => {
            const date = item.createdAt.toISOString().split('T')[0];
            dateMap.set(date, (dateMap.get(date) || 0) + 1);
        });

        const last30Days = Array.from(dateMap.entries())
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // Maintenance type breakdown
        const allMaintenance = await this.prisma.maintenanceRequest.findMany({
            where: { status: 'approved' },
            select: { maintenanceTypes: true },
        });

        const typeMap = new Map<string, number>();
        allMaintenance.forEach((m: { maintenanceTypes: string[] }) => {
            m.maintenanceTypes.forEach((t: string) => {
                typeMap.set(t, (typeMap.get(t) || 0) + 1);
            });
        });

        const maintenanceTypeBreakdown = Array.from(typeMap.entries())
            .map(([type, count]) => ({ type, count }));

        return {
            pending: { imams: pendingImams, halaqat: pendingHalaqat, maintenance: pendingMaintenance },
            total: { imams: totalImams, halaqat: totalHalaqat, maintenance: totalMaintenance },
            byGovernorate,
            last30Days,
            maintenanceTypeBreakdown,
        };
    }

    // ── Admin User Management ──

    async findAllAdmins() {
        return this.prisma.admin.findMany({
            select: {
                id: true,
                email: true,
                role: true,
                isActive: true,
                lastLoginAt: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async createAdmin(email: string, password: string, role: string, creatorId: string) {
        const passwordHash = await bcrypt.hash(password, 12);
        return this.prisma.admin.create({
            data: {
                email,
                passwordHash,
                role: role as any,
                createdBy: creatorId,
            },
            select: {
                id: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true,
            },
        });
    }

    async updateAdmin(id: string, data: { role?: string; is_active?: boolean }) {
        return this.prisma.admin.update({
            where: { id },
            data: {
                ...(data.role && { role: data.role as any }),
                ...(data.is_active !== undefined && { isActive: data.is_active }),
            },
            select: {
                id: true,
                email: true,
                role: true,
                isActive: true,
            },
        });
    }

    // ── Audit Logs ──
    async getAuditLogs(params: {
        entityType?: string;
        entityId?: string;
        userId?: string;
        action?: string;
        from?: string;
        to?: string;
        page?: number;
        limit?: number;
    }) {
        const page = params.page || 1;
        const limit = Math.min(params.limit || 20, 100);
        const skip = (page - 1) * limit;

        const where: any = {};
        if (params.entityType) where.entityType = params.entityType;
        if (params.entityId) where.entityId = params.entityId;
        if (params.userId) where.adminId = params.userId;
        if (params.action) where.action = params.action;
        if (params.from || params.to) {
            where.createdAt = {
                ...(params.from ? { gte: new Date(params.from) } : {}),
                ...(params.to ? { lte: new Date(params.to) } : {}),
            };
        }

        const [data, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: { admin: { select: { email: true, role: true } } },
            }),
            this.prisma.auditLog.count({ where }),
        ]);

        return {
            data,
            meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }
}
