'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useForm } from 'react-hook-form';
import { usePathname } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { api } from '@/lib/api';
import PhoneInputField from '@/components/form/PhoneInputField';

type FormStep = 'type' | 'info' | 'contact' | 'review';

export default function SubmitPage() {
    const t = useTranslations('submit');
    const ti = useTranslations('imams');
    const th = useTranslations('halaqat');
    const tm = useTranslations('maintenance');
    const locale = useLocale();
    const pathname = usePathname();

    const [step, setStep] = useState<FormStep>('info');
    const [entityType, setEntityType] = useState<'imam' | 'halqa' | 'maintenance' | null>('imam');
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [mediaUploads, setMediaUploads] = useState<Array<{ publicId: string; secureUrl: string }>>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [draggingImage, setDraggingImage] = useState(false);
    const { register, handleSubmit, watch, setValue } = useForm();
    const [governorates, setGovernorates] = useState<any[]>([]);
    const [areas, setAreas] = useState<any[]>([]);

    const selectedGovernorateId = watch('governorateId');
    const isOnline = watch('isOnline');
    const entityTitle = entityType === 'imam'
        ? (locale === 'ar' ? 'إضافة إمام' : 'Add Imam')
        : entityType === 'halqa'
            ? (locale === 'ar' ? 'إضافة حلقة' : 'Add Halqa')
            : (locale === 'ar' ? 'إضافة صيانة' : 'Add Maintenance');

    useEffect(() => {
        if (pathname.includes('/halaqat/submit')) {
            setEntityType('halqa');
            setStep('info');
            return;
        }
        if (pathname.includes('/maintenance/submit')) {
            setEntityType('maintenance');
            setStep('info');
            return;
        }
        setEntityType('imam');
        setStep('info');
    }, [pathname]);

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
            const toNum = (value: unknown) => {
                if (value === '' || value === null || value === undefined) return undefined;
                const parsed = Number(value);
                return Number.isFinite(parsed) ? parsed : undefined;
            };
            const payload = {
                ...data,
                lat: toNum(data.lat),
                lng: toNum(data.lng),
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
                    mosque_name: payload.isOnline ? undefined : payload.mosqueName,
                    halqa_type: payload.halqaType || 'children',
                    governorate: payload.isOnline ? undefined : payload.governorate,
                    city: payload.isOnline ? undefined : payload.city,
                    district: payload.isOnline ? undefined : payload.district,
                    area_id: payload.isOnline ? undefined : payload.areaId,
                    google_maps_url: payload.isOnline ? undefined : payload.googleMapsUrl,
                    is_online: !!payload.isOnline,
                    lat: payload.isOnline ? undefined : payload.lat,
                    lng: payload.isOnline ? undefined : payload.lng,
                    whatsapp: payload.whatsapp,
                    additional_info: payload.additionalInfo,
                });
            } else if (entityType === 'maintenance') {
                if (mediaUploads.length > 1) {
                    setUploadError(locale === 'ar' ? 'يسمح برفع صورة واحدة فقط.' : 'Only one image is allowed.');
                    setSubmitting(false);
                    return;
                }
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
                    media_uploads: mediaUploads,
                });
            }
            setSubmitted(true);
        } catch (err) {
            console.error('Submit error:', err);
        }
        setSubmitting(false);
    };

    const uploadMaintenanceImages = async (files: File[]) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!files.length) return;

        if (files.length > 1) {
            setUploadError(locale === 'ar' ? 'يسمح برفع صورة واحدة فقط.' : 'Only one image is allowed.');
            return;
        }

        if (mediaUploads.length >= 1) {
            setUploadError(locale === 'ar' ? 'تم رفع صورة بالفعل. احذفها أولاً إن أردت الاستبدال.' : 'An image is already uploaded. Remove it first to replace.');
            return;
        }

        const [file] = files;
        if (!allowed.includes(file.type) || file.size > 2 * 1024 * 1024) {
            setUploadError(locale === 'ar' ? 'الملف غير مدعوم أو حجمه أكبر من 2MB.' : 'Unsupported file type or file is larger than 2MB.');
            return;
        }

        setUploadError('');
        setUploadingImage(true);
        try {
            const sign = await api.getSignedUploadParams();
            const formData = new FormData();
            formData.append('file', file);
            formData.append('api_key', sign.api_key);
            formData.append('timestamp', String(sign.timestamp));
            formData.append('signature', sign.signature);
            formData.append('folder', sign.folder);
            formData.append('allowed_formats', sign.allowed_formats);

            const res = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloud_name}/image/upload`, {
                method: 'POST',
                body: formData,
            });
            const payload = await res.json();
            if (res.ok) {
                setMediaUploads([{ publicId: payload.public_id, secureUrl: payload.secure_url }]);
                setImagePreviews([payload.secure_url]);
                return;
            }
            setUploadError(locale === 'ar' ? 'تعذر رفع الصورة. حاول مرة أخرى.' : 'Image upload failed. Please try again.');
        } finally {
            setUploadingImage(false);
        }
    };


    const removeMaintenanceImage = (index: number) => {
        setImagePreviews((prev) => prev.filter((_, idx) => idx !== index));
        setMediaUploads((prev) => prev.filter((_, idx) => idx !== index));
        setUploadError('');
    };

    const renderMaintenanceUploader = () => (
        <div className="group">
            <label className="block text-sm font-black text-dark mb-2 ms-1">
                {locale === 'ar' ? 'صورة الصيانة (صورة واحدة فقط)' : 'Maintenance image (single image only)'}
            </label>
            <div
                onDragOver={(e) => {
                    e.preventDefault();
                    setDraggingImage(true);
                }}
                onDragLeave={(e) => {
                    e.preventDefault();
                    setDraggingImage(false);
                }}
                onDrop={(e) => {
                    e.preventDefault();
                    setDraggingImage(false);
                    const files = Array.from(e.dataTransfer.files || []);
                    if (files.length) void uploadMaintenanceImages(files);
                }}
                className={`relative rounded-2xl border-2 border-dashed p-5 transition ${draggingImage ? 'border-primary bg-primary/5' : 'border-border bg-cream/60'}`}
            >
                <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length) void uploadMaintenanceImages(files);
                        e.currentTarget.value = '';
                    }}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
                <div className="pointer-events-none text-center">
                    <p className="text-sm font-black text-dark">{locale === 'ar' ? 'اسحب الصورة هنا أو اضغط للاختيار' : 'Drag & drop image here or click to browse'}</p>
                    <p className="text-xs text-text-muted mt-1">{locale === 'ar' ? 'JPG/PNG/WEBP بحد أقصى 2MB' : 'JPG/PNG/WEBP up to 2MB'}</p>
                </div>
            </div>
            {uploadingImage && <p className="text-xs text-primary mt-1">{locale === 'ar' ? 'جاري الرفع...' : 'Uploading...'}</p>}
            {uploadError && <p className="text-xs text-red-600 mt-1">{uploadError}</p>}
            {!!imagePreviews.length && (
                <div className="mt-3 max-w-xs">
                    {imagePreviews.map((url, i) => (
                        <div key={url} className="relative">
                            <img src={url} alt={`preview-${i}`} className="w-full h-28 object-cover rounded-lg border" />
                            <button
                                type="button"
                                onClick={() => removeMaintenanceImage(i)}
                                className="absolute top-2 end-2 bg-black/60 text-white rounded-full w-7 h-7 text-sm"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

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

                    {/* Step: Info Form */}
                    {step === 'info' && entityType && (
                        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-[40px] p-10 space-y-8 shadow-card border border-border animate-slide-up">
                            <div className="flex items-center justify-between pb-6 border-b border-border">
                                <div className="flex items-center gap-4">
                                    <span className="px-4 py-2 bg-primary text-white rounded-2xl text-sm font-black shadow-btn whitespace-nowrap">
                                        {entityTitle}
                                    </span>
                                    <div>
                                        <h3 className="font-black text-dark text-lg leading-tight">{t('basicInfo')}</h3>
                                        <p className="text-xs text-text-muted font-bold uppercase tracking-widest mt-0.5">{entityType}</p>
                                    </div>
                                </div>
                                {entityType === 'halqa' && (
                                    <label className="inline-flex items-center gap-3 rounded-2xl border border-primary/25 bg-primary/5 px-4 py-2 cursor-pointer select-none hover:bg-primary/10 transition" dir="ltr">
                                        <input type="checkbox" {...register('isOnline')} className="peer sr-only" />
                                        <span className="relative w-11 h-6 bg-gray-300 rounded-full transition-colors duration-300 peer-checked:bg-primary">
                                            <span className="absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full shadow transition-transform duration-300 ease-out peer-checked:translate-x-5" />
                                        </span>
                                        <span className="text-sm font-black text-primary">{locale === 'ar' ? 'حلقة أونلاين' : 'Online Halqa'}</span>
                                    </label>
                                )}
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

                                {!(entityType === 'halqa' && isOnline) && (
                                    <div className="group">
                                        <label className="block text-sm font-black text-dark mb-2 ms-1 transition-colors group-focus-within:text-primary">
                                            {entityType === 'imam' ? ti('mosqueName') : entityType === 'halqa' ? th('mosqueName') : tm('mosqueName')} <span className="text-red-500">*</span>
                                        </label>
                                        <input {...register('mosqueName', { required: entityType !== 'halqa' || !isOnline })} className="block w-full px-5 py-4 bg-cream border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white transition-all outline-none font-bold" placeholder={locale === 'ar' ? 'اسم المسجد التابع له...' : 'Mosque name...'} />
                                    </div>
                                )}

                                {entityType === 'halqa' && (
                                    <div className="group">
                                        <label className="block text-sm font-black text-dark mb-2 ms-1 transition-colors group-focus-within:text-primary">{th('type')} <span className="text-red-500">*</span></label>
                                        <select {...register('halqaType', { required: true })} className="block w-full px-5 py-4 bg-cream border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white transition-all outline-none font-bold appearance-none cursor-pointer">
                                            <option value="men">{th('men')}</option>
                                            <option value="women">{th('women')}</option>
                                            <option value="children">{th('children')}</option>
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

                                {!(entityType === 'halqa' && isOnline) && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="group">
                                        <label className="block text-sm font-black text-dark mb-2 ms-1 transition-colors group-focus-within:text-primary">
                                            {ti('governorate')} <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            {...register('governorateId', { required: entityType !== 'halqa' || !isOnline })}
                                            className="block w-full px-5 py-4 bg-cream border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white transition-all outline-none font-bold"
                                            value={selectedGovernorateId || ''}
                                            onChange={(e) => {
                                                setValue('governorateId', e.target.value);
                                                const gov = governorates.find((g) => g.id === e.target.value);
                                                setValue('governorate', gov?.nameAr || gov?.nameEn || '');
                                                setValue('city', '');
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
                                            {...register('areaId', { required: entityType !== 'halqa' || !isOnline })}
                                            className="block w-full px-5 py-4 bg-cream border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white transition-all outline-none font-bold"
                                            disabled={!selectedGovernorateId}
                                            onChange={(e) => {
                                                setValue('areaId', e.target.value);
                                                const area = areas.find((a) => a.id === e.target.value);
                                                setValue('city', area?.nameAr || area?.nameEn || '');
                                            }}
                                        >
                                            <option value="">{locale === 'ar' ? 'اختر المنطقة' : 'Select area'}</option>
                                            {areas.map((a) => (
                                                <option key={a.id} value={a.id}>{locale === 'ar' ? a.nameAr : a.nameEn}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                )}

                                {!(entityType === 'halqa' && isOnline) && (
                                <div className="group">
                                    <label className="block text-sm font-black text-dark mb-2 ms-1 transition-colors group-focus-within:text-primary">
                                        {locale === 'ar' ? 'رابط خرائط جوجل' : 'Google Maps Link'}
                                    </label>
                                    <input
                                        {...register('googleMapsUrl', { required: entityType !== 'halqa' || !isOnline })}
                                        type="url"
                                        className="block w-full px-5 py-4 bg-cream border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white transition-all outline-none font-bold"
                                        placeholder="https://maps.google.com/...?q=30.0444,31.2357"
                                    />
                                    <span className="text-[10px] text-text-muted mt-2 block ms-1 font-bold">
                                        {locale === 'ar' ? 'سنستخرج الإحداثيات تلقائياً من الرابط' : 'We will extract coordinates automatically from the link'}
                                    </span>
                                </div>
                                )}
                            </div>

                            <div className="space-y-6 pt-2 border-t border-border">
                                <PhoneInputField
                                    label={ti('whatsapp')}
                                    required
                                    value={watch('whatsapp')}
                                    onChange={(next) => setValue('whatsapp', next || '')}
                                />

                                {entityType === 'imam' && (
                                    <div className="group">
                                        <label className="block text-sm font-black text-dark mb-2 ms-1 transition-colors group-focus-within:text-primary">
                                            {locale === 'ar' ? 'رابط التلاوة / الفيديو' : 'Recitation / Video URL'}
                                        </label>
                                        <input {...register('videoUrl')} className="block w-full px-5 py-4 bg-cream border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white transition-all outline-none font-bold" dir="ltr" placeholder="https://..." />
                                    </div>
                                )}

                                {entityType === 'maintenance' && renderMaintenanceUploader()}

                                {entityType === 'halqa' && (
                                    <div className="group">
                                        <label className="block text-sm font-black text-dark mb-2 ms-1 transition-colors group-focus-within:text-primary">{th('additionalInfo')}</label>
                                        <textarea {...register('additionalInfo')} className="block w-full px-5 py-4 bg-cream border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white transition-all outline-none font-bold min-h-[100px]"
                                            placeholder={locale === 'ar' ? 'مواعيد الحلقة، السعة، ملاحظات...' : 'Schedule, capacity, notes...'}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="pt-4">
                                <button type="submit" disabled={submitting} className="btn-primary w-full rounded-2xl group flex items-center justify-center">
                                    {submitting
                                        ? (locale === 'ar' ? 'جاري الإرسال...' : 'Submitting...')
                                        : (locale === 'ar' ? 'إرسال الطلب' : 'Submit Request')}
                                    {!submitting && <span className="ms-2 rtl:rotate-180 inline-block transition-transform group-hover:translate-y-[-1px]">✨</span>}
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
                                <PhoneInputField
                                    label={ti('whatsapp')}
                                    required
                                    value={watch('whatsapp')}
                                    onChange={(next) => setValue('whatsapp', next || '')}
                                />

                                {entityType === 'imam' && (
                                    <div className="group">
                                        <label className="block text-sm font-black text-dark mb-2 ms-1 transition-colors group-focus-within:text-primary">
                                            {locale === 'ar' ? 'رابط التلاوة / الفيديو' : 'Recitation / Video URL'}
                                        </label>
                                        <input {...register('videoUrl')} className="block w-full px-5 py-4 bg-cream border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white transition-all outline-none font-bold" dir="ltr" placeholder="https://..." />
                                    </div>
                                )}

                                {entityType === 'maintenance' && renderMaintenanceUploader()}

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

