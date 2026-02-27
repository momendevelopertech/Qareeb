 'use client';

import { useLocale } from 'next-intl';
import ErrorScreen from '@/components/ErrorScreen';

export default function NotFound() {
    const locale = useLocale();
    // server-side log to help trace why production returned default 404
    // eslint-disable-next-line no-console
    console.log('[not-found] rendering not-found for locale:', locale);
    return <ErrorScreen status={404} locale={locale} />;
}