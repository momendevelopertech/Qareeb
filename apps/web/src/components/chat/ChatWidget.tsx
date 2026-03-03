'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useChatStore, useGeolocationStore } from '@/lib/store';
import { api } from '@/lib/api';
import { FaMosque, FaTools } from 'react-icons/fa';
import AppIcon from '@/components/ui/AppIcon';
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
    const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'ready'>('idle');
    const [locationLabel, setLocationLabel] = useState<string>('');
    const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);

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

    const getBrowserCoords = async (forceFresh = false): Promise<{ lat: number; lng: number }> => {
        if (!navigator.geolocation) throw new Error('Geolocation not supported');

        const getPosition = (options: PositionOptions) => new Promise<{ lat: number; lng: number }>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                reject,
                options,
            );
        });

        try {
            return await getPosition({
                enableHighAccuracy: false,
                timeout: 15000,
                maximumAge: forceFresh ? 0 : 60_000,
            });
        } catch {
            return getPosition({
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: forceFresh ? 0 : 60_000,
            });
        }
    };

    const getLocationByIP = async (): Promise<{ lat: number; lng: number }> => {
        const res = await fetch('https://ipapi.co/json/');
        if (!res.ok) throw new Error('IP geolocation failed');
        const data = await res.json() as { latitude?: number; longitude?: number };
        if (!Number.isFinite(data.latitude) || !Number.isFinite(data.longitude)) {
            throw new Error('Invalid IP geolocation response');
        }
        return { lat: data.latitude as number, lng: data.longitude as number };
    };

    const resolveReadableLocation = async (coords: { lat: number; lng: number }) => {
        try {
            const url = new URL('https://nominatim.openstreetmap.org/reverse');
            url.searchParams.set('format', 'jsonv2');
            url.searchParams.set('lat', String(coords.lat));
            url.searchParams.set('lon', String(coords.lng));
            url.searchParams.set('zoom', '16');
            url.searchParams.set('accept-language', locale === 'ar' ? 'ar' : 'en');

            const response = await fetch(url.toString(), {
                headers: {
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) throw new Error('Reverse geocoding failed');

            const data = await response.json() as {
                display_name?: string;
                address?: Record<string, string | undefined>;
            };

            const parts = [
                data.address?.suburb,
                data.address?.city || data.address?.town || data.address?.village,
                data.address?.state,
            ].filter(Boolean);

            if (parts.length) return parts.join(' - ');
            if (data.display_name) return data.display_name;
        } catch {
            // Silent fallback to coordinates.
        }

        return `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
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
        const radiusKm = 10;
        const res = await api.nearestSearch(userLat, userLng, type, { radiusKm, limit: 5 });
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

        setPendingType(type);
        setShowLocationChooser(true);
        setLocationStatus('idle');
        setLocationLabel('');
        setLocationCoords(null);
        addMessage(
            'bot',
            locale === 'ar'
                ? 'حدد موقعك للبحث: اختار الموقع الحالي أو المحافظة والمنطقة.'
                : 'Choose location: use current location or select governorate/area.',
        );
    };

    const handleCurrentLocationNow = async (forceFresh = false) => {
        if (!pendingType) return;
        setLoadingSearch(true);
        setLocationStatus('loading');
        addMessage(
            'bot',
            locale === 'ar'
                ? 'انت كده اللوكيشن بتاعك اهو.. جاري البحث عن الأقرب.'
                : 'Got it — using your current location. Searching for nearest results.',
        );
        let coords: { lat: number; lng: number };
        let usedIpFallback = false;

        try {
            if (Number.isFinite(lat) && Number.isFinite(lng) && !forceFresh) {
                coords = { lat: lat as number, lng: lng as number };
            } else {
                try {
                    coords = await getBrowserCoords(forceFresh);
                } catch {
                    coords = await getLocationByIP();
                    usedIpFallback = true;
                }
            }

            setLocationCoords(coords);
            const readableLocation = await resolveReadableLocation(coords);
            setLocationLabel(readableLocation);
            setLocationStatus('ready');

            try {
                await searchByNearest(pendingType, coords.lat, coords.lng);

                addMessage(
                    'bot',
                    locale === 'ar'
                        ? `موقعك الحالي الآن: ${readableLocation}. سنعتمد نفس طريقة القراءة دي لكل نتائج الأقرب.`
                        : `Your current location is: ${readableLocation}. We'll use this same location reading method for nearest results.`,
                );

                if (usedIpFallback) {
                    addMessage(
                        'bot',
                        locale === 'ar'
                            ? 'تعذر الوصول لـ GPS، فتم استخدام موقع تقريبي حسب الشبكة لإظهار النتائج الأقرب.'
                            : 'GPS location was unavailable, so a network/IP-based approximate location was used to find nearby results.',
                    );
                }
                setShowLocationChooser(false);
                setPendingType(null);
            } catch {
                addMessage(
                    'bot',
                    locale === 'ar'
                        ? 'تعذر البحث بالموقع الحالي الآن. حاول مرة أخرى أو اختر المحافظة والمنطقة.'
                        : 'Could not search by current location right now. Please try again or select governorate and area.',
                );
            }
        } catch {
            setLocationStatus('idle');
            addMessage(
                'bot',
                locale === 'ar'
                    ? 'تعذر تحديد موقعك الحالي تلقائياً. فعّل إذن الموقع/‏GPS من إعدادات الهاتف أو اللابتوب، ثم اعمل تحديث (Refresh) للصفحة وحاول مرة تانية، أو اختر المحافظة والمنطقة.'
                    : 'Could not determine your current location automatically. Enable location permission/GPS from your phone or laptop settings, refresh the page, and try again, or select governorate and area.',
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
            <button
                onClick={toggleChat}
                className="fixed bottom-6 start-6 z-40 w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary-dark text-white border-2 border-white/90 ring-4 ring-white/35 shadow-[0_14px_34px_rgba(9,55,33,0.45)] flex items-center justify-center transition-all duration-300 hover:scale-110 hover:ring-white/55"
                aria-label="chat"
            >
                <AppIcon name="chat" className="w-5 h-5" />
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
                        <div className="space-y-2">
                            <div
                                className="flex items-center gap-2 bg-cream rounded-xl px-3 py-2 border max-w-[260px] cursor-pointer transition-colors border-transparent hover:border-primary/20"
                                role="button"
                                tabIndex={0}
                                title={locale === 'ar' ? 'تحديث الموقع' : 'Refresh location'}
                                onClick={() => handleCurrentLocationNow(false)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCurrentLocationNow(false)}
                            >
                                <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z"></path>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"></path>
                                </svg>
                                <span className="text-[11px] font-bold truncate text-dark">
                                    {locationStatus === 'loading'
                                        ? (locale === 'ar' ? 'جارٍ تحديد الموقع...' : 'Locating...')
                                        : (locationLabel || (locale === 'ar' ? 'اضغط لتحديد موقعك الحالي' : 'Tap to use current location'))}
                                </span>
                                <button
                                    className="p-1 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                                    aria-label={locale === 'ar' ? 'تحديث الموقع' : 'Refresh location'}
                                    title={locale === 'ar' ? 'تحديث الموقع' : 'Refresh location'}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        void handleCurrentLocationNow(true);
                                    }}
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m14.836 2A8.003 8.003 0 005.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-13.837-2m13.837 2H15"></path>
                                    </svg>
                                </button>
                            </div>
                            {locationCoords && (
                                <div className="text-[11px] text-text-muted">
                                    {locationCoords.lat.toFixed(5)}, {locationCoords.lng.toFixed(5)}
                                </div>
                            )}
                        </div>
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
