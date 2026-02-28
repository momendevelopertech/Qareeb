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
import UnifiedCard from '@/components/public/UnifiedCard';
import { useRouter } from 'next/navigation';

const typeLabels: Record<string, Record<string, string>> = {
    ar: { men: 'رجال', women: 'نساء', children: 'أطفال', mixed: 'مختلط' },
    en: { men: 'Men', women: 'Women', children: 'Children', mixed: 'Mixed' },
};



export default function HalaqatPage() {
    const t = useTranslations('halaqat');
    const tc = useTranslations('common');
    const locale = useLocale();
    const searchParams = useSearchParams();
    const { lat, lng, requestLocation } = useGeolocationStore();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedType, setSelectedType] = useState(searchParams.get('type') || '');
    const [governorates, setGovernorates] = useState<any[]>([]);
    const [areas, setAreas] = useState<any[]>([]);
    const [governorateId, setGovernorateId] = useState<string>(searchParams.get('governorateId') || '');
    const [areaId, setAreaId] = useState<string>(searchParams.get('areaId') || '');
    const [searchTerm, setSearchTerm] = useState<string>(searchParams.get('query') || '');
    const [onlineOnly, setOnlineOnly] = useState<boolean>(searchParams.get('onlineOnly') === 'true');
    const [page, setPage] = useState<number>(Number(searchParams.get('page') || 1));
    const limit = 6;

    useEffect(() => { requestLocation(); api.getGovernorates().then(setGovernorates).catch(console.error); }, []);

    useEffect(() => {
        if (governorateId) {
            api.getAreas(governorateId).then(setAreas).catch(console.error);
        } else {
            setAreas([]);
            setAreaId('');
        }
    }, [governorateId]);

    useEffect(() => { void fetchData(); }, [lat, lng, selectedType, governorateId, areaId, governorates, onlineOnly, page]);
    useEffect(() => { setPage(1); }, [selectedType, governorateId, areaId, onlineOnly]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (lat && lng) { params.set('lat', lat.toString()); params.set('lng', lng.toString()); params.set('radius', '10000'); }
            if (selectedType) params.set('type', selectedType);
            if (onlineOnly) params.set('isOnline', 'true');
            if (areaId) {
                params.set('area_id', areaId);
            } else if (governorateId) {
                params.set('governorateId', governorateId);
            }
            params.set('page', String(page));
            params.set('limit', String(limit));
            const result = await api.getHalaqat(params.toString());
            setData(result);
        } catch (err) { console.error('Error:', err); }
        setLoading(false);
    };

    const filteredData = data?.data?.filter((halqa: any) => {
        if (!searchTerm) return true;
        const q = searchTerm.toLowerCase();
        return [
            halqa.circle_name || halqa.circleName,
            halqa.mosque_name || halqa.mosqueName,
            halqa.governorate,
            halqa.city,
            halqa.area?.nameEn,
            halqa.area?.nameAr,
        ].some((field) => (field || '').toString().toLowerCase().includes(q));
    });

    const router = useRouter();

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header />
            <main className="flex-1">
                <div className="bg-gradient-to-br from-[#1B6B45] to-[#2D8A5E] text-white py-16">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <span className="inline-block bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold mb-4 uppercase tracking-widest text-white/90">
                            {locale === 'ar' ? 'حلقات التحفيظ' : 'Quran Circles'}
                        </span>
                        <h1 className="text-4xl md:text-5xl font-black mb-4">{t('title')}</h1>
                        <p className="text-white/80 text-lg max-w-2xl">{t('subtitle')}</p>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
                    <div className="bg-white rounded-[24px] p-4 flex flex-wrap gap-2 shadow-card border border-border">
                        <button
                            onClick={() => setSelectedType('')}
                            className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${!selectedType ? 'bg-primary text-white shadow-lg' : 'bg-cream text-text-muted hover:bg-primary/5 hover:text-primary'}`}
                        >
                            {locale === 'ar' ? 'الكل' : 'All'}
                        </button>
                        {['men', 'women', 'children', 'mixed'].map((type) => (
                            <button
                                key={type}
                                onClick={() => setSelectedType(type)}
                                className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${selectedType === type ? 'bg-primary text-white shadow-lg' : 'bg-cream text-text-muted hover:bg-primary/5 hover:text-primary'}`}
                            >
                                {typeLabels[locale]?.[type] || type}
                            </button>
                        ))}

                        <select
                            value={governorateId}
                            onChange={(e) => setGovernorateId(e.target.value)}
                            className="px-4 py-2.5 rounded-xl text-sm font-black bg-cream border-2 border-transparent focus:border-primary"
                        >
                            <option value="">{locale === 'ar' ? 'كل المحافظات' : 'All governorates'}</option>
                            {governorates.map((g) => (
                                <option key={g.id} value={g.id}>{locale === 'ar' ? g.nameAr : g.nameEn}</option>
                            ))}
                        </select>
                        <select
                            value={areaId}
                            onChange={(e) => setAreaId(e.target.value)}
                            disabled={!governorateId}
                            className="px-4 py-2.5 rounded-xl text-sm font-black bg-cream border-2 border-transparent focus:border-primary disabled:opacity-50"
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
                            className="px-4 py-2.5 rounded-xl text-sm font-medium bg-cream border-2 border-transparent focus:border-primary min-w-[220px]"
                        />
                        <button
                            onClick={() => setOnlineOnly(!onlineOnly)}
                            className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${onlineOnly ? 'bg-blue-100 text-blue-700 shadow-lg' : 'bg-cream text-text-muted hover:bg-blue-50 hover:text-blue-700'}`}
                        >
                            📺 {locale === 'ar' ? 'أونلاين فقط' : 'Online only'}
                        </button>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="card p-6 animate-pulse"><div className="h-4 bg-gray-200 rounded w-3/4 mb-4" /><div className="h-3 bg-gray-200 rounded w-1/2" /></div>
                            ))}
                        </div>
                    ) : filteredData?.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredData.map((halqa: any) => {
                                const halqaType = halqa.halqa_type || halqa.halqaType;
                                const card = {
                                    id: halqa.id,
                                    entity: 'halqa' as const,
                                    name: halqa.circle_name || halqa.circleName,
                                    mosque: halqa.mosque_name || halqa.mosqueName,
                                    location: halqa.area
                                        ? (locale === 'ar' ? halqa.area.nameAr : halqa.area.nameEn)
                                        : [
                                              halqa.governorate,
                                              halqa.city,
                                              halqa.district,
                                          ]
                                              .filter(Boolean)
                                              .join(' — '),
                                    typeLabel: typeLabels[locale]?.[halqaType] || halqaType || (locale === 'ar' ? 'حلقة' : 'Circle'),
                                    typeIcon: '📖',
                                    map: halqa.google_maps_url,
                                    video: halqa.video_url || halqa.videoUrl,
                                    whatsapp: halqa.whatsapp,
                                    online: (halqa.additional_info || halqa.additionalInfo || '').toString().startsWith('[ONLINE]'),
                                    images: [],
                                    raw: halqa,
                                };

                                return (
                                    <div key={halqa.id} className="flex flex-col gap-2">
                                        <UnifiedCard
                                            card={card}
                                            showWhatsApp
                                            showImages={false}
                                            onViewDetails={() => router.push(`/${locale}/halaqat/${halqa.id}`)}
                                        />
                                        {(halqa.additional_info || halqa.additionalInfo) && (
                                            <p className="text-sm text-text font-medium leading-relaxed italic line-clamp-3 ps-1">
                                                " {halqa.additional_info || halqa.additionalInfo} "
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <h3 className="text-lg font-semibold mb-2">{tc('noResults')}</h3>
                        </div>
                    )}
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
