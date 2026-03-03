'use client';

import { useLoadingStore } from '@/lib/store';
import AppIcon from '@/components/ui/AppIcon';

export default function LoadingOverlay() {
    const loading = useLoadingStore((s) => s.loading);

    if (!loading) return null;

    return (
        <div className="fixed inset-0 bg-white/80 flex items-center justify-center z-50">
            <div className="w-14 h-14 flex items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-light text-white text-3xl animate-spin">
                <AppIcon name="mosque" className="w-7 h-7" />
            </div>
        </div>
    );
}