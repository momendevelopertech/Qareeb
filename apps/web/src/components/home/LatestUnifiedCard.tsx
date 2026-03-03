'use client';

import UnifiedCard from '@/components/public/UnifiedCard';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { AppIconName } from '@/components/ui/AppIcon';

type EntityType = 'imam' | 'halqa' | 'maintenance';

interface LatestUnifiedCardProps {
    id: string;
    entity: EntityType;
    name: string;
    mosque?: string;
    location?: string;
    typeLabel: string;
    typeIcon: AppIconName;
    link: string;
    map?: string;
    video?: string;
    whatsapp?: string;
    online?: boolean;
    images?: string[];
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
    map,
    video,
    whatsapp,
    online,
    images,
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
        map,
        video,
        whatsapp,
        online: online ?? false,
        images: images || [],
        raw: undefined,
    };

    return (
        <UnifiedCard
            card={card}
            showWhatsApp={entity !== 'imam'}
            showImages={entity === 'maintenance'}
            onViewDetails={() => router.push(link || `/${locale}/${entity}/${id}`)}
        />
    );
}

