import { getLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { getWhatsAppUrl } from '@/lib/utils';
import { getGoogleMapsEmbedUrl } from '@/lib/maps';

export const revalidate = 300; // ISR: 5 min

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
    const tc = await getTranslations('common');
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

    const mapEmbedUrl = getGoogleMapsEmbedUrl(imam.googleMapsUrl || imam.google_maps_url);

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
                            <span className="font-bold text-sm">{locale === 'ar' ? 'العودة للمكتشف' : 'Back to Explorer'}</span>
                        </Link>
                        <span className="block text-accent font-black text-sm uppercase tracking-widest mb-2">
                            {locale === 'ar' ? 'بيانات الإمام' : 'Imam Profile'}
                        </span>
                        <h1 className="text-4xl md:text-5xl font-black">{imam.imamName}</h1>
                        <div className="flex items-center gap-2 mt-4 text-white/90 font-bold">
                            <span className="text-2xl">🕌</span>
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
                                        <span>📍</span> {locale === 'ar' ? 'الموقع والتواجد' : 'Location & Presence'}
                                    </h3>
                                    <p className="text-dark font-bold text-lg leading-relaxed">
                                        {imam.area ? (locale === 'ar' ? imam.area.nameAr : imam.area.nameEn) : `${imam.governorate} — ${imam.city}`}
                                        {imam.district && <span className="block text-sm text-text-muted mt-1">{imam.district}</span>}
                                    </p>
                                    {(imam.googleMapsUrl || imam.google_maps_url) && (
                                        <div className="flex gap-3 text-sm font-bold text-primary underline flex-wrap">
                                            <a href={imam.googleMapsUrl || imam.google_maps_url} target="_blank" rel="noreferrer">{locale === 'ar' ? 'افتح في الخرائط' : 'Open in Maps'}</a>
                                            <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(imam.googleMapsUrl || imam.google_maps_url)}`} target="_blank" rel="noreferrer">{locale === 'ar' ? 'اتجاهات' : 'Directions'}</a>
                                            <a href={imam.googleMapsUrl || imam.google_maps_url} target="_blank" rel="noreferrer">{locale === 'ar' ? 'مشاركة' : 'Share'}</a>
                                        </div>
                                    )}
                                </div>

                                {imam.recitationUrl && (
                                    <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10">
                                        <h3 className="font-black text-primary text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <span>🔊</span> {locale === 'ar' ? 'نموذج التلاوة' : 'Sample Recitation'}
                                        </h3>
                                        <a
                                            href={imam.recitationUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-3 bg-white px-6 py-4 rounded-xl shadow-sm border border-primary/10 text-primary font-black hover:bg-primary hover:text-white transition-all group"
                                        >
                                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-white/20 transition-colors">
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M8 5v14l11-7z" />
                                                </svg>
                                            </div>
                                            {locale === 'ar' ? 'استمع الآن' : 'Listen Now'}
                                        </a>
                                    </div>
                                )}
                                {(imam.videoUrl || imam.video_url) && (
                                    <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10">
                                        <h3 className="font-black text-primary text-sm uppercase tracking-wider mb-2">{locale === 'ar' ? 'رابط الفيديو' : 'Video Link'}</h3>
                                        <a href={imam.videoUrl || imam.video_url} target="_blank" rel="noreferrer" className="text-primary font-bold underline break-all">{imam.videoUrl || imam.video_url}</a>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-6">
                                {mapEmbedUrl && (
                                    <div className="p-4 bg-white rounded-2xl border border-border shadow-sm">
                                        <h3 className="font-black text-primary text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <span>🗺️</span> {locale === 'ar' ? 'الموقع على الخريطة' : 'Location on Map'}
                                        </h3>
                                        <div className="w-full aspect-video rounded-xl overflow-hidden border border-border">
                                            <iframe
                                                src={mapEmbedUrl}
                                                className="w-full h-full"
                                                loading="lazy"
                                                allowFullScreen
                                                title="imam-location-map"
                                                referrerPolicy="no-referrer-when-downgrade"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="p-8 bg-gradient-to-br from-primary to-primary-light rounded-3xl text-white shadow-btn">
                                    <h3 className="font-black text-lg mb-4">{locale === 'ar' ? 'تواصل مع الإمام' : 'Contact Imam'}</h3>
                                    <p className="text-white/80 text-sm mb-6 leading-relaxed">
                                        {locale === 'ar'
                                            ? 'يمكنك التواصل مباشرة مع الإمام عبر واتساب للاستفسار عن مواعيد الصلاة أو الدروس.'
                                            : 'You can contact the imam directly via WhatsApp for inquiries about prayer times or lessons.'}
                                    </p>
                                    <a
                                        href={getWhatsAppUrl(imam.whatsapp)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full bg-white text-primary rounded-2xl py-4 font-black flex items-center justify-center gap-3 shadow-lg hover:scale-[1.02] active:scale-95 transition-all text-lg"
                                    >
                                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                        </svg>
                                        {tc('whatsapp')}
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
