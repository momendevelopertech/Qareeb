'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { api } from '@/lib/api';
import AppModal from '@/components/ui/AppModal';
import UnifiedCard from './UnifiedCard';
import { useModalStore, useToastStore } from '@/lib/store';
import { getEmbeddableVideoUrl } from '@/lib/video';

type TabType = 'all' | 'imams' | 'halqa' | 'maintenance';

export default function PublicCardsTabs() {
    const locale = useLocale();
    const { isOpen, type, payload, openModal, closeModal } = useModalStore();
    const { pushToast } = useToastStore();
    const [tab, setTab] = useState<TabType>('all');
    const [imams, setImams] = useState<any[]>([]);
    const [halaqat, setHalaqat] = useState<any[]>([]);
    const [maintenance, setMaintenance] = useState<any[]>([]);

    useEffect(() => {
        void Promise.all([
            api.getImams('limit=12'),
            api.getHalaqat('limit=12'),
            api.getMaintenance('limit=12'),
        ])
            .then(([im, ha, ma]) => {
                setImams(im?.data || []);
                setHalaqat(ha?.data || []);
                setMaintenance(ma?.data || []);
            })
            .catch(() => undefined);
    }, []);

    const shareText = async (text: string) => {
        try {
            if (navigator.share) {
                await navigator.share({ text });
                return;
            }
            await navigator.clipboard.writeText(text);
            pushToast(locale === 'ar' ? 'تم نسخ النص' : 'Text copied', 'success');
        } catch {
            pushToast(locale === 'ar' ? 'تعذر تنفيذ الحركة' : 'Unable to perform action', 'error');
        }
    };

    const cards = useMemo(() => {
        const toCard = (item: any, entity: 'imam' | 'halqa' | 'maintenance') => ({
            id: item.id,
            entity,
            name: item.imamName || item.circleName || item.mosqueName || item.imam_name || item.circle_name || item.mosque_name,
            mosque: item.mosqueName || item.mosque_name,
            location: [item.governorate, item.city, item.district].filter(Boolean).join(' - '),
            typeLabel:
                entity === 'imam'
                    ? locale === 'ar'
                        ? 'إمام'
                        : 'Imam'
                    : entity === 'halqa'
                      ? locale === 'ar'
                          ? 'حلقة'
                          : 'Circle'
                      : locale === 'ar'
                        ? 'صيانة'
                        : 'Maintenance',
            typeIcon: entity === 'imam' ? '🕌' : entity === 'halqa' ? '📖' : '🏗️',
            map: item.googleMapsUrl || item.google_maps_url || '',
            video: item.videoUrl || item.video_url || '',
            whatsapp: item.whatsapp || '',
            online: (item.additionalInfo || '').startsWith('[ONLINE]'), // للحلقات
            images: item.media ? item.media.map((m: any) => m.url) : [], // للصيانة
            raw: item,
        });

        const all = [
            ...imams.map((x) => toCard(x, 'imam')),
            ...halaqat.map((x) => toCard(x, 'halqa')),
            ...maintenance.map((x) => toCard(x, 'maintenance')),
        ];

        if (tab === 'all') return all;
        if (tab === 'imams') return all.filter((x) => x.entity === 'imam');
        if (tab === 'halqa') return all.filter((x) => x.entity === 'halqa');
        return all.filter((x) => x.entity === 'maintenance');
    }, [tab, imams, halaqat, maintenance, locale]);

    const embedUrl = getEmbeddableVideoUrl(payload?.video);

    const handleViewDetails = (card: any) => {
        // open details page in a new tab instead of modal
        const base =
            card.entity === 'imam'
                ? '/imams'
                : card.entity === 'halqa'
                ? '/halaqat'
                : '/maintenance';
        window.open(`${base}/${card.id}`, '_blank');
    };

    const shareCard = async (card: any) => {
        const text = `${card.name}\n${card.mosque || ''}\n${card.location}\n${card.map || ''}`.trim();
        await shareText(text);
    };

    return (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            {/* Tabs */}
            <div className="flex gap-2 flex-wrap mb-8">
                {[
                    { key: 'all', label: locale === 'ar' ? 'الكل' : 'All' },
                    { key: 'imams', label: locale === 'ar' ? 'الأئمة' : 'Imams' },
                    { key: 'halqa', label: locale === 'ar' ? 'الحلقات' : 'Circles' },
                    { key: 'maintenance', label: locale === 'ar' ? 'الصيانة' : 'Maintenance' },
                ].map((item) => (
                    <button
                        key={item.key}
                        onClick={() => setTab(item.key as TabType)}
                        className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
                            tab === item.key
                                ? 'bg-primary text-white shadow-md'
                                : 'bg-white border border-border hover:border-primary'
                        }`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cards.map((card) => (
                    <div key={`${card.entity}-${card.id}`} className="flex flex-col gap-2">
                        <UnifiedCard
                            card={card}
                            showWhatsApp={card.entity !== 'imam'} // للحلقات والصيانة فقط
                            showImages={card.entity === 'maintenance'} // للصيانة فقط
                            onViewDetails={handleViewDetails}
                        />
                        {/* زر المشاركة */}
                        <button
                            className="btn-outline !py-2 !px-4 text-xs font-bold text-center"
                            onClick={() => shareCard(card)}
                            title={locale === 'ar' ? 'مشاركة البطاقة' : 'Share card'}
                        >
                            {locale === 'ar' ? '📤 مشاركة' : '📤 Share'}
                        </button>
                    </div>
                ))}
            </div>

            {/* No Results */}
            {cards.length === 0 && (
                <div className="text-center py-16">
                    <div className="text-5xl mb-4">🔍</div>
                    <p className="text-text-muted text-lg">
                        {locale === 'ar' ? 'لا توجد نتائج' : 'No results found'}
                    </p>
                </div>
            )}

            {/* Video Modal */}
            <AppModal
                isOpen={isOpen && type === 'video'}
                type="video"
                title={locale === 'ar' ? '🎥 عرض الفيديو' : '🎥 Video'}
                onClose={closeModal}
            >
                {payload?.video ? (
                    embedUrl ? (
                        <iframe
                            src={embedUrl}
                            className="w-full h-96 rounded-xl border border-border"
                            allowFullScreen
                            title="video-modal"
                        />
                    ) : (
                        <div className="space-y-4">
                            <p className="text-sm text-text-muted">
                                {locale === 'ar'
                                    ? 'لا يمكن تضمين هذا الرابط داخل الصفحة.'
                                    : 'This link cannot be embedded.'}
                            </p>
                            <a
                                className="btn-primary inline-flex"
                                href={payload.video}
                                target="_blank"
                                rel="noreferrer"
                            >
                                {locale === 'ar' ? '🔗 فتح الفيديو' : '🔗 Open Video'}
                            </a>
                        </div>
                    )
                ) : null}
            </AppModal>

            {/* Images Modal - للصيانة */}
            <AppModal
                isOpen={isOpen && type === 'images'}
                type="images"
                title={locale === 'ar' ? '📸 الصور' : '📸 Photos'}
                onClose={closeModal}
            >
                {payload?.images && payload.images.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                        {payload.images.map((img: string, idx: number) => (
                            <a
                                key={idx}
                                href={img}
                                target="_blank"
                                rel="noreferrer"
                                className="overflow-hidden rounded-lg"
                            >
                                <img
                                    src={img}
                                    alt={`Photo ${idx + 1}`}
                                    className="w-full h-48 object-cover hover:scale-105 transition-transform"
                                />
                            </a>
                        ))}
                    </div>
                ) : null}
            </AppModal>

        </section>
    );
}
