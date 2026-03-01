import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateImprovementDto } from './dto/create-improvement.dto';
import { AdminQueryImprovementsDto } from './dto/admin-query-improvements.dto';
import { UpdateImprovementDto } from './dto/update-improvement.dto';

@Injectable()
export class ImprovementsService {
    constructor(private readonly prisma: PrismaService) { }

    create(data: CreateImprovementDto) {
        return this.prisma.improvement.create({
            data: {
                suggestionText: data.suggestion_text,
                name: data.name?.trim() || null,
                email: data.email?.trim().toLowerCase() || null,
            },
        });
    }

    findAllForAdmin(query: AdminQueryImprovementsDto) {
        const where: any = {};

        if (query.status && query.status !== 'all') {
            where.status = query.status;
        }

        if (query.from || query.to) {
            where.createdAt = {
                ...(query.from ? { gte: new Date(query.from) } : {}),
                ...(query.to ? { lte: new Date(query.to) } : {}),
            };
        }

        return this.prisma.improvement.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });
    }

    update(id: string, data: UpdateImprovementDto) {
        return this.prisma.improvement.update({
            where: { id },
            data: {
                ...(data.status ? { status: data.status } : {}),
                ...(data.internal_note !== undefined ? { internalNote: data.internal_note || null } : {}),
            },
        });
    }

    remove(id: string) {
        return this.prisma.improvement.delete({ where: { id } });
    }
}
