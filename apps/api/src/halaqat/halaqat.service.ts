import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHalqaDto, HalqaQueryDto } from './dto/halqa.dto';
import { NotificationType, Prisma } from '@prisma/client';
import { extractLatLngFromGoogleMaps, resolveLatLngFromGoogleMaps } from '../common/maps.util';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class HalaqatService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly audit: AuditService,
        private readonly notifications: NotificationsService,
    ) { }

    async findAll(query: HalqaQueryDto) {
        const page = query.page || 1;
        const limit = Math.min(query.limit || 20, 50);
        const skip = (page - 1) * limit;

        const postgisEnabled = process.env.POSTGIS_ENABLED === 'true';

        if (postgisEnabled && query.lat && query.lng) {
            const radius = query.radius || 10000;
            const typeFilter = query.type
                ? Prisma.sql`AND halqa_type = ${query.type}::\"HalqaType\"`
                : Prisma.sql``;

            const results = await this.prisma.$queryRaw`
        SELECT id, circle_name, mosque_name, halqa_type, governorate, city, district,
               latitude, longitude, whatsapp, additional_info, status,
               created_at, updated_at,
               ST_Distance(location, ST_SetSRID(ST_MakePoint(${query.lng}, ${query.lat}), 4326)::geography) AS distance_meters
        FROM halaqat
        WHERE status = 'approved'
          AND location IS NOT NULL
          AND ST_DWithin(location, ST_SetSRID(ST_MakePoint(${query.lng}, ${query.lat}), 4326)::geography, ${radius})
          ${typeFilter}
        ORDER BY distance_meters ASC
        LIMIT ${limit} OFFSET ${skip}
      `;

            const countResult = await this.prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count FROM halaqat
        WHERE status = 'approved'
          AND location IS NOT NULL
          AND ST_DWithin(location, ST_SetSRID(ST_MakePoint(${query.lng}, ${query.lat}), 4326)::geography, ${radius})
          ${typeFilter}
      `;

            const total = Number(countResult[0]?.count || 0);
            return {
                data: results,
                meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page * limit < total, hasPrev: page > 1 },
            };
        }

        const where: Prisma.HalqaWhereInput = {
            status: (query.status as any) || 'approved',
        };
        if (query.type) where.halqaType = query.type as any;
        if (query.governorate) where.governorate = query.governorate;
        if (query.governorateId) where.area = { governorateId: query.governorateId };
        if (query.city) where.city = query.city;
        if (query.area_id) where.areaId = query.area_id;

        const [data, total] = await Promise.all([
            this.prisma.halqa.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: { media: true, area: true },
            }),
            this.prisma.halqa.count({ where }),
        ]);

        return {
            data,
            meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page * limit < total, hasPrev: page > 1 },
        };
    }

    async findOne(id: string) {
        return this.prisma.halqa.findUnique({ where: { id }, include: { media: true } });
    }

    async create(dto: CreateHalqaDto, createdBy?: string) {
        const coords = extractLatLngFromGoogleMaps(dto.google_maps_url)
            || await resolveLatLngFromGoogleMaps(dto.google_maps_url)
            || (dto.lat && dto.lng ? { lat: dto.lat, lng: dto.lng } : null);
        if (!coords) {
            throw new BadRequestException('Invalid Google Maps link. Please share a link that contains coordinates (e.g., open map > share > copy link).');
        }
        const halqa = await this.prisma.halqa.create({
            data: {
                circleName: dto.circle_name,
                mosqueName: dto.mosque_name,
                halqaType: dto.halqa_type as any,
                governorate: dto.governorate,
                city: dto.city || dto.governorate,
                district: dto.district,
                areaId: dto.area_id || null,
                googleMapsUrl: dto.google_maps_url,
                videoUrl: dto.video_url,
                latitude: coords.lat,
                longitude: coords.lng,
                whatsapp: dto.whatsapp,
                additionalInfo: dto.additional_info,
                status: 'pending',
            },
        });

        if (process.env.POSTGIS_ENABLED === 'true') {
            try {
                await this.prisma.$executeRaw`
                    UPDATE halaqat
                    SET location = ST_SetSRID(ST_MakePoint(${dto.lng}, ${dto.lat}), 4326)::geography
                    WHERE id = ${halqa.id}::uuid
                `;
            } catch (error) {
                // eslint-disable-next-line no-console
                console.warn('PostGIS update failed for halqa, continuing without location column:', error);
            }
        }

        if (dto.media_ids?.length) {
            await this.prisma.mediaAsset.updateMany({
                where: { id: { in: dto.media_ids } },
                data: { entityId: halqa.id, entityType: 'halqa' },
            });
        }

        await this.notifications.createForType(
            NotificationType.halqa,
            halqa.id,
            'Halqa submission',
            `New circle submitted: ${halqa.circleName} (${halqa.mosqueName})`,
            createdBy,
        );
        return halqa;
    }

    async approve(id: string, adminId: string) {
        const before = await this.prisma.halqa.findUnique({ where: { id } });
        const updated = await this.prisma.halqa.update({ where: { id }, data: { status: 'approved', adminId, rejectionReason: null } });
        await this.audit.log({ adminId, entityType: 'halqa', entityId: id, action: 'approve', oldData: before, newData: updated });
        return updated;
    }

    async reject(id: string, adminId: string, reason?: string) {
        const before = await this.prisma.halqa.findUnique({ where: { id } });
        const updated = await this.prisma.halqa.update({ where: { id }, data: { status: 'rejected', adminId, rejectionReason: reason } });
        await this.audit.log({ adminId, entityType: 'halqa', entityId: id, action: 'reject', oldData: before, newData: updated });
        return updated;
    }

    async update(id: string, adminId: string, data: Partial<CreateHalqaDto>) {
        const before = await this.prisma.halqa.findUnique({ where: { id } });
        if (!before) throw new Error('Halqa not found');
        const coords = data.google_maps_url ? extractLatLngFromGoogleMaps(data.google_maps_url) : null;

        const updated = await this.prisma.halqa.update({
            where: { id },
            data: {
                circleName: data.circle_name ?? before.circleName,
                mosqueName: data.mosque_name ?? before.mosqueName,
                halqaType: (data.halqa_type as any) ?? before.halqaType,
                governorate: data.governorate ?? before.governorate,
                city: (data.city ?? data.governorate) ?? before.city,
                district: data.district ?? before.district,
                areaId: data.area_id ?? before.areaId,
                googleMapsUrl: data.google_maps_url ?? before.googleMapsUrl,
                videoUrl: data.video_url ?? before.videoUrl,
                latitude: coords ? coords.lat : before.latitude,
                longitude: coords ? coords.lng : before.longitude,
                whatsapp: data.whatsapp ?? before.whatsapp,
                additionalInfo: data.additional_info ?? before.additionalInfo,
            },
        });

        await this.audit.log({ adminId, entityType: 'halqa', entityId: id, action: 'update', oldData: before, newData: updated });
        return updated;
    }

    async remove(id: string) {
        await this.prisma.mediaAsset.deleteMany({ where: { entityId: id, entityType: 'halqa' } });
        return this.prisma.halqa.delete({ where: { id } });
    }
}
