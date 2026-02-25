import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type WithCoords = { latitude?: number | null; longitude?: number | null };

@Injectable()
export class ChatService {
    constructor(private readonly prisma: PrismaService) { }

    private haversine(a: WithCoords, b: { lat: number; lng: number }) {
        if (!a.latitude || !a.longitude) return Number.POSITIVE_INFINITY;
        const toRad = (v: number) => (v * Math.PI) / 180;
        const R = 6371e3;
        const dLat = toRad(b.lat - a.latitude);
        const dLng = toRad(b.lng - a.longitude);
        const la1 = toRad(a.latitude);
        const la2 = toRad(b.lat);
        const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
        return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
    }

    async findNearest(text: string, userLat?: number, userLng?: number) {
        if (!text || !text.trim()) throw new BadRequestException('text is required');

        const areas = await this.prisma.area.findMany({ select: { id: true, nameAr: true, nameEn: true, governorateId: true } });
        const governorates = await this.prisma.governorate.findMany({ select: { id: true, nameAr: true, nameEn: true } });
        const query = text.toLowerCase();

        const intent = (() => {
            if (/(صيانة|اعمار|maintenance)/i.test(text)) return 'maintenance';
            if (/(حلقة|دار|تحفيظ|circle|halqa|halaqa)/i.test(text)) return 'halqa';
            if (/(إمام|شيخ|imam)/i.test(text)) return 'imam';
            return 'any';
        })();

        const matchedArea = areas.find((a) => query.includes((a.nameAr || '').toLowerCase()) || query.includes((a.nameEn || '').toLowerCase()));
        const matchedGov = governorates.find((g) => query.includes((g.nameAr || '').toLowerCase()) || query.includes((g.nameEn || '').toLowerCase()));
        if (!matchedArea && !matchedGov) return { match: null, message: 'No matching area found' };

        const areaIds = matchedArea ? [matchedArea.id] : areas.filter((a) => a.governorateId === matchedGov?.id).map((a) => a.id);

        const candidates = [
            ...(intent === 'maintenance' ? [] : await this.prisma.imam.findMany({ where: { areaId: { in: areaIds }, status: 'approved' }, include: { media: true } })),
            ...(intent === 'maintenance' ? [] : await this.prisma.halqa.findMany({ where: { areaId: { in: areaIds }, status: 'approved' }, include: { media: true } })),
            ...(intent === 'imam' || intent === 'halqa' ? [] : await this.prisma.maintenanceRequest.findMany({ where: { areaId: { in: areaIds }, status: 'approved' }, include: { media: true } })),
        ];

        if (!candidates.length) return { match: null, message: 'No approved records in this area yet' };

        const ranked = userLat !== undefined && userLng !== undefined
            ? candidates
                .map((c) => ({ c, dist: this.haversine(c, { lat: userLat!, lng: userLng! }) }))
                .sort((a, b) => a.dist - b.dist)
                .map((r) => r.c)
            : candidates.sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));

        const top = ranked.slice(0, 3);

        const areaLabel = matchedArea
            ? `${matchedArea.nameEn} / ${matchedArea.nameAr}`
            : `${matchedGov?.nameEn || ''} / ${matchedGov?.nameAr || ''}`;

        const formatMessage = (pick: any) => {
            if ('imamName' in pick) {
                return [
                    `🕌 Imam: ${pick.imamName}`,
                    `🏠 Mosque: ${pick.mosqueName}`,
                    `📍 Area: ${areaLabel}`,
                    pick.videoUrl || pick.recitationUrl ? `🎥 Video: ${pick.videoUrl || pick.recitationUrl}` : null,
                    pick.googleMapsUrl ? `🗺️ Maps: ${pick.googleMapsUrl}` : null,
                    pick.whatsapp ? `💬 WhatsApp: ${pick.whatsapp}` : null,
                ].filter(Boolean).join('\n');
            }
            if ('circleName' in pick) {
                return [
                    `📖 Halqa: ${pick.circleName}`,
                    `🏠 Mosque: ${pick.mosqueName}`,
                    `📍 Area: ${areaLabel}`,
                    pick.videoUrl ? `🎥 Video: ${pick.videoUrl}` : null,
                    pick.googleMapsUrl ? `🗺️ Maps: ${pick.googleMapsUrl}` : null,
                    pick.whatsapp ? `💬 WhatsApp: ${pick.whatsapp}` : null,
                ].filter(Boolean).join('\n');
            }
            return [
                `🔧 Maintenance: ${pick.mosqueName}`,
                `📍 Area: ${areaLabel}`,
                pick.googleMapsUrl ? `🗺️ Maps: ${pick.googleMapsUrl}` : null,
                pick.whatsapp ? `💬 WhatsApp: ${pick.whatsapp}` : null,
            ].filter(Boolean).join('\n');
        };

        const mapType = (p: any) => ('imamName' in p ? 'imam' : 'circleName' in p ? 'halqa' : 'maintenance');

        return {
            matches: top.map((item) => ({ type: mapType(item), item, area: matchedArea || matchedGov })),
            message: top.map((item, i) => `${i + 1}) ${formatMessage(item)}`).join('\n\n'),
        };
    }
}
