'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useForm } from 'react-hook-form';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { api } from '@/lib/api';

type FormStep = 'type' | 'info' | 'contact' | 'review';

export default function SubmitPage() {
    const t = useTranslations('submit');
    const ti = useTranslations('imams');
    const th = useTranslations('halaqat');
    const tm = useTranslations('maintenance');
    const locale = useLocale();

    const [step, setStep] = useState<FormStep>('type');
    const [entityType, setEntityType] = useState<'imam' | 'halqa' | 'maintenance' | null>(null);
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm();
    const [governorates, setGovernorates] = useState<any[]>([]);
    const [areas, setAreas] = useState<any[]>([]);

    const selectedGovernorateId = watch('governorateId');
    const selectedGovernorate = useMemo(
        () => governorates.find((g) => g.id === selectedGovernorateId),
        [governorates, selectedGovernorateId],
    );

    useEffect(() => {
        api.getGovernorates().then(setGovernorates).catch(console.error);
    }, []);

    useEffect(() => {
        if (selectedGovernorateId) {
            api.getAreas(selectedGovernorateId).then(setAreas).catch(console.error);
        } else {
            setAreas([]);
        }
        // reset area selection when governorate changes
        setValue('areaId', undefined);
    }, [selectedGovernorateId, setValue]);

    const onSubmit = async (data: any) => {
        setSubmitting(true);
        try {
            const payload = {
                ...data,
                lat: data.lat ? parseFloat(data.lat) : undefined,
                lng: data.lng ? parseFloat(data.lng) : undefined,
            };

            if (entityType === 'imam') {
                await api.createImam({
                    imam_name: payload.name,
                    mosque_name: payload.mosqueName,
                    governorate: payload.governorate,
                    city: payload.city,
                    district: payload.district,
                    area_id: payload.areaId,
                    google_maps_url: payload.googleMapsUrl,
                    video_url: payload.videoUrl,
                    lat: payload.lat,
                    lng: payload.lng,
                    whatsapp: payload.whatsapp,
                    recitation_url: payload.videoUrl,
                });
            } else if (entityType === 'halqa') {
                await api.createHalqa({
                    circle_name: payload.name,
                    mosque_name: payload.mosqueName,
                    halqa_type: payload.halqaType || 'mixed',
                    governorate: payload.governorate,
                    city: payload.city,
                    district: payload.district,
                    area_id: payload.areaId,
                    google_maps_url: payload.googleMapsUrl,
                    video_url: payload.videoUrl,
                    lat: payload.lat,
                    lng: payload.lng,
                    whatsapp: payload.whatsapp,
                    additional_info: payload.additionalInfo,
                });
            } else if (entityType === 'maintenance') {
                await api.createMaintenance({
                    mosque_name: payload.mosqueName,
                    governorate: payload.governorate,
                    city: payload.city,
                    district: payload.district,
                    area_id: payload.areaId,
                    google_maps_url: payload.googleMapsUrl,
                    lat: payload.lat,
                    lng: payload.lng,
                    maintenance_types: payload.maintenanceTypes || ['other'],
                    description: payload.description,
                    estimated_cost_min: parseInt(payload.costMin) || undefined,
                    estimated_cost_max: parseInt(payload.costMax) || undefined,
                    whatsapp: payload.whatsapp,
                });
            }
            setSubmitted(true);
        } catch (err) {
            console.error('Submit error:', err);
        }
        setSubmitting(false);
    };

    if (submitted) {
        return (
            <div className="min-h-screen flex flex-col bg-cream">
                <Header />
                <main className="flex-1 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[40px] p-12 text-center max-w-lg w-full shadow-card border border-border animate-fade-in">
                        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8 relative">
                            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping opacity-25" />
                            <svg className="w-12 h-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-black text-dark mb-4">{t('successTitle')}</h2>
                        <p className="text-text-muted text-lg mb-10 leading-relaxed">{t('successMessage')}</p>
                        <a href={`/${locale}`} className="btn-primary inline-flex items-center gap-2 group px-8">
                            {locale === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
                            <svg className="w-5 h-5 rtl:rotate-180 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </a>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header />
            <main className="flex-1 py-12">
                <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h1 className="text-4xl font-black text-dark mb-3">{t('title')}</h1>
                        <p className="text-text-muted font-medium">{locale === 'ar' ? 'ساهم في بناء مجتمعنا المسلم في مصر' : 'Contribute to building our Muslim community in Egypt'}</p>
                    </div>

                    {/* Step: Select Type */}
                    {step === 'type' && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 animate-fade-in">
                            {[
                                { type: 'imam' as const, label: t('imam'), color: 'hover:border-primary', icon: '🕌', desc: locale === 'ar' ? 'إضافة إمام مسجد' : 'Add Masjid Imam' },
                                { type: 'halqa' as const, label: t('halqa'), color: 'hover:border-primary', icon: '📖', desc: locale === 'ar' ? 'إضافة دار تحفيظ' : 'Add Quran Center' },
                                { type: 'maintenance' as const, label: t('maintenanceReq'), color: 'hover:border-primary', icon: '🏗️', desc: locale === 'ar' ? 'طلب إعمار' : 'Maint. Request' },
                            ].map((item) => (
                                <button
                                    key={item.type}
                                    onClick={() => { setEntityType(item.type); setStep('info'); }}
                                    className={`bg-white rounded-[32px] p-8 text-center border-2 border-transparent shadow-card transition-all hover:-translate-y-2 group ${item.color}`}
                                >
                                    <span className="text-5xl mb-6 block transition-transform group-hover:scale-110">{item.icon}</span>
                                    <span className="font-black text-dark block mb-2">{item.label}</span>
                                    <span className="text-xs text-text-muted font-bold block">{item.desc}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Step: Info Form */}
                    {step === 'info' && entityType && (
                        <form onSubmit={handleSubmit(() => setStep('contact'))} className="bg-white rounded-[40px] p-10 space-y-8 shadow-card border border-border animate-slide-up">
                            <div className="flex items-center justify-between pb-6 border-b border-border">
                                <div className="flex items-center gap-4">
                                    <span className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center text-lg font-black shadow-btn">1</span>
                                    <div>
                                        <h3 className="font-black text-dark text-lg leading-tight">{t('basicInfo')}</h3>
                                        <p className="text-xs text-text-muted font-bold uppercase tracking-widest mt-0.5">{entityType}</p>
                                    </div>
                                </div>
                                <div className="text-xs font-black text-text-muted">{locale === 'ar' ? 'الخطوة الأولى' : 'Step 1'}</div>
                            </div>

                            <div className="space-y-6">
                                {entityType !== 'maintenance' && (
                                    <div className="group">
                                        <label className="block text-sm font-black text-dark mb-2 ms-1 transition-colors group-focus-within:text-primary">
                                            {entityType === 'imam' ? ti('imamName') : th('circleName')} <span className="text-red-500">*</span>
                                        </label>
                                        <input {...register('name', { required: true })} className="block w-full px-5 py-4 bg-cream border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white transition-all outline-none font-bold" placeholder={locale === 'ar' ? 'الاسم كاملاً...' : 'Full name...'} />
                                    </div>
                                )}

                                <div className="group">
                                    <label className="block text-sm font-black text-dark mb-2 ms-1 transition-colors group-focus-within:text-primary">
                                        {entityType === 'imam' ? ti('mosqueName') : entityType === 'halqa' ? th('mosqueName') : tm('mosqueName')} <span className="text-red-500">*</span>
                                    </label>
                                    <input {...register('mosqueName', { required: true })} className="block w-full px-5 py-4 bg-cream border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white transition-all outline-none font-bold" placeholder={locale === 'ar' ? 'اسم المسجد التابع له...' : 'Mosque name...'} />
                                </div>

                                {entityType === 'halqa' && (
                                    <div className="group">
                                        <label className="block text-sm font-black text-dark mb-2 ms-1 transition-colors group-focus-within:text-primary">{th('type')} <span className="text-red-500">*</span></label>
                                        <select {...register('halqaType', { required: true })} className="block w-full px-5 py-4 bg-cream border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white transition-all outline-none font-bold appearance-none cursor-pointer">
                                            <option value="men">{th('men')}</option>
                                            <option value="women">{th('women')}</option>
                                            <option value="children">{th('children')}</option>
                                            <option value="mixed">{th('mixed')}</option>
                                        </select>
                                    </div>
                                )}

                                {entityType === 'maintenance' && (
                                    <>
                                        <div className="group">
                                            <label className="block text-sm font-black text-dark mb-2 ms-1 transition-colors group-focus-within:text-primary">{tm('maintenanceTypes')} <span className="text-red-500">*</span></label>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
                                                {[
                                                    { value: 'Plumbing', label: locale === 'ar' ? 'سباكة' : 'Plumbing', icon: '🚿' },
                                                    { value: 'Electrical', label: locale === 'ar' ? 'كهرباء' : 'Electrical', icon: '💡' },
                                                    { value: 'Carpentry', label: locale === 'ar' ? 'نجارة' : 'Carpentry', icon: '🔨' },
                                                    { value: 'Painting', label: locale === 'ar' ? 'دهان' : 'Painting', icon: '🎨' },
                                                    { value: 'AC_Repair', label: locale === 'ar' ? 'تكييف' : 'AC Repair', icon: '❄️' },
                                                    { value: 'Cleaning', label: locale === 'ar' ? 'تنظيف' : 'Cleaning', icon: '🧹' },
                                                    { value: 'Other', label: locale === 'ar' ? 'أخرى' : 'Other', icon: '📋' },
                                                ].map((type) => (
                                                    <label key={type.value} className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            value={type.value}
                                                            {...register('maintenanceTypes')}
                                                            className="w-5 h-5 rounded border-2 border-gray-300 text-primary focus:ring-primary"
                                                        />
                                                        <span className="text-sm font-bold">{type.icon} {type.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="group">
                                            <label className="block text-sm font-black text-dark mb-2 ms-1 transition-colors group-focus-within:text-primary">{tm('description')} <span className="text-red-500">*</span></label>
                                            <textarea {...register('description', { required: true })} className="block w-full px-5 py-4 bg-cream border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white transition-all outline-none font-bold min-h-[120px]" placeholder={locale === 'ar' ? 'اشرح بالتفصيل حالة المسجد والاحتياجات...' : 'Describe مسجد condition and needs...'} />
                                        </div>
                                    </>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="group">
                                        <label className="block text-sm font-black text-dark mb-2 ms-1 transition-colors group-focus-within:text-primary">
                                            {ti('governorate')} <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            {...register('governorateId', { required: true })}
                                            className="block w-full px-5 py-4 bg-cream border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white transition-all outline-none font-bold"
                                            value={selectedGovernorateId || ''}
                                            onChange={(e) => {
                                                setValue('governorateId', e.target.value);
                                                const gov = governorates.find((g) => g.id === e.target.value);
                                                setValue('governorate', gov?.nameAr || gov?.nameEn || '');
                                            }}
                                        >
                                            <option value="">{locale === 'ar' ? 'اختر المحافظة' : 'Select governorate'}</option>
                                            {governorates.map((g) => (
                                                <option key={g.id} value={g.id}>{locale === 'ar' ? g.nameAr : g.nameEn}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="group">
                                        <label className="block text-sm font-black text-dark mb-2 ms-1 transition-colors group-focus-within:text-primary">{locale === 'ar' ? 'المنطقة' : 'Area'} <span className="text-red-500">*</span></label>
                                        <select
                                            {...register('areaId', { required: true })}
                                            className="block w-full px-5 py-4 bg-cream border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white transition-all outline-none font-bold"
                                            disabled={!selectedGovernorateId}
                                        >
                                            <option value="">{locale === 'ar' ? 'اختر المنطقة' : 'Select area'}</option>
                                            {areas.map((a) => (
                                                <option key={a.id} value={a.id}>{locale === 'ar' ? a.nameAr : a.nameEn}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="group">
                                    <label className="block text-sm font-black text-dark mb-2 ms-1 transition-colors group-focus-within:text-primary">
                                        {locale === 'ar' ? 'رابط خرائط جوجل (إجباري)' : 'Google Maps Link (Required)'}
                                    </label>
                                    <input
                                        {...register('googleMapsUrl', { required: true })}
                                        type="url"
                                        className="block w-full px-5 py-4 bg-cream border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white transition-all outline-none font-bold"
                                        placeholder="https://maps.google.com/...?q=30.0444,31.2357"
                                    />
                                    <span className="text-[10px] text-text-muted mt-2 block ms-1 font-bold">
                                        {locale === 'ar' ? 'سنستخرج الإحداثيات تلقائياً من الرابط' : 'We will extract coordinates automatically from the link'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setStep('type')} className="btn-outline flex-1 rounded-2xl border-2 hover:bg-cream">
                                    {locale === 'ar' ? 'السابق' : 'Previous'}
                                </button>
                                <button type="submit" className="btn-primary flex-1 rounded-2xl group">
                                    {locale === 'ar' ? 'التالي' : 'Next'}
                                    <span className="ms-2 rtl:rotate-180 inline-block transition-transform group-hover:translate-x-1">→</span>
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Step: Contact */}
                    {step === 'contact' && (
                        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-[40px] p-10 space-y-8 shadow-card border border-border animate-slide-up">
                            <div className="flex items-center justify-between pb-6 border-b border-border">
                                <div className="flex items-center gap-4">
                                    <span className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center text-lg font-black shadow-btn">2</span>
                                    <div>
                                        <h3 className="font-black text-dark text-lg leading-tight">{t('contact')}</h3>
                                        <p className="text-xs text-text-muted font-bold uppercase tracking-widest mt-0.5">{locale === 'ar' ? 'التواصل والوسائط' : 'Communication & Media'}</p>
                                    </div>
                                </div>
                                <div className="text-xs font-black text-text-muted">{locale === 'ar' ? 'الخطوة الأخيرة' : 'Final Step'}</div>
                            </div>

                            <div className="space-y-6">
                                <div className="group">
                                    <label className="block text-sm font-black text-dark mb-2 ms-1 transition-colors group-focus-within:text-primary">
                                        {ti('whatsapp')} <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            {...register('whatsapp', { required: true })}
                                            className="block w-full px-5 py-4 bg-cream border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white transition-all outline-none font-bold pe-12"
                                            placeholder="+201..."
                                            dir="ltr"
                                        />
                                        <div className="absolute right-5 top-1/2 -translate-y-1/2 text-2xl">📱</div>
                                    </div>
                                    <span className="text-[10px] text-text-muted mt-2 block ms-1 font-bold">
                                        {locale === 'ar' ? 'تأكد من إضافة كود الدولة (مثال: +20)' : 'Include country code (e.g. +20)'}
                                    </span>
                                </div>

                                {(entityType === 'imam' || entityType === 'halqa') && (
                                    <div className="group">
                                        <label className="block text-sm font-black text-dark mb-2 ms-1 transition-colors group-focus-within:text-primary">
                                            {locale === 'ar' ? 'رابط التلاوة / الفيديو' : 'Recitation / Video URL'}
                                        </label>
                                        <input {...register('videoUrl')} className="block w-full px-5 py-4 bg-cream border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white transition-all outline-none font-bold" dir="ltr" placeholder="https://..." />
                                    </div>
                                )}

                                {entityType === 'halqa' && (
                                    <div className="group">
                                        <label className="block text-sm font-black text-dark mb-2 ms-1 transition-colors group-focus-within:text-primary">{th('additionalInfo')}</label>
                                        <textarea {...register('additionalInfo')} className="block w-full px-5 py-4 bg-cream border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white transition-all outline-none font-bold min-h-[100px]"
                                            placeholder={locale === 'ar' ? 'مواعيد الحلقة، السعة، ملاحظات...' : 'Schedule, capacity, notes...'}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setStep('info')} className="btn-outline flex-1 rounded-2xl border-2 hover:bg-cream">
                                    {locale === 'ar' ? 'السابق' : 'Previous'}
                                </button>
                                <button type="submit" disabled={submitting} className="btn-primary flex-1 rounded-2xl group flex items-center justify-center">
                                    {submitting
                                        ? (locale === 'ar' ? 'جاري الإرسال...' : 'Submitting...')
                                        : (locale === 'ar' ? 'إرسال الطلب' : 'Submit Request')}
                                    {!submitting && <span className="ms-2 rtl:rotate-180 inline-block transition-transform group-hover:translate-y-[-1px]">✨</span>}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
}
