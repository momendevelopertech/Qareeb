'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { useAuthStore, useModalStore, useToastStore } from '@/lib/store';
import { adminApi, api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import AppModal from '@/components/ui/AppModal';
import { FaCheck, FaEye, FaPenToSquare, FaTrash, FaUpload, FaXmark } from 'react-icons/fa6';
import PhoneInputField from '@/components/form/PhoneInputField';
import Pagination from '@/components/ui/Pagination';
import { downloadCsv, parseCsv } from '@/lib/adminCsv';

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
    return <button aria-label={label} title={label} onClick={onClick} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-cream">{children}</button>;
}

export default function AdminHalaqatPage() {
    const locale = useLocale();
    const router = useRouter();
    const { token, admin } = useAuthStore();
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
    const [pageSize, setPageSize] = useState(20);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const importInputRef = useRef<HTMLInputElement | null>(null);

    const getStatusLabel = (status: string) => {
        if (locale === 'ar') {
            return ({ pending: 'قيد المراجعة', approved: 'مقبول', rejected: 'مرفوض' } as Record<string, string>)[status] || status;
        }
        return status;
    };

    useEffect(() => {
        if (!token) { router.push(`/${locale}/admin`); return; }
        void fetchData();
    }, [token, statusFilter, searchTerm, onlineFilter, page, pageSize]);

    useEffect(() => {
        api.getGovernorates().then(setGovernorates).catch(() => setGovernorates([]));
    }, []);

    useEffect(() => {
        setPage(1);
    }, [statusFilter]);

    useEffect(() => {
        setPage(1);
    }, [searchTerm, onlineFilter, pageSize]);

    useEffect(() => {
        setSelectedIds([]);
    }, [statusFilter, searchTerm, onlineFilter, page, pageSize]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                status: statusFilter,
                page: page.toString(),
                limit: pageSize.toString(),
            });
            if (searchTerm.trim()) params.set('query', searchTerm.trim());
            if (onlineFilter === 'online') params.set('isOnline', 'true');
            if (onlineFilter === 'offline') params.set('isOnline', 'false');
            const result = await adminApi.getAdminHalaqat(token!, params.toString());
            setItems(result?.data || []);
            setTotalPages(result?.meta?.totalPages || 1);
        } catch {
            pushToast(locale === 'ar' ? 'فشل تحميل البيانات' : 'Failed to load data', 'error');
            setItems([]);
            setTotalPages(1);
        }
        setLoading(false);
    };

    const approve = async (id: string) => {
        try { await adminApi.approveHalqa(token!, id); pushToast(locale === 'ar' ? 'تمت الموافقة' : 'Approved', 'success'); void fetchData(); }
        catch { pushToast(locale === 'ar' ? 'فشل في الموافقة' : 'Approve failed', 'error'); }
    };

    const remove = async (id: string) => {
        try { await adminApi.deleteHalqa(token!, id); pushToast(locale === 'ar' ? 'تم الحذف' : 'Deleted', 'success'); void fetchData(); }
        catch { pushToast(locale === 'ar' ? 'فشل الحذف' : 'Delete failed', 'error'); }
    };

    const approveSelected = async () => {
        if (!selectedIds.length) return;
        try {
            await Promise.all(selectedIds.map((id) => adminApi.approveHalqa(token!, id)));
            pushToast(locale === 'ar' ? 'تمت الموافقة على العناصر المحددة' : 'Selected records approved', 'success');
            setSelectedIds([]);
            await fetchData();
        } catch {
            pushToast(locale === 'ar' ? 'فشل الموافقة الجماعية' : 'Bulk approve failed', 'error');
        }
    };

    const deleteSelected = async () => {
        if (!selectedIds.length) return;
        try {
            await Promise.all(selectedIds.map((id) => adminApi.deleteHalqa(token!, id)));
            pushToast(locale === 'ar' ? 'تم حذف العناصر المحددة' : 'Selected records deleted', 'success');
            setSelectedIds([]);
            await fetchData();
        } catch {
            pushToast(locale === 'ar' ? 'فشل الحذف الجماعي' : 'Bulk delete failed', 'error');
        }
    };

    const exportCurrentTab = () => {
        downloadCsv(`halaqat-${statusFilter}.csv`, ['circle_name', 'mosque_name', 'halqa_type', 'governorate', 'area', 'whatsapp', 'is_online', 'online_link', 'additional_info'], items.map((item) => ({
            circle_name: item.circleName,
            mosque_name: item.mosqueName,
            halqa_type: item.halqaType,
            governorate: item.governorate,
            area: getAreaLabel(item),
            whatsapp: item.whatsapp,
            is_online: item.isOnline ? 'true' : 'false',
            online_link: item.onlineLink || '',
            additional_info: item.additionalInfo || '',
        })));
    };

    const downloadTemplate = () => {
        downloadCsv('halaqat-template.csv', ['circle_name', 'mosque_name', 'halqa_type', 'governorate', 'area_id', 'whatsapp', 'is_online', 'online_link', 'google_maps_url', 'additional_info'], []);
    };

    const importCsv = async (file?: File) => {
        if (!file) return;
        try {
            const content = await file.text();
            const rows = parseCsv(content);
            if (!rows.length) {
                pushToast(locale === 'ar' ? 'الملف فارغ' : 'File is empty', 'error');
                return;
            }
            await Promise.all(rows.map((row) => api.createHalqa({
                circle_name: row.circle_name || '',
                mosque_name: row.mosque_name || '',
                halqa_type: row.halqa_type || 'men',
                governorate: row.governorate || '',
                city: row.city || row.governorate || '',
                district: row.district || '',
                area_id: row.area_id || undefined,
                whatsapp: row.whatsapp || '',
                is_online: row.is_online === 'true',
                online_link: row.online_link || '',
                google_maps_url: row.google_maps_url || undefined,
                additional_info: row.additional_info || '',
            })));
            pushToast(locale === 'ar' ? 'تم الاستيراد وستظهر في المراجعة' : 'Imported successfully as pending records', 'success');
            await fetchData();
        } catch {
            pushToast(locale === 'ar' ? 'فشل الاستيراد' : 'Import failed', 'error');
        }
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

    const paginatedItems = items;
    const allCurrentSelected = paginatedItems.length > 0 && paginatedItems.every((item) => selectedIds.includes(item.id));

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-black">{locale === 'ar' ? 'إدارة الحلقات' : 'Manage Halaqat'}</h1>
                <div className="flex flex-wrap gap-2 items-center">
                    <input
                        ref={importInputRef}
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={(e) => {
                            void importCsv(e.target.files?.[0]);
                            e.currentTarget.value = '';
                        }}
                    />
                    <button
                        onClick={() => void fetchData()}
                        className="px-4 py-2 rounded-xl text-sm font-bold bg-white border border-border"
                    >
                        Refresh
                    </button>
                    <button onClick={exportCurrentTab} className="px-4 py-2 rounded-xl text-sm font-bold bg-white border border-border">
                        {locale === 'ar' ? 'تصدير CSV' : 'Export CSV'}
                    </button>
                    <button onClick={() => importInputRef.current?.click()} className="px-4 py-2 rounded-xl text-sm font-bold bg-white border border-border flex items-center gap-2">
                        <FaUpload />
                        {locale === 'ar' ? 'استيراد CSV' : 'Import CSV'}
                    </button>
                    <button onClick={downloadTemplate} className="px-4 py-2 rounded-xl text-sm font-bold bg-white border border-border">
                        {locale === 'ar' ? 'تحميل القالب' : 'Download template'}
                    </button>
                    {statusFilter === 'pending' && (
                        <button onClick={() => void approveSelected()} disabled={!selectedIds.length} className="px-4 py-2 rounded-xl text-sm font-bold bg-green-100 text-green-700 disabled:opacity-50">
                            {locale === 'ar' ? 'موافقة المحدد' : 'Approve selected'}
                        </button>
                    )}
                    {admin?.role === 'super_admin' && (
                        <button onClick={() => void deleteSelected()} disabled={!selectedIds.length} className="px-4 py-2 rounded-xl text-sm font-bold bg-red-100 text-red-700 disabled:opacity-50">
                            {locale === 'ar' ? 'حذف المحدد' : 'Delete selected'}
                        </button>
                    )}
                    <input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={locale === 'ar' ? 'بحث بالاسم أو المسجد أو النوع' : 'Search by name, mosque or type'}
                        className="input-field max-w-xs text-sm"
                    />
                    <select
                        value={pageSize}
                        onChange={(e) => setPageSize(Number(e.target.value))}
                        className="input-field !py-2 text-sm w-44"
                    >
                        {[20, 50, 100, 500].map((size) => (
                            <option key={size} value={size}>{locale === 'ar' ? `عدد السجلات: ${size}` : `${size} records / page`}</option>
                        ))}
                    </select>
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
                        <thead className="bg-gray-50 border-b"><tr><th className="text-start px-4 py-3 text-sm"><input type="checkbox" checked={allCurrentSelected} onChange={(e) => setSelectedIds(e.target.checked ? paginatedItems.map((item) => item.id) : [])} /></th><th className="text-start px-4 py-3 text-sm">{locale === 'ar' ? 'الاسم' : 'Name'}</th><th className="text-start px-4 py-3 text-sm">{locale === 'ar' ? 'المسجد' : 'Mosque'}</th><th className="text-start px-4 py-3 text-sm">{locale === 'ar' ? 'النوع' : 'Type'}</th><th className="text-start px-4 py-3 text-sm">{locale === 'ar' ? 'الحالة' : 'Status'}</th><th className="text-start px-4 py-3 text-sm">{locale === 'ar' ? 'الإجراءات' : 'Actions'}</th></tr></thead>
                        <tbody className="divide-y">
                            {loading && <tr><td colSpan={6} className="px-4 py-10 text-center">{locale === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}</td></tr>}
                            {!loading && !paginatedItems.length && <tr><td colSpan={6} className="px-4 py-10 text-center">{locale === 'ar' ? 'لا توجد بيانات' : 'No data'}</td></tr>}
                            {!loading && paginatedItems.map((item) => (
                                <tr key={item.id}>
                                    <td className="px-4 py-4"><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={(e) => setSelectedIds((prev) => e.target.checked ? [...new Set([...prev, item.id])] : prev.filter((id) => id !== item.id))} /></td>
                                    <td className="px-4 py-4 font-semibold">{item.circleName}</td>
                                    <td className="px-4 py-4 text-sm text-text-muted">{item.mosqueName}</td>
                                    <td className="px-4 py-4 text-sm">
                                        <span className="mr-1">{item.isOnline ? '📺' : '🏢'}</span>
                                        {item.isOnline ? (locale === 'ar' ? 'أونلاين' : 'Online') : (locale === 'ar' ? 'في المسجد' : 'In Mosque')}
                                    </td>
                                    <td className="px-4 py-4"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${item.status === 'approved' ? 'bg-green-100 text-green-700' : item.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{getStatusLabel(item.status)}</span></td>
                                    <td className="px-4 py-4"><div className="flex gap-2">
                                        <IconButton label="view" onClick={() => openModal('view', 'halqa', item)}><FaEye className="text-slate-700" /></IconButton>
                                        <IconButton label="edit" onClick={() => { void openEditHalqa(item); }}><FaPenToSquare className="text-blue-700" /></IconButton>
                                        {item.status === 'pending' && <IconButton label="approve" onClick={() => approve(item.id)}><FaCheck className="text-green-700" /></IconButton>}
                                        {item.status === 'pending' && <IconButton label="reject" onClick={() => reject(item.id)}><FaXmark className="text-red-700" /></IconButton>}
                                        {admin?.role === 'super_admin' && <IconButton label="delete" onClick={() => void remove(item.id)}><FaTrash className="text-red-700" /></IconButton>}
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
