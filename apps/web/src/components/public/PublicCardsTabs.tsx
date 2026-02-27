'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { api } from '@/lib/api';
import AppModal from '@/components/ui/AppModal';
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

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            pushToast(locale === 'ar' ? 'تم النسخ بنجاح' : 'Copied successfully', 'success');
        } catch {
            pushToast(locale === 'ar' ? 'تعذر النسخ' : 'Failed to copy', 'error');
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
                          : 'Halqa'
                      : locale === 'ar'
                        ? 'صيانة'
                        : 'Maintenance',
            typeIcon: entity === 'imam' ? '🕌' : entity === 'halqa' ? '📖' : '🏗️',
            map: item.googleMapsUrl || item.google_maps_url || '',
            video: item.videoUrl || item.video_url || '',
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

    const shareCard = async (card: any) => {
        const text = `${card.name}\n${card.mosque || ''}\n${card.location}\n${card.map || ''}`.trim();
        await shareText(text);
    };

    const embedUrl = getEmbeddableVideoUrl(payload?.video);

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
                    <div
                        key={`${card.entity}-${card.id}`}
                        className="bg-white rounded-[20px] border border-border p-5 space-y-4 hover:shadow-lg transition-all duration-300 flex flex-col"
                    >
                        {/* Header: Badge and Name */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-primary/10 text-primary">
                                    <span>{card.typeIcon}</span>
                                    {card.typeLabel}
                                </span>
                            </div>
                            <h3 className="text-lg font-black text-dark leading-tight">{card.name}</h3>
                            {card.mosque && card.mosque !== card.name && (
                                <p className="text-sm text-text-muted mt-1">{card.mosque}</p>
                            )}
                        </div>

                        {/* Location */}
                        {card.location && (
                            <div className="flex items-center gap-2 text-sm text-text-muted bg-cream rounded-lg px-3 py-2.5">
                                <span>📍</span>
                                <span className="font-semibold flex-1">{card.location}</span>
                            </div>
                        )}

                        {/* Action Buttons Group 1: Map and Video */}
                        <div className="flex gap-2 flex-wrap">
                            {card.map && (
                                <>
                                    <a
                                        href={card.map}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="btn-outline !py-2 !px-3 text-xs font-bold flex-1 min-w-[120px] text-center"
                                    >
                                        {locale === 'ar' ? '🗺️ فتح الخريطة' : '🗺️ Open Map'}
                                    </a>
                                    <button
                                        className="btn-outline !py-2 !px-3 text-xs font-bold"
                                        onClick={() => copyToClipboard(card.map)}
                                        title={locale === 'ar' ? 'نسخ الرابط' : 'Copy link'}
                                    >
                                        {locale === 'ar' ? '📋' : '📋'}
                                    </button>
                                </>
                            )}
                            {card.video && (
                                <button
                                    className="btn-outline !py-2 !px-3 text-xs font-bold flex-1 min-w-[120px]"
                                    onClick={() => openModal('video', card.entity, card)}
                                >
                                    {locale === 'ar' ? '🎥 عرض الفيديو' : '🎥 View Video'}
                                </button>
                            )}
                        </div>

                        {/* Spacer */}
                        <div className="flex-1" />

                        {/* Footer: View Details and Share */}
                        <div className="flex gap-2 pt-2 border-t border-border">
                            <button
                                className="btn-primary !py-2.5 !px-4 text-xs font-bold flex-1"
                                onClick={() => openModal('view', card.entity, card)}
                            >
                                {locale === 'ar' ? '➡️ عرض التفاصيل' : '➡️ View Details'}
                            </button>
                            <button
                                className="btn-outline !py-2.5 !px-4 text-xs font-bold"
                                onClick={() => shareCard(card)}
                                title={locale === 'ar' ? 'مشاركة البطاقة' : 'Share card'}
                            >
                                {locale === 'ar' ? '📤' : '📤'}
                            </button>
                        </div>
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

            {/* Details Modal */}
            <AppModal
                isOpen={isOpen && type === 'view'}
                type="view"
                title={locale === 'ar' ? '📋 التفاصيل' : '📋 Details'}
                onClose={closeModal}
            >
                {payload && (
                    <div className="space-y-4">
                        <div className="border-b border-border pb-3">
                            <p className="text-xs uppercase font-black text-primary mb-1">
                                {locale === 'ar' ? 'النوع' : 'Type'}
                            </p>
                            <p className="font-bold text-dark">{payload.typeLabel}</p>
                        </div>

                        <div className="border-b border-border pb-3">
                            <p className="text-xs uppercase font-black text-primary mb-1">
                                {locale === 'ar' ? 'الاسم' : 'Name'}
                            </p>
                            <p className="font-bold text-dark">{payload.name}</p>
                        </div>

                        {payload.mosque && (
                            <div className="border-b border-border pb-3">
                                <p className="text-xs uppercase font-black text-primary mb-1">
                                    {locale === 'ar' ? 'المسجد' : 'Mosque'}
                                </p>
                                <p className="font-bold text-dark">{payload.mosque}</p>
                            </div>
                        )}

                        {payload.location && (
                            <div className="border-b border-border pb-3">
                                <p className="text-xs uppercase font-black text-primary mb-1">
                                    {locale === 'ar' ? 'الموقع' : 'Location'}
                                </p>
                                <p className="font-bold text-dark">{payload.location}</p>
                            </div>
                        )}

                        {payload.map && (
                            <a
                                className="btn-primary w-full text-center"
                                href={payload.map}
                                target="_blank"
                                rel="noreferrer"
                            >
                                {locale === 'ar' ? '🗺️ فتح الخريطة' : '🗺️ Open Map'}
                            </a>
                        )}
                    </div>
                )}
            </AppModal>
        </section>
    );
}
