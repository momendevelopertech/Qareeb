import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHalqaDto, HalqaQueryDto } from './dto/halqa.dto';
import { extractLatLngFromGoogleMaps, resolveLatLngFromGoogleMaps } from '../common/maps.util';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class HalaqatService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly audit: AuditService,
        private readonly notifications: NotificationsService,
        private readonly cache: CacheService,
    ) { }

    private async invalidateCache() {
        await this.cache.deleteByPrefix('approved:halaqat:');
    }

    async findAll(query: HalqaQueryDto) {
        const page = query.page || 1;
        const limit = Math.min(query.limit || 20, 500);
        const skip = (page - 1) * limit;

        const postgisEnabled = process.env.POSTGIS_ENABLED === 'true';

        if (postgisEnabled && query.lat && query.lng) {
            const radius = query.radius || 10000;
            try {
            const typeFilter = query.type
                ? `AND halqa_type = '${query.type}'::"HalqaType"`
                : '';

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
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('PostGIS query for halaqat failed, falling back to default query:', error);
        }
        }

        const where: any = {
            status: (query.status as any) || 'approved',
        };
        if (query.type) where.halqaType = query.type as any;
        if (query.governorate) where.governorate = query.governorate;
        if (query.governorateId) where.area = { governorateId: query.governorateId };
        if (query.city) where.city = query.city;
        if (query.area_id) where.areaId = query.area_id;
        if (query.isOnline !== undefined) where.isOnline = query.isOnline;

        if (query.query) {
            where.OR = [
                { circleName: { contains: query.query, mode: 'insensitive' } },
                { mosqueName: { contains: query.query, mode: 'insensitive' } },
                { governorate: { contains: query.query, mode: 'insensitive' } },
                { city: { contains: query.query, mode: 'insensitive' } },
                { district: { contains: query.query, mode: 'insensitive' } },
                { additionalInfo: { contains: query.query, mode: 'insensitive' } },
                { area: { nameAr: { contains: query.query, mode: 'insensitive' } } },
                { area: { nameEn: { contains: query.query, mode: 'insensitive' } } },
            ];
        }

        const cacheable = where.status === 'approved';
        const cacheKey = `approved:halaqat:${JSON.stringify({ query, page, limit })}`;
        if (cacheable) {
            const cached = await this.cache.getJSON<any>(cacheKey);
            if (cached) return cached;
        }

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

        const response = {
            data,
            meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page * limit < total, hasPrev: page > 1 },
        };
        if (cacheable) {
            await this.cache.setJSON(cacheKey, response, 60);
        }
        return response;
    }

    async findOne(id: string) {
        return this.prisma.halqa.findUnique({ where: { id }, include: { media: true, area: true } });
    }

    async create(dto: CreateHalqaDto, createdBy?: string) {
        const isOnline = Boolean(dto.is_online);
        const coords = !isOnline
            ? extractLatLngFromGoogleMaps(dto.google_maps_url)
                || await resolveLatLngFromGoogleMaps(dto.google_maps_url)
                || (dto.lat && dto.lng ? { lat: dto.lat, lng: dto.lng } : null)
            : null;
        if (!isOnline && !coords) {
            throw new BadRequestException('Invalid Google Maps link. Please share a link that contains coordinates (e.g., open map > share > copy link).');
        }
        const halqa = await this.prisma.halqa.create({
            data: {
                circleName: dto.circle_name,
                mosqueName: isOnline ? '' : (dto.mosque_name || ''),
                halqaType: dto.halqa_type as any,
                governorate: isOnline ? '' : (dto.governorate || ''),
                city: isOnline ? '' : (dto.city || dto.governorate || ''),
                district: isOnline ? null : (dto.district || null),
                areaId: isOnline ? null : (dto.area_id || null),
                googleMapsUrl: isOnline ? null : dto.google_maps_url,
                latitude: coords?.lat ?? 0,
                longitude: coords?.lng ?? 0,
                whatsapp: dto.whatsapp,
                additionalInfo: `${isOnline ? '[ONLINE] ' : ''}${dto.additional_info || ''}`.trim() || null,
                isOnline,
                status: 'pending',
            },
        });

        if (process.env.POSTGIS_ENABLED === 'true' && coords) {
            try {
                await this.prisma.$executeRaw`
                    UPDATE halaqat
                    SET location = ST_SetSRID(ST_MakePoint(${coords.lng}, ${coords.lat}), 4326)::geography
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
            'halqa',
            halqa.id,
            'Halqa submission',
            `New circle submitted: ${halqa.circleName} (${halqa.mosqueName})`,
            createdBy,
        );
        if (createdBy && /^[0-9a-fA-F-]{36}$/.test(createdBy)) {
            await this.audit.logCreate(createdBy, 'halqa', halqa.id, halqa);
        }
        await this.invalidateCache();
        return halqa;
    }

    async approve(id: string, adminId: string) {
        const updated = await this.prisma.halqa.update({ where: { id }, data: { status: 'approved', adminId, rejectionReason: null } });
        await this.audit.logApprove(adminId, 'halqa', id, updated);
        await this.notifications.emitAction('halqa', 'approved', id, 'Halqa approved', `Halqa ${updated.circleName} approved`);
        await this.invalidateCache();
        return updated;
    }

    async reject(id: string, adminId: string, reason?: string) {
        const updated = await this.prisma.halqa.update({ where: { id }, data: { status: 'rejected', adminId, rejectionReason: reason } });
        await this.audit.logReject(adminId, 'halqa', id, updated);
        await this.notifications.emitAction('halqa', 'rejected', id, 'Halqa rejected', `Halqa ${updated.circleName} rejected`);
        await this.invalidateCache();
        return updated;
    }

    async update(id: string, adminId: string, data: Partial<CreateHalqaDto>) {
        const before = await this.prisma.halqa.findUnique({ where: { id } });
        if (!before) throw new Error('Halqa not found');
        const nextOnline = data.is_online !== undefined ? Boolean(data.is_online) : (before.additionalInfo || '').startsWith('[ONLINE]');
        const coords = data.google_maps_url
            ? (extractLatLngFromGoogleMaps(data.google_maps_url) || await resolveLatLngFromGoogleMaps(data.google_maps_url))
            : null;

        const updated = await this.prisma.halqa.update({
            where: { id },
            data: {
                circleName: data.circle_name ?? before.circleName,
                mosqueName: nextOnline ? '' : (data.mosque_name ?? before.mosqueName),
                halqaType: (data.halqa_type as any) ?? before.halqaType,
                governorate: nextOnline ? '' : (data.governorate ?? before.governorate),
                city: nextOnline ? '' : ((data.city ?? data.governorate) ?? before.city),
                district: nextOnline ? null : (data.district ?? before.district),
                areaId: nextOnline ? null : (data.area_id ?? before.areaId),
                googleMapsUrl: nextOnline ? null : (data.google_maps_url ?? before.googleMapsUrl),
                latitude: nextOnline ? 0 : (coords ? coords.lat : before.latitude),
                longitude: nextOnline ? 0 : (coords ? coords.lng : before.longitude),
                whatsapp: data.whatsapp ?? before.whatsapp,
                additionalInfo: data.additional_info !== undefined
                    ? `${nextOnline ? '[ONLINE] ' : ''}${data.additional_info || ''}`.trim() || null
                    : before.additionalInfo,
                isOnline: nextOnline,
            },
        });

        if (process.env.POSTGIS_ENABLED === 'true') {
            try {
                if (updated.isOnline || (updated.latitude === 0 && updated.longitude === 0)) {
                    await this.prisma.$executeRaw`
                        UPDATE halaqat
                        SET location = NULL
                        WHERE id = ${updated.id}::uuid
                    `;
                } else {
                    await this.prisma.$executeRaw`
                        UPDATE halaqat
                        SET location = ST_SetSRID(ST_MakePoint(${updated.longitude}, ${updated.latitude}), 4326)::geography
                        WHERE id = ${updated.id}::uuid
                    `;
                }
            } catch (error) {
                // eslint-disable-next-line no-console
                console.warn('PostGIS update failed for halqa update, continuing without location column:', error);
            }
        }

        await this.audit.logUpdate(adminId, 'halqa', id, before, updated);
        await this.notifications.emitAction('halqa', 'updated', id, 'Halqa updated', `Halqa ${updated.circleName} updated`);
        await this.invalidateCache();
        return updated;
    }

    async remove(id: string, adminId: string) {
        const before = await this.prisma.halqa.findUnique({ where: { id } });
        await this.prisma.mediaAsset.deleteMany({ where: { entityId: id, entityType: 'halqa' } });
        const deleted = await this.prisma.halqa.delete({ where: { id } });
        await this.audit.logDelete(adminId, 'halqa', id, before || deleted);
        await this.notifications.emitAction('halqa', 'updated', id, 'Halqa deleted', `Halqa ${deleted.circleName} deleted`);
        await this.invalidateCache();
        return deleted;
    }
}
