'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useAuthStore, useToastStore } from '@/lib/store';
import { adminApi } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function AdminUsersPage() {
    const t = useTranslations('admin');
    const locale = useLocale();
    const router = useRouter();
    const { token, admin } = useAuthStore();
    const { pushToast } = useToastStore();

    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState('imam_reviewer');

    useEffect(() => {
        if (!token || admin?.role !== 'super_admin') {
            router.push(`/${locale}/admin`);
            return;
        }
        void fetchUsers();
    }, [token]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await adminApi.getAdminUsers(token!);
            setUsers(Array.isArray(data) ? data : []);
        } catch {
            pushToast(locale === 'ar' ? '???? ????? ??????????.' : 'Failed to load users.', 'error');
        }
        setLoading(false);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await adminApi.createAdminUser(token!, { email: newEmail, password: newPassword, role: newRole });
            pushToast(locale === 'ar' ? '?? ????? ????????.' : 'User created.', 'success');
            setShowCreate(false);
            setNewEmail('');
            setNewPassword('');
            setNewRole('imam_reviewer');
            void fetchUsers();
        } catch {
            pushToast(locale === 'ar' ? '??? ????? ????????.' : 'Create failed.', 'error');
        }
    };

    const handleToggle = async (id: string, currentActive: boolean) => {
        try {
            await adminApi.updateAdminUser(token!, id, { is_active: !currentActive });
            pushToast(currentActive ? (locale === 'ar' ? '?? ???????.' : 'Deactivated.') : (locale === 'ar' ? '?? ???????.' : 'Activated.'), 'success');
            void fetchUsers();
        } catch {
            pushToast(locale === 'ar' ? '??? ????? ??????.' : 'Status update failed.', 'error');
        }
    };

    const roleLabels: Record<string, string> = locale === 'ar'
        ? { super_admin: '???? ???', full_reviewer: '????? ????', imam_reviewer: '????? ????', halqa_reviewer: '????? ?????', maintenance_reviewer: '????? ?????' }
        : { super_admin: 'Super Admin', full_reviewer: 'Full Reviewer', imam_reviewer: 'Imam Reviewer', halqa_reviewer: 'Halqa Reviewer', maintenance_reviewer: 'Maint. Reviewer' };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">{t('users')}</h1>
                <button onClick={() => setShowCreate(!showCreate)} className="btn-primary text-sm">{showCreate ? (locale === 'ar' ? '?????' : 'Cancel') : t('addUser')}</button>
            </div>

            {showCreate && (
                <form onSubmit={handleCreate} className="card p-6 space-y-4 animate-slide-up">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Email" className="input-field" dir="ltr" required />
                        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Password" className="input-field" dir="ltr" required />
                        <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="input-field">
                            {Object.entries(roleLabels).filter(([k]) => k !== 'super_admin').map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                    </div>
                    <button type="submit" className="btn-primary">{locale === 'ar' ? '?????' : 'Create'}</button>
                </form>
            )}

            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b"><tr><th className="text-start px-4 py-3 text-sm font-medium">{t('email')}</th><th className="text-start px-4 py-3 text-sm font-medium">{t('role')}</th><th className="text-start px-4 py-3 text-sm font-medium">{t('status')}</th><th className="text-start px-4 py-3 text-sm font-medium">{locale === 'ar' ? '?????????' : 'Actions'}</th></tr></thead>
                        <tbody className="divide-y">
                            {loading ? <tr><td colSpan={4} className="px-4 py-8 text-center">Loading...</td></tr> : users.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-4 font-medium">{user.email}</td>
                                    <td className="px-4 py-4"><span className="badge bg-primary-light text-primary text-xs">{roleLabels[user.role] || user.role}</span></td>
                                    <td className="px-4 py-4"><span className={`badge text-xs ${user.isActive ? 'badge-approved' : 'badge-rejected'}`}>{user.isActive ? t('active') : t('inactive')}</span></td>
                                    <td className="px-4 py-4">{user.role !== 'super_admin' && <button onClick={() => handleToggle(user.id, user.isActive)} className="text-sm text-primary hover:text-primary-dark font-medium">{user.isActive ? (locale === 'ar' ? '?????' : 'Deactivate') : (locale === 'ar' ? '?????' : 'Activate')}</button>}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

