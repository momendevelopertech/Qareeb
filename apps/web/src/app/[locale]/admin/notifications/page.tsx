'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { adminApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import Link from 'next/link';
import Pusher from 'pusher-js';

type Notification = {
    id: string;
    title: string;
    message: string;
    type: 'imam' | 'halqa' | 'maintenance';
    referenceId: string;
    isRead: boolean;
    createdAt: string;
};

export default function NotificationsPage() {
    const locale = useLocale();
    const { token, admin } = useAuthStore();
    const [status, setStatus] = useState<'unread' | 'all'>('unread');
    const [items, setItems] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await adminApi.getNotifications(token, status);
            setItems(res);
        } catch (err) {
            console.error('Notifications fetch error', err);
        }
        setLoading(false);
    };

    useEffect(() => {
        load();
        let pusher: Pusher | null = null;
        if (token && process.env.NEXT_PUBLIC_PUSHER_KEY && admin?.role) {
            pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
                cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
            });
            const channel = pusher.subscribe(`role-${admin.role}`);
            channel.bind('notification', (payload: any) => {
                setItems((prev) => [
                    { id: crypto.randomUUID(), isRead: false, createdAt: new Date().toISOString(), referenceId: '', type: payload?.type || 'imam', title: payload?.title || 'New submission', message: payload?.message || '' },
                    ...prev,
                ]);
            });
        }
        return () => { if (pusher) pusher.disconnect(); };
    }, [status, token, admin?.role]);

    const markRead = async (id: string) => {
        if (!token) return;
        await adminApi.markNotificationRead(token, id);
        setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    };

    const markAll = async () => {
        if (!token) return;
        await adminApi.markAllNotificationsRead(token);
        setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    };

    const typeLabel = (t: string) => {
        if (locale === 'ar') {
            if (t === 'imam') return 'إمام';
            if (t === 'halqa') return 'حلقة';
            return 'صيانة';
        }
        return t === 'imam' ? 'Imam' : t === 'halqa' ? 'Circle' : 'Maintenance';
    };

    const detailHref = (n: Notification) => {
        const base = `/${locale}`;
        if (n.type === 'imam') return `${base}/imams/${n.referenceId}`;
        if (n.type === 'halqa') return `${base}/halaqat/${n.referenceId}`;
        return `${base}/maintenance/${n.referenceId}`;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">{locale === 'ar' ? 'الإشعارات' : 'Notifications'}</h1>
                    <p className="text-text-muted text-sm">{locale === 'ar' ? 'تنبيهات الإضافات الجديدة' : 'Alerts for new submissions'}</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setStatus('unread')} className={`px-4 py-2 rounded-btn text-sm font-bold ${status === 'unread' ? 'bg-primary text-white' : 'bg-gray-100 text-text'}`}>
                        {locale === 'ar' ? 'غير مقروءة' : 'Unread'}
                    </button>
                    <button onClick={() => setStatus('all')} className={`px-4 py-2 rounded-btn text-sm font-bold ${status === 'all' ? 'bg-primary text-white' : 'bg-gray-100 text-text'}`}>
                        {locale === 'ar' ? 'الكل' : 'All'}
                    </button>
                    <button onClick={markAll} className="px-4 py-2 rounded-btn text-sm font-bold bg-cream text-text hover:bg-primary/10">
                        {locale === 'ar' ? 'تعيين كمقروء' : 'Mark all read'}
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-card border border-border divide-y">
                {loading ? (
                    <div className="p-6 text-text-muted">{locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
                ) : items.length === 0 ? (
                    <div className="p-6 text-text-muted">{locale === 'ar' ? 'لا إشعارات' : 'No notifications'}</div>
                ) : (
                    items.map((n) => (
                        <div key={n.id} className="p-5 flex items-start gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${n.isRead ? 'bg-gray-100 text-gray-500' : 'bg-primary/10 text-primary'}`}>
                                🔔
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-black uppercase text-primary">{typeLabel(n.type)}</span>
                                    <span className="text-xs text-text-muted">{new Date(n.createdAt).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')}</span>
                                    {!n.isRead && <span className="inline-flex px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 rounded-full">{locale === 'ar' ? 'جديد' : 'New'}</span>}
                                </div>
                                <p className="font-semibold text-dark mt-1">{n.title}</p>
                                <p className="text-sm text-text-muted">{n.message}</p>
                                <div className="flex gap-3 mt-3">
                                    <Link href={detailHref(n)} className="text-primary font-bold text-sm underline">
                                        {locale === 'ar' ? 'عرض التفاصيل' : 'View details'}
                                    </Link>
                                    {!n.isRead && (
                                        <button onClick={() => markRead(n.id)} className="text-xs text-text-muted hover:text-primary">
                                            {locale === 'ar' ? 'تعليم كمقروء' : 'Mark read'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
