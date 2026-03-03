import { BadRequestException, Injectable } from '@nestjs/common';
import { SearchService } from '../search/search.service';

type EntityType = 'imam' | 'halqa' | 'maintenance';

@Injectable()
export class ChatService {
    constructor(private readonly searchService: SearchService) { }

    private parseLocationIntent(text: string): EntityType | null {
        const hasNear = /(أقرب|قريب|nearest|near)/i.test(text);
        if (hasNear) {
            if (/(مسجد|المساجد|imam|إمام|الأئمة)/i.test(text)) return 'imam';
            if (/(حلقة|حلقات|halqa|halaqa)/i.test(text)) return 'halqa';
            if (/(صيانة|maintenance|إعمار)/i.test(text)) return 'maintenance';
        }
        if (/(imam|إمام|مسجد|المساجد)/i.test(text)) return 'imam';
        if (/(حلقة|حلقات|halqa|halaqa)/i.test(text)) return 'halqa';
        if (/(صيانة|maintenance|إعمار)/i.test(text)) return 'maintenance';
        return null;
    }

    private parseAddIntent(text: string): EntityType | 'all' | null {
        if (!/(add|submit|اضيف|أضيف|اضافة|إضافة|ضيف|يضيف)/i.test(text)) return null;
        if (/(imam|إمام|امام|مسجد|المساجد)/i.test(text)) return 'imam';
        if (/(halqa|halaqa|حلقة|حلقات)/i.test(text)) return 'halqa';
        if (/(maintenance|صيانة|اعمار|إعمار)/i.test(text)) return 'maintenance';
        return 'all';
    }

    private hasServiceInterest(text: string): boolean {
        return /(imam|إمام|مسجد|المساجد|حلقة|حلقات|halqa|halaqa|تحفيظ|قرآن|دار تحفيظ|صيانة|إعمار|maintenance|تبرع|donate|donation)/i.test(text);
    }

    async findNearest(text: string, userLat?: number, userLng?: number) {
        if (!text || !text.trim()) throw new BadRequestException('text is required');

        const addIntent = this.parseAddIntent(text);
        if (addIntent) {
            const links = addIntent === 'all'
                ? [
                    { type: 'imam', path: '/imams/submit', labelAr: 'إضافة إمام/مسجد', labelEn: 'Add Imam/Mosque' },
                    { type: 'halqa', path: '/halaqat/submit', labelAr: 'إضافة حلقة', labelEn: 'Add Halqa' },
                    { type: 'maintenance', path: '/maintenance/submit', labelAr: 'طلب صيانة مسجد', labelEn: 'Request Maintenance' },
                ]
                : [
                    addIntent === 'imam'
                        ? { type: 'imam', path: '/imams/submit', labelAr: 'إضافة إمام/مسجد', labelEn: 'Add Imam/Mosque' }
                        : addIntent === 'halqa'
                            ? { type: 'halqa', path: '/halaqat/submit', labelAr: 'إضافة حلقة', labelEn: 'Add Halqa' }
                            : { type: 'maintenance', path: '/maintenance/submit', labelAr: 'طلب صيانة مسجد', labelEn: 'Request Maintenance' },
                ];

            return {
                mode: 'add',
                message: 'تمام - تقدر تضيف من الروابط دي:',
                links,
                cards: [],
            };
        }

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

        if (intent) {
            return {
                mode: 'need_location',
                intent,
                message: 'عشان أقدر أجيب الأقرب، اختار موقعك الحالي أو حدّد المحافظة والمنطقة.',
                cards: [],
            };
        }

        if (/(أقرب|قريب|nearest|near)/i.test(text)) {
            return {
                mode: 'ask_type',
                message: 'عايز تدور على إيه بالضبط؟ أقرب مسجد، أقرب حلقة، ولا مسجد يحتاج صيانة؟',
                cards: [],
            };
        }

        if (this.hasServiceInterest(text)) {
            return {
                mode: 'suggest_types',
                message: 'اختار نوع الخدمة عشان أجيب الأقرب ليك:',
                choices: [
                    { type: 'imam', labelAr: 'أقرب مسجد', labelEn: 'Nearest mosque' },
                    { type: 'halqa', labelAr: 'أقرب حلقة', labelEn: 'Nearest halqa' },
                    { type: 'maintenance', labelAr: 'مسجد يحتاج صيانة', labelEn: 'Mosque needs maintenance' },
                ],
                cards: [],
            };
        }

        return {
            mode: 'guided',
            message: 'أنا أقدر أساعدك في حاجتين: البحث عن الأقرب، أو إضافة إمام/حلقة/صيانة. قول لي عايز تعمل إيه.',
            cards: [],
        };
    }
}
