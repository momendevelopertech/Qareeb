'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import FAB from '@/components/ui/FAB';
import ChatWidget from '@/components/chat/ChatWidget';
import Pagination from '@/components/ui/Pagination';
import { api } from '@/lib/api';
import { useGeolocationStore } from '@/lib/store';
import { formatLocationParts } from '@/lib/location';
import UnifiedCard from '@/components/public/UnifiedCard';
import { useRouter } from 'next/navigation';

export default function ImamsPage() {
    const t = useTranslations('imams');
    const tc = useTranslations('common');
    const locale = useLocale();
    const searchParams = useSearchParams();
    const { lat, lng, requestLocation, loading: geoLoading } = useGeolocationStore();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [governorates, setGovernorates] = useState<any[]>([]);
    const [areas, setAreas] = useState<any[]>([]);
    const [governorateId, setGovernorateId] = useState<string>(searchParams.get('governorateId') || '');
    const [areaId, setAreaId] = useState<string>(searchParams.get('areaId') || '');
    const [searchTerm, setSearchTerm] = useState<string>(searchParams.get('query') || '');
    const [page, setPage] = useState<number>(Number(searchParams.get('page') || 1));
    const limit = 6;

    useEffect(() => {
        requestLocation();
        api.getGovernorates().then(setGovernorates).catch(console.error);
    }, []);

    useEffect(() => {
        if (governorateId) {
            api.getAreas(governorateId).then(setAreas).catch(console.error);
        } else {
            setAreas([]);
            setAreaId('');
        }
    }, [governorateId]);

    useEffect(() => {
        void fetchData();
    }, [lat, lng, governorateId, areaId, governorates, page]);

    useEffect(() => {
        setPage(1);
    }, [governorateId, areaId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (lat && lng) {
                params.set('lat', lat.toString());
                params.set('lng', lng.toString());
                params.set('radius', '10000');
            }
            if (areaId) {
                params.set('area_id', areaId);
            } else if (governorateId) {
                params.set('governorateId', governorateId);
            }
            params.set('page', String(page));
            params.set('limit', String(limit));
            const result = await api.getImams(params.toString());
            setData(result);
        } catch (err) {
            console.error('Error fetching imams:', err);
        }
        setLoading(false);
    };

    const filteredData = data?.data?.filter((imam: any) => {
        if (!searchTerm) return true;
        const q = searchTerm.toLowerCase();
        return [
            imam.imam_name || imam.imamName,
            imam.mosque_name || imam.mosqueName,
            imam.governorate,
            imam.city,
            imam.district,
            imam.area?.nameEn,
            imam.area?.nameAr,
        ].some((field) => (field || '').toString().toLowerCase().includes(q));
    });

    const router = useRouter();

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header />
            <main className="flex-1">
                <div className="bg-gradient-to-br from-primary to-primary-light text-white py-16">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <span className="inline-block bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold mb-4 uppercase tracking-widest text-white/90">
                            {locale === 'ar' ? 'دليل الأئمة' : 'Imams Directory'}
                        </span>
                        <h1 className="text-4xl md:text-5xl font-black mb-4">{t('title')}</h1>
                        <p className="text-white/80 text-lg max-w-2xl">{t('subtitle')}</p>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
                    <div className="bg-white rounded-[24px] p-6 shadow-card border border-border flex flex-wrap gap-4 items-center">
                        <div className="flex-1 min-w-[200px] flex items-center gap-3 bg-cream rounded-xl px-4 py-3 border-2 border-transparent transition-all">
                            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="text-sm font-bold text-dark">
                                {geoLoading ? tc('loading') : lat ? `${lat.toFixed(2)}, ${lng?.toFixed(2)}` : (locale === 'ar' ? 'حدد موقعك الحالي' : 'Set location')}
                            </span>
                        </div>
                        <select
                            value={governorateId}
                            onChange={(e) => setGovernorateId(e.target.value)}
                            className="bg-cream rounded-xl px-4 py-3 min-w-[200px] outline-none border-2 border-transparent focus:border-primary text-sm font-bold cursor-pointer transition-all"
                        >
                            <option value="">{locale === 'ar' ? 'جميع المحافظات' : 'All governorates'}</option>
                            {governorates.map((g) => (
                                <option key={g.id} value={g.id}>{locale === 'ar' ? g.nameAr : g.nameEn}</option>
                            ))}
                        </select>
                        <select
                            value={areaId}
                            onChange={(e) => setAreaId(e.target.value)}
                            className="bg-cream rounded-xl px-4 py-3 min-w-[200px] outline-none border-2 border-transparent focus:border-primary text-sm font-bold cursor-pointer transition-all"
                            disabled={!governorateId}
                        >
                            <option value="">{locale === 'ar' ? 'كل المناطق' : 'All areas'}</option>
                            {areas.map((a) => (
                                <option key={a.id} value={a.id}>{locale === 'ar' ? a.nameAr : a.nameEn}</option>
                            ))}
                        </select>
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={locale === 'ar' ? 'بحث بالاسم أو المسجد' : 'Search name or mosque'}
                            className="bg-cream rounded-xl px-4 py-3 min-w-[220px] outline-none border-2 border-transparent focus:border-primary text-sm font-medium transition-all"
                        />
                    </div>
                </div>

                {/* Results */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="card p-6 animate-pulse">
                                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-4" />
                                    <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
                                    <div className="h-3 bg-gray-200 rounded w-2/3" />
                                </div>
                            ))}
                        </div>
                    ) : filteredData?.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredData.map((imam: any) => {
                                const card = {
                                    id: imam.id,
                                    entity: 'imam' as const,
                                    name: imam.imam_name || imam.imamName,
                                    mosque: imam.mosque_name || imam.mosqueName,
                                    location: formatLocationParts([
                                        imam.governorate,
                                        imam.area ? (locale === 'ar' ? imam.area.nameAr : imam.area.nameEn) : null,
                                        imam.city,
                                        imam.district,
                                    ]),
                                    typeLabel: locale === 'ar' ? 'إمام' : 'Imam',
                                    typeIcon: '🕌',
                                   map: imam.google_maps_url || imam.googleMapsUrl,
                                    video: imam.video_url || imam.videoUrl,
                                    whatsapp: imam.whatsapp,
                                    online: false,
                                    images: [],
                                    raw: imam,
                                };

                                return (
                                    <UnifiedCard
                                        key={imam.id}
                                        card={card}
                                        showWhatsApp={false}
                                        showImages={false}
                                        onViewDetails={() => router.push(`/${locale}/imams/${imam.id}`)}
                                    />
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-text mb-2">{tc('noResults')}</h3>
                            <p className="text-text-muted">
                                {locale === 'ar' ? 'جرب تغيير معايير البحث أو إضافة إمام جديد' : 'Try changing search criteria or add a new imam'}
                            </p>
                        </div>
                    )}

                    {/* Pagination */}
                    <Pagination
                        page={data?.meta?.page || page}
                        totalPages={data?.meta?.totalPages || 1}
                        onPageChange={setPage}
                        locale={locale}
                        className="mt-8"
                    />
                </div>
            </main>
            <Footer />
            <FAB />
            <ChatWidget />
        </div>
    );
}
