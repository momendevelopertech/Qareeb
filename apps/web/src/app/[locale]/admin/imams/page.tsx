'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { useAuthStore, useModalStore, useToastStore } from '@/lib/store';
import { adminApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import AppModal from '@/components/ui/AppModal';
import { FaCheck, FaEye, FaPenToSquare, FaTrash, FaXmark } from 'react-icons/fa6';
import PhoneInputField from '@/components/form/PhoneInputField';

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
    const [loading, setLoading] = useState(true);
    const [editForm, setEditForm] = useState<any>({});

    useEffect(() => {
        if (!token) {
            router.push(`/${locale}/admin`);
            return;
        }
        void fetchData();
    }, [token, statusFilter]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const result = await adminApi.getAdminImams(token!, `status=${statusFilter}`);
            setItems(result?.data || []);
        } catch {
            pushToast(locale === 'ar' ? '???? ????? ????????' : 'Failed to load data', 'error');
        }
        setLoading(false);
    };

    const approve = async (id: string) => {
        try {
            await adminApi.approveImam(token!, id);
            pushToast(locale === 'ar' ? '??? ????????' : 'Approved', 'success');
            void fetchData();
        } catch {
            pushToast(locale === 'ar' ? '??? ????? ????????' : 'Approve failed', 'error');
        }
    };

    const reject = async (id: string) => {
        try {
            await adminApi.rejectImam(token!, id, locale === 'ar' ? '?? ????? ?? ??????' : 'Rejected by admin');
            pushToast(locale === 'ar' ? '?? ?????' : 'Rejected', 'success');
            void fetchData();
        } catch {
            pushToast(locale === 'ar' ? '??? ????? ?????' : 'Reject failed', 'error');
        }
    };

    const saveEdit = async () => {
        try {
            await adminApi.updateImam(token!, payload.id, editForm);
            pushToast(locale === 'ar' ? '?? ???????' : 'Updated', 'success');
            closeModal();
            void fetchData();
        } catch {
            pushToast(locale === 'ar' ? '??? ???????' : 'Update failed', 'error');
        }
    };

    const remove = async (id: string) => {
        try {
            await adminApi.deleteImam(token!, id);
            pushToast(locale === 'ar' ? '?? ?????' : 'Deleted', 'success');
            closeModal();
            void fetchData();
        } catch {
            pushToast(locale === 'ar' ? '??? ?????' : 'Delete failed', 'error');
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-black">{locale === 'ar' ? '????? ??????' : 'Manage Imams'}</h1>

            <div className="flex gap-2 flex-wrap">
                {['pending', 'approved', 'rejected'].map((s) => (
                    <button key={s} onClick={() => setStatusFilter(s)} className={`px-4 py-2 rounded-xl text-sm font-bold ${statusFilter === s ? 'bg-primary text-white' : 'bg-white border border-border'}`}>
                        {s}
                    </button>
                ))}
            </div>

            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[680px]">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="text-start px-4 py-3 text-sm">{locale === 'ar' ? '?????' : 'Name'}</th>
                                <th className="text-start px-4 py-3 text-sm">{locale === 'ar' ? '??????' : 'Mosque'}</th>
                                <th className="text-start px-4 py-3 text-sm">{locale === 'ar' ? '??????' : 'Status'}</th>
                                <th className="text-start px-4 py-3 text-sm">{locale === 'ar' ? '?????????' : 'Actions'}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {loading && <tr><td colSpan={4} className="px-4 py-10 text-center">Loading...</td></tr>}
                            {!loading && !items.length && <tr><td colSpan={4} className="px-4 py-10 text-center">{locale === 'ar' ? '?? ???? ??????' : 'No data'}</td></tr>}
                            {!loading && items.map((imam) => (
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
                                            <IconButton label="edit" onClick={() => { setEditForm({ imam_name: imam.imamName, mosque_name: imam.mosqueName, whatsapp: imam.whatsapp, google_maps_url: imam.googleMapsUrl || '', video_url: imam.videoUrl || '' }); openModal('edit', 'imam', imam); }}><FaPenToSquare className="text-blue-700" /></IconButton>
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

            <AppModal isOpen={isOpen && type === 'view'} type="view" title={locale === 'ar' ? '??? ?????? ??????' : 'View Imam'} onClose={closeModal}>
                {payload && (
                    <div className="space-y-3 text-sm">
                        <p><strong>{locale === 'ar' ? '?????:' : 'Name:'}</strong> {payload.imamName}</p>
                        <p><strong>{locale === 'ar' ? '??????:' : 'Mosque:'}</strong> {payload.mosqueName}</p>
                        <p><strong>WhatsApp:</strong> {payload.whatsapp}</p>
                        {payload.videoUrl && (
                            <iframe src={payload.videoUrl} className="w-full h-64 rounded-xl border" allowFullScreen title="video" />
                        )}
                        {payload.googleMapsUrl && (
                            <div className="flex gap-2">
                                <a className="btn-outline" target="_blank" rel="noreferrer" href={payload.googleMapsUrl}>{locale === 'ar' ? '??? ???????' : 'Open map'}</a>
                                <button className="btn-outline" onClick={() => navigator.clipboard.writeText(payload.googleMapsUrl)}>{locale === 'ar' ? '??? ??????' : 'Copy link'}</button>
                            </div>
                        )}
                    </div>
                )}
            </AppModal>

            <AppModal isOpen={isOpen && type === 'edit'} type="edit" title={locale === 'ar' ? '????? ??????' : 'Edit Imam'} onClose={closeModal}>
                <div className="space-y-3">
                    <input className="input-field" value={editForm.imam_name || ''} onChange={(e) => setEditForm((s: any) => ({ ...s, imam_name: e.target.value }))} placeholder={locale === 'ar' ? '??? ??????' : 'Imam name'} />
                    <input className="input-field" value={editForm.mosque_name || ''} onChange={(e) => setEditForm((s: any) => ({ ...s, mosque_name: e.target.value }))} placeholder={locale === 'ar' ? '??? ??????' : 'Mosque name'} />
                    <PhoneInputField value={editForm.whatsapp || ''} onChange={(next) => setEditForm((s: any) => ({ ...s, whatsapp: next || '' }))} />
                    <input className="input-field" value={editForm.google_maps_url || ''} onChange={(e) => setEditForm((s: any) => ({ ...s, google_maps_url: e.target.value }))} placeholder="Google map URL" />
                    <input className="input-field" value={editForm.video_url || ''} onChange={(e) => setEditForm((s: any) => ({ ...s, video_url: e.target.value }))} placeholder="Video URL" />
                    <button className="btn-primary w-full" onClick={saveEdit}>{locale === 'ar' ? '???' : 'Save'}</button>
                </div>
            </AppModal>

            <AppModal isOpen={isOpen && type === 'images'} type="images" title={locale === 'ar' ? '????? ?????' : 'Confirm delete'} onClose={closeModal}>
                {payload && (
                    <div className="space-y-4">
                        <p>{locale === 'ar' ? '?? ???? ??? ??? ??????' : 'Delete this record?'}</p>
                        <button className="btn-danger w-full" onClick={() => remove(payload.id)}>{locale === 'ar' ? '???' : 'Delete'}</button>
                    </div>
                )}
            </AppModal>
        </div>
    );
}

