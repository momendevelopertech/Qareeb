'use client';

import AppModal from '@/components/ui/AppModal';
import { useLocale } from 'next-intl';
import { useModalStore } from '@/lib/store';
import VideoEmbedPanel from './VideoEmbedPanel';

export default function PublicCardModals() {
    const locale = useLocale();
    const { isOpen, type, payload, closeModal } = useModalStore();

    const videoUrl = payload?.video || payload?.video_url;

    return (
        <>
            <AppModal
                isOpen={isOpen && type === 'video'}
                type="video"
                title={locale === 'ar' ? 'عرض الفيديو' : 'Video'}
                onClose={closeModal}
            >
                {videoUrl ? (
                    <VideoEmbedPanel
                        url={videoUrl}
                        title="video-modal"
                    />
                ) : null}
            </AppModal>

            <AppModal
                isOpen={isOpen && type === 'images'}
                type="images"
                title={locale === 'ar' ? 'الصور' : 'Photos'}
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
