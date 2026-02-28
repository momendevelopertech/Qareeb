'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { FaEye, FaEyeSlash, FaMosque } from 'react-icons/fa';
import { useAuthStore, useThemeStore } from '@/lib/store';
import { adminApi } from '@/lib/api';

export default function AdminLoginPage() {
    const t = useTranslations('admin');
    const locale = useLocale();
    const router = useRouter();
    const { setAuth } = useAuthStore();
    const { theme } = useThemeStore();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(true);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await adminApi.login(email, password, rememberMe);
            setAuth(result.access_token, result.admin, rememberMe);
            router.push(`/${locale}/admin/dashboard`);
        } catch {
            setError(locale === 'ar' ? 'بيانات الدخول غير صحيحة' : 'Invalid credentials');
        }
        setLoading(false);
    };

    const pageClass = theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-gray-100 text-gray-900';
    const cardClass = theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200';

    return (
        <div className={`min-h-screen flex items-center justify-center ${pageClass}`}>
            <div className="w-full max-w-md mx-4">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-fab bg-gradient-to-br from-primary to-primary-light text-white text-2xl">
                        <FaMosque />
                    </div>
                    <h1 className="text-2xl font-black">{locale === 'ar' ? 'قريب - لوحة التحكم' : 'Qareeb Dashboard'}</h1>
                    <p className="opacity-75 mt-1">{t('login')}</p>
                </div>

                <form onSubmit={handleLogin} className={`rounded-2xl border p-8 space-y-6 ${cardClass}`}>
                    {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

                    <div>
                        <label className="block text-sm font-medium mb-2">{t('email')}</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="input-field box-border"
                            placeholder="admin@qareeb.app"
                            dir="ltr"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">{t('password')}</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-field box-border !pe-12"
                                dir="ltr"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((prev) => !prev)}
                                className="absolute inset-y-0 end-0 px-3 text-text-muted hover:text-text"
                                aria-label={showPassword ? (locale === 'ar' ? 'إخفاء كلمة المرور' : 'Hide password') : (locale === 'ar' ? 'إظهار كلمة المرور' : 'Show password')}
                                title={showPassword ? (locale === 'ar' ? 'إخفاء كلمة المرور' : 'Hide password') : (locale === 'ar' ? 'إظهار كلمة المرور' : 'Show password')}
                            >
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                    </div>

                    <label className="flex items-center gap-2 text-sm opacity-80">
                        <input
                            type="checkbox"
                            className="w-4 h-4"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                        />
                        <span>{locale === 'ar' ? 'تذكرني' : 'Remember me'}</span>
                    </label>

                    <button type="submit" disabled={loading} className="btn-primary w-full">
                        {loading ? (locale === 'ar' ? 'جارٍ تسجيل الدخول...' : 'Signing in...') : t('loginBtn')}
                    </button>
                </form>
            </div>
        </div>
    );
}
