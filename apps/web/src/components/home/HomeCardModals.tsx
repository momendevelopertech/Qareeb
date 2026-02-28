'use client';

import AppModal from '@/components/ui/AppModal';
import { useLocale } from 'next-intl';
import { useModalStore } from '@/lib/store';
import { getEmbeddableVideoUrl } from '@/lib/video';

export default function HomeCardModals() {
    const locale = useLocale();
    const { isOpen, type, payload, closeModal } = useModalStore();

    const videoUrl = payload?.video || payload?.video_url;
    const embedUrl = getEmbeddableVideoUrl(videoUrl);

    return (
        <>
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
        </>
    );
}

