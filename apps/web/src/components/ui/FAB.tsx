'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

export default function FAB() {
    const [isOpen, setIsOpen] = useState(false);
    const locale = useLocale();
    const t = useTranslations('nav');

    const actions = [
        {
            label: locale === 'ar' ? 'إمام' : 'Imam',
            href: `/${locale}/imams/submit`,
            color: 'bg-primary',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
            ),
        },
        {
            label: locale === 'ar' ? 'حلقة' : 'Circle',
            href: `/${locale}/halaqat/submit`,
            color: 'bg-halqa',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
            ),
        },
        {
            label: locale === 'ar' ? 'صيانة' : 'Maintenance',
            href: `/${locale}/maintenance/submit`,
            color: 'bg-maintenance',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            ),
        },
    ];

    return (
        <div className="fixed bottom-6 end-6 z-40 flex flex-col-reverse items-end gap-3">
            {/* Main FAB button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 gradient-bg text-white rounded-full border-2 border-white/90 ring-4 ring-white/35 shadow-[0_14px_34px_rgba(9,55,33,0.45)] flex items-center justify-center
                     transition-all duration-300 hover:shadow-xl hover:ring-white/55 active:scale-95
                     ${isOpen ? 'rotate-45' : ''}`}
                aria-label={t('submit')}
            >
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
            </button>

            {/* Action buttons */}
            {isOpen && (
                <div className="flex flex-col gap-3 animate-slide-up">
                    {actions.map((action, i) => (
                        <Link
                            key={i}
                            href={action.href}
                            className={`flex items-center gap-3 ${action.color} text-white px-4 py-3 rounded-full shadow-lg
                         hover:shadow-xl transition-all duration-200 hover:scale-105`}
                            onClick={() => setIsOpen(false)}
                        >
                            {action.icon}
                            <span className="text-sm font-medium whitespace-nowrap">{action.label}</span>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
