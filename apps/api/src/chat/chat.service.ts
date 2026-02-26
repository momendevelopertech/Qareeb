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

    private async askGroq(text: string) {
        const key = process.env.GROQ_API_KEY;
        if (!key) {
            return 'يرجى ضبط مفتاح Groq في الخادم. الإجابة الدينية غير متاحة الآن.';
        }

        const systemPrompt = [
            'أنت مساعد قريب الشرعي.',
            'أجب بالعربية فقط.',
            'إجابات قصيرة ومباشرة.',
            'اعتمد على مفاهيم القرآن والسنة وأقوال العلماء المعتبرين.',
            'لا تُصدر فتوى شخصية، واذكر أن السائل يرجع لأهل العلم عند النوازل.',
        ].join(' ');

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${key}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                temperature: 0.2,
                max_tokens: 220,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: text },
                ],
            }),
        });

        if (!response.ok) {
            return 'تعذر الوصول لخدمة الإجابة الآن. حاول مرة أخرى بعد قليل.';
        }

        const payload = await response.json() as any;
        return payload?.choices?.[0]?.message?.content?.trim()
            || 'لا أملك إجابة دقيقة الآن، راجع إمام المسجد أو أهل العلم الموثوقين.';
    }

    async findNearest(text: string, userLat?: number, userLng?: number) {
        if (!text || !text.trim()) throw new BadRequestException('text is required');

        const intent = this.parseLocationIntent(text);
        if (intent && Number.isFinite(userLat) && Number.isFinite(userLng)) {
            const result = await this.searchService.nearest(userLat!, userLng!, intent);
            const cards = result.data || [];
            if (!cards.length) {
                return { mode: 'location', message: 'لا توجد نتائج معتمدة قريبة حالياً.', cards: [] };
            }

            const title = intent === 'imam' ? 'أقرب المساجد/الأئمة' : intent === 'halqa' ? 'أقرب الحلقات' : 'المساجد المحتاجة للصيانة';
            return {
                mode: 'location',
                message: `${title} (أفضل 3 نتائج):`,
                cards,
            };
        }

        const answer = await this.askGroq(text);
        return { mode: 'religious', message: answer, cards: [] };
    }
}
