import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type EntityType = 'imam' | 'halqa' | 'maintenance';

@Injectable()
export class SearchService {
    constructor(private readonly prisma: PrismaService) { }

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

    async nearest(lat: number, lng: number, type: EntityType) {
        const postgisEnabled = process.env.POSTGIS_ENABLED === 'true';
        if (postgisEnabled) {
            const table = type === 'imam' ? 'imams' : type === 'halqa' ? 'halaqat' : 'maintenance_requests';
            const rows = await this.prisma.$queryRawUnsafe<any[]>(
                `
                SELECT *
                FROM ${table}
                WHERE status = 'approved' AND location IS NOT NULL
                ORDER BY ST_Distance(
                    location,
                    ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
                ) ASC
                LIMIT 3
                `,
                lng,
                lat,
            );
            return { data: rows.map((row) => this.toCard(row, type)) };
        }

        const modelRows = type === 'imam'
            ? await this.prisma.imam.findMany({ where: { status: 'approved' }, take: 200, orderBy: { createdAt: 'desc' } })
            : type === 'halqa'
                ? await this.prisma.halqa.findMany({ where: { status: 'approved' }, take: 200, orderBy: { createdAt: 'desc' } })
                : await this.prisma.maintenanceRequest.findMany({ where: { status: 'approved' }, take: 200, orderBy: { createdAt: 'desc' } });

        const toRad = (v: number) => (v * Math.PI) / 180;
        const distance = (aLat: number, aLng: number) => {
            const R = 6371e3;
            const dLat = toRad(lat - aLat);
            const dLng = toRad(lng - aLng);
            const la1 = toRad(aLat);
            const la2 = toRad(lat);
            const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
            return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
        };

        const ranked = (modelRows as any[])
            .map((row) => ({
                ...row,
                distance_meters: distance(row.latitude, row.longitude),
            }))
            .sort((a, b) => a.distance_meters - b.distance_meters)
            .slice(0, 3);

        return { data: ranked.map((row) => this.toCard(row, type)) };
    }
}
