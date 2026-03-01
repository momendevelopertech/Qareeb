'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { useAuthStore, useModalStore, useToastStore } from '@/lib/store';
import { adminApi, api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import AppModal from '@/components/ui/AppModal';
import { FaCheck, FaEye, FaPenToSquare, FaTrash, FaUpload, FaXmark } from 'react-icons/fa6';
import PhoneInputField from '@/components/form/PhoneInputField';
import { getEmbeddableVideoUrl } from '@/lib/video';
import Pagination from '@/components/ui/Pagination';
import { downloadCsv, parseCsv } from '@/lib/adminCsv';

function IconButton({ label, onClick, children, className = '' }: { label: string; onClick: () => void; children: React.ReactNode; className?: string }) {
    return (
        <button aria-label={label} title={label} onClick={onClick} className={`w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-cream ${className}`}>
            {children}
        </button>
    );
}

export default function AdminImamsPage() {
    const locale = useLocale();
    const router = useRouter();
    const { token, admin } = useAuthStore();
    const { isOpen, type, payload, openModal, closeModal } = useModalStore();
    const { pushToast } = useToastStore();

    const [items, setItems] = useState<any[]>([]);
    const [statusFilter, setStatusFilter] = useState('pending');
    const [searchTerm, setSearchTerm] = useState('');
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

    const shareText = async (text: string) => {
        try {
            if (navigator.share) {
                await navigator.share({ text });
                return;
            }
            await navigator.clipboard.writeText(text);
            pushToast(locale === 'ar' ? 'تم نسخ النص للمشاركة' : 'Share text copied', 'success');
        } catch {
            pushToast(locale === 'ar' ? 'تعذر تنفيذ المشاركة' : 'Unable to share', 'error');
        }
    };

    useEffect(() => {
        if (!token) {
            router.push(`/${locale}/admin`);
            return;
        }
        void fetchData();
    }, [token, statusFilter, page, pageSize, searchTerm]);

    useEffect(() => {
        api.getGovernorates().then(setGovernorates).catch(() => setGovernorates([]));
    }, []);

    useEffect(() => {
        setPage(1);
    }, [statusFilter]);

    useEffect(() => {
        setPage(1);
    }, [searchTerm, pageSize]);

    useEffect(() => {
        setSelectedIds([]);
    }, [statusFilter, searchTerm, page, pageSize]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                status: statusFilter,
                page: page.toString(),
                limit: pageSize.toString(),
            });
            if (searchTerm.trim()) params.set('query', searchTerm.trim());
            const result = await adminApi.getAdminImams(token!, params.toString());
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
        try {
            await adminApi.approveImam(token!, id);
            pushToast(locale === 'ar' ? 'تمت الموافقة' : 'Approved', 'success');
            void fetchData();
        } catch {
            pushToast(locale === 'ar' ? 'فشل في الموافقة' : 'Approve failed', 'error');
        }
    };

    const reject = async (id: string) => {
        try {
            await adminApi.rejectImam(token!, id, locale === 'ar' ? 'تم الرفض بواسطة المشرف' : 'Rejected by admin');
            pushToast(locale === 'ar' ? 'تم الرفض' : 'Rejected', 'success');
            void fetchData();
        } catch {
            pushToast(locale === 'ar' ? 'فشل الرفض' : 'Reject failed', 'error');
        }
    };

    const saveEdit = async () => {
        try {
            const { governorate_id: _governorate_id, ...updatePayload } = editForm;
            await adminApi.updateImam(token!, payload.id, updatePayload);
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

    const openEditImam = async (imam: any) => {
        const governorateId = resolveGovernorateId(imam);
        const areas = await loadAreasByGovernorate(governorateId);
        const areaId = imam.areaId || imam.area?.id || '';
        const selectedGovernorate = governorates.find((g) => g.id === governorateId);
        const selectedArea = areas.find((a: any) => a.id === areaId) || imam.area;

        setEditForm({
            imam_name: imam.imamName,
            mosque_name: imam.mosqueName,
            governorate: selectedGovernorate
                ? (locale === 'ar' ? selectedGovernorate.nameAr : selectedGovernorate.nameEn)
                : (imam.governorate || ''),
            governorate_id: governorateId,
            area_id: areaId,
            city: selectedArea ? (locale === 'ar' ? (selectedArea.nameAr || selectedArea.nameEn) : (selectedArea.nameEn || selectedArea.nameAr)) : '',
            district: '',
            whatsapp: imam.whatsapp,
            google_maps_url: imam.googleMapsUrl || '',
            video_url: imam.videoUrl || '',
        });
        openModal('edit', 'imam', imam);
    };

    const remove = async (id: string) => {
        try {
            await adminApi.deleteImam(token!, id);
            pushToast(locale === 'ar' ? 'تم الحذف' : 'Deleted', 'success');
            closeModal();
            void fetchData();
        } catch {
            pushToast(locale === 'ar' ? 'فشل الحذف' : 'Delete failed', 'error');
        }
    };

    const approveSelected = async () => {
        if (!selectedIds.length) return;
        try {
            await Promise.all(selectedIds.map((id) => adminApi.approveImam(token!, id)));
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
            await Promise.all(selectedIds.map((id) => adminApi.deleteImam(token!, id)));
            pushToast(locale === 'ar' ? 'تم حذف العناصر المحددة' : 'Selected records deleted', 'success');
            setSelectedIds([]);
            await fetchData();
        } catch {
            pushToast(locale === 'ar' ? 'فشل الحذف الجماعي' : 'Bulk delete failed', 'error');
        }
    };

    const exportCurrentTab = () => {
        downloadCsv(`imams-${statusFilter}.csv`, ['imam_name', 'mosque_name', 'governorate', 'area', 'whatsapp', 'google_maps_url', 'video_url'], items.map((item) => ({
            imam_name: item.imamName,
            mosque_name: item.mosqueName,
            governorate: item.governorate,
            area: getAreaLabel(item),
            whatsapp: item.whatsapp,
            google_maps_url: item.googleMapsUrl || '',
            video_url: item.videoUrl || '',
        })));
    };

    const downloadTemplate = () => {
        downloadCsv('imams-template.csv', ['imam_name', 'mosque_name', 'governorate', 'city', 'district', 'area_id', 'whatsapp', 'google_maps_url', 'video_url'], []);
    };

    const importCsv = async (file?: File) => {
        if (!file) return;
        try {
            const rows = parseCsv(await file.text());
            if (!rows.length) {
                pushToast(locale === 'ar' ? 'الملف فارغ' : 'File is empty', 'error');
                return;
            }
            await Promise.all(rows.map((row) => api.createImam({
                imam_name: row.imam_name || '',
                mosque_name: row.mosque_name || '',
                governorate: row.governorate || '',
                city: row.city || row.governorate || '',
                district: row.district || '',
                area_id: row.area_id || undefined,
                whatsapp: row.whatsapp || '',
                google_maps_url: row.google_maps_url || '',
                video_url: row.video_url || '',
            })));
            pushToast(locale === 'ar' ? 'تم الاستيراد وستظهر في المراجعة' : 'Imported successfully as pending records', 'success');
            await fetchData();
        } catch {
            pushToast(locale === 'ar' ? 'فشل الاستيراد' : 'Import failed', 'error');
        }
    };

    const paginatedItems = items;
    const allCurrentSelected = paginatedItems.length > 0 && paginatedItems.every((item) => selectedIds.includes(item.id));

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-black">{locale === 'ar' ? 'إدارة الأئمة' : 'Manage Imams'}</h1>
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
                        placeholder={locale === 'ar' ? 'بحث بالاسم أو المسجد أو الحالة' : 'Search by name, mosque or status'}
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
                    <div className="flex gap-2 flex-wrap">
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
                </div>
            </div>

            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[680px]">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="text-start px-4 py-3 text-sm"><input type="checkbox" checked={allCurrentSelected} onChange={(e) => setSelectedIds(e.target.checked ? paginatedItems.map((item) => item.id) : [])} /></th>
                                <th className="text-start px-4 py-3 text-sm">{locale === 'ar' ? 'الاسم' : 'Name'}</th>
                                <th className="text-start px-4 py-3 text-sm">{locale === 'ar' ? 'المسجد' : 'Mosque'}</th>
                                <th className="text-start px-4 py-3 text-sm">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                                <th className="text-start px-4 py-3 text-sm">{locale === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {loading && <tr><td colSpan={5} className="px-4 py-10 text-center">{locale === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}</td></tr>}
                            {!loading && !paginatedItems.length && <tr><td colSpan={5} className="px-4 py-10 text-center">{locale === 'ar' ? 'لا توجد بيانات' : 'No data'}</td></tr>}
                            {!loading && paginatedItems.map((imam) => (
                                <tr key={imam.id}>
                                    <td className="px-4 py-4"><input type="checkbox" checked={selectedIds.includes(imam.id)} onChange={(e) => setSelectedIds((prev) => e.target.checked ? [...new Set([...prev, imam.id])] : prev.filter((id) => id !== imam.id))} /></td>
                                    <td className="px-4 py-4 font-semibold">{imam.imamName}</td>
                                    <td className="px-4 py-4 text-sm text-text-muted">{imam.mosqueName}</td>
                                    <td className="px-4 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${imam.status === 'approved' ? 'bg-green-100 text-green-700' : imam.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                            {getStatusLabel(imam.status)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex gap-2">
                                            <IconButton label="view" onClick={() => openModal('view', 'imam', imam)}><FaEye className="text-slate-700" /></IconButton>
                                            <IconButton label="edit" onClick={() => { void openEditImam(imam); }}><FaPenToSquare className="text-blue-700" /></IconButton>
                                            {imam.status === 'pending' && <IconButton label="approve" onClick={() => approve(imam.id)}><FaCheck className="text-green-700" /></IconButton>}
                                            {imam.status === 'pending' && <IconButton label="reject" onClick={() => reject(imam.id)}><FaXmark className="text-red-700" /></IconButton>}
                                            {admin?.role === 'super_admin' && <IconButton label="delete" onClick={() => openModal('images', 'imam', imam)}><FaTrash className="text-red-700" /></IconButton>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} locale={locale} />

            <AppModal isOpen={isOpen && type === 'view'} type="view" title={locale === 'ar' ? 'عرض الإمام' : 'View Imam'} onClose={closeModal}>
                {payload && (
                    <div className="space-y-4 text-sm">
                        <p><strong>{locale === 'ar' ? 'الاسم:' : 'Name:'}</strong> {payload.imamName}</p>
                        <p><strong>{locale === 'ar' ? 'المسجد:' : 'Mosque:'}</strong> {payload.mosqueName}</p>
                        <p><strong>{locale === 'ar' ? 'المحافظة:' : 'Governorate:'}</strong> {payload.governorate}</p>
                        <p><strong>{locale === 'ar' ? 'المنطقة:' : 'Area:'}</strong> {getAreaLabel(payload) || '-'}</p>
                        <p><strong>WhatsApp:</strong> {payload.whatsapp}</p>
                        {payload.videoUrl && (
                            <div className="rounded-xl border border-border p-3 bg-cream/40 space-y-2">
                                <p className="text-xs font-bold text-text-muted">{locale === 'ar' ? 'رابط الفيديو' : 'Video link'}</p>
                                {getEmbeddableVideoUrl(payload.videoUrl) ? (
                                    <iframe src={getEmbeddableVideoUrl(payload.videoUrl)!} className="w-full h-64 rounded-xl border" allowFullScreen title="video" />
                                ) : (
                                    <p className="text-xs text-text-muted">
                                        {locale === 'ar' ? 'لا يمكن تضمين هذا الرابط داخل الصفحة.' : 'This link cannot be embedded in-page.'}
                                    </p>
                                )}
                                <div className="flex flex-wrap gap-2">
                                    <a className="btn-outline !py-1.5 !px-3 text-xs" target="_blank" rel="noreferrer" href={payload.videoUrl}>
                                        {locale === 'ar' ? 'فتح الفيديو' : 'Open video'}
                                    </a>
                                    <button className="btn-outline !py-1.5 !px-3 text-xs" onClick={() => navigator.clipboard.writeText(payload.videoUrl)}>
                                        {locale === 'ar' ? 'نسخ الرابط' : 'Copy link'}
                                    </button>
                                    <button className="btn-outline !py-1.5 !px-3 text-xs" onClick={() => shareText(`${payload.imamName}\n${payload.mosqueName}\n${payload.videoUrl}`)}>
                                        {locale === 'ar' ? 'مشاركة' : 'Share'}
                                    </button>
                                </div>
                            </div>
                        )}
                        {payload.googleMapsUrl && (
                            <div className="rounded-xl border border-border p-3 bg-cream/40 space-y-2">
                                <p className="text-xs font-bold text-text-muted">{locale === 'ar' ? 'رابط الخريطة' : 'Map link'}</p>
                                <div className="flex flex-wrap gap-2">
                                    <a className="btn-outline !py-1.5 !px-3 text-xs" target="_blank" rel="noreferrer" href={payload.googleMapsUrl}>
                                        {locale === 'ar' ? 'فتح الخريطة' : 'Open map'}
                                    </a>
                                    <button className="btn-outline !py-1.5 !px-3 text-xs" onClick={() => navigator.clipboard.writeText(payload.googleMapsUrl)}>
                                        {locale === 'ar' ? 'نسخ الرابط' : 'Copy link'}
                                    </button>
                                    <button className="btn-outline !py-1.5 !px-3 text-xs" onClick={() => shareText(`${payload.imamName}\n${payload.mosqueName}\n${payload.googleMapsUrl}`)}>
                                        {locale === 'ar' ? 'مشاركة' : 'Share'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </AppModal>

            <AppModal isOpen={isOpen && type === 'edit'} type="edit" title={locale === 'ar' ? 'تعديل الإمام' : 'Edit Imam'} onClose={closeModal}>
                <div className="space-y-3">
                    <input className="input-field" value={editForm.imam_name || ''} onChange={(e) => setEditForm((s: any) => ({ ...s, imam_name: e.target.value }))} placeholder={locale === 'ar' ? 'اسم الإمام' : 'Imam name'} />
                    <input className="input-field" value={editForm.mosque_name || ''} onChange={(e) => setEditForm((s: any) => ({ ...s, mosque_name: e.target.value }))} placeholder={locale === 'ar' ? 'اسم المسجد' : 'Mosque name'} />
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
                    <PhoneInputField value={editForm.whatsapp || ''} onChange={(next) => setEditForm((s: any) => ({ ...s, whatsapp: next || '' }))} />
                    <input className="input-field" value={editForm.google_maps_url || ''} onChange={(e) => setEditForm((s: any) => ({ ...s, google_maps_url: e.target.value }))} placeholder="Google map URL" />
                    <input className="input-field" value={editForm.video_url || ''} onChange={(e) => setEditForm((s: any) => ({ ...s, video_url: e.target.value }))} placeholder="Video URL" />
                    <button className="btn-primary w-full" onClick={saveEdit}>{locale === 'ar' ? 'حفظ' : 'Save'}</button>
                </div>
            </AppModal>

            <AppModal isOpen={isOpen && type === 'images'} type="images" title={locale === 'ar' ? 'تأكيد الحذف' : 'Confirm delete'} onClose={closeModal}>
                {payload && (
                    <div className="space-y-4">
                        <p>{locale === 'ar' ? 'هل تريد حذف هذا السجل؟' : 'Delete this record?'}</p>
                        <button className="btn-danger w-full" onClick={() => remove(payload.id)}>{locale === 'ar' ? 'حذف' : 'Delete'}</button>
                    </div>
                )}
            </AppModal>
        </div>
    );
}
