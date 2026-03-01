'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { FaFacebook, FaInstagram, FaWhatsapp, FaXTwitter, FaYoutube } from 'react-icons/fa6';
import { FaLightbulb, FaMosque } from 'react-icons/fa';
import AppModal from '@/components/ui/AppModal';
import EgyptWhatsAppInput from '@/components/form/EgyptWhatsAppInput';
import { api } from '@/lib/api';

const socialLinks = [
    { href: 'https://www.instagram.com/qareeb.platform/', icon: FaInstagram, label: 'Instagram' },
    { href: 'https://x.com/qareeb_platform', icon: FaXTwitter, label: 'X' },
    { href: 'https://wa.me/201551429227', icon: FaWhatsapp, label: 'WhatsApp' },
    { href: 'https://www.youtube.com/@Qareeb-Platform', icon: FaYoutube, label: 'YouTube' },
    { href: 'https://www.facebook.com/', icon: FaFacebook, label: 'Facebook' },
];

export default function Footer() {
    const t = useTranslations('nav');
    const locale = useLocale();
    const isArabic = locale === 'ar';

    const [isOpen, setIsOpen] = useState(false);
    const [isThanksOpen, setIsThanksOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState({ suggestion_text: '', name: '', whatsapp: '' });
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isThanksOpen) return;
        const timer = setTimeout(() => setIsThanksOpen(false), 5000);
        return () => clearTimeout(timer);
    }, [isThanksOpen]);

    const openModal = () => {
        setError('');
        setIsOpen(true);
    };

    const submitSuggestion = async (event: FormEvent) => {
        event.preventDefault();

        if (form.suggestion_text.trim().length < 10) {
            setError(isArabic ? 'يرجى كتابة اقتراح لا يقل عن 10 أحرف' : 'Please write at least 10 characters');
            return;
        }

        try {
            setIsSubmitting(true);
            setError('');

            await api.createImprovement({
                suggestion_text: form.suggestion_text.trim(),
                name: form.name.trim() || undefined,
                whatsapp: form.whatsapp || undefined,
            });

            setForm({ suggestion_text: '', name: '', whatsapp: '' });
            setIsOpen(false);
            setIsThanksOpen(true);
        } catch {
            setError(isArabic ? 'تعذر إرسال الاقتراح، حاول مرة أخرى' : 'Failed to send suggestion, please try again');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <footer className="bg-gray-900 text-gray-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-10 h-10 gradient-bg rounded-xl flex items-center justify-center text-white text-xl">
                                <FaMosque />
                            </div>
                            <span className="text-xl font-bold text-white">{isArabic ? 'قريب' : 'Qareeb'}</span>
                        </div>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            {isArabic ? 'منصة مجتمعية غير ربحية لخدمة المسلمين.' : 'A non-profit community platform.'}
                        </p>
                        <div className="flex items-center gap-3 mt-4">
                            {socialLinks.map(({ href, icon: Icon, label }) => (
                                <a
                                    key={label}
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={label}
                                    className="group relative w-9 h-9 rounded-lg border border-gray-700 flex items-center justify-center text-gray-300 hover:text-white hover:border-primary hover:-translate-y-0.5 transition-all"
                                >
                                    <Icon />
                                    <span className="absolute -top-8 px-2 py-1 rounded bg-black text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                        {label}
                                    </span>
                                </a>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-white font-semibold mb-4">
                            {isArabic ? 'روابط سريعة' : 'Quick Links'}
                        </h3>
                        <div className="flex flex-col gap-2">
                            <Link href={`/${locale}/search`} className="text-gray-400 hover:text-primary transition-colors text-sm">{isArabic ? 'بحث' : 'Search'}</Link>
                            <Link href={`/${locale}/imams`} className="text-gray-400 hover:text-primary transition-colors text-sm">{t('imams')}</Link>
                            <Link href={`/${locale}/halaqat`} className="text-gray-400 hover:text-primary transition-colors text-sm">{t('halaqat')}</Link>
                            <Link href={`/${locale}/maintenance`} className="text-gray-400 hover:text-primary transition-colors text-sm">{t('maintenance')}</Link>
                            <Link href={`/${locale}/about`} className="text-gray-400 hover:text-primary transition-colors text-sm">{isArabic ? 'عن قريب' : 'About'}</Link>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-white font-semibold mb-4">
                            {isArabic ? 'تواصل' : 'Contact'}
                        </h3>
                        <div className="flex flex-col items-start gap-3">
                            <a
                                href="https://wa.me/201551429227"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-primary text-sm !px-4 !py-2 inline-flex"
                            >
                                WhatsApp
                            </a>
                            <button
                                onClick={openModal}
                                className="inline-flex items-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-bold text-accent hover:bg-accent/20 transition-colors"
                            >
                                <FaLightbulb className="text-base" />
                                <span>{isArabic ? 'اقترح تحسين' : 'Suggest improvement'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <AppModal
                isOpen={isOpen}
                type="edit"
                title={isArabic ? 'التحسينات والمقترحات' : 'Improvements & Suggestions'}
                onClose={() => setIsOpen(false)}
            >
                <form
                    onSubmit={submitSuggestion}
                    className={`space-y-4 ${isArabic ? 'font-arabic' : 'font-latin'}`}
                    dir={isArabic ? 'rtl' : 'ltr'}
                >
                    <div>
                        <label className="block mb-1 text-sm font-semibold text-dark">
                            {isArabic ? 'اكتب التحسين المقترح' : 'Write your suggestion'}
                        </label>
                        <textarea
                            rows={5}
                            className="input-field text-dark placeholder:text-slate-400 caret-primary"
                            value={form.suggestion_text}
                            onChange={(e) => setForm((s) => ({ ...s, suggestion_text: e.target.value }))}
                            placeholder={isArabic ? 'شاركنا فكرة التحسين...' : 'Share your improvement idea...'}
                            required
                        />
                    </div>

                    <div>
                        <label className="block mb-1 text-sm font-semibold text-dark">
                            {isArabic ? 'الاسم (اختياري)' : 'Name (optional)'}
                        </label>
                        <input
                            className="input-field text-dark placeholder:text-slate-400 caret-primary"
                            value={form.name}
                            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                            maxLength={120}
                        />
                    </div>

                    <EgyptWhatsAppInput
                        value={form.whatsapp}
                        onChange={(value) => setForm((s) => ({ ...s, whatsapp: value || '' }))}
                        label={isArabic ? 'رقم الواتساب (اختياري)' : 'WhatsApp number (optional)'}
                        required={false}
                        id="improvement-whatsapp"
                    />

                    {error && <p className="text-sm text-red-600">{error}</p>}

                    <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-60">
                        {isSubmitting ? (isArabic ? 'جارٍ الإرسال...' : 'Submitting...') : (isArabic ? 'إرسال' : 'Submit')}
                    </button>
                </form>
            </AppModal>

            <AppModal
                isOpen={isThanksOpen}
                type="view"
                title={isArabic ? 'شكرًا لك' : 'Thank You'}
                onClose={() => setIsThanksOpen(false)}
            >
                <p className={`text-base text-dark ${isArabic ? 'font-arabic' : 'font-latin'}`}>
                    {isArabic
                        ? 'تم استلام اقتراحك بنجاح. شكرًا لمساهمتك في تطوير قريب.'
                        : 'Your suggestion has been received successfully. Thank you for helping improve Qareeb.'}
                </p>
            </AppModal>
        </footer>
    );
}
