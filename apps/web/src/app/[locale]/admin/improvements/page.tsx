'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { FaSave, FaTrash } from 'react-icons/fa';
import { adminApi } from '@/lib/api';
import { useAuthStore, useToastStore } from '@/lib/store';

const statusTabs = ['all', 'pending', 'planned', 'completed', 'rejected'] as const;

export default function AdminImprovementsPage() {
    const locale = useLocale();
    const router = useRouter();
    const { token } = useAuthStore();
    const { pushToast } = useToastStore();

    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<(typeof statusTabs)[number]>('all');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const queryString = useMemo(() => {
        const params = new URLSearchParams();
        if (status !== 'all') params.set('status', status);
        if (fromDate) params.set('from', new Date(fromDate).toISOString());
        if (toDate) params.set('to', new Date(toDate).toISOString());
        return params.toString();
    }, [status, fromDate, toDate]);

    const fetchData = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const result = await adminApi.getAdminImprovements(token, queryString);
            setItems(result || []);
        } catch {
            pushToast(locale === 'ar' ? 'فشل تحميل التحسينات' : 'Failed to load improvements', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!token) {
            router.push(`/${locale}/admin`);
            return;
        }
        void fetchData();
    }, [token, queryString]);

    const updateItem = async (id: string, data: { status?: string; internal_note?: string }) => {
        if (!token) return;
        try {
            await adminApi.updateImprovement(token, id, data);
            setItems((prev) => prev.map((item) => (item.id === id ? {
                ...item,
                ...(data.status ? { status: data.status } : {}),
                ...(data.internal_note !== undefined ? { internalNote: data.internal_note } : {}),
            } : item)));
            pushToast(locale === 'ar' ? 'تم التحديث بنجاح' : 'Updated successfully', 'success');
        } catch {
            pushToast(locale === 'ar' ? 'فشل التحديث' : 'Update failed', 'error');
        }
    };

    const removeItem = async (id: string) => {
        if (!token) return;
        try {
            await adminApi.deleteImprovement(token, id);
            setItems((prev) => prev.filter((item) => item.id !== id));
            pushToast(locale === 'ar' ? 'تم حذف التحسين' : 'Improvement deleted', 'success');
        } catch {
            pushToast(locale === 'ar' ? 'فشل الحذف' : 'Delete failed', 'error');
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-black">{locale === 'ar' ? 'التحسينات' : 'Improvements'}</h1>

            <div className="bg-white border border-border rounded-2xl p-4 space-y-4">
                <div className="flex flex-wrap gap-2">
                    {statusTabs.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setStatus(tab)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold border ${status === tab ? 'bg-primary text-white border-primary' : 'bg-white border-border'}`}
                        >
                            {locale === 'ar'
                                ? ({ all: 'الكل', pending: 'قيد المراجعة', planned: 'ضمن الخطة', completed: 'تم التنفيذ', rejected: 'مرفوض' } as any)[tab]
                                : ({ all: 'All', pending: 'Pending', planned: 'Planned', completed: 'Completed', rejected: 'Rejected' } as any)[tab]}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="input-field" />
                    <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="input-field" />
                    <button onClick={() => void fetchData()} className="px-4 py-2 rounded-xl border border-border font-semibold">{locale === 'ar' ? 'تحديث' : 'Refresh'}</button>
                </div>
            </div>

            {loading ? <p>{locale === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}</p> : (
                <div className="space-y-3">
                    {items.map((item) => (
                        <div key={item.id} className="bg-white border border-border rounded-2xl p-4 space-y-3">
                            <p className="font-semibold text-dark whitespace-pre-wrap">{item.suggestionText}</p>
                            <div className="text-sm text-gray-600 grid grid-cols-1 md:grid-cols-2 gap-2">
                                <p>{locale === 'ar' ? 'الاسم:' : 'Name:'} {item.name || '-'}</p>
                                <p>{locale === 'ar' ? 'البريد:' : 'Email:'} {item.email || '-'}</p>
                                <p>{locale === 'ar' ? 'تاريخ الإرسال:' : 'Submitted:'} {new Date(item.createdAt).toLocaleString(locale)}</p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {(['pending', 'planned', 'completed', 'rejected'] as const).map((targetStatus) => (
                                    <button
                                        key={targetStatus}
                                        onClick={() => void updateItem(item.id, { status: targetStatus })}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${item.status === targetStatus ? 'bg-primary text-white border-primary' : 'bg-white border-border'}`}
                                    >
                                        {targetStatus}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-dark">{locale === 'ar' ? 'ملاحظة داخلية' : 'Internal note'}</label>
                                <textarea
                                    className="input-field"
                                    rows={3}
                                    value={item.internalNote || ''}
                                    onChange={(e) => setItems((prev) => prev.map((x) => x.id === item.id ? { ...x, internalNote: e.target.value } : x))}
                                />
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => void updateItem(item.id, { internal_note: item.internalNote || '' })}
                                        className="px-3 py-2 rounded-lg border border-border text-sm font-semibold inline-flex items-center gap-2"
                                    >
                                        <FaSave /> {locale === 'ar' ? 'حفظ الملاحظة' : 'Save note'}
                                    </button>
                                    <button
                                        onClick={() => void removeItem(item.id)}
                                        className="px-3 py-2 rounded-lg border border-red-300 text-red-600 text-sm font-semibold inline-flex items-center gap-2"
                                    >
                                        <FaTrash /> {locale === 'ar' ? 'حذف' : 'Delete'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {!items.length && <p className="text-sm text-gray-600">{locale === 'ar' ? 'لا توجد تحسينات حالياً.' : 'No improvements yet.'}</p>}
                </div>
            )}
        </div>
    );
}
