'use client';

import { useEffect, useMemo, useState } from 'react';
import Pagination from '@/components/ui/Pagination';
import { useLocale } from 'next-intl';
import { api } from '@/lib/api';
import AppModal from '@/components/ui/AppModal';
import UnifiedCard from './UnifiedCard';
import { useModalStore } from '@/lib/store';
import { getEmbeddableVideoUrl } from '@/lib/video';
import { formatLocationParts } from '@/lib/location';

type TabType = 'all' | 'imams' | 'halqa' | 'maintenance';

export default function PublicCardsTabs() {
    const locale = useLocale();
    const { isOpen, type, payload, openModal: _openModal, closeModal } = useModalStore();
    const [tab, setTab] = useState<TabType>('all');
    const [imams, setImams] = useState<any[]>([]);
    const [halaqat, setHalaqat] = useState<any[]>([]);
    const [maintenance, setMaintenance] = useState<any[]>([]);

    // pagination state per category
    const [pageImams, setPageImams] = useState(1);
    const [pageHalaqat, setPageHalaqat] = useState(1);
    const [pageMaintenance, setPageMaintenance] = useState(1);
    const [metaImams, setMetaImams] = useState<any>({ totalPages: 1 });
    const [metaHalaqat, setMetaHalaqat] = useState<any>({ totalPages: 1 });
    const [metaMaintenance, setMetaMaintenance] = useState<any>({ totalPages: 1 });
    const limit = 6; // show 6 cards per page
    // fetch each category with pagination
    useEffect(() => {
        const qIm = `limit=${limit}&page=${pageImams}`;
        const qHa = `limit=${limit}&page=${pageHalaqat}`;
        const qMa = `limit=${limit}&page=${pageMaintenance}`;
        void Promise.all([
            api.getImams(qIm),
            api.getHalaqat(qHa),
            api.getMaintenance(qMa),
        ])
            .then(([im, ha, ma]) => {
                setImams(im?.data || []);
                setMetaImams(im?.meta || { totalPages: 1 });
                setHalaqat(ha?.data || []);
                setMetaHalaqat(ha?.meta || { totalPages: 1 });
                setMaintenance(ma?.data || []);
                setMetaMaintenance(ma?.meta || { totalPages: 1 });
            })
            .catch(() => undefined);
    }, [pageImams, pageHalaqat, pageMaintenance]);

    // reset page when switching tabs
    useEffect(() => {
        setPageImams(1);
        setPageHalaqat(1);
        setPageMaintenance(1);
    }, [tab]);

    const cards = useMemo(() => {
        const toCard = (item: any, entity: 'imam' | 'halqa' | 'maintenance') => ({
            id: item.id,
            entity,
            name: item.imamName || item.circleName || item.mosqueName || item.imam_name || item.circle_name || item.mosque_name,
            mosque: item.mosqueName || item.mosque_name,
            location: formatLocationParts([item.governorate, item.area ? (locale === 'ar' ? item.area.nameAr : item.area.nameEn) : null, item.city, item.district], ' - '),
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

    const videoUrl = payload?.video || payload?.video_url;
    const embedUrl = getEmbeddableVideoUrl(videoUrl);

    const handleViewDetails = (card: any) => {
        // open details page in a new tab instead of modal, respecting locale prefix
        const base =
            card.entity === 'imam'
                ? '/imams'
                : card.entity === 'halqa'
                ? '/halaqat'
                : '/maintenance';
        window.open(`/${locale}${base}/${card.id}`, '_blank');
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
                    <UnifiedCard
                        key={`${card.entity}-${card.id}`}
                        card={card}
                        showWhatsApp={card.entity !== 'imam'} // للحلقات والصيانة فقط
                        showImages={card.entity === 'maintenance'} // للصيانة فقط
                        onViewDetails={handleViewDetails}
                    />
                ))}
            </div>
            {/* pagination for current tab */}
            <div className="mt-8">
                {tab === 'imams' && (
                    <Pagination
                        page={pageImams}
                        totalPages={metaImams.totalPages || 1}
                        onPageChange={setPageImams}
                        locale={locale}
                    />
                )}
                {tab === 'halqa' && (
                    <Pagination
                        page={pageHalaqat}
                        totalPages={metaHalaqat.totalPages || 1}
                        onPageChange={setPageHalaqat}
                        locale={locale}
                    />
                )}
                {tab === 'maintenance' && (
                    <Pagination
                        page={pageMaintenance}
                        totalPages={metaMaintenance.totalPages || 1}
                        onPageChange={setPageMaintenance}
                        locale={locale}
                    />
                )}
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
                {videoUrl ? (
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
                                href={videoUrl}
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
