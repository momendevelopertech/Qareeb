'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { useAuthStore, useModalStore } from '@/lib/store';
import AppModal from '@/components/ui/AppModal';

export default function AuditPage() {
    const locale = useLocale();
    const router = useRouter();
    const { token, admin } = useAuthStore();
    const { isOpen, payload, openModal, closeModal } = useModalStore();

    const [data, setData] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);

    const [userId, setUserId] = useState('');
    const [action, setAction] = useState('');
    const [entityType, setEntityType] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');

    useEffect(() => {
        if (!token) {
            router.push(`/${locale}/admin`);
            return;
        }
        if (!['super_admin', 'full_reviewer'].includes(admin?.role || '')) {
            router.push(`/${locale}/admin/dashboard`);
            return;
        }
        void fetchUsers();
        void fetchLogs(page);
    }, [token, page, action, entityType, userId, from, to]);

    const fetchUsers = async () => {
        if (!token || admin?.role !== 'super_admin') return;
        try {
            const list = await adminApi.getAdminUsers(token);
            setUsers(list || []);
        } catch {
            setUsers([]);
        }
    };

    const fetchLogs = async (p: number) => {
        if (!token) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: p.toString(), limit: '20' });
            if (entityType) params.set('entityType', entityType);
            if (userId) params.set('userId', userId);
            if (action) params.set('action', action);
            if (from) params.set('from', from);
            if (to) params.set('to', to);
            const res = await adminApi.getAuditLogs(token, params.toString());
            setData(res.data || []);
            setTotalPages(res.meta?.totalPages || 1);
        } catch (err) {
            console.error('Audit fetch error', err);
        }
        setLoading(false);
    };

    const formatDate = (d: string) => new Date(d).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US');

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">{locale === 'ar' ? 'سجل التدقيق' : 'Audit Logs'}</h1>
                <p className="text-text-muted text-sm">{locale === 'ar' ? 'جميع إجراءات الإدارة مع snapshot كامل' : 'All admin actions with full snapshots'}</p>
            </div>

            <div className="card p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
                <select className="input-field" value={entityType} onChange={(e) => { setPage(1); setEntityType(e.target.value); }}>
                    <option value="">{locale === 'ar' ? 'كل الكيانات' : 'All entities'}</option>
                    <option value="imam">imam</option>
                    <option value="halqa">halqa</option>
                    <option value="maintenance">maintenance</option>
                </select>
                <select className="input-field" value={action} onChange={(e) => { setPage(1); setAction(e.target.value); }}>
                    <option value="">{locale === 'ar' ? 'كل الإجراءات' : 'All actions'}</option>
                    {['create', 'update', 'delete', 'approve', 'reject'].map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
                <select className="input-field" value={userId} onChange={(e) => { setPage(1); setUserId(e.target.value); }}>
                    <option value="">{locale === 'ar' ? 'كل المستخدمين' : 'All users'}</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.email}</option>)}
                </select>
                <input type="date" className="input-field" value={from} onChange={(e) => { setPage(1); setFrom(e.target.value); }} />
                <input type="date" className="input-field" value={to} onChange={(e) => { setPage(1); setTo(e.target.value); }} />
            </div>

            <div className="card p-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead>
                        <tr className="text-left text-text-muted">
                            <th className="py-2 pe-4">{locale === 'ar' ? 'المستخدم' : 'User'}</th>
                            <th className="py-2 pe-4">{locale === 'ar' ? 'الإجراء' : 'Action'}</th>
                            <th className="py-2 pe-4">{locale === 'ar' ? 'الكيان' : 'Entity'}</th>
                            <th className="py-2 pe-4">{locale === 'ar' ? 'السجل' : 'Record'}</th>
                            <th className="py-2 pe-4">{locale === 'ar' ? 'التاريخ' : 'Date & Time'}</th>
                            <th className="py-2 pe-4">{locale === 'ar' ? 'تفاصيل' : 'Details'}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {loading ? (
                            <tr><td className="py-6 text-center" colSpan={6}>Loading...</td></tr>
                        ) : data.length ? data.map((log: any) => (
                            <tr key={log.id} className="hover:bg-cream/60 transition-colors">
                                <td className="py-2 pe-4 text-text-muted">{log.admin?.email || '-'}</td>
                                <td className="py-2 pe-4 uppercase text-xs font-black text-primary">{log.action}</td>
                                <td className="py-2 pe-4 font-semibold">{log.entityType}</td>
                                <td className="py-2 pe-4 text-text-muted">{log.entityId}</td>
                                <td className="py-2 pe-4 text-text-muted">{formatDate(log.createdAt)}</td>
                                <td className="py-2 pe-4"><button className="btn-outline !py-1 !px-2 text-xs" onClick={() => openModal('view', 'imam', log)}>{locale === 'ar' ? 'عرض' : 'View'}</button></td>
                            </tr>
                        )) : (
                            <tr><td className="py-6 text-center" colSpan={6}>{locale === 'ar' ? 'لا توجد سجلات' : 'No entries'}</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="flex gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 8).map((p) => (
                        <button key={p} onClick={() => setPage(p)} className={`px-3 py-2 rounded-btn text-sm font-medium ${p === page ? 'bg-primary text-white' : 'bg-white border border-border text-text'}`}>{p}</button>
                    ))}
                </div>
            )}

            <AppModal isOpen={isOpen} type="view" title={locale === 'ar' ? 'تفاصيل السجل' : 'Log Details'} onClose={closeModal}>
                {payload && (
                    <div className="space-y-4">
                        <p className="text-sm text-text-muted">{locale === 'ar' ? 'Snapshot كامل' : 'Full snapshot'}</p>
                        <pre className="text-xs bg-gray-50 border border-border rounded-xl p-3 overflow-auto">{JSON.stringify(payload.oldData, null, 2)}</pre>
                        {payload.newData && (
                            <>
                                <p className="text-sm text-text-muted">{locale === 'ar' ? 'Before/After' : 'Before/After'}</p>
                                <pre className="text-xs bg-gray-50 border border-border rounded-xl p-3 overflow-auto">{JSON.stringify(payload.newData, null, 2)}</pre>
                            </>
                        )}
                    </div>
                )}
            </AppModal>
        </div>
    );
}
