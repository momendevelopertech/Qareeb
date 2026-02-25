'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useAuthStore } from '@/lib/store';
import { adminApi } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function AdminImamsPage() {
    const t = useTranslations('admin');
    const locale = useLocale();
    const router = useRouter();
    const { token, admin } = useAuthStore();
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
            const result = await adminApi.getAdminImams(token!, `status=${statusFilter}`);
            setData(result);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const handleApprove = async (id: string) => {
        try {
            await adminApi.approveImam(token!, id);
            alert(locale === 'ar' ? 'تمت الموافقة بنجاح.' : 'Approved successfully.');
            fetchData();
        } catch (err) {
            console.error(err);
            alert(locale === 'ar' ? 'حدث خطأ أثناء الموافقة.' : 'An error occurred while approving.');
        }
    };

    const handleReject = async (id: string) => {
        const reason = prompt(locale === 'ar' ? 'سبب الرفض (اختياري):' : 'Rejection reason (optional):') || '';
        try {
            await adminApi.rejectImam(token!, id, reason);
            alert(locale === 'ar' ? 'تم رفض الطلب.' : 'Request rejected.');
            fetchData();
        } catch (err) {
            console.error(err);
            alert(locale === 'ar' ? 'حدث خطأ أثناء الرفض.' : 'An error occurred while rejecting.');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(locale === 'ar' ? 'هل أنت متأكد من الحذف؟' : 'Are you sure you want to delete?')) return;
        try {
            await adminApi.deleteImam(token!, id);
            alert(locale === 'ar' ? 'تم حذف الإمام بنجاح.' : 'Imam deleted successfully.');
            fetchData();
        } catch (err) {
            console.error(err);
            alert(locale === 'ar' ? 'حدث خطأ أثناء الحذف.' : 'An error occurred while deleting.');
        }
    };

    const handleEdit = async (imam: any) => {
        const newName = prompt(locale === 'ar' ? 'اسم الإمام' : 'Imam name', imam.imamName) || imam.imamName;
        const newMosque = prompt(locale === 'ar' ? 'اسم المسجد' : 'Mosque name', imam.mosqueName) || imam.mosqueName;
        const newWhatsapp = prompt('WhatsApp', imam.whatsapp) || imam.whatsapp;
        try {
            await adminApi.updateImam(token!, imam.id, { imam_name: newName, mosque_name: newMosque, whatsapp: newWhatsapp });
            fetchData();
        } catch (err) {
            console.error(err);
            alert(locale === 'ar' ? 'حدث خطأ أثناء التحديث.' : 'Error updating record.');
        }
    };

    const statusTabs = [
        { value: 'pending', label: t('pending'), color: 'bg-yellow-500' },
        { value: 'approved', label: t('approved'), color: 'bg-green-500' },
        { value: 'rejected', label: t('rejected'), color: 'bg-red-500' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">{locale === 'ar' ? 'إدارة الأئمة' : 'Manage Imams'}</h1>
            </div>

            {/* Status Tabs */}
            <div className="flex gap-2">
                {statusTabs.map((tab) => (
                    <button
                        key={tab.value}
                        onClick={() => setStatusFilter(tab.value)}
                        className={`px-4 py-2 rounded-btn text-sm font-medium transition-all ${statusFilter === tab.value ? 'bg-primary text-white' : 'bg-white text-text-muted hover:bg-gray-50'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="text-start px-4 py-3 text-sm font-medium text-text-muted">{locale === 'ar' ? 'الإمام' : 'Imam'}</th>
                                <th className="text-start px-4 py-3 text-sm font-medium text-text-muted">{locale === 'ar' ? 'المسجد' : 'Mosque'}</th>
                                <th className="text-start px-4 py-3 text-sm font-medium text-text-muted">{locale === 'ar' ? 'الموقع' : 'Location'}</th>
                                <th className="text-start px-4 py-3 text-sm font-medium text-text-muted">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                                <th className="text-start px-4 py-3 text-sm font-medium text-text-muted">{locale === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {loading ? (
                                <tr><td colSpan={5} className="px-4 py-8 text-center text-text-muted">{locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}</td></tr>
                            ) : data?.data?.length > 0 ? (
                                data.data.map((imam: any) => (
                                    <tr key={imam.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-4 font-medium">{imam.imamName}</td>
                                        <td className="px-4 py-4 text-text-muted text-sm">{imam.mosqueName}</td>
                                        <td className="px-4 py-4 text-text-muted text-sm">{imam.governorate} — {imam.city}</td>
                                        <td className="px-4 py-4">
                                            <span className={`badge text-xs ${imam.status === 'approved' ? 'badge-approved' :
                                                    imam.status === 'rejected' ? 'badge-rejected' : 'badge-pending'
                                                }`}>
                                                {imam.status === 'approved' ? t('approved') : imam.status === 'rejected' ? t('rejected') : t('pending')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex gap-2">
                                                {imam.status === 'pending' && (
                                                    <>
                                                        <button onClick={() => handleApprove(imam.id)} className="text-green-600 hover:text-green-700 text-sm font-medium">{t('approve')}</button>
                                                        <button onClick={() => handleReject(imam.id)} className="text-red-600 hover:text-red-700 text-sm font-medium">{t('reject')}</button>
                                                    </>
                                                )}
                                                <button onClick={() => handleEdit(imam)} className="text-blue-600 hover:text-blue-700 text-sm font-medium">{locale === 'ar' ? 'تعديل' : 'Edit'}</button>
                                                {admin?.role === 'super_admin' && (
                                                    <button onClick={() => handleDelete(imam.id)} className="text-gray-400 hover:text-red-600 text-sm">{locale === 'ar' ? 'حذف' : 'Delete'}</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={5} className="px-4 py-8 text-center text-text-muted">{locale === 'ar' ? 'لا توجد بيانات' : 'No data'}</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
