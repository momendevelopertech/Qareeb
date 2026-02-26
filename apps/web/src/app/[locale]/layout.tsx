import type { Metadata } from 'next';
import { Cairo, Tajawal } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import '../globals.css';
import ToastHost from '@/components/ui/ToastHost';

const cairo = Cairo({
    subsets: ['arabic', 'latin'],
    variable: '--font-cairo',
    display: 'swap',
});

const tajawal = Tajawal({
    subsets: ['arabic', 'latin'],
    weight: ['300', '400', '500', '700', '800'],
    variable: '--font-tajawal',
    display: 'swap',
});

export const metadata: Metadata = {
    title: 'قريب | Qareeb — خدمات دينية قريبة منك',
    description:
        'منصة مجتمعية تربط المسلمين بالأئمة وحلقات تحفيظ القرآن وصيانة المساجد. A community platform connecting Muslims with nearby religious services.',
    keywords: ['قريب', 'Qareeb', 'أئمة', 'حلقات تحفيظ', 'مساجد', 'صيانة', 'imams', 'mosques', 'Quran circles'],
};

export default async function LocaleLayout({
    children,
    params: { locale },
}: {
    children: React.ReactNode;
    params: { locale: string };
}) {
    const messages = await getMessages();

    return (
        <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} className={`${cairo.variable} ${tajawal.variable}`}>
            <body className={locale === 'ar' ? 'font-arabic' : 'font-latin'}>
                <NextIntlClientProvider messages={messages}>
                    {children}
                    <ToastHost />
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
