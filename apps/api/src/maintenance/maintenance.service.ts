import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMaintenanceDto, MaintenanceQueryDto } from './dto/maintenance.dto';
import { extractLatLngFromGoogleMaps, resolveLatLngFromGoogleMaps } from '../common/maps.util';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CacheService } from '../cache/cache.service';


@Injectable()
export class MaintenanceService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly audit: AuditService,
        private readonly notifications: NotificationsService,
        private readonly cache: CacheService,
    ) { }

    private async invalidateCache() {
        await this.cache.deleteByPrefix('approved:maintenance:');
    }

    async findAll(query: MaintenanceQueryDto) {
        const page = query.page || 1;
        const limit = Math.min(query.limit || 20, 500);
        const skip = (page - 1) * limit;

        const postgisEnabled = process.env.POSTGIS_ENABLED === 'true';

        if (postgisEnabled && query.lat && query.lng) {
            const radius = query.radius || 10000;
            try {
            const results = await this.prisma.$queryRaw`
        SELECT id, mosque_name, governorate, city, district,
               latitude, longitude, maintenance_types, description,
               estimated_cost_min, estimated_cost_max, whatsapp, status,
               created_at, updated_at,
               ST_Distance(location, ST_SetSRID(ST_MakePoint(${query.lng}, ${query.lat}), 4326)::geography) AS distance_meters
        FROM maintenance_requests
        WHERE status = 'approved'
          AND location IS NOT NULL
          AND ST_DWithin(location, ST_SetSRID(ST_MakePoint(${query.lng}, ${query.lat}), 4326)::geography, ${radius})
        ORDER BY distance_meters ASC
        LIMIT ${limit} OFFSET ${skip}
      `;

            const countResult = await this.prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count FROM maintenance_requests
        WHERE status = 'approved'
          AND location IS NOT NULL
          AND ST_DWithin(location, ST_SetSRID(ST_MakePoint(${query.lng}, ${query.lat}), 4326)::geography, ${radius})
      `;

            const total = Number(countResult[0]?.count || 0);
            return {
                data: results,
                meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page * limit < total, hasPrev: page > 1 },
            };
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('PostGIS query for maintenance failed, falling back to default query:', error);
        }
        }

        const where: any = {
            status: (query.status as any) || 'approved',
        };
        if (query.governorate) where.governorate = query.governorate;
        if (query.governorateId) where.area = { governorateId: query.governorateId };
        if (query.city) where.city = query.city;
        if (query.area_id) where.areaId = query.area_id;

        if (query.query) {
            where.OR = [
                { mosqueName: { contains: query.query, mode: 'insensitive' } },
                { description: { contains: query.query, mode: 'insensitive' } },
                { governorate: { contains: query.query, mode: 'insensitive' } },
                { city: { contains: query.query, mode: 'insensitive' } },
                { district: { contains: query.query, mode: 'insensitive' } },
                { area: { nameAr: { contains: query.query, mode: 'insensitive' } } },
                { area: { nameEn: { contains: query.query, mode: 'insensitive' } } },
            ];
        }

        const cacheable = where.status === 'approved';
        const cacheKey = `approved:maintenance:${JSON.stringify({ query, page, limit })}`;
        if (cacheable) {
            const cached = await this.cache.getJSON<any>(cacheKey);
            if (cached) return cached;
        }

        const [data, total] = await Promise.all([
            this.prisma.maintenanceRequest.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: { media: true, area: true },
            }),
            this.prisma.maintenanceRequest.count({ where }),
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
        return this.prisma.maintenanceRequest.findUnique({ where: { id }, include: { media: true } });
    }

    async create(dto: CreateMaintenanceDto, createdBy?: string) {
        const coords = extractLatLngFromGoogleMaps(dto.google_maps_url)
            || await resolveLatLngFromGoogleMaps(dto.google_maps_url)
            || (dto.lat && dto.lng ? { lat: dto.lat, lng: dto.lng } : null);
        if (!coords) {
            throw new BadRequestException('Invalid Google Maps link. Please share a link that contains coordinates (e.g., open map > share > copy link).');
        }
        const request = await this.prisma.maintenanceRequest.create({
            data: {
                mosqueName: dto.mosque_name,
                governorate: dto.governorate,
                city: dto.city || dto.governorate,
                district: dto.district,
                areaId: dto.area_id || null,
                googleMapsUrl: dto.google_maps_url,
                latitude: coords.lat,
                longitude: coords.lng,
                maintenanceTypes: dto.maintenance_types as any,
                description: dto.description,
                estimatedCostMin: dto.estimated_cost_min,
                estimatedCostMax: dto.estimated_cost_max,
                whatsapp: dto.whatsapp,
                status: 'pending',
            },
        });

        if (process.env.POSTGIS_ENABLED === 'true') {
            try {
                await this.prisma.$executeRaw`
                    UPDATE maintenance_requests
                    SET location = ST_SetSRID(ST_MakePoint(${coords.lng}, ${coords.lat}), 4326)::geography
                    WHERE id = ${request.id}::uuid
                `;
            } catch (error) {
                // eslint-disable-next-line no-console
                console.warn('PostGIS update failed for maintenance request, continuing without location column:', error);
            }
        }

        if (dto.media_ids?.length) {
            await this.prisma.mediaAsset.updateMany({
                where: { id: { in: dto.media_ids } },
                data: { entityId: request.id, entityType: 'maintenance' },
            });
        }
        if (dto.media_uploads?.length) {
            await this.prisma.mediaAsset.createMany({
                data: dto.media_uploads.map((item, index) => ({
                    entityType: 'maintenance',
                    entityId: request.id,
                    url: item.secureUrl,
                    publicId: item.publicId,
                    mediaType: 'image',
                    sortOrder: index,
                })),
            });
        }

        await this.notifications.createForType(
            'maintenance',
            request.id,
            'Maintenance submission',
            `New maintenance request: ${request.mosqueName}`,
            createdBy,
        );
        if (createdBy && /^[0-9a-fA-F-]{36}$/.test(createdBy)) {
            await this.audit.logCreate(createdBy, 'maintenance', request.id, request);
        }
        await this.invalidateCache();
        return request;
    }

    async approve(id: string, adminId: string) {
        const updated = await this.prisma.maintenanceRequest.update({ where: { id }, data: { status: 'approved', adminId, rejectionReason: null } });
        await this.audit.logApprove(adminId, 'maintenance', id, updated);
        await this.notifications.emitAction('maintenance', 'approved', id, 'Maintenance approved', `Maintenance ${updated.mosqueName} approved`);
        await this.invalidateCache();
        return updated;
    }

    async reject(id: string, adminId: string, reason?: string) {
        const updated = await this.prisma.maintenanceRequest.update({ where: { id }, data: { status: 'rejected', adminId, rejectionReason: reason } });
        await this.audit.logReject(adminId, 'maintenance', id, updated);
        await this.notifications.emitAction('maintenance', 'rejected', id, 'Maintenance rejected', `Maintenance ${updated.mosqueName} rejected`);
        await this.invalidateCache();
        return updated;
    }

    async update(id: string, adminId: string, data: Partial<CreateMaintenanceDto>) {
        const before = await this.prisma.maintenanceRequest.findUnique({ where: { id } });
        if (!before) throw new Error('Maintenance not found');
        const coords = data.google_maps_url
            ? (extractLatLngFromGoogleMaps(data.google_maps_url) || await resolveLatLngFromGoogleMaps(data.google_maps_url))
            : null;

        const updated = await this.prisma.maintenanceRequest.update({
            where: { id },
            data: {
                mosqueName: data.mosque_name ?? before.mosqueName,
                governorate: data.governorate ?? before.governorate,
                city: (data.city ?? data.governorate) ?? before.city,
                district: data.district ?? before.district,
                areaId: data.area_id ?? before.areaId,
                googleMapsUrl: data.google_maps_url ?? before.googleMapsUrl,
                latitude: coords ? coords.lat : before.latitude,
                longitude: coords ? coords.lng : before.longitude,
                maintenanceTypes: (data.maintenance_types as any) ?? before.maintenanceTypes,
                description: data.description ?? before.description,
                estimatedCostMin: data.estimated_cost_min ?? before.estimatedCostMin,
                estimatedCostMax: data.estimated_cost_max ?? before.estimatedCostMax,
                whatsapp: data.whatsapp ?? before.whatsapp,
            },
        });

        if (process.env.POSTGIS_ENABLED === 'true') {
            try {
                await this.prisma.$executeRaw`
                    UPDATE maintenance_requests
                    SET location = ST_SetSRID(ST_MakePoint(${updated.longitude}, ${updated.latitude}), 4326)::geography
                    WHERE id = ${updated.id}::uuid
                `;
            } catch (error) {
                // eslint-disable-next-line no-console
                console.warn('PostGIS update failed for maintenance update, continuing without location column:', error);
            }
        }

        if (data.media_uploads?.length) {
            await this.prisma.mediaAsset.createMany({
                data: data.media_uploads.map((item, index) => ({
                    entityType: 'maintenance',
                    entityId: id,
                    url: item.secureUrl,
                    publicId: item.publicId,
                    mediaType: 'image',
                    sortOrder: index,
                })),
            });
        }

        await this.audit.logUpdate(adminId, 'maintenance', id, before, updated);
        await this.notifications.emitAction('maintenance', 'updated', id, 'Maintenance updated', `Maintenance ${updated.mosqueName} updated`);
        await this.invalidateCache();
        return updated;
    }

    async remove(id: string, adminId: string) {
        const before = await this.prisma.maintenanceRequest.findUnique({ where: { id } });
        await this.prisma.mediaAsset.deleteMany({ where: { entityId: id, entityType: 'maintenance' } });
        const deleted = await this.prisma.maintenanceRequest.delete({ where: { id } });
        await this.audit.logDelete(adminId, 'maintenance', id, before || deleted);
        await this.notifications.emitAction('maintenance', 'updated', id, 'Maintenance deleted', `Maintenance ${deleted.mosqueName} deleted`);
        await this.invalidateCache();
        return deleted;
    }
}
