'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { useAuthStore, useModalStore, useToastStore } from '@/lib/store';
import { adminApi, api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import AppModal from '@/components/ui/AppModal';
import { FaCheck, FaEye, FaPenToSquare, FaTrash, FaXmark } from 'react-icons/fa6';
import PhoneInputField from '@/components/form/PhoneInputField';
import { getEmbeddableVideoUrl } from '@/lib/video';
import Pagination from '@/components/ui/Pagination';

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
    const pageSize = 12;

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

    const fetchData = async () => {
        setLoading(true);
        try {
            // جلب كل البيانات لهذا الفلتر؛ الباجنيشن يتم على الواجهة
            const result = await adminApi.getAdminImams(token!, `status=${statusFilter}`);
            setItems(result?.data || []);
        } catch {
            pushToast(locale === 'ar' ? 'فشل تحميل البيانات' : 'Failed to load data', 'error');
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

    const filteredItems = items.filter((imam) => {
        if (!searchTerm) return true;
        const q = searchTerm.toLowerCase();
        return [
            imam.imamName,
            imam.mosqueName,
            imam.status,
            imam.whatsapp,
            imam.googleMapsUrl,
        ].some((field: any) => (field || '').toString().toLowerCase().includes(q));
    });

    const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
    const paginatedItems = filteredItems.slice((page - 1) * pageSize, page * pageSize);

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-black">{locale === 'ar' ? 'إدارة الأئمة' : 'Manage Imams'}</h1>
                <div className="flex flex-wrap gap-2 items-center">
                    <input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={locale === 'ar' ? 'بحث بالاسم أو المسجد أو الحالة' : 'Search by name, mosque or status'}
                        className="input-field max-w-xs text-sm"
                    />
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
                                <th className="text-start px-4 py-3 text-sm">{locale === 'ar' ? 'الاسم' : 'Name'}</th>
                                <th className="text-start px-4 py-3 text-sm">{locale === 'ar' ? 'المسجد' : 'Mosque'}</th>
                                <th className="text-start px-4 py-3 text-sm">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                                <th className="text-start px-4 py-3 text-sm">{locale === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {loading && <tr><td colSpan={4} className="px-4 py-10 text-center">Loading...</td></tr>}
                            {!loading && !filteredItems.length && <tr><td colSpan={4} className="px-4 py-10 text-center">{locale === 'ar' ? 'لا توجد بيانات' : 'No data'}</td></tr>}
                            {!loading && paginatedItems.map((imam) => (
                                <tr key={imam.id}>
                                    <td className="px-4 py-4 font-semibold">{imam.imamName}</td>
                                    <td className="px-4 py-4 text-sm text-text-muted">{imam.mosqueName}</td>
                                    <td className="px-4 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${imam.status === 'approved' ? 'bg-green-100 text-green-700' : imam.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                            {imam.status}
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


