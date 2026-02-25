import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMaintenanceDto, MaintenanceQueryDto } from './dto/maintenance.dto';
import { extractLatLngFromGoogleMaps } from '../common/maps.util';


@Injectable()
export class MaintenanceService {
    constructor(private readonly prisma: PrismaService) { }

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

        const where: { status?: any; governorate?: string; city?: string; areaId?: string } = {
            status: (query.status as any) || 'approved',
        };
        if (query.governorate) where.governorate = query.governorate;
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

    async create(dto: CreateMaintenanceDto) {
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
        return request;
    }

    async approve(id: string, adminId: string) {
        return this.prisma.maintenanceRequest.update({ where: { id }, data: { status: 'approved', adminId, rejectionReason: null } });
    }

    async reject(id: string, adminId: string, reason?: string) {
        return this.prisma.maintenanceRequest.update({ where: { id }, data: { status: 'rejected', adminId, rejectionReason: reason } });
    }

    async remove(id: string) {
        await this.prisma.mediaAsset.deleteMany({ where: { entityId: id, entityType: 'maintenance' } });
        return this.prisma.maintenanceRequest.delete({ where: { id } });
    }
}
