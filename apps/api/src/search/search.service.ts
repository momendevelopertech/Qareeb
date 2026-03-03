import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { calculateDistance } from '../common/location.util';

type EntityType = 'imam' | 'halqa' | 'maintenance';

type NearestOptions = {
    radiusKm?: number;
    limit?: number;
};

@Injectable()
export class SearchService {
    constructor(private readonly prisma: PrismaService) { }

    private readonly DEFAULT_RADIUS_KM = 5;

    private toCard(item: any, type: EntityType) {
        return {
            id: item.id,
            type,
            name: item.imam_name || item.circle_name || item.mosque_name || item.imamName || item.circleName || item.mosqueName,
            mosque: item.mosque_name || item.mosqueName,
            address: [item.governorate, item.city, item.district].filter(Boolean).join(' - '),
            googleMapUrl: item.google_maps_url || item.googleMapsUrl,
            videoUrl: item.video_url || item.videoUrl || null,
            distanceMeters: Number(item.distance_meters || 0),
            raw: item,
        };
    }

    private clampLimit(limit?: number) {
        if (!Number.isFinite(limit)) return 10;
        return Math.min(Math.max(Math.floor(limit as number), 1), 20);
    }

    private normalizeRadius(radiusKm?: number) {
        if (!Number.isFinite(radiusKm) || (radiusKm as number) <= 0) return this.DEFAULT_RADIUS_KM;
        return Math.min(radiusKm as number, 50);
    }

    async nearest(lat: number, lng: number, type: EntityType, options: NearestOptions = {}) {
        const radiusKm = this.normalizeRadius(options.radiusKm);
        const limit = this.clampLimit(options.limit);
        const radiusMeters = radiusKm * 1000;
        const postgisEnabled = process.env.POSTGIS_ENABLED === 'true';

        if (postgisEnabled) {
            const table = type === 'imam' ? 'imams' : type === 'halqa' ? 'halaqat' : 'maintenance_requests';
            const rows = await this.prisma.$queryRawUnsafe<any[]>(
                `
                SELECT *, ST_Distance(
                    location,
                    ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
                ) AS distance_meters
                FROM ${table}
                WHERE status = 'approved'
                    AND location IS NOT NULL
                    AND ST_DWithin(
                        location,
                        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
                        $3
                    )
                ORDER BY distance_meters ASC
                LIMIT $4
                `,
                lng,
                lat,
                radiusMeters,
                limit,
            );

            return { data: rows.map((row) => this.toCard(row, type)), radiusKm };
        }

        const modelRows = type === 'imam'
            ? await this.prisma.imam.findMany({ where: { status: 'approved' }, take: 300, orderBy: { createdAt: 'desc' } })
            : type === 'halqa'
                ? await this.prisma.halqa.findMany({ where: { status: 'approved' }, take: 300, orderBy: { createdAt: 'desc' } })
                : await this.prisma.maintenanceRequest.findMany({ where: { status: 'approved' }, take: 300, orderBy: { createdAt: 'desc' } });

        const ranked = (modelRows as any[])
            .filter((row) => Number.isFinite(row.latitude) && Number.isFinite(row.longitude))
            .map((row) => ({
                ...row,
                distance_meters: calculateDistance(
                    { lat: row.latitude, lng: row.longitude },
                    { lat, lng },
                ),
            }))
            .filter((row) => row.distance_meters <= radiusMeters)
            .sort((a, b) => a.distance_meters - b.distance_meters)
            .slice(0, limit);

        return { data: ranked.map((row) => this.toCard(row, type)), radiusKm };
    }
}
