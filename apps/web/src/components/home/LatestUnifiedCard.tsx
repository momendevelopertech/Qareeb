'use client';

import UnifiedCard from '@/components/public/UnifiedCard';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';

type EntityType = 'imam' | 'halqa' | 'maintenance';

interface LatestUnifiedCardProps {
    id: string;
    entity: EntityType;
    name: string;
    mosque?: string;
    location?: string;
    typeLabel: string;
    typeIcon: string;
    link: string;
}

export default function LatestUnifiedCard({
    id,
    entity,
    name,
    mosque,
    location,
    typeLabel,
    typeIcon,
    link,
}: LatestUnifiedCardProps) {
    const locale = useLocale();
    const router = useRouter();

    const card = {
        id,
        entity,
        name,
        mosque,
        location,
        typeLabel,
        typeIcon,
        map: undefined,
        video: undefined,
        whatsapp: undefined,
        online: false,
        images: [],
        raw: undefined,
    };

    return (
        <UnifiedCard
            card={card}
            showWhatsApp={false}
            showImages={false}
            onViewDetails={() => router.push(link || `/${locale}/${entity}/${id}`)}
        />
    );
}

