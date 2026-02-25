import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateImamDto, ImamQueryDto } from './dto/imam.dto';
import { Prisma } from '@prisma/client';
import { extractLatLngFromGoogleMaps } from '../common/maps.util';

@Injectable()
export class ImamsService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll(query: ImamQueryDto) {
        const page = query.page || 1;
        const limit = Math.min(query.limit || 20, 50);
        const skip = (page - 1) * limit;

        const postgisEnabled = process.env.POSTGIS_ENABLED === 'true';

        // If geospatial query params provided and PostGIS is available, use raw SQL with PostGIS
        if (postgisEnabled && query.lat && query.lng) {
            const radius = query.radius || 10000; // Default 10km
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
        }

        // Fallback: standard Prisma query with filters
        const where: Prisma.ImamWhereInput = {
            status: (query.status as any) || 'approved',
        };
        if (query.governorate) where.governorate = query.governorate;
        if (query.city) where.city = query.city;
        if (query.district) where.district = query.district;
        if (query.area_id) where.areaId = query.area_id;

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

        return {
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
    }

    async findOne(id: string) {
        return this.prisma.imam.findUnique({
            where: { id },
            include: { media: true },
        });
    }

    async create(dto: CreateImamDto, ip?: string) {
        const coords = extractLatLngFromGoogleMaps(dto.google_maps_url) || (dto.lat && dto.lng ? { lat: dto.lat, lng: dto.lng } : null);
        if (!coords) throw new Error('Unable to parse coordinates from Google Maps URL');

        const imam = await this.prisma.imam.create({
            data: {
                imamName: dto.imam_name,
                mosqueName: dto.mosque_name,
                governorate: dto.governorate,
                city: dto.city,
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

        return imam;
    }

    async approve(id: string, adminId: string) {
        return this.prisma.imam.update({
            where: { id },
            data: { status: 'approved', adminId, rejectionReason: null },
        });
    }

    async reject(id: string, adminId: string, reason?: string) {
        return this.prisma.imam.update({
            where: { id },
            data: { status: 'rejected', adminId, rejectionReason: reason },
        });
    }

    async remove(id: string) {
        // Delete associated media first
        await this.prisma.mediaAsset.deleteMany({
            where: { entityId: id, entityType: 'imam' },
        });
        return this.prisma.imam.delete({ where: { id } });
    }
}
