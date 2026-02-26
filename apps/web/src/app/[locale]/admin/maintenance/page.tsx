'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { useAuthStore, useModalStore, useToastStore } from '@/lib/store';
import { adminApi, api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import AppModal from '@/components/ui/AppModal';
import { FaCheck, FaEye, FaPenToSquare, FaTrash, FaXmark } from 'react-icons/fa6';
import PhoneInputField from '@/components/form/PhoneInputField';

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
    const [loading, setLoading] = useState(true);
    const [editForm, setEditForm] = useState<any>({});
    const [newImageUrl, setNewImageUrl] = useState('');

    useEffect(() => {
        if (!token) { router.push(`/${locale}/admin`); return; }
        void fetchData();
    }, [token, statusFilter]);

    const fetchData = async () => {
        setLoading(true);
        try {
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
            await adminApi.updateMaintenance(token!, payload.id, editForm);
            pushToast(locale === 'ar' ? 'تم التحديث' : 'Updated', 'success');
            closeModal();
            void fetchData();
        } catch {
            pushToast(locale === 'ar' ? 'فشل التحديث' : 'Update failed', 'error');
        }
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

        const res = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloud_name}/image/upload`, { method: 'POST', body: formData });
        const uploaded = await res.json();
        if (!res.ok) throw new Error(uploaded?.error?.message || 'upload failed');
        return { publicId: uploaded.public_id, secureUrl: uploaded.secure_url };
    };

    const addUploadedImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !payload) return;
        const current = payload.media || [];
        if (current.length >= 4) {
            pushToast(locale === 'ar' ? 'الحد الأقصى 4 صور' : 'Max 4 images', 'error');
            return;
        }
        try {
            const uploaded = await uploadImageToCloudinary(file);
            setEditForm((s: any) => ({ ...s, media_uploads: [...(s.media_uploads || []), uploaded] }));
            setNewImageUrl(uploaded?.secureUrl || '');
            pushToast(locale === 'ar' ? 'تم رفع الصورة' : 'Image uploaded', 'success');
        } catch (error: any) {
            const reason = error?.message === 'size' ? (locale === 'ar' ? 'الحد الأقصى للحجم 2MB' : 'Max size is 2MB')
                : error?.message === 'type' ? (locale === 'ar' ? 'نوع الصورة غير مدعوم' : 'Unsupported image type')
                    : (locale === 'ar' ? 'فشل رفع الصورة' : 'Upload failed');
            pushToast(reason, 'error');
        }
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

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-black">{locale === 'ar' ? 'إدارة الصيانة' : 'Manage Maintenance'}</h1>
            <div className="flex gap-2 flex-wrap">
                {['pending', 'approved', 'rejected'].map((s) => (
                    <button key={s} onClick={() => setStatusFilter(s)} className={`px-4 py-2 rounded-xl text-sm font-bold ${statusFilter === s ? 'bg-primary text-white' : 'bg-white border border-border'}`}>
                        {s}
                    </button>
                ))}
            </div>

            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px]">
                        <thead className="bg-gray-50 border-b">
                            <tr><th className="text-start px-4 py-3 text-sm">Mosque</th><th className="text-start px-4 py-3 text-sm">Types</th><th className="text-start px-4 py-3 text-sm">Status</th><th className="text-start px-4 py-3 text-sm">Actions</th></tr>
                        </thead>
                        <tbody className="divide-y">
                            {loading && <tr><td colSpan={4} className="px-4 py-10 text-center">Loading...</td></tr>}
                            {!loading && !items.length && <tr><td colSpan={4} className="px-4 py-10 text-center">No data</td></tr>}
                            {!loading && items.map((item) => (
                                <tr key={item.id}>
                                    <td className="px-4 py-4 font-semibold">{item.mosqueName}</td>
                                    <td className="px-4 py-4 text-sm text-text-muted">{(item.maintenanceTypes || []).join(', ')}</td>
                                    <td className="px-4 py-4"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${item.status === 'approved' ? 'bg-green-100 text-green-700' : item.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{item.status}</span></td>
                                    <td className="px-4 py-4"><div className="flex gap-2">
                                        <IconButton label="view" onClick={() => openModal('view', 'maintenance', item)}><FaEye className="text-slate-700" /></IconButton>
                                        <IconButton label="edit" onClick={() => { setEditForm({ mosque_name: item.mosqueName, whatsapp: item.whatsapp, description: item.description, google_maps_url: item.googleMapsUrl || '' }); setNewImageUrl(''); openModal('edit', 'maintenance', item); }}><FaPenToSquare className="text-blue-700" /></IconButton>
                                        {item.status === 'pending' && <IconButton label="approve" onClick={() => approve(item.id)}><FaCheck className="text-green-700" /></IconButton>}
                                        {item.status === 'pending' && <IconButton label="reject" onClick={() => reject(item.id)}><FaXmark className="text-red-700" /></IconButton>}
                                    </div></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <AppModal isOpen={isOpen && type === 'view'} type="view" title={locale === 'ar' ? 'عرض الصيانة' : 'View Maintenance'} onClose={closeModal}>
                {payload && <div className="space-y-3 text-sm">
                    <p><strong>Mosque:</strong> {payload.mosqueName}</p>
                    <p><strong>Description:</strong> {payload.description}</p>
                    <p><strong>Types:</strong> {(payload.maintenanceTypes || []).join(', ')}</p>
                    {payload.googleMapsUrl && <div className="flex gap-2"><a className="btn-outline" href={payload.googleMapsUrl} target="_blank" rel="noreferrer">{locale === 'ar' ? 'فتح الخريطة' : 'Open map'}</a><button className="btn-outline" onClick={() => navigator.clipboard.writeText(payload.googleMapsUrl)}>{locale === 'ar' ? 'نسخ الرابط' : 'Copy link'}</button></div>}
                    {(payload.media || []).length > 0 && <div className="overflow-x-auto whitespace-nowrap space-x-2">{(payload.media || []).map((m: any) => <img key={m.id} src={m.url} alt="maintenance" className="inline-block w-40 h-28 object-cover rounded-lg border" />)}</div>}
                </div>}
            </AppModal>

            <AppModal isOpen={isOpen && type === 'edit'} type="edit" title={locale === 'ar' ? 'تعديل الصيانة' : 'Edit Maintenance'} onClose={closeModal}>
                <div className="space-y-3">
                    <input className="input-field" value={editForm.mosque_name || ''} onChange={(e) => setEditForm((s: any) => ({ ...s, mosque_name: e.target.value }))} placeholder="Mosque" />
                    <PhoneInputField value={editForm.whatsapp || ''} onChange={(next) => setEditForm((s: any) => ({ ...s, whatsapp: next || '' }))} />
                    <textarea className="input-field" value={editForm.description || ''} onChange={(e) => setEditForm((s: any) => ({ ...s, description: e.target.value }))} placeholder="Description" />
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
                        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={addUploadedImage} />
                        {newImageUrl && <img src={newImageUrl} alt="uploaded" className="mt-3 w-40 h-28 object-cover rounded-lg border" />}
                        <p className="text-xs text-text-muted mt-2">{locale === 'ar' ? 'الحد الأقصى 4 صور لكل طلب' : 'Maximum 4 images per request'}</p>
                    </div>
                    <button className="btn-primary w-full" onClick={saveEdit}>{locale === 'ar' ? 'حفظ' : 'Save'}</button>
                </div>
            </AppModal>
        </div>
    );
}

