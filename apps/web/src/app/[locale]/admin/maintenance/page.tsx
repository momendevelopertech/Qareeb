'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useAuthStore } from '@/lib/store';
import { adminApi } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function AdminMaintenancePage() {
    const t = useTranslations('admin');
    const locale = useLocale();
    const router = useRouter();
    const { token } = useAuthStore();
    const [data, setData] = useState<any>(null);
    const [statusFilter, setStatusFilter] = useState('pending');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token) { router.push(`/${locale}/admin`); return; }
        fetchData();
    }, [token, statusFilter]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const result = await adminApi.getAdminMaintenance(token!, `status=${statusFilter}`);
            setData(result);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const handleApprove = async (id: string) => {
        try {
            await adminApi.approveMaintenance(token!, id);
            alert(locale === 'ar' ? 'تمت الموافقة على طلب الصيانة.' : 'Maintenance request approved.');
            fetchData();
        } catch (err) {
            console.error(err);
            alert(locale === 'ar' ? 'حدث خطأ أثناء الموافقة.' : 'An error occurred while approving.');
        }
    };

    const handleReject = async (id: string) => {
        const reason = prompt(locale === 'ar' ? 'سبب الرفض:' : 'Rejection reason:') || '';
        try {
            await adminApi.rejectMaintenance(token!, id, reason);
            alert(locale === 'ar' ? 'تم رفض طلب الصيانة.' : 'Maintenance request rejected.');
            fetchData();
        } catch (err) {
            console.error(err);
            alert(locale === 'ar' ? 'حدث خطأ أثناء الرفض.' : 'An error occurred while rejecting.');
        }
    };

    const handleEdit = async (item: any) => {
        const newName = prompt(locale === 'ar' ? 'اسم المسجد' : 'Mosque name', item.mosqueName) || item.mosqueName;
        const newWhatsapp = prompt('WhatsApp', item.whatsapp) || item.whatsapp;
        const newDesc = prompt(locale === 'ar' ? 'الوصف' : 'Description', item.description) || item.description;
        try {
            await adminApi.updateMaintenance(token!, item.id, { mosque_name: newName, whatsapp: newWhatsapp, description: newDesc });
            fetchData();
        } catch (err) {
            console.error(err);
            alert(locale === 'ar' ? 'حدث خطأ أثناء التحديث.' : 'Error updating record.');
        }
    };

    const mLabels: Record<string, string> = locale === 'ar'
        ? { flooring: 'أرضيات', ac: 'تكييف', plumbing: 'سباكة', painting: 'دهان', furniture: 'أثاث', electrical: 'كهرباء', other: 'أخرى' }
        : {};

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">{locale === 'ar' ? 'إدارة الصيانة' : 'Manage Maintenance'}</h1>
            <div className="flex gap-2">
                {['pending', 'approved', 'rejected'].map((s) => (
                    <button key={s} onClick={() => setStatusFilter(s)} className={`px-4 py-2 rounded-btn text-sm font-medium transition-all ${statusFilter === s ? 'bg-primary text-white' : 'bg-white text-text-muted hover:bg-gray-50'}`}>
                        {s === 'pending' ? t('pending') : s === 'approved' ? t('approved') : t('rejected')}
                    </button>
                ))}
            </div>
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b"><tr>
                            <th className="text-start px-4 py-3 text-sm font-medium text-text-muted">{locale === 'ar' ? 'المسجد' : 'Mosque'}</th>
                            <th className="text-start px-4 py-3 text-sm font-medium text-text-muted">{locale === 'ar' ? 'الأنواع' : 'Types'}</th>
                            <th className="text-start px-4 py-3 text-sm font-medium text-text-muted">{locale === 'ar' ? 'الموقع' : 'Location'}</th>
                            <th className="text-start px-4 py-3 text-sm font-medium text-text-muted">{locale === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                        </tr></thead>
                        <tbody className="divide-y">
                            {loading ? (
                                <tr><td colSpan={4} className="px-4 py-8 text-center text-text-muted">{locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}</td></tr>
                            ) : data?.data?.length > 0 ? data.data.map((item: any) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-4"><div className="font-medium">{item.mosqueName}</div><div className="text-sm text-text-muted line-clamp-1">{item.description}</div></td>
                                    <td className="px-4 py-4"><div className="flex flex-wrap gap-1">{(item.maintenanceTypes || []).map((type: string) => (<span key={type} className="badge bg-red-100 text-red-800 text-xs">{mLabels[type] || type}</span>))}</div></td>
                                    <td className="px-4 py-4 text-text-muted text-sm">{item.governorate} — {item.city}</td>
                                    <td className="px-4 py-4">
                                        <div className="flex gap-2">
                                            {item.status === 'pending' && (
                                                <>
                                                    <button onClick={() => handleApprove(item.id)} className="text-green-600 hover:text-green-700 text-sm font-medium">{t('approve')}</button>
                                                    <button onClick={() => handleReject(item.id)} className="text-red-600 hover:text-red-700 text-sm font-medium">{t('reject')}</button>
                                                </>
                                            )}
                                            <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-700 text-sm font-medium">{locale === 'ar' ? 'تعديل' : 'Edit'}</button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={4} className="px-4 py-8 text-center text-text-muted">{locale === 'ar' ? 'لا توجد بيانات' : 'No data'}</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
