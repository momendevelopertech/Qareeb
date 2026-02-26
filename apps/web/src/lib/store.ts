import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type EntityKind = 'imam' | 'halqa' | 'maintenance';
type ModalType = 'view' | 'edit' | 'video' | 'images';

type ToastType = 'success' | 'error' | 'info';

interface GeolocationState {
    lat: number | null;
    lng: number | null;
    loading: boolean;
    error: string | null;
    requestLocation: () => void;
}

export const useGeolocationStore = create<GeolocationState>((set) => ({
    lat: null,
    lng: null,
    loading: false,
    error: null,
    requestLocation: () => {
        if (!navigator.geolocation) {
            set({ error: 'Geolocation is not supported' });
            return;
        }
        set({ loading: true, error: null });
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                set({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    loading: false,
                });
            },
            (err) => {
                set({ error: err.message, loading: false });
            },
        );
    },
}));

interface AuthState {
    token: string | null;
    admin: { id: string; email: string; role: string } | null;
    rememberMe: boolean;
    setAuth: (token: string, admin: any, rememberMe?: boolean) => void;
    clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            admin: null,
            rememberMe: true,
            setAuth: (token, admin, rememberMe = true) => set({ token, admin, rememberMe }),
            clearAuth: () => set({ token: null, admin: null, rememberMe: true }),
        }),
        {
            name: 'qareeb-auth',
            storage: createJSONStorage(() => localStorage),
        },
    ),
);

interface ChatMessage {
    from: 'user' | 'bot';
    text: string;
}

interface ChatState {
    isOpen: boolean;
    messages: ChatMessage[];
    toggleChat: () => void;
    addMessage: (from: 'user' | 'bot', text: string) => void;
    clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
    isOpen: false,
    messages: [],
    toggleChat: () => set((state) => ({ isOpen: !state.isOpen })),
    addMessage: (from, text) => set((state) => ({ messages: [...state.messages, { from, text }] })),
    clearMessages: () => set({ messages: [] }),
}));

interface ModalState {
    isOpen: boolean;
    type: ModalType;
    entity: EntityKind | null;
    payload: any;
    openModal: (type: ModalType, entity: EntityKind, payload?: any) => void;
    closeModal: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
    isOpen: false,
    type: 'view',
    entity: null,
    payload: null,
    openModal: (type, entity, payload) => set({ isOpen: true, type, entity, payload: payload ?? null }),
    closeModal: () => set({ isOpen: false, payload: null }),
}));

interface Toast {
    id: string;
    type: ToastType;
    message: string;
}

interface ToastState {
    toasts: Toast[];
    pushToast: (message: string, type?: ToastType) => void;
    removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
    toasts: [],
    pushToast: (message, type = 'info') => {
        const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
        setTimeout(() => {
            set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
        }, 3500);
    },
    removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

interface RealtimeNotification {
    id: string;
    type: string;
    title: string;
    message: string;
    recordId: string;
    createdAt: string;
    read?: boolean;
}

interface NotificationState {
    items: RealtimeNotification[];
    unreadCount: number;
    addNotification: (item: RealtimeNotification) => void;
    markRead: (id: string) => void;
    markAllRead: () => void;
    setNotifications: (items: RealtimeNotification[]) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
    items: [],
    unreadCount: 0,
    addNotification: (item) => set((state) => ({
        items: [item, ...state.items],
        unreadCount: state.unreadCount + 1,
    })),
    markRead: (id) => set((state) => ({
        items: state.items.map((n) => (n.id === id ? { ...n, read: true } : n)),
        unreadCount: Math.max(0, state.unreadCount - 1),
    })),
    markAllRead: () => set((state) => ({
        items: state.items.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
    })),
    setNotifications: (items) => set({
        items,
        unreadCount: items.filter((x) => !x.read).length,
    }),
}));

type RollbackFn = () => void;

interface EntityStore<T> {
    items: T[];
    setItems: (items: T[]) => void;
    optimisticUpdate: (id: string, patch: Partial<T>) => RollbackFn;
    optimisticRemove: (id: string) => RollbackFn;
    optimisticUpsert: (item: T & { id: string }) => RollbackFn;
}

function createEntityStore<T extends { id: string }>() {
    return create<EntityStore<T>>((set, get) => ({
        items: [],
        setItems: (items) => set({ items }),
        optimisticUpdate: (id, patch) => {
            const prev = get().items;
            set({ items: prev.map((item) => (item.id === id ? { ...item, ...patch } : item)) });
            return () => set({ items: prev });
        },
        optimisticRemove: (id) => {
            const prev = get().items;
            set({ items: prev.filter((item) => item.id !== id) });
            return () => set({ items: prev });
        },
        optimisticUpsert: (item) => {
            const prev = get().items;
            const exists = prev.some((x) => x.id === item.id);
            set({ items: exists ? prev.map((x) => (x.id === item.id ? item : x)) : [item, ...prev] });
            return () => set({ items: prev });
        },
    }));
}

export const useImamStore = createEntityStore<any>();
export const useHalqaStore = createEntityStore<any>();
export const useMaintenanceStore = createEntityStore<any>();

