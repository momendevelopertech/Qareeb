import { getLocale } from 'next-intl/server';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import FAB from '@/components/ui/FAB';
import ChatWidget from '@/components/chat/ChatWidget';

export const metadata = {
    title: 'About | Qareeb',
    description: 'Learn about Qareeb - A non-profit platform serving Muslims in Egypt',
};

export default async function AboutPage() {
    const locale = await getLocale();
    const isAr = locale === 'ar';

    const features = [
        {
            icon: '🎯',
            titleAr: 'رؤيتنا',
            titleEn: 'Our Vision',
            descAr: 'منصة إلكترونية غير ربحية تهدف إلى ربط المسلمين بالخدمات الدينية القريبة منهم جغرافياً في جميع أنحاء مصر — من الإسكندرية إلى أسوان.',
            descEn: 'A non-profit digital platform aimed at connecting Muslims with religious services near them geographically across all of Egypt — from Alexandria to Aswan.',
        },
        {
            icon: '🚀',
            titleAr: 'مهمتنا',
            titleEn: 'Our Mission',
            descAr: 'نؤمن أن كل مسلم في مصر يستحق أن يجد بسهولة مسجداً يصلي فيه، وإماماً يتعلم منه، وحلقة لتحفيظ أولاده — بضغطة واحدة.',
            descEn: 'We believe every Muslim in Egypt deserves to easily find a mosque to pray in, an imam to learn from, and a Quran circle for their children — with just one click.',
        },
        {
            icon: '🤝',
            titleAr: 'كيف تعمل المنصة',
            titleEn: 'How We Work',
            descAr: 'المنصة تعتمد على مجتمع المستخدمين لإضافة المعلومات. كل إضافة تمر بمراجعة من فريق إداري متخصص قبل النشر للحفاظ على جودة المحتوى ودقته.',
            descEn: 'The platform relies on our community to add information. Every submission goes through review by our specialized admin team before publishing to ensure content quality and accuracy.',
        },
        {
            icon: '💡',
            titleAr: 'قيمنا',
            titleEn: 'Our Values',
            descAr: 'الشفافية — المجانية — خدمة المجتمع — الدقة في المعلومات — الخصوصية وعدم التعامل بأي بيانات مالية.',
            descEn: 'Transparency — Free access — Community service — Information accuracy — Privacy and no financial data sharing.',
        },
    ];

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="flex-1">
                {/* Hero Section */}
                <section className="bg-gradient-to-br from-[#F0F9F4] via-[#FAF8F3] to-[#FFF9F0] py-16 md:py-20">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="inline-block bg-primary/10 text-primary px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider mb-6">
                            {isAr ? 'عن المنصة' : 'About the Platform'}
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-dark mb-6">
                            {isAr ? 'قريب — دليل المسلمين في مصر 🇪🇬' : 'Qareeb — Guide for Muslims in Egypt 🇪🇬'}
                        </h1>
                        <p className="text-lg text-text-muted leading-relaxed">
                            {isAr
                                ? 'منصة مجتمعية غير ربحية تربط المسلمين بالخدمات الدينية القريبة منهم، من الإسكندرية إلى أسوان.'
                                : 'A non-profit community platform connecting Muslims with nearby religious services across Egypt.'}
                        </p>
                    </div>
                </section>

                {/* Features Section */}
                <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                    <div className="space-y-8">
                        {features.map((feature, idx) => (
                            <div
                                key={idx}
                                className="flex gap-6 md:gap-8 items-start bg-white rounded-[24px] p-6 md:p-8 border border-border shadow-card hover:-translate-y-1 transition-all duration-300"
                            >
                                <div className="text-5xl md:text-6xl flex-shrink-0">{feature.icon}</div>
                                <div className="flex-1">
                                    <h2 className="text-2xl md:text-3xl font-black text-dark mb-3">
                                        {isAr ? feature.titleAr : feature.titleEn}
                                    </h2>
                                    <p className="text-base md:text-lg text-text-muted leading-relaxed">
                                        {isAr ? feature.descAr : feature.descEn}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* CTA Section */}
                <section className="bg-gradient-to-r from-[#1B6B45] to-[#1B4D35] py-16 px-4 text-center text-white">
                    <div className="max-w-2xl mx-auto">
                        <h2 className="text-3xl md:text-4xl font-black mb-6">
                            {isAr ? 'هل أنت مستعد للبدء؟' : 'Ready to Get Started?'}
                        </h2>
                        <p className="text-lg text-white/90 mb-10 leading-relaxed">
                            {isAr
                                ? 'ابدأ البحث الآن واكتشف الخدمات الدينية القريبة منك، أو ساهم بإضافة خدمة جديدة'
                                : 'Start searching now and discover religious services near you, or contribute by adding a new service'}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link
                                href={`/${locale}/search`}
                                className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-accent text-white rounded-xl font-bold shadow-lg hover:bg-accent-dark hover:-translate-y-1 transition-all"
                            >
                                {isAr ? '🔍 ابحث الآن' : '🔍 Search Now'}
                            </Link>
                            <Link
                                href={`/${locale}/imams/submit`}
                                className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-white text-primary rounded-xl font-bold shadow-lg hover:bg-gray-50 hover:-translate-y-1 transition-all"
                            >
                                {isAr ? '➕ أضف خدمة' : '➕ Add Service'}
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
            <FAB />
            <ChatWidget />
        </div>
    );
}
