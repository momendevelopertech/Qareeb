'use client';

import { getEmbeddableVideoUrl } from '@/lib/video';

type VideoEmbedPanelProps = {
    url: string;
    title: string;
};

export default function VideoEmbedPanel({ url, title }: VideoEmbedPanelProps) {
    const embedUrl = getEmbeddableVideoUrl(url);

    if (!embedUrl) {
        return (
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-bold underline break-all"
            >
                {url}
            </a>
        );
    }

    return (
        <div className="overflow-hidden rounded-2xl border border-primary/10 bg-black/5">
            <div className="aspect-video w-full">
                <iframe
                    src={embedUrl}
                    title={title}
                    className="h-full w-full"
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                />
            </div>
        </div>
    );
}
