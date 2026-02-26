'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { useAuthStore, useModalStore, useToastStore } from '@/lib/store';
import { adminApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import AppModal from '@/components/ui/AppModal';
import { FaCheck, FaEye, FaPenToSquare, FaXmark } from 'react-icons/fa6';
import PhoneInputField from '@/components/form/PhoneInputField';

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
    const [loading, setLoading] = useState(true);
    const [editForm, setEditForm] = useState<any>({});

    useEffect(() => {
        if (!token) { router.push(`/${locale}/admin`); return; }
        void fetchData();
    }, [token, statusFilter]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const result = await adminApi.getAdminHalaqat(token!, `status=${statusFilter}`);
            setItems(result?.data || []);
        } catch {
            pushToast(locale === 'ar' ? '???? ????? ????????' : 'Failed to load data', 'error');
        }
        setLoading(false);
    };

    const approve = async (id: string) => {
        try { await adminApi.approveHalqa(token!, id); pushToast(locale === 'ar' ? '??? ????????' : 'Approved', 'success'); void fetchData(); }
        catch { pushToast(locale === 'ar' ? '??? ????????' : 'Approve failed', 'error'); }
    };
    const reject = async (id: string) => {
        try { await adminApi.rejectHalqa(token!, id, locale === 'ar' ? '?? ????? ?? ??????' : 'Rejected by admin'); pushToast(locale === 'ar' ? '?? ?????' : 'Rejected', 'success'); void fetchData(); }
        catch { pushToast(locale === 'ar' ? '??? ?????' : 'Reject failed', 'error'); }
    };

    const saveEdit = async () => {
        try {
            await adminApi.updateHalqa(token!, payload.id, editForm);
            pushToast(locale === 'ar' ? '?? ???????' : 'Updated', 'success');
            closeModal();
            void fetchData();
        } catch {
            pushToast(locale === 'ar' ? '??? ???????' : 'Update failed', 'error');
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-black">{locale === 'ar' ? '????? ???????' : 'Manage Halaqat'}</h1>
            <div className="flex gap-2 flex-wrap">
                {['pending', 'approved', 'rejected'].map((s) => <button key={s} onClick={() => setStatusFilter(s)} className={`px-4 py-2 rounded-xl text-sm font-bold ${statusFilter === s ? 'bg-primary text-white' : 'bg-white border border-border'}`}>{s}</button>)}
            </div>

            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[680px]">
                        <thead className="bg-gray-50 border-b"><tr><th className="text-start px-4 py-3 text-sm">Name</th><th className="text-start px-4 py-3 text-sm">Mosque</th><th className="text-start px-4 py-3 text-sm">Status</th><th className="text-start px-4 py-3 text-sm">Actions</th></tr></thead>
                        <tbody className="divide-y">
                            {loading && <tr><td colSpan={4} className="px-4 py-10 text-center">Loading...</td></tr>}
                            {!loading && !items.length && <tr><td colSpan={4} className="px-4 py-10 text-center">No data</td></tr>}
                            {!loading && items.map((item) => (
                                <tr key={item.id}>
                                    <td className="px-4 py-4 font-semibold">{item.circleName}</td>
                                    <td className="px-4 py-4 text-sm text-text-muted">{item.mosqueName}</td>
                                    <td className="px-4 py-4"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${item.status === 'approved' ? 'bg-green-100 text-green-700' : item.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{item.status}</span></td>
                                    <td className="px-4 py-4"><div className="flex gap-2">
                                        <IconButton label="view" onClick={() => openModal('view', 'halqa', item)}><FaEye className="text-slate-700" /></IconButton>
                                        <IconButton label="edit" onClick={() => { setEditForm({ circle_name: item.circleName, mosque_name: item.mosqueName, whatsapp: item.whatsapp, additional_info: item.additionalInfo || '' }); openModal('edit', 'halqa', item); }}><FaPenToSquare className="text-blue-700" /></IconButton>
                                        {item.status === 'pending' && <IconButton label="approve" onClick={() => approve(item.id)}><FaCheck className="text-green-700" /></IconButton>}
                                        {item.status === 'pending' && <IconButton label="reject" onClick={() => reject(item.id)}><FaXmark className="text-red-700" /></IconButton>}
                                    </div></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <AppModal isOpen={isOpen && type === 'view'} type="view" title={locale === 'ar' ? '??? ??????' : 'View Halqa'} onClose={closeModal}>
                {payload && <div className="space-y-3 text-sm">
                    <p><strong>Name:</strong> {payload.circleName}</p>
                    <p><strong>Mosque:</strong> {payload.mosqueName}</p>
                    <p><strong>Type:</strong> {payload.halqaType}</p>
                    <p><strong>WhatsApp:</strong> {payload.whatsapp}</p>
                    {payload.googleMapsUrl && <div className="flex gap-2"><a className="btn-outline" href={payload.googleMapsUrl} target="_blank" rel="noreferrer">{locale === 'ar' ? '??? ???????' : 'Open map'}</a><button className="btn-outline" onClick={() => navigator.clipboard.writeText(payload.googleMapsUrl)}>{locale === 'ar' ? '??? ??????' : 'Copy link'}</button></div>}
                </div>}
            </AppModal>

            <AppModal isOpen={isOpen && type === 'edit'} type="edit" title={locale === 'ar' ? '????? ??????' : 'Edit Halqa'} onClose={closeModal}>
                <div className="space-y-3">
                    <input className="input-field" value={editForm.circle_name || ''} onChange={(e) => setEditForm((s: any) => ({ ...s, circle_name: e.target.value }))} placeholder="Name" />
                    <input className="input-field" value={editForm.mosque_name || ''} onChange={(e) => setEditForm((s: any) => ({ ...s, mosque_name: e.target.value }))} placeholder="Mosque" />
                    <PhoneInputField value={editForm.whatsapp || ''} onChange={(next) => setEditForm((s: any) => ({ ...s, whatsapp: next || '' }))} />
                    <textarea className="input-field" value={editForm.additional_info || ''} onChange={(e) => setEditForm((s: any) => ({ ...s, additional_info: e.target.value }))} placeholder="Additional info" />
                    <button className="btn-primary w-full" onClick={saveEdit}>{locale === 'ar' ? '???' : 'Save'}</button>
                </div>
            </AppModal>
        </div>
    );
}

