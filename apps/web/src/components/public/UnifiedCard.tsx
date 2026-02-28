'use client';

import { useLocale } from 'next-intl';
import { useModalStore, useToastStore } from '@/lib/store';
import { useState } from 'react';

interface CardItem {
    id: string;
    entity: 'imam' | 'halqa' | 'maintenance';
    name: string;
    mosque?: string;
    location?: string;
    typeLabel: string;
    typeIcon: string;
    map?: string;
    video?: string;
    whatsapp?: string;
    online?: boolean;
    images?: string[];
    raw?: any;
}

interface UnifiedCardProps {
    card: CardItem;
    showWhatsApp?: boolean; // للحلقات والصيانة
    showImages?: boolean; // للصيانة
    onViewDetails: (card: CardItem) => void;
}

export default function UnifiedCard({ card, showWhatsApp = false, showImages = false, onViewDetails }: UnifiedCardProps) {
    const locale = useLocale();
    const { openModal } = useModalStore();
    const { pushToast } = useToastStore();
    const [copying, setCopying] = useState(false);

    const copyToClipboard = async (text: string | undefined) => {
        if (!text) return;
        try {
            setCopying(true);
            await navigator.clipboard.writeText(text);
            pushToast(locale === 'ar' ? 'تم النسخ بنجاح' : 'Copied successfully', 'success');
        } catch {
            pushToast(locale === 'ar' ? 'تعذر النسخ' : 'Failed to copy', 'error');
        } finally {
            setCopying(false);
        }
    };

    const handleWhatsApp = () => {
        if (card.whatsapp) {
            const message = locale === 'ar' 
                ? `السلام عليكم، أنا مهتم بـ ${card.name}`
                : `Hi, I'm interested in ${card.name}`;
            const url = `https://wa.me/${card.whatsapp}?text=${encodeURIComponent(message)}`;
            window.open(url, '_blank');
        }
    };

    const handleShare = async () => {
        const basePath =
            card.entity === 'imam'
                ? '/imams'
                : card.entity === 'halqa'
                ? '/halaqat'
                : '/maintenance';
        const relativeUrl = `${basePath}/${card.id}`;
        const fullUrl =
            typeof window !== 'undefined'
                ? new URL(`/${locale}${relativeUrl}`, window.location.origin).toString()
                : `/${locale}${relativeUrl}`;

        try {
            if (navigator.share) {
                await navigator.share({ url: fullUrl });
                return;
            }
            await navigator.clipboard.writeText(fullUrl);
            pushToast(locale === 'ar' ? 'تم نسخ الرابط' : 'Link copied', 'success');
        } catch {
            pushToast(locale === 'ar' ? 'تعذر مشاركة الرابط' : 'Unable to share link', 'error');
        }
    };

    // للحلقات: إذا كانت online، أخفِ الخريطة
    const isOnline = card.online === true;
    const shouldShowMap = !isOnline && card.map;

    return (
        <div className="bg-white rounded-[20px] border border-border p-5 space-y-4 hover:shadow-lg transition-all duration-300 flex flex-col">
            {/* Header: Badge and Name */}
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-primary/10 text-primary">
                        <span>{card.typeIcon}</span>
                        {card.typeLabel}
                    </span>
                    {/* online badge للحلقات */}
                    {isOnline && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-accent/10 text-accent">
                            <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                            {locale === 'ar' ? 'أونلاين' : 'Online'}
                        </span>
                    )}
                </div>
                <h3 className="text-lg font-black text-dark leading-tight">{card.name}</h3>
                {card.mosque && card.mosque !== card.name && (
                    <p className="text-sm text-text-muted mt-1">{card.mosque}</p>
                )}
            </div>

            {/* Location - أظهر فقط لو ليست online */}
            {card.location && !isOnline && (
                <div className="flex items-center gap-2 text-sm text-text-muted bg-cream rounded-lg px-3 py-2.5">
                    <span>📍</span>
                    <span className="font-semibold flex-1 break-words">{card.location}</span>
                </div>
            )}

            {/* Action Buttons Group 1: Map and Video */}
            <div className="flex gap-2 flex-wrap">
                {/* خريطة - فقط لو ليست online */}
                {shouldShowMap && (
                    <div className="flex items-stretch rounded-xl border border-border overflow-hidden min-w-[200px]">
                        <a
                            href={card.map}
                            target="_blank"
                            rel="noreferrer"
                            className="!py-2 !px-3 text-xs font-bold flex-1 min-w-[120px] text-center bg-white hover:bg-cream transition-colors"
                        >
                            {locale === 'ar' ? '🗺️ فتح الخريطة' : '🗺️ Open Map'}
                        </a>
                        <button
                            className="!py-2 !px-3 text-xs font-bold disabled:opacity-50 border-s border-border bg-white hover:bg-cream transition-colors"
                            onClick={() => copyToClipboard(card.map)}
                            disabled={copying}
                            title={locale === 'ar' ? 'نسخ رابط Google Maps' : 'Copy Google Maps link'}
                            aria-label={locale === 'ar' ? 'نسخ رابط Google Maps' : 'Copy Google Maps link'}
                        >
                            📋
                        </button>
                    </div>
                )}

                {/* فيديو */}
                {card.video && card.entity !== 'halqa' && (
                    <button
                        className="btn-outline !py-2 !px-3 text-xs font-bold flex-1 min-w-[120px]"
                        onClick={() => openModal('video', card.entity, card)}
                    >
                        {locale === 'ar' ? '🎥 عرض الفيديو' : '🎥 View Video'}
                    </button>
                )}

                {/* صور - للصيانة */}
                {showImages && card.images && card.images.length > 0 && (
                    <button
                        className="btn-outline !py-2 !px-3 text-xs font-bold flex-1 min-w-[120px]"
                        onClick={() => openModal('images', card.entity, card)}
                    >
                        {locale === 'ar' ? '📸 عرض الصور' : '📸 View Photos'}
                    </button>
                )}

                {/* واتساب - للحلقات والصيانة */}
                {showWhatsApp && card.whatsapp && (
                    <button
                        className="btn-outline !py-2 !px-3 text-xs font-bold flex-1 min-w-[120px]"
                        onClick={handleWhatsApp}
                    >
                        {locale === 'ar' ? '💬 واتساب' : '💬 WhatsApp'}
                    </button>
                )}
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Footer: View Details and Share */}
            <div className="flex gap-2 pt-2 border-t border-border">
                <button
                    className="btn-primary !py-2.5 !px-4 text-xs font-bold flex-1"
                    onClick={() => onViewDetails(card)}
                >
                    {locale === 'ar' ? '➡️ عرض التفاصيل' : '➡️ View Details'}
                </button>
                <button
                    className="btn-outline !py-2.5 !px-3 text-xs font-bold flex items-center justify-center gap-1.5"
                    onClick={handleShare}
                    aria-label={locale === 'ar' ? 'مشاركة الرابط' : 'Share link'}
                >
                    {locale === 'ar' ? '📤 مشاركة' : '📤 Share'}
                </button>
            </div>
        </div>
    );
}
