import { Injectable } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMaintenanceDto, MaintenanceQueryDto } from './dto/maintenance.dto';
import { extractLatLngFromGoogleMaps } from '../common/maps.util';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';


@Injectable()
export class MaintenanceService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly audit: AuditService,
        private readonly notifications: NotificationsService,
    ) { }

    async findAll(query: MaintenanceQueryDto) {
        const page = query.page || 1;
        const limit = Math.min(query.limit || 20, 50);
        const skip = (page - 1) * limit;

        const postgisEnabled = process.env.POSTGIS_ENABLED === 'true';

        if (postgisEnabled && query.lat && query.lng) {
            const radius = query.radius || 10000;
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
        }

        const where: Prisma.MaintenanceRequestWhereInput = {
            status: (query.status as any) || 'approved',
        };
        if (query.governorate) where.governorate = query.governorate;
        if (query.governorateId) where.area = { governorateId: query.governorateId };
        if (query.city) where.city = query.city;
        if (query.area_id) where.areaId = query.area_id;

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

        return {
            data,
            meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page * limit < total, hasPrev: page > 1 },
        };
    }

    async findOne(id: string) {
        return this.prisma.maintenanceRequest.findUnique({ where: { id }, include: { media: true } });
    }

    async create(dto: CreateMaintenanceDto, createdBy?: string) {
        const coords = extractLatLngFromGoogleMaps(dto.google_maps_url) || (dto.lat && dto.lng ? { lat: dto.lat, lng: dto.lng } : null);
        if (!coords) throw new Error('Unable to parse coordinates from Google Maps URL');
        const request = await this.prisma.maintenanceRequest.create({
            data: {
                mosqueName: dto.mosque_name,
                governorate: dto.governorate,
                city: dto.city,
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
                    SET location = ST_SetSRID(ST_MakePoint(${dto.lng}, ${dto.lat}), 4326)::geography
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

        await this.notifications.createForType(
            NotificationType.maintenance,
            request.id,
            'Maintenance submission',
            `New maintenance request: ${request.mosqueName}`,
            createdBy,
        );
        return request;
    }

    async approve(id: string, adminId: string) {
        const before = await this.prisma.maintenanceRequest.findUnique({ where: { id } });
        const updated = await this.prisma.maintenanceRequest.update({ where: { id }, data: { status: 'approved', adminId, rejectionReason: null } });
        await this.audit.log({ adminId, entityType: 'maintenance', entityId: id, action: 'approve', oldData: before, newData: updated });
        return updated;
    }

    async reject(id: string, adminId: string, reason?: string) {
        const before = await this.prisma.maintenanceRequest.findUnique({ where: { id } });
        const updated = await this.prisma.maintenanceRequest.update({ where: { id }, data: { status: 'rejected', adminId, rejectionReason: reason } });
        await this.audit.log({ adminId, entityType: 'maintenance', entityId: id, action: 'reject', oldData: before, newData: updated });
        return updated;
    }

    async update(id: string, adminId: string, data: Partial<CreateMaintenanceDto>) {
        const before = await this.prisma.maintenanceRequest.findUnique({ where: { id } });
        if (!before) throw new Error('Maintenance not found');
        const coords = data.google_maps_url ? extractLatLngFromGoogleMaps(data.google_maps_url) : null;

        const updated = await this.prisma.maintenanceRequest.update({
            where: { id },
            data: {
                mosqueName: data.mosque_name ?? before.mosqueName,
                governorate: data.governorate ?? before.governorate,
                city: data.city ?? before.city,
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

        await this.audit.log({ adminId, entityType: 'maintenance', entityId: id, action: 'update', oldData: before, newData: updated });
        return updated;
    }

    async remove(id: string) {
        await this.prisma.mediaAsset.deleteMany({ where: { entityId: id, entityType: 'maintenance' } });
        return this.prisma.maintenanceRequest.delete({ where: { id } });
    }
}
