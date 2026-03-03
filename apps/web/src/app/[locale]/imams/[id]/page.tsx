import { getLocale } from 'next-intl/server';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { extractLatLngFromGoogleMaps, getGoogleMapsEmbedUrl } from '@/lib/maps';
import { formatLocationParts } from '@/lib/location';
import LocationMapSection from '@/components/public/LocationMapSection';
import VideoEmbedPanel from '@/components/public/VideoEmbedPanel';
import AppIcon from '@/components/ui/AppIcon';

export const revalidate = 300;

async function getImam(id: string): Promise<any> {
    try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1';
        const res = await fetch(`${API_URL}/imams/${id}`, { next: { revalidate: 300 } });
        if (!res.ok) return null;
        return res.json();
    } catch {
        return null;
    }
}

export default async function ImamDetailPage({ params }: { params: { id: string } }) {
    const locale = await getLocale();
    const imam = await getImam(params.id);

    if (!imam) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold mb-4">{locale === 'ar' ? 'الإمام غير موجود' : 'Imam Not Found'}</h1>
                        <Link href={`/${locale}/imams`} className="btn-primary">
                            {locale === 'ar' ? 'العودة للقائمة' : 'Back to List'}
                        </Link>
                    </div>
                </main>
            </div>
        );
    }

    const coords = (typeof imam.latitude === 'number' && typeof imam.longitude === 'number' && (imam.latitude !== 0 || imam.longitude !== 0))
        ? { lat: imam.latitude, lng: imam.longitude }
        : extractLatLngFromGoogleMaps(imam.googleMapsUrl || imam.google_maps_url);

    const mapHref = coords
        ? `https://www.google.com/maps?q=${encodeURIComponent(`${coords.lat},${coords.lng}`)}&z=15`
        : (imam.googleMapsUrl || imam.google_maps_url || null);

    const mapEmbedUrl = mapHref ? getGoogleMapsEmbedUrl(mapHref) : null;
    const directionsDestination = coords ? `${coords.lat},${coords.lng}` : (imam.googleMapsUrl || imam.google_maps_url || '');
    const recitationUrl = imam.recitationUrl || imam.recitation_url || imam.videoUrl || imam.video_url || '';

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header />
            <main className="flex-1">
                <div className="bg-gradient-to-br from-[#1B6B45] to-[#2D8A5E] text-white py-16">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                        <Link href={`/${locale}/imams`} className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm transition-all hover:bg-white/20">
                            <svg className="w-5 h-5 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            <span className="font-bold text-sm">{locale === 'ar' ? 'العودة إلى صفحة الأئمة' : 'Back to Imams'}</span>
                        </Link>
                        <span className="block text-accent font-black text-sm uppercase tracking-widest mb-2">
                            {locale === 'ar' ? 'بيانات الإمام' : 'Imam Profile'}
                        </span>
                        <h1 className="text-4xl md:text-5xl font-black">{imam.imamName}</h1>
                        <div className="flex items-center gap-2 mt-4 text-white/90 font-bold">
                            <AppIcon name="mosque" className="w-6 h-6" />
                            {imam.mosqueName}
                        </div>
                    </div>
                </div>

                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 pb-16">
                    <div className="bg-white rounded-[32px] p-8 md:p-12 shadow-card border border-border">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div className="space-y-8">
                                <div className="p-6 bg-cream rounded-2xl border border-primary/5 space-y-2">
                                    <h3 className="font-black text-primary text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <AppIcon name="location" className="w-4 h-4" />
                                        {locale === 'ar' ? 'الموقع والتواجد' : 'Location & Presence'}
                                    </h3>
                                    <p className="text-dark font-bold text-lg leading-relaxed">
                                        {formatLocationParts([
                                            imam.governorate,
                                            imam.area ? (locale === 'ar' ? imam.area.nameAr : imam.area.nameEn) : null,
                                            imam.city,
                                            imam.district,
                                        ])}
                                    </p>
                                    {mapHref && (
                                        <div className="flex gap-3 text-sm font-bold text-primary underline flex-wrap">
                                            <a href={mapHref} target="_blank" rel="noreferrer">{locale === 'ar' ? 'افتح في الخرائط' : 'Open in Maps'}</a>
                                            <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(directionsDestination)}`} target="_blank" rel="noreferrer">{locale === 'ar' ? 'اتجاهات' : 'Directions'}</a>
                                            <a href={mapHref} target="_blank" rel="noreferrer">{locale === 'ar' ? 'مشاركة' : 'Share'}</a>
                                        </div>
                                    )}
                                </div>

                                {recitationUrl && (
                                    <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10">
                                        <h3 className="font-black text-primary text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <AppIcon name="audio" className="w-4 h-4" />
                                            {locale === 'ar' ? 'نموذج التلاوة' : 'Sample Recitation'}
                                        </h3>
                                        <VideoEmbedPanel
                                            url={recitationUrl}
                                            title={locale === 'ar' ? 'تلاوة الإمام' : 'Imam recitation'}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-6">
                                {mapEmbedUrl && <LocationMapSection mapEmbedUrl={mapEmbedUrl} titleId="imam-location-map" />}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
