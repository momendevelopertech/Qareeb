'use client';

import { useTranslations, useLocale } from 'next-intl';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const t = useTranslations('admin');
    const locale = useLocale();
    const pathname = usePathname();
    const router = useRouter();
    const { token, admin, clearAuth } = useAuthStore();
    const [unreadCount, setUnreadCount] = useState(0);

    // If no token and not on login page, show login
    const isLoginPage = pathname.includes('/admin') && !pathname.includes('/admin/');

    useEffect(() => {
        if (!token && !isLoginPage) {
            // Don't redirect, just show login on the admin page
        }
    }, [token, isLoginPage]);

    useEffect(() => {
        const loadCount = async () => {
            if (!token) return;
            try {
                const res = await adminApi.getNotificationCount(token);
                setUnreadCount(res.count || 0);
            } catch (err) {
                console.error('Notification count error', err);
            }
        };
        loadCount();
        const interval = setInterval(loadCount, 30000);
        return () => clearInterval(interval);
    }, [token]);

    const handleLogout = () => {
        clearAuth();
        router.push(`/${locale}/admin`);
    };

    // If no auth, show login component
    if (!token && !isLoginPage) {
        return children;
    }

    const navItems = [
        { href: `/${locale}/admin/dashboard`, label: t('dashboard'), icon: '📊' },
        { href: `/${locale}/admin/imams`, label: locale === 'ar' ? 'الأئمة' : 'Imams', icon: '🕌' },
        { href: `/${locale}/admin/halaqat`, label: locale === 'ar' ? 'الحلقات' : 'Circles', icon: '📖' },
        { href: `/${locale}/admin/maintenance`, label: locale === 'ar' ? 'الصيانة' : 'Maintenance', icon: '🔧' },
        { href: `/${locale}/admin/notifications`, label: locale === 'ar' ? 'الإشعارات' : 'Notifications', icon: '🔔', badge: unreadCount },
    ];

    if (admin?.role === 'super_admin') {
        navItems.push({ href: `/${locale}/admin/users`, label: t('users'), icon: '👥' });
    }

    if (isLoginPage) {
        return children;
    }

    return (
        <div className="min-h-screen flex bg-gray-100">
            {/* Sidebar */}
            <aside className="w-64 bg-gray-900 text-white flex flex-col shrink-0 hidden md:flex">
                <div className="p-6 border-b border-gray-800">
                    <Link href={`/${locale}`} className="flex items-center gap-2">
                        <div className="w-10 h-10 gradient-bg rounded-xl flex items-center justify-center">
                            <span className="text-white text-xl font-bold">ق</span>
                        </div>
                        <div>
                            <span className="font-bold text-lg">{locale === 'ar' ? 'قريب' : 'Qareeb'}</span>
                            <p className="text-xs text-gray-400">{t('dashboard')}</p>
                        </div>
                    </Link>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${isActive ? 'bg-primary text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                    }`}
                            >
                                <span>{item.icon}</span>
                                <span className="flex items-center gap-2">
                                    {item.label}
                                    {item.badge ? (
                                        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 text-[10px] font-bold bg-red-500 text-white rounded-full">
                                            {item.badge > 99 ? '99+' : item.badge}
                                        </span>
                                    ) : null}
                                </span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-800">
                    <div className="flex items-center gap-3 mb-3 px-2">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-sm font-bold">
                            {admin?.email?.[0]?.toUpperCase() || 'A'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{admin?.email}</p>
                            <p className="text-xs text-gray-400">{admin?.role?.replace('_', ' ')}</p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="w-full text-start px-4 py-2 text-sm text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-all">
                        {t('logout')}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 overflow-auto">
                {/* Mobile Header */}
                <div className="md:hidden bg-gray-900 text-white p-4 flex items-center justify-between">
                    <span className="font-bold">{locale === 'ar' ? 'قريب — لوحة التحكم' : 'Qareeb — Dashboard'}</span>
                    <button onClick={handleLogout} className="text-sm text-gray-400">{t('logout')}</button>
                </div>
                <main className="p-6 md:p-8">{children}</main>
            </div>
        </div>
    );
}
