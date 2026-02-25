'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import FAB from '@/components/ui/FAB';
import ChatWidget from '@/components/chat/ChatWidget';
import { api } from '@/lib/api';
import { useGeolocationStore } from '@/lib/store';
import { getWhatsAppUrl } from '@/lib/utils';

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
        fetchData();
    }, [lat, lng, governorateId, areaId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (lat && lng) {
                params.set('lat', lat.toString());
                params.set('lng', lng.toString());
                params.set('radius', '10000');
            }
            if (governorateId) params.set('area_id', areaId || '');
            if (governorateId && !areaId) params.set('governorateId', governorateId);
            if (areaId) params.set('area_id', areaId);
            const result = await api.getImams(params.toString());
            setData(result);
        } catch (err) {
            console.error('Error fetching imams:', err);
        }
        setLoading(false);
    };

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
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setGovernorateId(e.target.value)}
                            className="bg-cream rounded-xl px-4 py-3 min-w-[200px] outline-none border-2 border-transparent focus:border-primary text-sm font-bold cursor-pointer transition-all"
                        >
                            <option value="">{locale === 'ar' ? 'جميع المحافظات' : 'All governorates'}</option>
                            {governorates.map((g) => (
                                <option key={g.id} value={g.id}>{locale === 'ar' ? g.nameAr : g.nameEn}</option>
                            ))}
                        </select>
                        <select
                            value={areaId}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAreaId(e.target.value)}
                            className="bg-cream rounded-xl px-4 py-3 min-w-[200px] outline-none border-2 border-transparent focus:border-primary text-sm font-bold cursor-pointer transition-all"
                            disabled={!governorateId}
                        >
                            <option value="">{locale === 'ar' ? 'كل المناطق' : 'All areas'}</option>
                            {areas.map((a) => (
                                <option key={a.id} value={a.id}>{locale === 'ar' ? a.nameAr : a.nameEn}</option>
                            ))}
                        </select>
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
                    ) : data?.data?.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {data.data.map((imam: any) => (
                                <div key={imam.id} className="bg-white rounded-[24px] overflow-hidden shadow-card border border-border group hover:-translate-y-1 transition-all duration-300 animate-fade-in p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <h3 className="font-black text-xl text-dark leading-tight group-hover:text-primary transition-colors">{imam.imam_name || imam.imamName}</h3>
                                            <div className="flex items-center gap-1.5 mt-2 text-text-muted">
                                                <div className="w-6 h-6 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-[10px]">🕌</div>
                                                <span className="text-sm font-bold">{imam.mosque_name || imam.mosqueName}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <span className="inline-flex items-center px-2.5 py-1 bg-green-50 text-green-700 rounded-lg text-[10px] font-black uppercase tracking-tight border border-green-100 italic">
                                                ✅ {locale === 'ar' ? 'موثق' : 'Verified'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 mb-6 p-4 bg-cream rounded-2xl border border-primary/5">
                                        <div className="flex items-center gap-2 text-xs font-bold text-text-muted">
                                            <span className="text-primary text-base">📍</span>
                                            {imam.area ? (locale === 'ar' ? imam.area.nameAr : imam.area.nameEn) : `${imam.governorate} — ${imam.city}`}
                                            {imam.district && ` — ${imam.district}`}
                                        </div>
                                        {imam.google_maps_url && (
                                            <div className="flex gap-3 text-[11px] font-semibold text-primary underline flex-wrap">
                                                <a href={imam.google_maps_url} target="_blank" rel="noreferrer">{locale === 'ar' ? 'افتح في الخرائط' : 'Open in Maps'}</a>
                                                <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(imam.google_maps_url)}`} target="_blank" rel="noreferrer">{locale === 'ar' ? 'اتجاهات' : 'Directions'}</a>
                                                <button type="button" onClick={() => navigator.clipboard.writeText(imam.google_maps_url)} className="text-primary underline">
                                                    {locale === 'ar' ? 'نسخ الرابط' : 'Copy link'}
                                                </button>
                                            </div>
                                        )}
                                        {imam.distance_meters && (
                                            <div className="flex items-center gap-2 text-xs font-black text-primary">
                                                <span className="bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">✨</span>
                                                {(imam.distance_meters / 1000).toFixed(1)} {tc('km')} {locale === 'ar' ? 'بعيداً عنك' : 'away'}
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <Link
                                            href={`/${locale}/imams/${imam.id}`}
                                            className="btn-outline !py-3 !px-2 text-xs text-center truncate"
                                        >
                                            {tc('viewDetails')}
                                        </Link>
                                        <a
                                            href={getWhatsAppUrl(imam.whatsapp)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn-primary !py-3 !px-2 text-xs flex items-center justify-center gap-1.5 shadow-[0_4px_12px_rgba(27,107,69,0.25)]"
                                        >
                                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                            </svg>
                                            {tc('whatsapp')}
                                        </a>
                                    </div>
                                </div>
                            ))}
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
                    {data?.meta && data.meta.totalPages > 1 && (
                        <div className="flex justify-center gap-2 mt-8">
                            {Array.from({ length: Math.min(data.meta.totalPages, 5) }, (_, i) => i + 1).map((p) => (
                                <button
                                    key={p}
                                    className={`w-10 h-10 rounded-btn font-medium transition-all ${p === data.meta.page ? 'bg-primary text-white' : 'bg-white text-text hover:bg-primary-light'
                                        }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </main>
            <Footer />
            <FAB />
            <ChatWidget />
        </div>
    );
}
