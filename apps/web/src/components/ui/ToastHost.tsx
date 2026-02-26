'use client';

import { useToastStore } from '@/lib/store';

export default function ToastHost() {
    const { toasts, removeToast } = useToastStore();
    if (!toasts.length) return null;

    return (
        <div className="fixed top-20 end-4 z-[1200] space-y-2 w-[min(92vw,360px)]">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`rounded-xl border px-4 py-3 shadow-lg text-sm font-semibold ${
                        toast.type === 'error'
                            ? 'bg-red-50 text-red-800 border-red-200'
                            : toast.type === 'success'
                                ? 'bg-green-50 text-green-800 border-green-200'
                                : 'bg-blue-50 text-blue-800 border-blue-200'
                    }`}
                >
                    <div className="flex items-start justify-between gap-2">
                        <p>{toast.message}</p>
                        <button onClick={() => removeToast(toast.id)} aria-label="Close toast">×</button>
                    </div>
                </div>
            ))}
        </div>
    );
}
