'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { adminApi } from '@/lib/api';
import { useAuthStore, useModalStore, useNotificationStore } from '@/lib/store';
import AppModal from '@/components/ui/AppModal';

export default function NotificationsPage() {
    const locale = useLocale();
    const { token } = useAuthStore();
    const { items, setNotifications, markRead, markAllRead } = useNotificationStore();
    const { isOpen, payload, openModal, closeModal } = useModalStore();
    const [status, setStatus] = useState<'unread' | 'all'>('unread');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            if (!token) return;
            setLoading(true);
            try {
                const res = await adminApi.getNotifications(token, status);
                setNotifications((res || []).map((n: any) => ({
                    id: n.id,
                    type: n.type,
                    title: n.title,
                    message: n.message,
                    recordId: n.referenceId,
                    createdAt: n.createdAt,
                    read: n.isRead,
                })));
            } catch (err) {
                console.error('Notifications fetch error', err);
            }
            setLoading(false);
        };
        void load();
    }, [status, token]);

    const onMarkRead = async (id: string) => {
        if (!token) return;
        await adminApi.markNotificationRead(token, id);
        markRead(id);
    };

    const onMarkAll = async () => {
        if (!token) return;
        await adminApi.markAllNotificationsRead(token);
        markAllRead();
    };

    const entityLabel = (type: string) => type.includes('imam') ? 'imam' : type.includes('halqa') ? 'halqa' : 'maintenance';

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">{locale === 'ar' ? 'الإشعارات' : 'Notifications'}</h1>
                    <p className="text-text-muted text-sm">{locale === 'ar' ? 'تحديث لحظي بدون Refresh' : 'Live updates without refresh'}</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setStatus('unread')} className={`px-4 py-2 rounded-btn text-sm font-bold ${status === 'unread' ? 'bg-primary text-white' : 'bg-gray-100 text-text'}`}>{locale === 'ar' ? 'غير مقروءة' : 'Unread'}</button>
                    <button onClick={() => setStatus('all')} className={`px-4 py-2 rounded-btn text-sm font-bold ${status === 'all' ? 'bg-primary text-white' : 'bg-gray-100 text-text'}`}>{locale === 'ar' ? 'الكل' : 'All'}</button>
                    <button onClick={onMarkAll} className="px-4 py-2 rounded-btn text-sm font-bold bg-cream text-text hover:bg-primary/10">{locale === 'ar' ? 'تعيين الكل كمقروء' : 'Mark all read'}</button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-card border border-border divide-y">
                {loading ? <div className="p-6 text-text-muted">Loading...</div> : !items.length ? <div className="p-6 text-text-muted">{locale === 'ar' ? 'لا إشعارات' : 'No notifications'}</div> : (
                    items.map((n) => (
                        <div key={n.id} className="p-5 flex items-start gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${n.read ? 'bg-gray-100 text-gray-500' : 'bg-primary/10 text-primary'}`}>🔔</div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-black uppercase text-primary">{entityLabel(n.type)}</span>
                                    <span className="text-xs text-text-muted">{new Date(n.createdAt).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')}</span>
                                    {!n.read && <span className="inline-flex px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 rounded-full">{locale === 'ar' ? 'جديد' : 'New'}</span>}
                                </div>
                                <p className="font-semibold text-dark mt-1">{n.title}</p>
                                <p className="text-sm text-text-muted">{n.message}</p>
                                <div className="flex gap-3 mt-3">
                                    <button onClick={() => openModal('view', entityLabel(n.type) as any, n)} className="text-primary font-bold text-sm underline">{locale === 'ar' ? 'فتح السجل' : 'Open record'}</button>
                                    {!n.read && <button onClick={() => onMarkRead(n.id)} className="text-xs text-text-muted hover:text-primary">{locale === 'ar' ? 'كمقروء' : 'Mark read'}</button>}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <AppModal isOpen={isOpen} type="view" title={locale === 'ar' ? 'سجل الإشعار' : 'Notification Record'} onClose={closeModal}>
                {payload && (
                    <div className="space-y-2 text-sm">
                        <p><strong>{locale === 'ar' ? 'العنوان:' : 'Title:'}</strong> {payload.title}</p>
                        <p><strong>{locale === 'ar' ? 'النوع:' : 'Type:'}</strong> {entityLabel(payload.type)}</p>
                        <p><strong>{locale === 'ar' ? 'المعرف:' : 'Record ID:'}</strong> {payload.recordId}</p>
                    </div>
                )}
            </AppModal>
        </div>
    );
}
