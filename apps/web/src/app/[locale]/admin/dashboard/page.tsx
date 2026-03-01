'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useAuthStore } from '@/lib/store';
import { adminApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaBook, FaClipboardList, FaTools, FaUserTie } from 'react-icons/fa';

export default function AdminDashboard() {
    const t = useTranslations('admin');
    const locale = useLocale();
    const router = useRouter();
    const { token, admin } = useAuthStore();

    const [stats, setStats] = useState<any>(null);
    const [cloudUsage, setCloudUsage] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token) {
            router.push(`/${locale}/admin`);
            return;
        }
        void fetchStats();
    }, [token, locale, router]);

    const fetchStats = async () => {
        try {
            const [statsData, cloudData] = await Promise.all([
                adminApi.getDashboardStats(token!),
                adminApi.getCloudinaryUsage(token!),
            ]);
            setStats(statsData);
            setCloudUsage(cloudData);
        } catch {
            setStats(null);
            setCloudUsage(null);
        }
        setLoading(false);
    };

    const pendingCards = useMemo(() => ([
        {
            label: locale === 'ar' ? 'أئمة قيد المراجعة' : 'Pending Imams',
            count: stats?.pending?.imams || 0,
            color: 'text-primary',
            bg: 'bg-primary/10',
            icon: FaUserTie,
        },
        {
            label: locale === 'ar' ? 'حلقات قيد المراجعة' : 'Pending Halaqat',
            count: stats?.pending?.halaqat || 0,
            color: 'text-orange-600',
            bg: 'bg-orange-100',
            icon: FaBook,
        },
        {
            label: locale === 'ar' ? 'صيانة قيد المراجعة' : 'Pending Maintenance',
            count: stats?.pending?.maintenance || 0,
            color: 'text-red-600',
            bg: 'bg-red-100',
            icon: FaTools,
        },
    ]), [stats, locale]);

    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-xl border border-gray-200 bg-white p-6 animate-pulse">
                        <div className="h-7 bg-gray-200 rounded w-1/2 mb-3" />
                        <div className="h-4 bg-gray-200 rounded w-1/3" />
                    </div>
                ))}
            </div>
        );
    }

    if (!stats) {
        return <p className="text-sm opacity-70">{locale === 'ar' ? 'تعذر تحميل الإحصائيات' : 'Could not load stats'}</p>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-black">{t('dashboard')}</h1>
                    <p className="text-sm opacity-70 mt-1">
                        {locale === 'ar' ? 'نظرة عامة على طلبات المنصة وحالة المراجعة' : 'Overview of platform requests and review status'}
                    </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button onClick={() => void fetchStats()} className="btn-outline !py-2.5 !px-4 text-sm">
                        {locale === 'ar' ? 'Refresh Usage' : 'Refresh Usage'}
                    </button>
                    <Link href={`/${locale}/imams/submit`} className="btn-primary !py-2.5 !px-4 text-sm">{locale === 'ar' ? 'إضافة إمام' : 'Add Imam'}</Link>
                    <Link href={`/${locale}/halaqat/submit`} className="btn-outline !py-2.5 !px-4 text-sm">{locale === 'ar' ? 'إضافة حلقة' : 'Add Halqa'}</Link>
                    <Link href={`/${locale}/maintenance/submit`} className="btn-outline !py-2.5 !px-4 text-sm">{locale === 'ar' ? 'إضافة صيانة' : 'Add Maintenance'}</Link>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingCards.map((card, i) => {
                    const Icon = card.icon;
                    return (
                        <div key={i} className="rounded-xl border border-gray-200 bg-white p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-70">{card.label}</p>
                                    <p className={`text-3xl font-black ${card.color}`}>{card.count}</p>
                                </div>
                                <span className={`w-11 h-11 rounded-xl inline-flex items-center justify-center ${card.bg}`}>
                                    <Icon className={card.color} />
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title={locale === 'ar' ? 'إجمالي الأئمة' : 'Total Imams'} value={stats.total?.imams || 0} />
                <StatCard title={locale === 'ar' ? 'إجمالي الحلقات' : 'Total Halaqat'} value={stats.total?.halaqat || 0} />
                <StatCard title={locale === 'ar' ? 'إجمالي الصيانة' : 'Total Maintenance'} value={stats.total?.maintenance || 0} />
                <StatCard title={locale === 'ar' ? 'دورك الحالي' : 'Your role'} value={admin?.role?.replace('_', ' ') || '-'} icon={<FaClipboardList />} />
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-black">{locale === 'ar' ? 'استخدام Cloudinary' : 'Cloudinary Usage'}</h2>
                    <span className="text-xs font-bold text-text-muted">
                        {cloudUsage?.plan ? `${locale === 'ar' ? 'الخطة' : 'Plan'}: ${cloudUsage.plan}` : ''}
                    </span>
                </div>

                {cloudUsage?.enabled ? (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard title={locale === 'ar' ? 'المساحة المستخدمة' : 'Storage used'} value={formatBytes(cloudUsage?.storage?.used || 0)} />
                            <StatCard title={locale === 'ar' ? 'المساحة المتبقية' : 'Storage remaining'} value={formatBytes(cloudUsage?.storage?.remaining || 0)} />
                            <StatCard title={locale === 'ar' ? 'عدد الملفات' : 'Assets count'} value={cloudUsage?.resources || 0} />
                            <StatCard title={locale === 'ar' ? 'استهلاك الباندويث' : 'Bandwidth used'} value={formatBytes(cloudUsage?.bandwidth?.used || 0)} />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold text-text-muted">
                                <span>{locale === 'ar' ? 'نسبة استخدام المساحة' : 'Storage usage'}</span>
                                <span>{cloudUsage?.storage?.usedPercent || 0}%</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary rounded-full"
                                    style={{ width: `${Math.min(Number(cloudUsage?.storage?.usedPercent || 0), 100)}%` }}
                                />
                            </div>
                        </div>
                    </>
                ) : (
                    <p className="text-sm opacity-70">
                        {cloudUsage?.message || (locale === 'ar' ? 'تعذر تحميل بيانات Cloudinary' : 'Could not load Cloudinary usage')}
                    </p>
                )}
            </div>
        </div>
    );
}

function StatCard({ title, value, icon }: { title: string; value: string | number; icon?: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between">
                <p className="text-sm opacity-70">{title}</p>
                {icon ? <span className="text-primary">{icon}</span> : null}
            </div>
            <p className="text-2xl font-black mt-2">{value}</p>
        </div>
    );
}

function formatBytes(bytes: number) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / 1024 ** index;
    return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[index]}`;
}
