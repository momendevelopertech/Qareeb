import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateImamDto, ImamQueryDto } from './dto/imam.dto';
import { extractLatLngFromGoogleMaps, resolveLatLngFromGoogleMaps } from '../common/maps.util';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class ImamsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly audit: AuditService,
        private readonly notifications: NotificationsService,
        private readonly cache: CacheService,
    ) { }

    private async invalidateCache() {
        await this.cache.deleteByPrefix('approved:imams:');
    }

    async findAll(query: ImamQueryDto) {
        const page = query.page || 1;
        const limit = Math.min(query.limit || 20, 50);
        const skip = (page - 1) * limit;

        const postgisEnabled = process.env.POSTGIS_ENABLED === 'true';

        // If geospatial query params provided and PostGIS is available, use raw SQL with PostGIS
        if (postgisEnabled && query.lat && query.lng) {
            const radius = query.radius || 10000; // Default 10km
            try {
                const results = await this.prisma.$queryRaw`
        SELECT id, imam_name, mosque_name, governorate, city, district,
               latitude, longitude, whatsapp, recitation_url, status,
               created_at, updated_at,
               ST_Distance(location, ST_SetSRID(ST_MakePoint(${query.lng}, ${query.lat}), 4326)::geography) AS distance_meters
        FROM imams
        WHERE status = 'approved'
          AND location IS NOT NULL
          AND ST_DWithin(location, ST_SetSRID(ST_MakePoint(${query.lng}, ${query.lat}), 4326)::geography, ${radius})
        ORDER BY distance_meters ASC
        LIMIT ${limit} OFFSET ${skip}
      `;

            const countResult = await this.prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count FROM imams
        WHERE status = 'approved'
          AND location IS NOT NULL
          AND ST_DWithin(location, ST_SetSRID(ST_MakePoint(${query.lng}, ${query.lat}), 4326)::geography, ${radius})
      `;

            const total = Number(countResult[0]?.count || 0);

            return {
                data: results,
                meta: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    hasNext: page * limit < total,
                    hasPrev: page > 1,
                },
            };
        } catch (error) {
            // If the spatial query fails, log and continue to non-spatial logic below
            // eslint-disable-next-line no-console
            console.error('PostGIS query for imams failed, falling back to default query:', error);
        }
        }

        // Fallback: standard Prisma query with filters
        const where: any = {
            status: (query.status as any) || 'approved',
        };
        if (query.governorate) where.governorate = query.governorate;
        if (query.governorateId) where.area = { governorateId: query.governorateId };
        if (query.city) where.city = query.city;
        if (query.district) where.district = query.district;
        if (query.area_id) where.areaId = query.area_id;

        if (query.query) {
            where.OR = [
                { imamName: { contains: query.query, mode: 'insensitive' } },
                { mosqueName: { contains: query.query, mode: 'insensitive' } },
                { governorate: { contains: query.query, mode: 'insensitive' } },
                { city: { contains: query.query, mode: 'insensitive' } },
                { district: { contains: query.query, mode: 'insensitive' } },
                { area: { nameAr: { contains: query.query, mode: 'insensitive' } } },
                { area: { nameEn: { contains: query.query, mode: 'insensitive' } } },
            ];
        }

        const cacheable = where.status === 'approved';
        const cacheKey = `approved:imams:${JSON.stringify({ query, page, limit })}`;
        if (cacheable) {
            const cached = await this.cache.getJSON<any>(cacheKey);
            if (cached) return cached;
        }

        const [data, total] = await Promise.all([
            this.prisma.imam.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: { media: true, area: true },
            }),
            this.prisma.imam.count({ where }),
        ]);

        const response = {
            data,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNext: page * limit < total,
                hasPrev: page > 1,
            },
        };
        if (cacheable) {
            await this.cache.setJSON(cacheKey, response, 60);
        }
        return response;
    }

    async findOne(id: string) {
        return this.prisma.imam.findUnique({
            where: { id },
            include: { media: true },
        });
    }

    async create(dto: CreateImamDto, ip?: string, createdBy?: string) {
        const coords = extractLatLngFromGoogleMaps(dto.google_maps_url)
            || await resolveLatLngFromGoogleMaps(dto.google_maps_url)
            || (dto.lat && dto.lng ? { lat: dto.lat, lng: dto.lng } : null);
        if (!coords) {
            throw new BadRequestException('Invalid Google Maps link. Please share a link that contains coordinates (e.g., open map > share > copy link).');
        }

        const imam = await this.prisma.imam.create({
            data: {
                imamName: dto.imam_name,
                mosqueName: dto.mosque_name,
                governorate: dto.governorate,
                city: dto.city || dto.governorate,
                district: dto.district,
                areaId: dto.area_id || null,
                googleMapsUrl: dto.google_maps_url,
                videoUrl: dto.video_url,
                latitude: coords.lat,
                longitude: coords.lng,
                whatsapp: dto.whatsapp,
                recitationUrl: dto.recitation_url,
                submittedByIp: ip,
                status: 'pending',
            },
        });

        // Sync PostGIS geography column from lat/lng when PostGIS is enabled
        if (process.env.POSTGIS_ENABLED === 'true') {
            try {
                await this.prisma.$executeRaw`
                    UPDATE imams
                    SET location = ST_SetSRID(ST_MakePoint(${dto.lng}, ${dto.lat}), 4326)::geography
                    WHERE id = ${imam.id}::uuid
                `;
            } catch (error) {
                // In dev environments without PostGIS installed, fail gracefully
                // eslint-disable-next-line no-console
                console.warn('PostGIS update failed, continuing without location column:', error);
            }
        }

        // Link media assets if provided
        if (dto.media_ids?.length) {
            await this.prisma.mediaAsset.updateMany({
                where: { id: { in: dto.media_ids } },
                data: { entityId: imam.id, entityType: 'imam' },
            });
        }

        await this.notifications.createForType(
            'imam',
            imam.id,
            'Imam submission',
            `New Imam submitted: ${imam.imamName} (${imam.mosqueName})`,
            createdBy,
        );
        if (createdBy && /^[0-9a-fA-F-]{36}$/.test(createdBy)) {
            await this.audit.logCreate(createdBy, 'imam', imam.id, imam);
        }
        await this.invalidateCache();
        return imam;
    }

    async approve(id: string, adminId: string) {
        const before = await this.prisma.imam.findUnique({ where: { id } });
        const updated = await this.prisma.imam.update({
            where: { id },
            data: { status: 'approved', adminId, rejectionReason: null },
        });
        await this.audit.logApprove(adminId, 'imam', id, updated);
        await this.notifications.emitAction('imam', 'approved', id, 'Imam approved', `Imam ${updated.imamName} approved`);
        await this.invalidateCache();
        return updated;
    }

    async reject(id: string, adminId: string, reason?: string) {
        const before = await this.prisma.imam.findUnique({ where: { id } });
        const updated = await this.prisma.imam.update({
            where: { id },
            data: { status: 'rejected', adminId, rejectionReason: reason },
        });
        await this.audit.logReject(adminId, 'imam', id, updated);
        await this.notifications.emitAction('imam', 'rejected', id, 'Imam rejected', `Imam ${updated.imamName} rejected`);
        await this.invalidateCache();
        return updated;
    }

    async update(id: string, adminId: string, data: Partial<CreateImamDto>) {
        const before = await this.prisma.imam.findUnique({ where: { id } });
        if (!before) throw new Error('Imam not found');
        const coords = data.google_maps_url ? extractLatLngFromGoogleMaps(data.google_maps_url) : null;

        const updated = await this.prisma.imam.update({
            where: { id },
            data: {
                imamName: data.imam_name ?? before.imamName,
                mosqueName: data.mosque_name ?? before.mosqueName,
                governorate: data.governorate ?? before.governorate,
                city: (data.city ?? data.governorate) ?? before.city,
                district: data.district ?? before.district,
                areaId: data.area_id ?? before.areaId,
                googleMapsUrl: data.google_maps_url ?? before.googleMapsUrl,
                videoUrl: data.video_url ?? before.videoUrl,
                latitude: coords ? coords.lat : before.latitude,
                longitude: coords ? coords.lng : before.longitude,
                whatsapp: data.whatsapp ?? before.whatsapp,
                recitationUrl: data.recitation_url ?? before.recitationUrl,
            },
        });

        await this.audit.logUpdate(adminId, 'imam', id, before, updated);
        await this.notifications.emitAction('imam', 'updated', id, 'Imam updated', `Imam ${updated.imamName} updated`);
        await this.invalidateCache();
        return updated;
    }

    async remove(id: string, adminId: string) {
        const before = await this.prisma.imam.findUnique({ where: { id } });
        // Delete associated media first
        await this.prisma.mediaAsset.deleteMany({
            where: { entityId: id, entityType: 'imam' },
        });
        const deleted = await this.prisma.imam.delete({ where: { id } });
        await this.audit.logDelete(adminId, 'imam', id, before || deleted);
        await this.notifications.emitAction('imam', 'updated', id, 'Imam deleted', `Imam ${deleted.imamName} deleted`);
        await this.invalidateCache();
        return deleted;
    }
}
