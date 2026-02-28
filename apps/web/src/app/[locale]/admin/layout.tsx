'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import {
    FaBell,
    FaBook,
    FaCog,
    FaHome,
    FaMoon,
    FaMosque,
    FaSignOutAlt,
    FaSun,
    FaTools,
    FaUsers,
    FaUserTie,
    FaClipboardList,
} from 'react-icons/fa';
import { adminApi } from '@/lib/api';
import { useAuthStore, useNotificationStore, useThemeStore } from '@/lib/store';

const SOCKET_DISABLED_SESSION_KEY = 'qareeb-admin-socket-disabled';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const t = useTranslations('admin');
    const locale = useLocale();
    const pathname = usePathname();
    const router = useRouter();

    const { token, admin, rememberMe, setAuth, clearAuth } = useAuthStore();
    const { theme, toggleTheme } = useThemeStore();
    const { unreadCount, items, setNotifications, markRead } = useNotificationStore();

    const [showNotifMenu, setShowNotifMenu] = useState(false);

    const isLoginPage = pathname === `/${locale}/admin`;
    const otherLocale = locale === 'ar' ? 'en' : 'ar';
    const switchedLocalePath = useMemo(() => {
        if (!pathname.startsWith(`/${locale}`)) return `/${otherLocale}/admin/dashboard`;
        return pathname.replace(`/${locale}`, `/${otherLocale}`);
    }, [pathname, locale, otherLocale]);

    useEffect(() => {
        document.documentElement.classList.toggle('theme-dark', theme === 'dark');
    }, [theme]);

    useEffect(() => {
        let mounted = true;
        let refreshInterval: ReturnType<typeof setInterval> | null = null;
        let refreshFailed = false;

        const tryRefresh = async () => {
            if (refreshFailed) return;
            try {
                // Always try to refresh from server using httpOnly cookies
                const refreshed = await adminApi.refresh();
                if (mounted && refreshed?.access_token) {
                    // Keep current admin payload if we already have one in state.
                    const { admin: currentAdmin } = useAuthStore.getState();
                    setAuth(refreshed.access_token, currentAdmin || refreshed.admin, rememberMe);
                }
            } catch {
                refreshFailed = true;
                if (refreshInterval) {
                    clearInterval(refreshInterval);
                    refreshInterval = null;
                }
                // If refresh fails and rememberMe is true, don't clear auth yet
                // The token might still be valid from localStorage
                if (mounted && !rememberMe) {
                    clearAuth();
                }
            }
        };

        // Attempt refresh immediately if we have rememberMe enabled
        const { token: currentToken } = useAuthStore.getState();
        if (!isLoginPage && rememberMe && currentToken) {
            void tryRefresh();
            // Then refresh periodically
            refreshInterval = setInterval(() => {
                void tryRefresh();
            }, 10 * 60 * 1000); // 10 minutes
        }

        return () => {
            mounted = false;
            if (refreshInterval) clearInterval(refreshInterval);
        };
    }, [rememberMe, isLoginPage, setAuth, clearAuth]);

    useEffect(() => {
        const mapNotification = (n: any) => ({
            id: n.id,
            type: n.type,
            title: n.title,
            message: n.message,
            recordId: n.referenceId,
            createdAt: n.createdAt,
            read: n.isRead,
        });

        const playNotificationSound = () => {
            if (document.visibilityState !== 'visible') return;
            const audio = new Audio('/sounds/notification.mp3');
            audio.play().catch(() => undefined);
        };

        const syncUnreadNotifications = async (playSoundOnNew = false) => {
            if (!token) return;
            try {
                const res = await adminApi.getNotifications(token, 'unread');
                const mapped = (res || []).map(mapNotification);
                const existingIds = new Set(useNotificationStore.getState().items.map((item) => item.id));
                const hasNewItem = mapped.some((item: any) => !existingIds.has(item.id));

                setNotifications(mapped);

                if (playSoundOnNew && hasNewItem) {
                    playNotificationSound();
                }
            } catch {
                // ignore silent bootstrap failures
            }
        };

        void syncUnreadNotifications();

        const pollingInterval = setInterval(() => {
            void syncUnreadNotifications(true);
        }, 20000);

        let socket: Socket | null = null;
        const socketDisabled = typeof window !== 'undefined' && window.sessionStorage.getItem(SOCKET_DISABLED_SESSION_KEY) === '1';

        if (admin?.role && !socketDisabled) {
            const base = process.env.NEXT_PUBLIC_API_URL?.replace('/v1', '') || 'http://localhost:3001';
            socket = io(`${base}/notifications`, {
                transports: ['polling', 'websocket'],
                reconnection: false,
                timeout: 6000,
                withCredentials: true,
                query: { role: admin.role },
                auth: { token },
            });

            socket.on('connect', () => {
                if (typeof window !== 'undefined') {
                    window.sessionStorage.removeItem(SOCKET_DISABLED_SESSION_KEY);
                }
            });

            socket.on('connect_error', (error: any) => {
                const message = String(error?.message || '').toLowerCase();
                const description = String(error?.description || '').toLowerCase();
                const shouldDisableSocket = message.includes('xhr poll error')
                    || message.includes('404')
                    || description.includes('404');

                if (shouldDisableSocket && typeof window !== 'undefined') {
                    window.sessionStorage.setItem(SOCKET_DISABLED_SESSION_KEY, '1');
                    socket?.disconnect();
                }
            });

            socket.on('notification', () => {
                void syncUnreadNotifications(true);
            });
        }

        return () => {
            clearInterval(pollingInterval);
            socket?.disconnect();
        };
    }, [token, admin?.role, setNotifications]);

    const handleLogout = () => {
        clearAuth();
        router.push(`/${locale}/admin`);
    };

    if (!token && !isLoginPage) {
        return children;
    }

    if (isLoginPage) {
        return children;
    }

    const navItems = [
        { href: `/${locale}/admin/dashboard`, label: locale === 'ar' ? 'لوحة التحكم' : 'Dashboard', icon: FaHome },
        { href: `/${locale}/admin/imams`, label: locale === 'ar' ? 'الأئمة' : 'Imams', icon: FaUserTie },
        { href: `/${locale}/admin/halaqat`, label: locale === 'ar' ? 'الحلقات' : 'Halaqat', icon: FaBook },
        { href: `/${locale}/admin/maintenance`, label: locale === 'ar' ? 'الصيانة' : 'Maintenance', icon: FaTools },
        { href: `/${locale}/admin/audit`, label: locale === 'ar' ? 'سجل التدقيق' : 'Audit Logs', icon: FaClipboardList },
        { href: `/${locale}/admin/settings`, label: locale === 'ar' ? 'الإعدادات' : 'Settings', icon: FaCog },
    ];

    if (admin?.role === 'super_admin') {
        navItems.push({ href: `/${locale}/admin/users`, label: t('users'), icon: FaUsers });
    }

    const shellClass = theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-gray-100 text-gray-900';
    const sidebarClass = theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-gray-900 border-gray-800 text-white';
    const panelClass = theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200';

    return (
        <div className={`min-h-screen flex ${shellClass}`}>
            <aside className={`w-72 border-e flex-col hidden md:flex ${sidebarClass}`}>
                <div className="p-5 border-b border-current/10">
                    <Link href={`/${locale}`} className="flex items-center gap-3">
                        <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white">
                            <FaMosque className="text-xl" />
                        </span>
                        <div>
                            <p className="text-lg font-black">{locale === 'ar' ? 'قريب' : 'Qareeb'}</p>
                            <p className="text-xs text-white/70">{locale === 'ar' ? 'لوحة التحكم' : 'Admin Dashboard'}</p>
                        </div>
                    </Link>
                </div>

                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const active = pathname === item.href;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                                    active
                                        ? 'bg-primary text-white'
                                        : theme === 'dark'
                                            ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                            : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                                }`}
                            >
                                <span className="flex items-center gap-2.5">
                                    <Icon className="text-base" />
                                    <span>{item.label}</span>
                                </span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-current/10">
                    <div className="flex items-center gap-3 mb-3">
                        <span className="w-9 h-9 rounded-full bg-primary text-white text-sm font-black inline-flex items-center justify-center">
                            {admin?.email?.[0]?.toUpperCase() || 'A'}
                        </span>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{admin?.email}</p>
                            <p className="text-xs text-white/70 truncate">{admin?.role?.replace('_', ' ')}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full text-start px-3 py-2 rounded-lg text-sm text-red-300 hover:bg-red-500/10 hover:text-red-200 transition-colors flex items-center gap-2"
                    >
                        <FaSignOutAlt />
                        <span>{t('logout')}</span>
                    </button>
                </div>
            </aside>

            <div className="flex-1 min-w-0">
                <header className={`sticky top-0 z-30 border-b ${panelClass}`}>
                    <div className="px-4 md:px-6 py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <Link href={`/${locale}/admin/dashboard`} className="md:hidden w-9 h-9 rounded-lg bg-primary text-white inline-flex items-center justify-center">
                                <FaMosque />
                            </Link>
                            <p className="text-sm font-semibold opacity-80">{locale === 'ar' ? 'إدارة المنصة' : 'Platform Management'}</p>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={toggleTheme}
                                className={`w-9 h-9 rounded-lg inline-flex items-center justify-center border ${theme === 'dark' ? 'border-slate-700 hover:bg-slate-800' : 'border-gray-300 hover:bg-gray-50'}`}
                                title={locale === 'ar' ? 'تبديل الوضع الليلي' : 'Toggle dark mode'}
                                aria-label={locale === 'ar' ? 'تبديل الوضع الليلي' : 'Toggle dark mode'}
                            >
                                {theme === 'dark' ? <FaSun /> : <FaMoon />}
                            </button>

                            <Link
                                href={switchedLocalePath}
                                className={`px-3 h-9 rounded-lg border text-sm font-semibold inline-flex items-center ${theme === 'dark' ? 'border-slate-700 hover:bg-slate-800' : 'border-gray-300 hover:bg-gray-50'}`}
                                title={locale === 'ar' ? 'Switch to English' : 'التحويل للعربية'}
                                aria-label={locale === 'ar' ? 'Switch to English' : 'التحويل للعربية'}
                            >
                                {locale === 'ar' ? 'EN' : 'AR'}
                            </Link>

                            <div className="relative">
                                <button
                                    onClick={() => setShowNotifMenu((v) => !v)}
                                    className={`w-9 h-9 rounded-lg inline-flex items-center justify-center border relative ${theme === 'dark' ? 'border-slate-700 hover:bg-slate-800' : 'border-gray-300 hover:bg-gray-50'}`}
                                    aria-label={locale === 'ar' ? 'الإشعارات' : 'Notifications'}
                                    title={locale === 'ar' ? 'الإشعارات' : 'Notifications'}
                                >
                                    <FaBell />
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-1 -end-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold inline-flex items-center justify-center">
                                            {unreadCount > 99 ? '99+' : unreadCount}
                                        </span>
                                    )}
                                </button>

                                {showNotifMenu && (
                                    <div className={`absolute end-0 mt-2 w-80 rounded-xl border shadow-xl p-2 ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
                                        {items.length ? items.slice(0, 6).map((n) => (
                                            <div key={n.id} className={`p-2 rounded-lg text-xs border-b last:border-b-0 ${theme === 'dark' ? 'border-slate-700' : 'border-gray-100'}`}>
                                                <p className="font-bold">{n.title}</p>
                                                <p className="opacity-80">{n.message}</p>
                                                {!n.read && token && (
                                                    <button
                                                        className="mt-1 text-primary underline"
                                                        onClick={async () => {
                                                            await adminApi.markNotificationRead(token, n.id).catch(() => undefined);
                                                            markRead(n.id);
                                                        }}
                                                    >
                                                        {locale === 'ar' ? 'تعيين كمقروء' : 'Mark as read'}
                                                    </button>
                                                )}
                                            </div>
                                        )) : (
                                            <p className="text-xs opacity-75 p-2">{locale === 'ar' ? 'لا توجد إشعارات' : 'No notifications'}</p>
                                        )}

                                        <Link href={`/${locale}/admin/notifications`} className="block text-center text-xs text-primary underline mt-2">
                                            {locale === 'ar' ? 'عرض الكل' : 'View all'}
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                <main className="p-4 md:p-6">{children}</main>
            </div>
        </div>
    );
}
