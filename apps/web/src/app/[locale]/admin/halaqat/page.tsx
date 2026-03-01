'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { useAuthStore, useModalStore, useToastStore } from '@/lib/store';
import { adminApi, api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import AppModal from '@/components/ui/AppModal';
import { FaCheck, FaEye, FaPenToSquare, FaXmark } from 'react-icons/fa6';
import PhoneInputField from '@/components/form/PhoneInputField';
import Pagination from '@/components/ui/Pagination';

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
    return <button aria-label={label} title={label} onClick={onClick} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-cream">{children}</button>;
}

export default function AdminHalaqatPage() {
    const locale = useLocale();
    const router = useRouter();
    const { token } = useAuthStore();
    const { isOpen, type, payload, openModal, closeModal } = useModalStore();
    const { pushToast } = useToastStore();

    const [items, setItems] = useState<any[]>([]);
    const [statusFilter, setStatusFilter] = useState('pending');
    const [searchTerm, setSearchTerm] = useState('');
    const [onlineFilter, setOnlineFilter] = useState('all'); // 'all', 'online', 'offline'
    const [loading, setLoading] = useState(true);
    const [editForm, setEditForm] = useState<any>({});
    const [governorates, setGovernorates] = useState<any[]>([]);
    const [editAreas, setEditAreas] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const pageSize = 12;

    useEffect(() => {
        if (!token) { router.push(`/${locale}/admin`); return; }
        void fetchData();
    }, [token, statusFilter]);

    useEffect(() => {
        api.getGovernorates().then(setGovernorates).catch(() => setGovernorates([]));
    }, []);

    useEffect(() => {
        setPage(1);
    }, [statusFilter]);

    useEffect(() => {
        setPage(1);
    }, [searchTerm]);

    useEffect(() => {
        setPage(1);
    }, [onlineFilter]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // جلب كل البيانات لهذا الفلتر؛ الباجنيشن يتم على الواجهة
            const result = await adminApi.getAdminHalaqat(token!, `status=${statusFilter}`);
            setItems(result?.data || []);
        } catch {
            pushToast(locale === 'ar' ? 'فشل تحميل البيانات' : 'Failed to load data', 'error');
        }
        setLoading(false);
    };

    const approve = async (id: string) => {
        try { await adminApi.approveHalqa(token!, id); pushToast(locale === 'ar' ? 'تمت الموافقة' : 'Approved', 'success'); void fetchData(); }
        catch { pushToast(locale === 'ar' ? 'فشل في الموافقة' : 'Approve failed', 'error'); }
    };
    const reject = async (id: string) => {
        try { await adminApi.rejectHalqa(token!, id, locale === 'ar' ? 'تم الرفض بواسطة المشرف' : 'Rejected by admin'); pushToast(locale === 'ar' ? 'تم الرفض' : 'Rejected', 'success'); void fetchData(); }
        catch { pushToast(locale === 'ar' ? 'فشل الرفض' : 'Reject failed', 'error'); }
    };

    const saveEdit = async () => {
        try {
            const { governorate_id: _governorate_id, ...updatePayload } = editForm;
            await adminApi.updateHalqa(token!, payload.id, updatePayload);
            pushToast(locale === 'ar' ? 'تم التحديث' : 'Updated', 'success');
            closeModal();
            void fetchData();
        } catch {
            pushToast(locale === 'ar' ? 'فشل التحديث' : 'Update failed', 'error');
        }
    };

    const getAreaLabel = (item: any) => item?.area
        ? (locale === 'ar' ? (item.area.nameAr || item.area.nameEn) : (item.area.nameEn || item.area.nameAr))
        : '';

    const resolveGovernorateId = (item: any) => {
        if (item?.area?.governorateId) return item.area.governorateId as string;
        const normalizedGov = (item?.governorate || '').toString().trim().toLowerCase();
        if (!normalizedGov) return '';
        const matched = governorates.find((g) =>
            [g.nameAr, g.nameEn].some((n: string) => (n || '').toString().trim().toLowerCase() === normalizedGov),
        );
        return matched?.id || '';
    };

    const loadAreasByGovernorate = async (governorateId: string) => {
        if (!governorateId) {
            setEditAreas([]);
            return [];
        }
        try {
            const areas = await api.getAreas(governorateId);
            setEditAreas(areas || []);
            return areas || [];
        } catch {
            setEditAreas([]);
            return [];
        }
    };

    const openEditHalqa = async (item: any) => {
        const governorateId = resolveGovernorateId(item);
        const areas = await loadAreasByGovernorate(governorateId);
        const areaId = item.areaId || item.area?.id || '';
        const selectedGovernorate = governorates.find((g) => g.id === governorateId);
        const selectedArea = areas.find((a: any) => a.id === areaId) || item.area;

        setEditForm({
            circle_name: item.circleName,
            mosque_name: item.mosqueName,
            governorate: selectedGovernorate
                ? (locale === 'ar' ? selectedGovernorate.nameAr : selectedGovernorate.nameEn)
                : (item.governorate || ''),
            governorate_id: governorateId,
            area_id: areaId,
            city: selectedArea ? (locale === 'ar' ? (selectedArea.nameAr || selectedArea.nameEn) : (selectedArea.nameEn || selectedArea.nameAr)) : '',
            district: '',
            whatsapp: item.whatsapp,
            additional_info: item.additionalInfo || '',
            is_online: item.isOnline || false,
            online_link: item.onlineLink || '',
        });
        openModal('edit', 'halqa', item);
    };

    const filteredItems = items.filter((item) => {
        const matchesSearch = !searchTerm || [
            item.circleName,
            item.mosqueName,
            item.status,
            item.whatsapp,
            item.halqaType,
        ].some((field: any) => (field || '').toString().toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesOnlineFilter = 
            onlineFilter === 'all' ||
            (onlineFilter === 'online' && item.isOnline) ||
            (onlineFilter === 'offline' && !item.isOnline);

        return matchesSearch && matchesOnlineFilter;
    });

    const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
    const paginatedItems = filteredItems.slice((page - 1) * pageSize, page * pageSize);

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-black">{locale === 'ar' ? 'إدارة الحلقات' : 'Manage Halaqat'}</h1>
                <div className="flex flex-wrap gap-2 items-center">
                    <button
                        onClick={() => void fetchData()}
                        className="px-4 py-2 rounded-xl text-sm font-bold bg-white border border-border"
                    >
                        Refresh
                    </button>
                    <input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={locale === 'ar' ? 'بحث بالاسم أو المسجد أو النوع' : 'Search by name, mosque or type'}
                        className="input-field max-w-xs text-sm"
                    />
                    <div className="flex flex-wrap gap-2 flex-wrap">
                        {['pending', 'approved', 'rejected'].map((s) => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={`px-4 py-2 rounded-xl text-sm font-bold ${
                                    statusFilter === s ? 'bg-primary text-white' : 'bg-white border border-border'
                                }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2 flex-wrap items-center">
                        <span className="text-sm font-semibold">{locale === 'ar' ? 'نوع الحلقة:' : 'Circle type:'}</span>
                        {['all', 'online', 'offline'].map((type) => (
                            <button
                                key={type}
                                onClick={() => setOnlineFilter(type)}
                                className={`px-4 py-2 rounded-xl text-sm font-bold ${
                                    onlineFilter === type ? 'bg-blue-100 text-blue-700' : 'bg-white border border-border'
                                }`}
                            >
                                {type === 'all' ? (locale === 'ar' ? 'الكل' : 'All') : 
                                 type === 'online' ? '📺 ' + (locale === 'ar' ? 'أونلاين' : 'Online') : 
                                 '🏢 ' + (locale === 'ar' ? 'في المسجد' : 'In Mosque')}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[680px]">
                        <thead className="bg-gray-50 border-b"><tr><th className="text-start px-4 py-3 text-sm">Name</th><th className="text-start px-4 py-3 text-sm">Mosque</th><th className="text-start px-4 py-3 text-sm">Type</th><th className="text-start px-4 py-3 text-sm">Status</th><th className="text-start px-4 py-3 text-sm">Actions</th></tr></thead>
                        <tbody className="divide-y">
                            {loading && <tr><td colSpan={5} className="px-4 py-10 text-center">Loading...</td></tr>}
                            {!loading && !filteredItems.length && <tr><td colSpan={5} className="px-4 py-10 text-center">No data</td></tr>}
                            {!loading && paginatedItems.map((item) => (
                                <tr key={item.id}>
                                    <td className="px-4 py-4 font-semibold">{item.circleName}</td>
                                    <td className="px-4 py-4 text-sm text-text-muted">{item.mosqueName}</td>
                                    <td className="px-4 py-4 text-sm">
                                        <span className="mr-1">{item.isOnline ? '📺' : '🏢'}</span>
                                        {item.isOnline ? (locale === 'ar' ? 'أونلاين' : 'Online') : (locale === 'ar' ? 'في المسجد' : 'In Mosque')}
                                    </td>
                                    <td className="px-4 py-4"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${item.status === 'approved' ? 'bg-green-100 text-green-700' : item.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{item.status}</span></td>
                                    <td className="px-4 py-4"><div className="flex gap-2">
                                        <IconButton label="view" onClick={() => openModal('view', 'halqa', item)}><FaEye className="text-slate-700" /></IconButton>
                                        <IconButton label="edit" onClick={() => { void openEditHalqa(item); }}><FaPenToSquare className="text-blue-700" /></IconButton>
                                        {item.status === 'pending' && <IconButton label="approve" onClick={() => approve(item.id)}><FaCheck className="text-green-700" /></IconButton>}
                                        {item.status === 'pending' && <IconButton label="reject" onClick={() => reject(item.id)}><FaXmark className="text-red-700" /></IconButton>}
                                    </div></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} locale={locale} />

            <AppModal isOpen={isOpen && type === 'view'} type="view" title={locale === 'ar' ? 'عرض الحلقة' : 'View Halqa'} onClose={closeModal}>
                {payload && <div className="space-y-3 text-sm">
                    <p><strong>{locale === 'ar' ? 'الاسم:' : 'Name:'}</strong> {payload.circleName}</p>
                    <p><strong>{locale === 'ar' ? 'المسجد:' : 'Mosque:'}</strong> {payload.mosqueName}</p>
                    <p><strong>{locale === 'ar' ? 'النوع:' : 'Type:'}</strong> {payload.halqaType}</p>
                    <p><strong>{locale === 'ar' ? 'المحافظة:' : 'Governorate:'}</strong> {payload.governorate}</p>
                    <p><strong>{locale === 'ar' ? 'المنطقة:' : 'Area:'}</strong> {getAreaLabel(payload) || '-'}</p>
                    <p><strong>WhatsApp:</strong> {payload.whatsapp}</p>
                    <p><strong>{locale === 'ar' ? 'نوع الحلقة' : 'Circle Type'}:</strong> {payload.isOnline ? '📺 ' + (locale === 'ar' ? 'أونلاين' : 'Online') : '🏢 ' + (locale === 'ar' ? 'في المسجد' : 'In Mosque')}</p>
                    {payload.isOnline && payload.onlineLink && <p><strong>{locale === 'ar' ? 'رابط الحضور' : 'Join Link'}:</strong> <a href={payload.onlineLink} target="_blank" rel="noreferrer" className="text-blue-600 underline">{payload.onlineLink}</a></p>}
                    {payload.googleMapsUrl && <div className="flex gap-2"><a className="btn-outline" href={payload.googleMapsUrl} target="_blank" rel="noreferrer">{locale === 'ar' ? 'فتح الخريطة' : 'Open map'}</a><button className="btn-outline" onClick={() => navigator.clipboard.writeText(payload.googleMapsUrl)}>{locale === 'ar' ? 'نسخ الرابط' : 'Copy link'}</button></div>}
                </div>}
            </AppModal>

            <AppModal isOpen={isOpen && type === 'edit'} type="edit" title={locale === 'ar' ? 'تعديل الحلقة' : 'Edit Halqa'} onClose={closeModal}>
                <div className="space-y-3">
                    <input className="input-field" value={editForm.circle_name || ''} onChange={(e) => setEditForm((s: any) => ({ ...s, circle_name: e.target.value }))} placeholder={locale === 'ar' ? 'اسم الحلقة' : 'Name'} />
                    <input className="input-field" value={editForm.mosque_name || ''} onChange={(e) => setEditForm((s: any) => ({ ...s, mosque_name: e.target.value }))} placeholder={locale === 'ar' ? 'اسم المسجد' : 'Mosque'} />
                    {!editForm.is_online && (
                        <>
                            <select
                                className="input-field"
                                value={editForm.governorate_id || ''}
                                onChange={async (e) => {
                                    const governorateId = e.target.value;
                                    const selectedGovernorate = governorates.find((g) => g.id === governorateId);
                                    await loadAreasByGovernorate(governorateId);
                                    setEditForm((s: any) => ({
                                        ...s,
                                        governorate_id: governorateId,
                                        governorate: selectedGovernorate ? (locale === 'ar' ? selectedGovernorate.nameAr : selectedGovernorate.nameEn) : '',
                                        area_id: '',
                                        city: '',
                                        district: '',
                                    }));
                                }}
                            >
                                <option value="">{locale === 'ar' ? 'Governorate' : 'Select governorate'}</option>
                                {governorates.map((g) => (
                                    <option key={g.id} value={g.id}>{locale === 'ar' ? g.nameAr : g.nameEn}</option>
                                ))}
                            </select>
                            <select
                                className="input-field"
                                value={editForm.area_id || ''}
                                onChange={(e) => {
                                    const areaId = e.target.value;
                                    const area = editAreas.find((a) => a.id === areaId);
                                    setEditForm((s: any) => ({
                                        ...s,
                                        area_id: areaId,
                                        city: area ? (locale === 'ar' ? (area.nameAr || area.nameEn) : (area.nameEn || area.nameAr)) : '',
                                        district: '',
                                    }));
                                }}
                                disabled={!editForm.governorate_id}
                            >
                                <option value="">{locale === 'ar' ? 'Area' : 'Select area'}</option>
                                {editAreas.map((a) => (
                                    <option key={a.id} value={a.id}>{locale === 'ar' ? a.nameAr : a.nameEn}</option>
                                ))}
                            </select>
                        </>
                    )}
                    <PhoneInputField value={editForm.whatsapp || ''} onChange={(next) => setEditForm((s: any) => ({ ...s, whatsapp: next || '' }))} />
                    <textarea className="input-field" value={editForm.additional_info || ''} onChange={(e) => setEditForm((s: any) => ({ ...s, additional_info: e.target.value }))} placeholder={locale === 'ar' ? 'معلومات إضافية' : 'Additional info'} />
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={editForm.is_online || false}
                            onChange={(e) => {
                                const checked = e.target.checked;
                                setEditForm((s: any) => ({
                                    ...s,
                                    is_online: checked,
                                    ...(checked ? { governorate_id: '', governorate: '', area_id: '', city: '', district: '' } : {}),
                                }));
                                if (checked) setEditAreas([]);
                            }}
                            className="w-4 h-4"
                            id="is_online"
                        />
                        <label htmlFor="is_online" className="text-sm font-medium cursor-pointer">
                            {locale === 'ar' ? 'حلقة أونلاين' : 'Online circle'}
                        </label>
                    </div>
                    {editForm.is_online && (
                        <input
                            className="input-field"
                            value={editForm.online_link || ''}
                            onChange={(e) => setEditForm((s: any) => ({ ...s, online_link: e.target.value }))}
                            placeholder={locale === 'ar' ? 'رابط الحضور (Zoom, Google Meet, etc)' : 'Join link (Zoom, Google Meet, etc)'}
                        />
                    )}
                    <button className="btn-primary w-full" onClick={saveEdit}>{locale === 'ar' ? 'حفظ' : 'Save'}</button>
                </div>
            </AppModal>
        </div>
    );
}


