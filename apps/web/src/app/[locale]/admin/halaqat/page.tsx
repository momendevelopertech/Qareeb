'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useAuthStore } from '@/lib/store';
import { adminApi } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function AdminHalaqatPage() {
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
            const result = await adminApi.getAdminHalaqat(token!, `status=${statusFilter}`);
            setData(result);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const handleApprove = async (id: string) => {
        try {
            await adminApi.approveHalqa(token!, id);
            alert(locale === 'ar' ? 'تمت الموافقة على الحلقة.' : 'Circle approved.');
            fetchData();
        } catch (err) {
            console.error(err);
            alert(locale === 'ar' ? 'حدث خطأ أثناء الموافقة.' : 'An error occurred while approving.');
        }
    };

    const handleReject = async (id: string) => {
        const reason = prompt(locale === 'ar' ? 'سبب الرفض:' : 'Rejection reason:') || '';
        try {
            await adminApi.rejectHalqa(token!, id, reason);
            alert(locale === 'ar' ? 'تم رفض الحلقة.' : 'Circle rejected.');
            fetchData();
        } catch (err) {
            console.error(err);
            alert(locale === 'ar' ? 'حدث خطأ أثناء الرفض.' : 'An error occurred while rejecting.');
        }
    };

    const handleEdit = async (halqa: any) => {
        const newName = prompt(locale === 'ar' ? 'اسم الحلقة' : 'Circle name', halqa.circleName) || halqa.circleName;
        const newMosque = prompt(locale === 'ar' ? 'اسم المسجد' : 'Mosque name', halqa.mosqueName) || halqa.mosqueName;
        const newWhatsapp = prompt('WhatsApp', halqa.whatsapp) || halqa.whatsapp;
        try {
            await adminApi.updateHalqa(token!, halqa.id, { circle_name: newName, mosque_name: newMosque, whatsapp: newWhatsapp });
            fetchData();
        } catch (err) {
            console.error(err);
            alert(locale === 'ar' ? 'حدث خطأ أثناء التحديث.' : 'Error updating record.');
        }
    };

    const handleEdit = async (halqa: any) => {
        const newName = prompt(locale === 'ar' ? 'اسم الحلقة' : 'Circle name', halqa.circleName) || halqa.circleName;
        const newMosque = prompt(locale === 'ar' ? 'اسم المسجد' : 'Mosque name', halqa.mosqueName) || halqa.mosqueName;
        const newWhatsapp = prompt('WhatsApp', halqa.whatsapp) || halqa.whatsapp;
        try {
            await adminApi.updateHalqa(token!, halqa.id, { circle_name: newName, mosque_name: newMosque, whatsapp: newWhatsapp });
            fetchData();
        } catch (err) {
            console.error(err);
            alert(locale === 'ar' ? 'حدث خطأ أثناء التحديث.' : 'Error updating record.');
        }
    };

    const typeLabels: Record<string, string> = locale === 'ar'
        ? { men: 'رجال', women: 'نساء', children: 'أطفال', mixed: 'مختلط' }
        : { men: 'Men', women: 'Women', children: 'Children', mixed: 'Mixed' };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">{locale === 'ar' ? 'إدارة الحلقات' : 'Manage Circles'}</h1>
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
                            <th className="text-start px-4 py-3 text-sm font-medium text-text-muted">{locale === 'ar' ? 'الحلقة' : 'Circle'}</th>
                            <th className="text-start px-4 py-3 text-sm font-medium text-text-muted">{locale === 'ar' ? 'النوع' : 'Type'}</th>
                            <th className="text-start px-4 py-3 text-sm font-medium text-text-muted">{locale === 'ar' ? 'الموقع' : 'Location'}</th>
                            <th className="text-start px-4 py-3 text-sm font-medium text-text-muted">{locale === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                        </tr></thead>
                                <tbody className="divide-y">
                                    {loading ? (
                                        <tr><td colSpan={4} className="px-4 py-8 text-center text-text-muted">{locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}</td></tr>
                                    ) : data?.data?.length > 0 ? data.data.map((halqa: any) => (
                                        <tr key={halqa.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-4"><div className="font-medium">{halqa.circleName}</div><div className="text-sm text-text-muted">{halqa.mosqueName}</div></td>
                                            <td className="px-4 py-4"><span className="badge bg-orange-100 text-orange-800 text-xs">{typeLabels[halqa.halqaType] || halqa.halqaType}</span></td>
                                            <td className="px-4 py-4 text-text-muted text-sm">{halqa.governorate} — {halqa.city}</td>
                                            <td className="px-4 py-4">
                                                <div className="flex gap-2">
                                                    {halqa.status === 'pending' && (
                                                        <>
                                                            <button onClick={() => handleApprove(halqa.id)} className="text-green-600 hover:text-green-700 text-sm font-medium">{t('approve')}</button>
                                                            <button onClick={() => handleReject(halqa.id)} className="text-red-600 hover:text-red-700 text-sm font-medium">{t('reject')}</button>
                                                        </>
                                                    )}
                                                    <button onClick={() => handleEdit(halqa)} className="text-blue-600 hover:text-blue-700 text-sm font-medium">{locale === 'ar' ? 'تعديل' : 'Edit'}</button>
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
