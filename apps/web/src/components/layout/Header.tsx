'use client';

import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { useEffect, useState } from 'react';
import { useAuthStore, useGeolocationStore, useModalStore, useNotificationStore } from '@/lib/store';
import { adminApi } from '@/lib/api';
import { usePathname } from 'next/navigation';
import { useGeolocationStore } from '@/lib/store';

export default function Header() {
    const t = useTranslations('nav');
    const tc = useTranslations('common');
    const locale = useLocale();
    const { token, admin } = useAuthStore();
    const { openModal } = useModalStore();
    const { items, unreadCount, markRead } = useNotificationStore();
    const { lat, lng, requestLocation, loading: geoLoading } = useGeolocationStore();
    const pathname = usePathname();
    const isAdminPath = pathname.startsWith(`/${locale}/admin`);
    const otherLocale = locale === 'ar' ? 'en' : 'ar';

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);

    const navLinks = [
        { href: `/${locale}`, label: t('home') },
        { href: `/${locale}/imams`, label: t('imams') },
        { href: `/${locale}/halaqat`, label: t('halaqat') },
        { href: `/${locale}/maintenance`, label: t('maintenance') },
    ];

    const switchedLocalePath = pathname.startsWith(`/${locale}`)
        ? pathname.replace(`/${locale}`, `/${otherLocale}`)
        : `/${otherLocale}`;

    useEffect(() => {
        if (!token || !admin?.role || !isAdminPath) return;
        void adminApi.getNotificationCount(token).catch(() => undefined);
    }, [token, admin?.role, isAdminPath]);

    useEffect(() => {
        requestLocation();
    }, [requestLocation]);

    useEffect(() => {
        if (typeof document === 'undefined') return;
        if (isMenuOpen) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalOverflow;
            };
        }
        document.body.style.overflow = '';
    }, [isMenuOpen]);

    return (
        <>
            <header className="sticky top-0 z-[1000] bg-white/95 backdrop-blur-md border-b border-primary/10 h-[68px] shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link href={`/${locale}`} className="flex items-center gap-2.5 group">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-light rounded-xl flex items-center justify-center text-white text-xl shadow-[0_4px_12px_rgba(27,107,69,0.3)] transition-transform group-hover:scale-105">
                                🕌
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xl font-black text-primary leading-tight">{tc('appName')}</span>
                                <span className="text-[11px] text-text-muted -mt-0.5">
                                    {locale === 'ar' ? 'دليل المسلمين في مصر' : 'Muslims Guide in Egypt'}
                                </span>
                            </div>
                        </Link>

                        <nav className="hidden md:flex items-center gap-1">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className="px-4 py-2 rounded-lg text-text font-bold text-sm transition-all hover:bg-primary/5 hover:text-primary"
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </nav>

                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="hidden md:flex items-center gap-2 bg-cream rounded-xl px-3 py-2 border border-transparent max-w-[220px]">
                                <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span className="text-xs font-bold text-dark truncate">
                                    {geoLoading ? tc('loading') : lat ? `${lat.toFixed(2)}, ${lng?.toFixed(2)}` : (locale === 'ar' ? 'حدد موقعك الحالي' : 'Set location')}
                                </span>
                                <button
                                    onClick={() => requestLocation(true)}
                                    className="p-1 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                                    aria-label={locale === 'ar' ? 'تحديث الموقع' : 'Refresh location'}
                                    title={locale === 'ar' ? 'تحديث الموقع' : 'Refresh location'}
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m14.836 2A8.003 8.003 0 005.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-13.837-2m13.837 2H15" />
                                    </svg>
                                </button>
                            </div>
                            {token && isAdminPath && (
                                <div className="relative">
                                    <button
                                        onClick={() => setShowNotifications((v) => !v)}
                                        className="relative p-2 rounded-btn hover:bg-gray-100 transition-colors"
                                        aria-label="Notifications"
                                    >
                                        <span className="text-xl">🔔</span>
                                        {unreadCount > 0 && (
                                            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                                                {unreadCount > 99 ? '99+' : unreadCount}
                                            </span>
                                        )}
                                    </button>
                                    {showNotifications && (
                                        <div className="absolute end-0 mt-2 w-80 bg-white border border-border rounded-xl shadow-xl z-[1200] p-2">
                                            {items.slice(0, 5).length ? (
                                                items.slice(0, 5).map((n) => (
                                                    <div
                                                        key={n.id}
                                                        className="p-2 rounded-lg hover:bg-cream text-xs border-b border-border last:border-b-0"
                                                    >
                                                        <p className="font-bold">{n.title}</p>
                                                        <p className="text-text-muted">{n.message}</p>
                                                        <div className="mt-1 flex gap-2">
                                                            {!n.read && (
                                                                <button
                                                                    className="underline text-primary"
                                                                    onClick={async () => {
                                                                        if (token)
                                                                            await adminApi
                                                                                .markNotificationRead(token, n.id)
                                                                                .catch(() => undefined);
                                                                        markRead(n.id);
                                                                    }}
                                                                >
                                                                    {locale === 'ar' ? 'مقروء' : 'Read'}
                                                                </button>
                                                            )}
                                                            <button
                                                                className="underline text-primary"
                                                                onClick={() =>
                                                                    openModal(
                                                                        'view',
                                                                        (n.type.includes('imam')
                                                                            ? 'imam'
                                                                            : n.type.includes('halqa')
                                                                            ? 'halqa'
                                                                            : 'maintenance') as any,
                                                                        n,
                                                                    )
                                                                }
                                                            >
                                                                {locale === 'ar' ? 'فتح' : 'Open'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="p-2 text-xs text-text-muted">
                                                    {locale === 'ar' ? 'لا إشعارات' : 'No notifications'}
                                                </p>
                                            )}
                                            <Link
                                                href={`/${locale}/admin/notifications`}
                                                className="block mt-2 text-center text-xs text-primary underline"
                                            >
                                                {locale === 'ar' ? 'عرض الكل' : 'View all'}
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            )}

                            <Link
                                href={`/${locale}/submit`}
                                className="hidden sm:inline-flex px-5 py-2.5 bg-accent text-white rounded-xl font-bold text-sm transition-all hover:bg-accent-dark hover:-translate-y-0.5 shadow-[0_4px_12px_rgba(201,150,42,0.35)]"
                            >
                                {t('submit')}
                            </Link>

                            <Link
                                href={switchedLocalePath}
                                className="px-3 py-1.5 border border-gray-200 rounded-btn text-sm font-medium text-text-muted hover:border-primary hover:text-primary transition-all"
                            >
                                {tc('switchLang')}
                            </Link>

                            <button
                                onClick={() => requestLocation(true)}
                                className="md:hidden p-2 rounded-btn text-primary hover:bg-primary/10 transition-colors"
                                aria-label={locale === 'ar' ? 'تحديث الموقع' : 'Refresh location'}
                                title={locale === 'ar' ? 'تحديث الموقع' : 'Refresh location'}
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m14.836 2A8.003 8.003 0 005.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-13.837-2m13.837 2H15" />
                                </svg>
                            </button>

                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="md:hidden p-2 rounded-btn hover:bg-gray-100 transition-colors"
                                aria-label="Menu"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    {isMenuOpen ? (
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    ) : (
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M4 6h16M4 12h16M4 18h16"
                                        />
                                    )}
                                </svg>
                            </button>
                        </div>
                    </div>

                    {isMenuOpen && (
                        <div className="md:hidden pb-4 animate-slide-up">
                            <div className="flex flex-col gap-1">
                                {navLinks.map((link) => (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        onClick={() => setIsMenuOpen(false)}
                                        className="px-4 py-3 rounded-btn text-text hover:bg-primary-light hover:text-primary transition-all font-medium"
                                    >
                                        {link.label}
                                    </Link>
                                ))}

                                <Link
                                    href={`/${locale}/submit`}
                                    onClick={() => setIsMenuOpen(false)}
                                    className="btn-primary text-center mt-2"
                                >
                                    {t('submit')}
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {isMenuOpen && (
                <div
                    className="fixed inset-0 z-[900] bg-black/40 backdrop-blur-sm md:hidden"
                    onClick={() => setIsMenuOpen(false)}
                />
            )}
        </>
    );
}
