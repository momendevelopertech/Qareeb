'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import AppModal from '@/components/ui/AppModal';
import { validateCoordinates } from '@/lib/maps';

type Coordinates = {
    lat: number;
    lng: number;
};

type Props = {
    isOpen: boolean;
    locale: string;
    initialCoordinates?: Coordinates | null;
    onClose: () => void;
    onConfirm: (coords: Coordinates) => void;
};

const MapPickerCanvas = dynamic(() => import('./MapPickerCanvas'), { ssr: false });

export default function MapPickerModal({
    isOpen,
    locale,
    initialCoordinates,
    onClose,
    onConfirm,
}: Props) {
    const [selected, setSelected] = useState<Coordinates | null>(initialCoordinates || null);

    useEffect(() => {
        if (!isOpen) return;
        setSelected(initialCoordinates || null);
    }, [isOpen, initialCoordinates]);

    return (
        <AppModal
            isOpen={isOpen}
            type="view"
            title={locale === 'ar' ? 'اختيار الموقع من الخريطة' : 'Select location from map'}
            onClose={onClose}
        >
            <div className="space-y-4">
                <p className="text-sm text-text-muted">
                    {locale === 'ar'
                        ? 'اضغط على الخريطة لتحديد المكان بدقة، ثم اضغط تأكيد.'
                        : 'Click on the map to drop a precise pin, then confirm.'}
                </p>

                <MapPickerCanvas
                    value={selected}
                    onChange={(next) => setSelected(next)}
                />

                <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-bold text-text-muted">
                        {selected
                            ? `${selected.lat.toFixed(6)}, ${selected.lng.toFixed(6)}`
                            : (locale === 'ar' ? 'لم يتم اختيار نقطة بعد' : 'No point selected yet')}
                    </div>

                    <div className="flex items-center gap-2">
                        <button type="button" onClick={onClose} className="btn-outline !py-2 !px-4 text-sm">
                            {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                const valid = validateCoordinates(selected);
                                if (!valid) return;
                                onConfirm(valid);
                            }}
                            disabled={!validateCoordinates(selected)}
                            className="btn-primary !py-2 !px-4 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {locale === 'ar' ? 'تأكيد الموقع' : 'Confirm location'}
                        </button>
                    </div>
                </div>
            </div>
        </AppModal>
    );
}
