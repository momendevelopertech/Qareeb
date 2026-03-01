'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { useAuthStore, useModalStore, useToastStore } from '@/lib/store';
import { adminApi, api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import AppModal from '@/components/ui/AppModal';
import { FaCheck, FaEye, FaPenToSquare, FaTrash, FaXmark } from 'react-icons/fa6';
import PhoneInputField from '@/components/form/PhoneInputField';
import Pagination from '@/components/ui/Pagination';

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
    return <button aria-label={label} title={label} onClick={onClick} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-cream">{children}</button>;
}

export default function AdminMaintenancePage() {
    const locale = useLocale();
    const router = useRouter();
    const { token } = useAuthStore();
    const { isOpen, type, payload, openModal, closeModal } = useModalStore();
    const { pushToast } = useToastStore();

    const [items, setItems] = useState<any[]>([]);
    const [statusFilter, setStatusFilter] = useState('pending');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [editForm, setEditForm] = useState<any>({});
    const [governorates, setGovernorates] = useState<any[]>([]);
    const [editAreas, setEditAreas] = useState<any[]>([]);
    const [newImageUrls, setNewImageUrls] = useState<string[]>([]);
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

    const fetchData = async () => {
        setLoading(true);
        try {
            // جلب كل البيانات لهذا الفلتر؛ الباجنيشن يتم على الواجهة
            const result = await adminApi.getAdminMaintenance(token!, `status=${statusFilter}`);
            setItems(result?.data || []);
        } catch {
            pushToast(locale === 'ar' ? 'فشل تحميل البيانات' : 'Failed to load data', 'error');
        }
        setLoading(false);
    };

    const approve = async (id: string) => {
        try {
            await adminApi.approveMaintenance(token!, id);
            pushToast(locale === 'ar' ? 'تمت الموافقة' : 'Approved', 'success');
            void fetchData();
        } catch {
            pushToast(locale === 'ar' ? 'فشل في الموافقة' : 'Approve failed', 'error');
        }
    };

    const reject = async (id: string) => {
        try {
            await adminApi.rejectMaintenance(token!, id, locale === 'ar' ? 'تم الرفض بواسطة المشرف' : 'Rejected by admin');
            pushToast(locale === 'ar' ? 'تم الرفض' : 'Rejected', 'success');
            void fetchData();
        } catch {
            pushToast(locale === 'ar' ? 'فشل الرفض' : 'Reject failed', 'error');
        }
    };

    const saveEdit = async () => {
        try {
            const { governorate_id: _governorate_id, ...updatePayload } = editForm;
            await adminApi.updateMaintenance(token!, payload.id, updatePayload);
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

    const openEditMaintenance = async (item: any) => {
        const governorateId = resolveGovernorateId(item);
        const areas = await loadAreasByGovernorate(governorateId);
        const areaId = item.areaId || item.area?.id || '';
        const selectedGovernorate = governorates.find((g) => g.id === governorateId);
        const selectedArea = areas.find((a: any) => a.id === areaId) || item.area;

        setEditForm({
            mosque_name: item.mosqueName,
            governorate: selectedGovernorate
                ? (locale === 'ar' ? selectedGovernorate.nameAr : selectedGovernorate.nameEn)
                : (item.governorate || ''),
            governorate_id: governorateId,
            area_id: areaId,
            city: selectedArea ? (locale === 'ar' ? (selectedArea.nameAr || selectedArea.nameEn) : (selectedArea.nameEn || selectedArea.nameAr)) : '',
            district: '',
            whatsapp: item.whatsapp,
            description: item.description,
            google_maps_url: item.googleMapsUrl || '',
        });
        setNewImageUrls([]);
        openModal('edit', 'maintenance', item);
    };

    const uploadImageToCloudinary = async (file: File) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.type)) throw new Error('type');
        if (file.size > 2 * 1024 * 1024) throw new Error('size');

        const sign = await api.getSignedUploadParams();
        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', sign.api_key);
        formData.append('timestamp', String(sign.timestamp));
        formData.append('signature', sign.signature);
        formData.append('folder', sign.folder);
        formData.append('allowed_formats', sign.allowed_formats);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloud_name}/image/upload`, { method: 'POST', body: formData });
        const uploaded = await res.json();
        if (!res.ok) throw new Error(uploaded?.error?.message || 'upload failed');
        return { publicId: uploaded.public_id, secureUrl: uploaded.secure_url };
    };

    const addUploadedImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        if (!files.length || !payload) return;
        const current = payload.media || [];
        const queued = editForm.media_uploads || [];
        const available = 4 - (current.length + queued.length);
        if (available <= 0) {
            pushToast(locale === 'ar' ? 'الحد الأقصى 4 صور' : 'Max 4 images', 'error');
            return;
        }
        try {
            const selected = files.slice(0, available);
            const uploadedBatch: Array<{ publicId: string; secureUrl: string }> = [];
            for (const file of selected) {
                const uploaded = await uploadImageToCloudinary(file);
                uploadedBatch.push(uploaded);
            }
            if (uploadedBatch.length) {
                setEditForm((s: any) => ({ ...s, media_uploads: [...(s.media_uploads || []), ...uploadedBatch] }));
                setNewImageUrls((prev) => [...prev, ...uploadedBatch.map((x) => x.secureUrl)]);
                pushToast(locale === 'ar' ? 'تم رفع الصور' : 'Images uploaded', 'success');
            }
        } catch (error: any) {
            const reason = error?.message === 'size' ? (locale === 'ar' ? 'الحد الأقصى للحجم 2MB' : 'Max size is 2MB')
                : error?.message === 'type' ? (locale === 'ar' ? 'نوع الصورة غير مدعوم' : 'Unsupported image type')
                    : (locale === 'ar' ? 'فشل رفع الصورة' : 'Upload failed');
            pushToast(reason, 'error');
        }
        event.currentTarget.value = '';
    };

    const deleteExistingImage = async (publicId: string) => {
        try {
            await adminApi.deleteMediaAsset(token!, publicId);
            pushToast(locale === 'ar' ? 'تم حذف الصورة' : 'Image deleted', 'success');
            void fetchData();
        } catch {
            pushToast(locale === 'ar' ? 'فشل حذف الصورة' : 'Delete image failed', 'error');
        }
    };

    const filteredItems = items.filter((item) => {
        if (!searchTerm) return true;
        const q = searchTerm.toLowerCase();
        return [
            item.mosqueName,
            item.description,
            (item.maintenanceTypes || []).join(', '),
            item.status,
            item.whatsapp,
        ].some((field: any) => (field || '').toString().toLowerCase().includes(q));
    });

    const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
    const paginatedItems = filteredItems.slice((page - 1) * pageSize, page * pageSize);

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-black">{locale === 'ar' ? 'إدارة الصيانة' : 'Manage Maintenance'}</h1>
                <div className="flex flex-wrap gap-2 items-center">
                    <input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={locale === 'ar' ? 'بحث بالمسجد أو الوصف أو النوع' : 'Search by mosque, description or type'}
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
                    <table className="w-full min-w-[760px]">
                        <thead className="bg-gray-50 border-b">
                            <tr><th className="text-start px-4 py-3 text-sm">Mosque</th><th className="text-start px-4 py-3 text-sm">Types</th><th className="text-start px-4 py-3 text-sm">Status</th><th className="text-start px-4 py-3 text-sm">Actions</th></tr>
                        </thead>
                        <tbody className="divide-y">
                            {loading && <tr><td colSpan={4} className="px-4 py-10 text-center">Loading...</td></tr>}
                            {!loading && !filteredItems.length && <tr><td colSpan={4} className="px-4 py-10 text-center">No data</td></tr>}
                            {!loading && paginatedItems.map((item) => (
                                <tr key={item.id}>
                                    <td className="px-4 py-4 font-semibold">{item.mosqueName}</td>
                                    <td className="px-4 py-4 text-sm text-text-muted">{(item.maintenanceTypes || []).join(', ')}</td>
                                    <td className="px-4 py-4"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${item.status === 'approved' ? 'bg-green-100 text-green-700' : item.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{item.status}</span></td>
                                    <td className="px-4 py-4"><div className="flex gap-2">
                                        <IconButton label="view" onClick={() => openModal('view', 'maintenance', item)}><FaEye className="text-slate-700" /></IconButton>
                                        <IconButton label="edit" onClick={() => { void openEditMaintenance(item); }}><FaPenToSquare className="text-blue-700" /></IconButton>
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

            <AppModal isOpen={isOpen && type === 'view'} type="view" title={locale === 'ar' ? 'عرض الصيانة' : 'View Maintenance'} onClose={closeModal}>
                {payload && <div className="space-y-3 text-sm">
                    <p><strong>{locale === 'ar' ? 'المسجد:' : 'Mosque:'}</strong> {payload.mosqueName}</p>
                    <p><strong>{locale === 'ar' ? 'المحافظة:' : 'Governorate:'}</strong> {payload.governorate}</p>
                    <p><strong>{locale === 'ar' ? 'المنطقة:' : 'Area:'}</strong> {getAreaLabel(payload) || '-'}</p>
                    <p><strong>{locale === 'ar' ? 'الوصف:' : 'Description:'}</strong> {payload.description}</p>
                    <p><strong>{locale === 'ar' ? 'الأنواع:' : 'Types:'}</strong> {(payload.maintenanceTypes || []).join(', ')}</p>
                    {payload.googleMapsUrl && <div className="flex gap-2"><a className="btn-outline" href={payload.googleMapsUrl} target="_blank" rel="noreferrer">{locale === 'ar' ? 'فتح الخريطة' : 'Open map'}</a><button className="btn-outline" onClick={() => navigator.clipboard.writeText(payload.googleMapsUrl)}>{locale === 'ar' ? 'نسخ الرابط' : 'Copy link'}</button></div>}
                    {(payload.media || []).length > 0 && <div className="overflow-x-auto whitespace-nowrap space-x-2">{(payload.media || []).map((m: any) => <img key={m.id} src={m.url} alt="maintenance" className="inline-block w-40 h-28 object-cover rounded-lg border" />)}</div>}
                </div>}
            </AppModal>

            <AppModal isOpen={isOpen && type === 'edit'} type="edit" title={locale === 'ar' ? 'تعديل الصيانة' : 'Edit Maintenance'} onClose={closeModal}>
                <div className="space-y-3">
                    <input className="input-field" value={editForm.mosque_name || ''} onChange={(e) => setEditForm((s: any) => ({ ...s, mosque_name: e.target.value }))} placeholder={locale === 'ar' ? 'اسم المسجد' : 'Mosque'} />
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
                    <textarea className="input-field" value={editForm.description || ''} onChange={(e) => setEditForm((s: any) => ({ ...s, description: e.target.value }))} placeholder={locale === 'ar' ? 'الوصف' : 'Description'} />
                    <input className="input-field" value={editForm.google_maps_url || ''} onChange={(e) => setEditForm((s: any) => ({ ...s, google_maps_url: e.target.value }))} placeholder="Google map URL" />

                    {!!payload?.media?.length && (
                        <div className="grid grid-cols-2 gap-2">
                            {payload.media.map((m: any) => (
                                <div key={m.id} className="relative">
                                    <img src={m.url} alt="existing" className="w-full h-24 object-cover rounded-lg border" />
                                    <button type="button" aria-label="delete image" title="delete image" className="absolute top-1 end-1 w-6 h-6 rounded-full bg-red-600 text-white text-xs" onClick={() => deleteExistingImage(m.publicId)}>
                                        <FaTrash className="mx-auto" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="border border-dashed border-border rounded-xl p-3">
                        <label className="text-sm font-semibold block mb-2">{locale === 'ar' ? 'إضافة صورة' : 'Add image'} (jpg/png/webp, max 2MB)</label>
                        <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={addUploadedImage} />
                        {!!newImageUrls.length && (
                            <div className="mt-3 grid grid-cols-2 gap-2">
                                {newImageUrls.map((url) => (
                                    <img key={url} src={url} alt="uploaded" className="w-full h-24 object-cover rounded-lg border" />
                                ))}
                            </div>
                        )}
                        <p className="text-xs text-text-muted mt-2">{locale === 'ar' ? 'الحد الأقصى 4 صور لكل طلب' : 'Maximum 4 images per request'}</p>
                    </div>
                    <button className="btn-primary w-full" onClick={saveEdit}>{locale === 'ar' ? 'حفظ' : 'Save'}</button>
                </div>
            </AppModal>
        </div>
    );
}


