const DIRECT_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1';
const PROXY_API_URL = '/api/v1';
const API_URL = typeof window !== 'undefined' ? PROXY_API_URL : DIRECT_API_URL;

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

        const requestInit: RequestInit = {
            ...init,
            headers,
        };

        const sendRequest = async (baseUrl: string) => fetch(`${baseUrl}${endpoint}`, requestInit);

        let res = await sendRequest(API_URL);

        // Vercel's edge proxy may occasionally fail with FUNCTION_INVOCATION_FAILED.
        // In that case, retry once against the API origin directly.
        if (
            typeof window !== 'undefined' &&
            API_URL === PROXY_API_URL &&
            !res.ok &&
            res.status >= 500
        ) {
            const responseText = await res.clone().text();
            if (responseText.includes('FUNCTION_INVOCATION_FAILED')) {
                res = await sendRequest(DIRECT_API_URL);
            }
        }

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
    createImprovement: (data: { suggestion_text: string; name?: string; whatsapp?: string; email?: string }) =>
        fetchAPI<any>('/improvements', { method: 'POST', body: JSON.stringify(data) }),

    // Media
    getSignedUploadParams: () => fetchAPI<any>('/media/sign', { method: 'POST' }),

    // Chat
    chatNearest: (data: { text: string; lat?: number; lng?: number }) =>
        fetchAPI<any>('/chat/nearest', { method: 'POST', body: JSON.stringify(data) }),
    nearestSearch: (
        lat: number,
        lng: number,
        type: 'imam' | 'halqa' | 'maintenance',
        options?: { radiusKm?: number; limit?: number },
    ) => {
        const radiusKm = options?.radiusKm ?? 5;
        const limit = options?.limit ?? 10;
        return fetchAPI<any>(`/search/nearest?lat=${lat}&lng=${lng}&type=${type}&radiusKm=${radiusKm}&limit=${limit}`);
    },
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
    getSettingsByGroup: (token: string, group: 'WHATSAPP' | 'CLOUDINARY' | 'GENERAL') =>
        fetchAPI<any>(`/admin/settings/group/${group}`, { token }),
    upsertSetting: (token: string, data: { key: string; value: string; group: 'WHATSAPP' | 'CLOUDINARY' | 'GENERAL'; isSecret?: boolean }) =>
        fetchAPI<any>('/admin/settings', { method: 'POST', token, body: JSON.stringify(data) }),
    updateSetting: (token: string, key: string, data: { value?: string; group?: 'WHATSAPP' | 'CLOUDINARY' | 'GENERAL'; isSecret?: boolean }) =>
        fetchAPI<any>(`/admin/settings/${encodeURIComponent(key)}`, { method: 'PATCH', token, body: JSON.stringify(data) }),

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
    deleteHalqa: (token: string, id: string) =>
        fetchAPI<any>(`/admin/halaqat/${id}`, { method: 'DELETE', token }),

    // Maintenance admin
    getAdminMaintenance: (token: string, params?: string) =>
        fetchAPI<any>(`/admin/maintenance${params ? `?${params}` : ''}`, { token }),
    approveMaintenance: (token: string, id: string) =>
        fetchAPI<any>(`/admin/maintenance/${id}/approve`, { method: 'PATCH', token }),
    rejectMaintenance: (token: string, id: string, reason?: string) =>
        fetchAPI<any>(`/admin/maintenance/${id}/reject`, { method: 'PATCH', token, body: JSON.stringify({ reason }) }),
    updateMaintenance: (token: string, id: string, data: any) =>
        fetchAPI<any>(`/admin/maintenance/${id}`, { method: 'PATCH', token, body: JSON.stringify(data) }),
    deleteMaintenance: (token: string, id: string) =>
        fetchAPI<any>(`/admin/maintenance/${id}`, { method: 'DELETE', token }),

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
