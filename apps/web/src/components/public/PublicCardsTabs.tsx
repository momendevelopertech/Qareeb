'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { api } from '@/lib/api';
import AppModal from '@/components/ui/AppModal';
import { useModalStore, useToastStore } from '@/lib/store';

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
            api.getImams('limit=8'),
            api.getHalaqat('limit=8'),
            api.getMaintenance('limit=8'),
        ]).then(([im, ha, ma]) => {
            setImams(im?.data || []);
            setHalaqat(ha?.data || []);
            setMaintenance(ma?.data || []);
        }).catch(() => undefined);
    }, []);

    const shareText = async (text: string) => {
        try {
            if (navigator.share) {
                await navigator.share({ text });
                return;
            }
            await navigator.clipboard.writeText(text);
            pushToast(locale === 'ar' ? 'تم نسخ النص للمشاركة' : 'Share text copied', 'success');
        } catch {
            pushToast(locale === 'ar' ? 'تعذر تنفيذ المشاركة' : 'Unable to share', 'error');
        }
    };

    const cards = useMemo(() => {
        const toCard = (item: any, entity: 'imam' | 'halqa' | 'maintenance') => ({
            id: item.id,
            entity,
            name: item.imamName || item.circleName || item.mosqueName || item.imam_name || item.circle_name || item.mosque_name,
            mosque: item.mosqueName || item.mosque_name,
            typeLabel: entity === 'imam' ? (locale === 'ar' ? 'إمام' : 'Imam') : entity === 'halqa' ? (locale === 'ar' ? 'حلقة' : 'Halqa') : (locale === 'ar' ? 'صيانة' : 'Maintenance'),
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
        const text = `${card.name}\n${card.mosque || ''}\n${card.typeLabel}\n${card.map || ''}`.trim();
        await shareText(text);
    };

    return (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="flex gap-2 flex-wrap mb-6">
                {[
                    { key: 'all', label: locale === 'ar' ? 'الكل' : 'All' },
                    { key: 'imams', label: locale === 'ar' ? 'الأئمة' : 'Imams' },
                    { key: 'halqa', label: locale === 'ar' ? 'الحلقات' : 'Halqa' },
                    { key: 'maintenance', label: locale === 'ar' ? 'الصيانة' : 'Maintenance' },
                ].map((item) => (
                    <button
                        key={item.key}
                        onClick={() => setTab(item.key as TabType)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold ${tab === item.key ? 'bg-primary text-white' : 'bg-white border border-border'}`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {cards.map((card) => (
                    <div key={`${card.entity}-${card.id}`} className="bg-white rounded-2xl border border-border p-4 space-y-3">
                        <div>
                            <p className="text-xs text-primary font-bold">{card.typeLabel}</p>
                            <h3 className="font-black">{card.name}</h3>
                            <p className="text-sm text-text-muted">{card.mosque}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button className="btn-outline !py-1.5 !px-3 text-xs" onClick={() => openModal('view', card.entity, card)}>{locale === 'ar' ? 'عرض التفاصيل' : 'View details'}</button>
                            {card.map && <a href={card.map} target="_blank" rel="noreferrer" className="btn-outline !py-1.5 !px-3 text-xs">{locale === 'ar' ? 'فتح الخريطة' : 'Open map'}</a>}
                            {card.map && <button className="btn-outline !py-1.5 !px-3 text-xs" onClick={() => navigator.clipboard.writeText(card.map)}>{locale === 'ar' ? 'نسخ رابط الخريطة' : 'Copy map link'}</button>}
                            {card.video && <button className="btn-outline !py-1.5 !px-3 text-xs" onClick={() => openModal('video', card.entity, card)}>{locale === 'ar' ? 'عرض الفيديو' : 'View video'}</button>}
                            {card.video && <button className="btn-outline !py-1.5 !px-3 text-xs" onClick={() => shareText(`${card.name}\n${card.video}`)}>{locale === 'ar' ? 'مشاركة الفيديو' : 'Share video'}</button>}
                            <button className="btn-outline !py-1.5 !px-3 text-xs" onClick={() => shareCard(card)}>{locale === 'ar' ? 'مشاركة البطاقة' : 'Share card'}</button>
                        </div>
                    </div>
                ))}
            </div>

            <AppModal isOpen={isOpen && type === 'view'} type="view" title={locale === 'ar' ? 'تفاصيل' : 'Details'} onClose={closeModal}>
                {payload && (
                    <div className="space-y-3">
                        <p><strong>{locale === 'ar' ? 'الاسم:' : 'Name:'}</strong> {payload.name}</p>
                        <p><strong>{locale === 'ar' ? 'المسجد:' : 'Mosque:'}</strong> {payload.mosque}</p>
                        {payload.map && <a className="btn-outline inline-flex" href={payload.map} target="_blank" rel="noreferrer">{locale === 'ar' ? 'فتح الخريطة' : 'Open map'}</a>}
                    </div>
                )}
            </AppModal>

            <AppModal isOpen={isOpen && type === 'video'} type="video" title={locale === 'ar' ? 'عرض الفيديو' : 'Video'} onClose={closeModal}>
                {payload?.video ? <iframe src={payload.video} className="w-full h-72 rounded-xl border" allowFullScreen title="video-modal" /> : null}
            </AppModal>
        </section>
    );
}
