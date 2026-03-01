'use client';

import { useEffect, useMemo, useState } from 'react';
import AppModal from '@/components/ui/AppModal';

type GalleryItem = {
    id?: string;
    url: string;
};

type MaintenanceImageGalleryProps = {
    locale: string;
    images: GalleryItem[];
};

export default function MaintenanceImageGallery({ locale, images }: MaintenanceImageGalleryProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const total = images.length;
    const isAr = locale === 'ar';

    const currentImage = useMemo(() => images[currentIndex], [images, currentIndex]);

    const goNext = () => setCurrentIndex((prev) => (prev + 1) % total);
    const goPrev = () => setCurrentIndex((prev) => (prev - 1 + total) % total);

    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'ArrowRight') {
                if (isAr) goPrev();
                else goNext();
            } else if (event.key === 'ArrowLeft') {
                if (isAr) goNext();
                else goPrev();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen, isAr, total]);

    if (!total) return null;

    return (
        <div>
            <h3 className="text-sm font-black text-text-muted mb-3 uppercase">
                {isAr ? 'الصور' : 'Images'}
            </h3>
            <div className="grid grid-cols-2 gap-3">
                {images.map((item, index) => (
                    <button
                        key={item.id || `${item.url}-${index}`}
                        type="button"
                        className="group overflow-hidden rounded-2xl border border-border relative"
                        onClick={() => {
                            setCurrentIndex(index);
                            setIsOpen(true);
                        }}
                    >
                        <img
                            src={item.url}
                            alt={`${isAr ? 'صورة' : 'Image'} ${index + 1}`}
                            className="w-full h-36 object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                        />
                        <span className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </button>
                ))}
            </div>

            <AppModal
                isOpen={isOpen}
                type="images"
                title={isAr ? 'صور الصيانة' : 'Maintenance Images'}
                onClose={() => setIsOpen(false)}
            >
                <div className="space-y-4">
                    <div className="relative h-[clamp(280px,62vh,620px)] rounded-2xl overflow-hidden border border-border bg-black/5">
                        <img
                            src={currentImage?.url}
                            alt={`${isAr ? 'صورة' : 'Image'} ${currentIndex + 1}`}
                            className="w-full h-full object-contain bg-black/5"
                        />

                        {total > 1 && (
                            <>
                                <button
                                    type="button"
                                    onClick={goPrev}
                                    className="absolute top-1/2 -translate-y-1/2 left-3 w-10 h-10 rounded-full bg-white/90 border border-border shadow flex items-center justify-center"
                                    aria-label={isAr ? 'الصورة السابقة' : 'Previous image'}
                                >
                                    ‹
                                </button>
                                <button
                                    type="button"
                                    onClick={goNext}
                                    className="absolute top-1/2 -translate-y-1/2 right-3 w-10 h-10 rounded-full bg-white/90 border border-border shadow flex items-center justify-center"
                                    aria-label={isAr ? 'الصورة التالية' : 'Next image'}
                                >
                                    ›
                                </button>
                            </>
                        )}
                    </div>

                    <div className="flex items-center justify-between text-xs font-bold text-text-muted">
                        <span>{isAr ? 'المعرض' : 'Gallery'}</span>
                        <span>{currentIndex + 1} / {total}</span>
                    </div>

                    {total > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {images.map((item, index) => (
                                <button
                                    key={item.id || `${item.url}-thumb-${index}`}
                                    type="button"
                                    onClick={() => setCurrentIndex(index)}
                                    className={`shrink-0 rounded-xl overflow-hidden border-2 ${index === currentIndex ? 'border-primary' : 'border-transparent'}`}
                                >
                                    <img
                                        src={item.url}
                                        alt={`${isAr ? 'صورة مصغرة' : 'Thumbnail'} ${index + 1}`}
                                        className="w-20 h-16 object-cover"
                                        loading="lazy"
                                    />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </AppModal>
        </div>
    );
}
