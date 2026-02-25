import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LocationsService {
    constructor(private readonly prisma: PrismaService) { }

    getGovernorates() {
        return this.prisma.governorate.findMany({
            orderBy: { nameEn: 'asc' },
            select: { id: true, nameAr: true, nameEn: true },
        });
    }

    getAreas(governorateId?: string) {
        return this.prisma.area.findMany({
            where: governorateId ? { governorateId } : undefined,
            orderBy: { nameEn: 'asc' },
            select: { id: true, nameAr: true, nameEn: true, governorateId: true },
        });
    }
}
