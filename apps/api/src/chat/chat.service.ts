import { BadRequestException, Injectable } from '@nestjs/common';
import { SearchService } from '../search/search.service';

type EntityType = 'imam' | 'halqa' | 'maintenance';

@Injectable()
export class ChatService {
    constructor(private readonly searchService: SearchService) { }

    private parseLocationIntent(text: string): EntityType | null {
        if (/(أقرب\s*مسجد|imam|إمام|مسجد)/i.test(text)) return 'imam';
        if (/(أقرب\s*حلقة|حلقة|halqa|halaqa)/i.test(text)) return 'halqa';
        if (/(يحتاج\s*صيانة|صيانة|maintenance|إعمار)/i.test(text)) return 'maintenance';
        return null;
    }

    async findNearest(text: string, userLat?: number, userLng?: number) {
        if (!text || !text.trim()) throw new BadRequestException('text is required');

        const intent = this.parseLocationIntent(text);
        if (intent && Number.isFinite(userLat) && Number.isFinite(userLng)) {
            const radiusKm = 5;
            const limit = intent === 'imam' ? 10 : 6;
            const result = await this.searchService.nearest(userLat!, userLng!, intent, { radiusKm, limit });
            const cards = result.data || [];
            if (!cards.length) {
                return {
                    mode: 'location',
                    message: `لا توجد نتائج معتمدة داخل نطاق ${radiusKm} كم حالياً. جرّب منطقة أخرى أو وسّع نطاق البحث.`,
                    cards: [],
                };
            }

            const title = intent === 'imam' ? 'المساجد القريبة' : intent === 'halqa' ? 'الحلقات القريبة' : 'مساجد تحتاج صيانة';
            return {
                mode: 'location',
                message: `${title} داخل نطاق ${radiusKm} كم (${cards.length} نتيجة):`,
                cards,
            };
        }

        return {
            mode: 'guided',
            message: 'هذا المساعد مخصص للعثور على الخدمات القريبة فقط. اختر: أقرب مسجد، أقرب حلقة، أو مسجد يحتاج صيانة.',
            cards: [],
        };
    }
}
