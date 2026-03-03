import Link from 'next/link';
import AppIcon from '@/components/ui/AppIcon';

export default function SubmitServiceSection({ locale }: { locale: string }) {
    const cards = [
        {
            href: `/${locale}/imams/submit`,
            icon: 'imam',
            title: locale === 'ar' ? 'إضافة إمام' : 'Add Imam',
            desc: locale === 'ar' ? 'أضف بيانات إمام مسجد موثقة' : 'Submit verified imam details',
        },
        {
            href: `/${locale}/halaqat/submit`,
            icon: 'halqa',
            title: locale === 'ar' ? 'إضافة حلقة' : 'Add Halqa',
            desc: locale === 'ar' ? 'أضف حلقة تحفيظ جديدة' : 'Submit a Quran circle',
        },
        {
            href: `/${locale}/maintenance/submit`,
            icon: 'maintenance',
            title: locale === 'ar' ? 'إضافة صيانة' : 'Add Maintenance',
            desc: locale === 'ar' ? 'أضف طلب صيانة لمسجد' : 'Submit a mosque maintenance request',
        },
    ];

    return (
        <section className="py-20 px-4 bg-gradient-to-b from-white to-[#F7FBF8]">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-10">
                    <h2 className="text-3xl md:text-4xl font-black text-dark">
                        {locale === 'ar' ? 'أضف خدمة الآن' : 'Add a Service Now'}
                    </h2>
                    <p className="text-text-muted mt-3">
                        {locale === 'ar' ? 'اختر نوع الإضافة وسيتم فتح الفورم مباشرة' : 'Pick a type and open the form directly'}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {cards.map((card) => (
                        <Link
                            key={card.href}
                            href={card.href}
                            className="bg-white rounded-[28px] p-7 border border-border shadow-card transition-all hover:-translate-y-1.5 hover:shadow-card-hover"
                        >
                            <span className="text-4xl mb-4 block text-primary"><AppIcon name={card.icon} className="w-10 h-10" /></span>
                            <h3 className="text-xl font-black text-dark">{card.title}</h3>
                            <p className="text-sm text-text-muted mt-2">{card.desc}</p>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
