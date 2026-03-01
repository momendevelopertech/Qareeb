const API_URL =
    typeof window !== 'undefined'
        ? '/api/v1'
        : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1');

interface FetchOptions extends RequestInit {
    token?: string;
    showGlobalLoading?: boolean;
}

import { startGlobalLoading, endGlobalLoading } from './store';

async function fetchAPI<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const { token, showGlobalLoading, ...init } = options;
    const method = (init.method || 'GET').toUpperCase();
    const shouldShowGlobalLoading = showGlobalLoading ?? method !== 'GET';
    if (shouldShowGlobalLoading) startGlobalLoading();
    try {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...(init.headers as Record<string, string>),
        };

        const res = await fetch(`${API_URL}${endpoint}`, {
            ...init,
            headers,
        });

        if (!res.ok) {
            const error = await res.json().catch(() => ({ message: 'An error occurred' })) as { message?: string };
            throw new Error(error.message || `API Error: ${res.status}`);
        }

        return res.json() as Promise<T>;
    } finally {
        if (shouldShowGlobalLoading) endGlobalLoading();
    }
}

// ── Public API ──

export const api = {
    // Locations
    getGovernorates: () => fetchAPI<any>('/locations/governorates'),
    getAreas: (governorateId?: string) => fetchAPI<any>(`/locations/areas${governorateId ? `?governorateId=${governorateId}` : ''}`),

    // Imams
    getImams: (params?: string) => fetchAPI<any>(`/imams${params ? `?${params}` : ''}`),
    getImam: (id: string) => fetchAPI<any>(`/imams/${id}`),
    createImam: (data: any) => fetchAPI<any>('/imams', { method: 'POST', body: JSON.stringify(data) }),

    // Halaqat
    getHalaqat: (params?: string) => fetchAPI<any>(`/halaqat${params ? `?${params}` : ''}`),
    getHalqa: (id: string) => fetchAPI<any>(`/halaqat/${id}`),
    createHalqa: (data: any) => fetchAPI<any>('/halaqat', { method: 'POST', body: JSON.stringify(data) }),

    // Maintenance
    getMaintenance: (params?: string) => fetchAPI<any>(`/maintenance${params ? `?${params}` : ''}`),
    getMaintenanceItem: (id: string) => fetchAPI<any>(`/maintenance/${id}`),
    createMaintenance: (data: any) => fetchAPI<any>('/maintenance', { method: 'POST', body: JSON.stringify(data) }),

    // Improvements
    createImprovement: (data: { suggestion_text: string; name?: string; email?: string }) =>
        fetchAPI<any>('/improvements', { method: 'POST', body: JSON.stringify(data) }),

    // Media
    getSignedUploadParams: () => fetchAPI<any>('/media/sign', { method: 'POST' }),

    // Chat
    chatNearest: (data: { text: string; lat?: number; lng?: number }) =>
        fetchAPI<any>('/chat/nearest', { method: 'POST', body: JSON.stringify(data) }),
    nearestSearch: (lat: number, lng: number, type: 'imam' | 'halqa' | 'maintenance') =>
        fetchAPI<any>(`/search/nearest?lat=${lat}&lng=${lng}&type=${type}`),
    getGeoCountry: () => fetchAPI<{ country: string }>('/geo'),

    // Locations admin
    createGovernorate: (token: string, data: any) => fetchAPI<any>('/locations/governorates', { method: 'POST', token, body: JSON.stringify(data) }),
    createArea: (token: string, data: any) => fetchAPI<any>('/locations/areas', { method: 'POST', token, body: JSON.stringify(data) }),
    updateArea: (token: string, id: string, data: any) => fetchAPI<any>(`/locations/areas/${id}`, { method: 'PATCH', token, body: JSON.stringify(data) }),
    deleteArea: (token: string, id: string) => fetchAPI<any>(`/locations/areas/${id}`, { method: 'DELETE', token }),
};

// ── Admin API ──

export const adminApi = {
    login: (email: string, password: string, rememberMe = true) =>
        fetchAPI<any>('/admin/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password, remember_me: rememberMe }),
            credentials: 'include',
        }),

    refresh: () =>
        fetchAPI<any>('/admin/auth/refresh', {
            method: 'POST',
            credentials: 'include',
        }),

    changePassword: (token: string, currentPassword: string, newPassword: string) =>
        fetchAPI<any>('/admin/auth/change-password', {
            method: 'PATCH',
            token,
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword,
            }),
        }),

    getDashboardStats: (token: string) =>
        fetchAPI<any>('/admin/dashboard/stats', { token }),
    getCloudinaryUsage: (token: string) =>
        fetchAPI<any>('/admin/dashboard/cloudinary-usage', { token }),

    // Imams admin
    getAdminImams: (token: string, params?: string) =>
        fetchAPI<any>(`/admin/imams${params ? `?${params}` : ''}`, { token }),
    approveImam: (token: string, id: string) =>
        fetchAPI<any>(`/admin/imams/${id}/approve`, { method: 'PATCH', token }),
    rejectImam: (token: string, id: string, reason?: string) =>
        fetchAPI<any>(`/admin/imams/${id}/reject`, { method: 'PATCH', token, body: JSON.stringify({ reason }) }),
    deleteImam: (token: string, id: string) =>
        fetchAPI<any>(`/admin/imams/${id}`, { method: 'DELETE', token }),
    updateImam: (token: string, id: string, data: any) =>
        fetchAPI<any>(`/admin/imams/${id}`, { method: 'PATCH', token, body: JSON.stringify(data) }),

    // Halaqat admin
    getAdminHalaqat: (token: string, params?: string) =>
        fetchAPI<any>(`/admin/halaqat${params ? `?${params}` : ''}`, { token }),
    approveHalqa: (token: string, id: string) =>
        fetchAPI<any>(`/admin/halaqat/${id}/approve`, { method: 'PATCH', token }),
    rejectHalqa: (token: string, id: string, reason?: string) =>
        fetchAPI<any>(`/admin/halaqat/${id}/reject`, { method: 'PATCH', token, body: JSON.stringify({ reason }) }),
    updateHalqa: (token: string, id: string, data: any) =>
        fetchAPI<any>(`/admin/halaqat/${id}`, { method: 'PATCH', token, body: JSON.stringify(data) }),

    // Maintenance admin
    getAdminMaintenance: (token: string, params?: string) =>
        fetchAPI<any>(`/admin/maintenance${params ? `?${params}` : ''}`, { token }),
    approveMaintenance: (token: string, id: string) =>
        fetchAPI<any>(`/admin/maintenance/${id}/approve`, { method: 'PATCH', token }),
    rejectMaintenance: (token: string, id: string, reason?: string) =>
        fetchAPI<any>(`/admin/maintenance/${id}/reject`, { method: 'PATCH', token, body: JSON.stringify({ reason }) }),
    updateMaintenance: (token: string, id: string, data: any) =>
        fetchAPI<any>(`/admin/maintenance/${id}`, { method: 'PATCH', token, body: JSON.stringify(data) }),

    // Improvements admin
    getAdminImprovements: (token: string, params?: string) =>
        fetchAPI<any>(`/admin/improvements${params ? `?${params}` : ''}`, { token }),
    updateImprovement: (token: string, id: string, data: { status?: string; internal_note?: string }) =>
        fetchAPI<any>(`/admin/improvements/${id}`, { method: 'PATCH', token, body: JSON.stringify(data) }),
    deleteImprovement: (token: string, id: string) =>
        fetchAPI<any>(`/admin/improvements/${id}`, { method: 'DELETE', token }),
    deleteMediaAsset: (token: string, publicId: string) =>
        fetchAPI<any>(`/media/${encodeURIComponent(publicId)}`, { method: 'DELETE', token }),

    // Users
    getAdminUsers: (token: string) =>
        fetchAPI<any>('/admin/users', { token }),
    createAdminUser: (token: string, data: any) =>
        fetchAPI<any>('/admin/users', { method: 'POST', token, body: JSON.stringify(data) }),
    updateAdminUser: (token: string, id: string, data: any) =>
        fetchAPI<any>(`/admin/users/${id}`, { method: 'PATCH', token, body: JSON.stringify(data) }),

    getAuditLogs: (token: string, params?: string) =>
        fetchAPI<any>(`/admin/audit${params ? `?${params}` : ''}`, { token }),

    // Notifications (admin JWT)
    getNotifications: (token: string, status: 'unread' | 'all' = 'unread') =>
        fetchAPI<any>(`/notifications?status=${status}`, { token }),
    getNotificationCount: (token: string) =>
        fetchAPI<any>('/notifications/count', { token }),
    markNotificationRead: (token: string, id: string) =>
        fetchAPI<any>(`/notifications/${id}/read`, { method: 'PATCH', token }),
    markAllNotificationsRead: (token: string) =>
        fetchAPI<any>('/notifications/read-all', { method: 'PATCH', token }),
};
