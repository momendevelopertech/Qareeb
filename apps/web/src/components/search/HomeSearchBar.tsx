'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { api } from '@/lib/api';
import AppIcon from '@/components/ui/AppIcon';
import { normalizeArabicSearch } from '@/lib/utils';

type Gov = { id: string; nameAr: string; nameEn: string };
type Area = { id: string; nameAr: string; nameEn: string };

export default function HomeSearchBar() {
    const locale = useLocale();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [searchTerm, setSearchTerm] = useState(searchParams.get('query') || '');
    const [type, setType] = useState<'all' | 'imams' | 'halqa' | 'maintenance'>((searchParams.get('tab') as 'all' | 'imams' | 'halqa' | 'maintenance') || 'all');
    const [governorates, setGovernorates] = useState<Gov[]>([]);
    const [areas, setAreas] = useState<Area[]>([]);
    const [governorateId, setGovernorateId] = useState(searchParams.get('governorateId') || '');
    const [areaId, setAreaId] = useState(searchParams.get('areaId') || '');

    useEffect(() => {
        setSearchTerm(searchParams.get('query') || '');
        setType((searchParams.get('tab') as 'all' | 'imams' | 'halqa' | 'maintenance') || 'all');
        setGovernorateId(searchParams.get('governorateId') || '');
        setAreaId(searchParams.get('areaId') || '');
    }, [searchParams]);

    useEffect(() => {
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const params = new URLSearchParams();
        const normalizedSearch = normalizeArabicSearch(searchTerm.trim());
        if (normalizedSearch) params.set('query', normalizedSearch);
        if (governorateId) params.set('governorateId', governorateId);
        if (areaId) params.set('areaId', areaId);
        if (type !== 'all') {
            params.set('tab', type);
        }
        router.push(`/${locale}/search?${params.toString()}`);
    };

    return (
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto bg-white rounded-[24px] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.12)] border border-border flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[200px] flex items-center gap-3 bg-cream rounded-xl px-4 py-3 border-2 border-transparent focus-within:border-primary focus-within:bg-white transition-all">
                <AppIcon name="search" className="w-4 h-4 text-text-muted" />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={locale === 'ar' ? 'ابحث عن إمام، حلقة، أو مسجد...' : 'Search for imams, circles, or mosques...'}
                    className="bg-transparent w-full outline-none text-[15px] font-medium"
                />
            </div>

            <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="bg-cream rounded-xl px-4 py-3 min-w-[150px] outline-none border-2 border-transparent focus:border-primary text-sm font-bold cursor-pointer transition-all"
            >
                <option value="all">{locale === 'ar' ? 'الكل' : 'All'}</option>
                <option value="imams">{locale === 'ar' ? 'أئمة' : 'Imams'}</option>
                <option value="halqa">{locale === 'ar' ? 'حلقات' : 'Circles'}</option>
                <option value="maintenance">{locale === 'ar' ? 'إعمار' : 'Maintenance'}</option>
            </select>

            <select
                value={governorateId}
                onChange={(e) => setGovernorateId(e.target.value)}
                className="bg-cream rounded-xl px-4 py-3 min-w-[140px] outline-none border-2 border-transparent focus:border-primary text-sm font-bold cursor-pointer transition-all"
            >
                <option value="">{locale === 'ar' ? 'كل المحافظات' : 'All Governorates'}</option>
                {governorates.map((g) => (
                    <option key={g.id} value={g.id}>{locale === 'ar' ? g.nameAr : g.nameEn}</option>
                ))}
            </select>

            <select
                value={areaId}
                onChange={(e) => setAreaId(e.target.value)}
                disabled={!governorateId}
                className="bg-cream rounded-xl px-4 py-3 min-w-[140px] outline-none border-2 border-transparent focus:border-primary text-sm font-bold cursor-pointer transition-all disabled:opacity-50"
            >
                <option value="">{locale === 'ar' ? 'كل المناطق' : 'All Areas'}</option>
                {areas.map((a) => (
                    <option key={a.id} value={a.id}>{locale === 'ar' ? a.nameAr : a.nameEn}</option>
                ))}
            </select>

            <button type="submit" className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-primary-light transition-all">
                {locale === 'ar' ? 'بحث' : 'Search'}
            </button>
        </form>
    );
}
