'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useChatStore, useGeolocationStore } from '@/lib/store';
import { api } from '@/lib/api';
import { FaMosque, FaTools } from 'react-icons/fa';
import { GiPrayerBeads } from 'react-icons/gi';

type SearchType = 'imam' | 'halqa' | 'maintenance';

type ChatCard = {
    id: string;
    type: SearchType;
    name: string;
    address: string;
    googleMapUrl?: string;
};

export default function ChatWidget() {
    const locale = useLocale();
    const router = useRouter();
    const { isOpen, messages, toggleChat, addMessage } = useChatStore();
    const { lat, lng, requestLocation } = useGeolocationStore();

    const [input, setInput] = useState('');
    const [cards, setCards] = useState<ChatCard[]>([]);

    const [pendingType, setPendingType] = useState<SearchType | null>(null);
    const [showLocationChooser, setShowLocationChooser] = useState(false);
    const [loadingSearch, setLoadingSearch] = useState(false);

    const [governorates, setGovernorates] = useState<any[]>([]);
    const [areas, setAreas] = useState<any[]>([]);
    const [governorateId, setGovernorateId] = useState('');
    const [areaId, setAreaId] = useState('');

    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, cards, showLocationChooser]);

    useEffect(() => {
        requestLocation();
    }, [requestLocation]);

    useEffect(() => {
        if (!showLocationChooser || governorates.length) return;
        void api.getGovernorates().then(setGovernorates).catch(() => undefined);
    }, [showLocationChooser, governorates.length]);

    useEffect(() => {
        if (!governorateId) {
            setAreas([]);
            setAreaId('');
            return;
        }
        void api.getAreas(governorateId).then(setAreas).catch(() => undefined);
    }, [governorateId]);

    const typeLabel = (type: SearchType) => {
        if (type === 'imam') return locale === 'ar' ? 'المساجد/الأئمة' : 'imams/mosques';
        if (type === 'halqa') return locale === 'ar' ? 'الحلقات' : 'halaqat';
        return locale === 'ar' ? 'الصيانة' : 'maintenance';
    };

    const mapEntityToCard = (item: any, type: SearchType): ChatCard => ({
        id: item.id,
        type,
        name: item.imam_name || item.imamName || item.circle_name || item.circleName || item.mosque_name || item.mosqueName || '-',
        address: item.area
            ? (locale === 'ar' ? item.area.nameAr : item.area.nameEn)
            : [item.governorate, item.city, item.district].filter(Boolean).join(' - '),
        googleMapUrl: item.google_maps_url || item.googleMapsUrl || '',
    });

    const getBrowserCoords = async (): Promise<{ lat: number; lng: number }> => {
        if (!navigator.geolocation) throw new Error('Geolocation not supported');

        const getPosition = (options?: PositionOptions) => new Promise<{ lat: number; lng: number }>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                reject,
                options,
            );
        });

        try {
            return await getPosition({ enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 });
        } catch {
            return getPosition({ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
        }
    };

    const send = async (text?: string) => {
        const value = (text ?? input).trim();
        if (!value) return;

        addMessage('user', value);
        setInput('');

        try {
            const res = await api.chatNearest({ text: value, lat: lat ?? undefined, lng: lng ?? undefined });
            if (res?.message) addMessage('bot', res.message);
            const serverCards = Array.isArray(res?.cards) ? (res.cards as any[]) : [];
            setCards(serverCards.map((c) => ({
                id: c.id,
                type: c.type,
                name: c.name,
                address: c.address,
                googleMapUrl: c.googleMapUrl,
            })));
        } catch {
            addMessage('bot', locale === 'ar' ? 'حدث خطأ غير متوقع.' : 'Something went wrong.');
            setCards([]);
        }
    };

    const searchByNearest = async (type: SearchType, userLat: number, userLng: number) => {
        const radiusKm = 5;
        const res = await api.nearestSearch(userLat, userLng, type, { radiusKm, limit: 10 });
        const result = Array.isArray(res?.data) ? res.data : [];
        setCards(result.map((c: any) => ({
            id: c.id,
            type: c.type || type,
            name: c.name,
            address: c.address,
            googleMapUrl: c.googleMapUrl,
        })));

        if (!result.length) {
            addMessage('bot', locale === 'ar' ? 'لم أجد نتائج قريبة حالياً.' : 'No nearby results right now.');
            return;
        }

        addMessage(
            'bot',
            locale === 'ar'
                ? `هذه أقرب النتائج في ${typeLabel(type)} داخل نطاق ${radiusKm} كم.`
                : `Here are the nearest ${typeLabel(type)} results within ${radiusKm} km.`,
        );
    };

    const searchByAddress = async (type: SearchType) => {
        const params = new URLSearchParams();
        params.set('limit', '3');
        if (areaId) params.set('area_id', areaId);
        else if (governorateId) params.set('governorateId', governorateId);

        const query = params.toString();
        let res: any;
        if (type === 'imam') res = await api.getImams(query);
        else if (type === 'halqa') res = await api.getHalaqat(query);
        else res = await api.getMaintenance(query);

        const rows = Array.isArray(res?.data) ? res.data : [];
        const mapped = rows.slice(0, 3).map((row: any) => mapEntityToCard(row, type));
        setCards(mapped);

        if (!mapped.length) {
            addMessage('bot', locale === 'ar' ? 'لا يوجد نتائج في العنوان المحدد حالياً.' : 'No results in the selected address right now.');
            return;
        }

        addMessage('bot', locale === 'ar' ? `هذه أفضل النتائج في ${typeLabel(type)} حسب المنطقة.` : `Here are the top ${typeLabel(type)} results for that area.`);
    };

    const quickSearch = async (type: SearchType, promptLabel: string) => {
        addMessage('user', promptLabel);
        setCards([]);

        if (Number.isFinite(lat) && Number.isFinite(lng)) {
            setLoadingSearch(true);
            try {
                await searchByNearest(type, lat as number, lng as number);
                setShowLocationChooser(false);
                setPendingType(null);
            } catch {
                addMessage('bot', locale === 'ar' ? 'تعذر البحث بالموقع الحالي.' : 'Could not search by current location.');
            }
            setLoadingSearch(false);
            return;
        }

        setPendingType(type);
        setShowLocationChooser(true);
        addMessage(
            'bot',
            locale === 'ar'
                ? 'حدد موقعك: استخدم الموقع الحالي أو اختر المحافظة والمنطقة.'
                : 'Choose location: use current location or select governorate/area.',
        );
    };

    const useCurrentLocationNow = async () => {
        if (!pendingType) return;
        setLoadingSearch(true);
        try {
            const coords = await getBrowserCoords();
            await searchByNearest(pendingType, coords.lat, coords.lng);
            setShowLocationChooser(false);
            setPendingType(null);
        } catch {
            addMessage(
                'bot',
                locale === 'ar'
                    ? 'تعذر تحديد موقعك الحالي تلقائياً. فعّل إذن الموقع/‏GPS من إعدادات هاتفك أو اللابتوب ثم ارجع للتطبيق وجرب مرة تانية، أو اختر المحافظة والمنطقة.'
                    : 'Could not determine your current location automatically. Enable location permission/GPS from your phone or laptop settings, return to the app, and try again, or select governorate and area.',
            );
        }
        setLoadingSearch(false);
    };

    const searchWithSelectedAddress = async () => {
        if (!pendingType) return;
        if (!governorateId) {
            addMessage('bot', locale === 'ar' ? 'اختر المحافظة أولاً.' : 'Select governorate first.');
            return;
        }

        setLoadingSearch(true);
        try {
            await searchByAddress(pendingType);
            setShowLocationChooser(false);
            setPendingType(null);
        } catch {
            addMessage('bot', locale === 'ar' ? 'فشل البحث بالعنوان المحدد.' : 'Address search failed.');
        }
        setLoadingSearch(false);
    };

    const quickButtons = [
        {
            label: locale === 'ar' ? 'أقرب مسجد' : 'Nearest mosque',
            type: 'imam' as const,
            icon: <FaMosque className="text-base" aria-hidden="true" />,
            style: 'border-emerald-200 bg-emerald-50/80 text-emerald-900 hover:bg-emerald-600 hover:text-white hover:border-emerald-600',
        },
        {
            label: locale === 'ar' ? 'أقرب حلقة' : 'Nearest halqa',
            type: 'halqa' as const,
            icon: <GiPrayerBeads className="text-base" aria-hidden="true" />,
            style: 'border-sky-200 bg-sky-50/80 text-sky-900 hover:bg-sky-600 hover:text-white hover:border-sky-600',
        },
        {
            label: locale === 'ar' ? 'مسجد يحتاج صيانة' : 'Mosque needs maintenance',
            type: 'maintenance' as const,
            icon: <FaTools className="text-sm" aria-hidden="true" />,
            style: 'border-amber-200 bg-amber-50/80 text-amber-900 hover:bg-amber-600 hover:text-white hover:border-amber-600',
        },
    ];

    if (!isOpen) {
        return (
            <button onClick={toggleChat} className="fixed bottom-6 start-6 z-40 w-16 h-16 bg-primary text-white rounded-full shadow-fab flex items-center justify-center hover:scale-110 transition-all" aria-label="chat">
                💬
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 start-6 z-40 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-border overflow-hidden">
            <div className="bg-gradient-to-r from-primary to-primary-light px-5 py-4 flex items-center justify-between text-white">
                <span className="font-black">{locale === 'ar' ? 'مساعد قريب' : 'Qareeb Assistant'}</span>
                <button onClick={toggleChat} aria-label="close">×</button>
            </div>

            <div className="h-80 overflow-y-auto p-4 space-y-3 bg-cream/30">
                <div className="text-xs bg-white border border-border rounded-xl p-3">
                    {locale === 'ar' ? 'اختَر الخدمة المطلوبة وسنبحث لك عن الأقرب.' : 'Choose the needed service and we will find the nearest options.'}
                </div>

                <div className="grid gap-2">
                    {quickButtons.map((item) => (
                        <button
                            key={item.label}
                            onClick={() => quickSearch(item.type, item.label)}
                            className={`text-xs border px-3 py-2.5 rounded-xl text-start transition-all duration-200 flex items-center gap-2 ${item.style}`}
                            disabled={loadingSearch}
                        >
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/85 text-current shadow-sm">
                                {item.icon}
                            </span>
                            <span className="font-semibold">{item.label}</span>
                        </button>
                    ))}
                </div>

                {showLocationChooser && pendingType && (
                    <div className="bg-white border border-border rounded-xl p-3 space-y-2 text-xs">
                        <p className="font-bold">{locale === 'ar' ? 'حدد موقعك للبحث' : 'Choose location for search'}</p>
                        <button onClick={useCurrentLocationNow} className="btn-outline !py-1 !px-2 text-[11px]" disabled={loadingSearch}>
                            {locale === 'ar' ? 'استخدم موقعي الحالي' : 'Use current location'}
                        </button>
                        <div className="grid grid-cols-1 gap-2">
                            <select value={governorateId} onChange={(e) => setGovernorateId(e.target.value)} className="px-2 py-2 rounded-lg border border-border bg-white">
                                <option value="">{locale === 'ar' ? 'اختر المحافظة' : 'Select governorate'}</option>
                                {governorates.map((g) => (
                                    <option key={g.id} value={g.id}>{locale === 'ar' ? g.nameAr : g.nameEn}</option>
                                ))}
                            </select>
                            <select value={areaId} onChange={(e) => setAreaId(e.target.value)} disabled={!governorateId} className="px-2 py-2 rounded-lg border border-border bg-white disabled:opacity-50">
                                <option value="">{locale === 'ar' ? 'كل المناطق' : 'All areas'}</option>
                                {areas.map((a) => (
                                    <option key={a.id} value={a.id}>{locale === 'ar' ? a.nameAr : a.nameEn}</option>
                                ))}
                            </select>
                            <button onClick={searchWithSelectedAddress} className="btn-primary !py-1.5 !px-3 text-xs" disabled={loadingSearch}>
                                {loadingSearch ? (locale === 'ar' ? 'جارٍ البحث...' : 'Searching...') : (locale === 'ar' ? 'ابحث حسب العنوان' : 'Search by address')}
                            </button>
                        </div>
                    </div>
                )}

                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm ${msg.from === 'user' ? 'bg-primary text-white' : 'bg-white border border-border text-dark'}`}>{msg.text}</div>
                    </div>
                ))}

                {cards.length > 0 && (
                    <div className="space-y-2">
                        {cards.map((card) => (
                            <div key={card.id} className="bg-white border border-border rounded-xl p-3 text-xs space-y-2">
                                <p className="font-bold">{card.name}</p>
                                <p className="text-text-muted">{card.address}</p>
                                <div className="flex gap-2 flex-wrap">
                                    {card.googleMapUrl && <a className="btn-outline !py-1 !px-2 text-[11px]" href={card.googleMapUrl} target="_blank" rel="noreferrer">Google Maps</a>}
                                    <button
                                        className="btn-outline !py-1 !px-2 text-[11px]"
                                        onClick={() => {
                                            const path = card.type === 'halqa' ? 'halaqat' : card.type === 'imam' ? 'imams' : 'maintenance';
                                            router.push(`/${locale}/${path}/${card.id}`);
                                        }}
                                    >
                                        {locale === 'ar' ? 'عرض التفاصيل' : 'View details'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-border p-3 bg-white flex gap-2">
                <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder={locale === 'ar' ? 'اكتب سؤالك...' : 'Ask...'} className="flex-1 px-3 py-2 bg-cream rounded-xl text-sm outline-none" />
                <button onClick={() => send()} className="bg-primary text-white px-3 rounded-xl">↵</button>
            </div>
        </div>
    );
}
