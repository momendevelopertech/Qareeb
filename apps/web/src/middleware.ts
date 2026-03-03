import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { locales, defaultLocale } from './i18n';

const intlMiddleware = createMiddleware({
    locales,
    defaultLocale,
    localePrefix: 'always',
});

const knownTopLevelRoutes = new Set([
    'about',
    'admin',
    'error-test',
    'halaqat',
    'imams',
    'maintenance',
    'search',
    'submit',
]);

export default function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;
    const match = pathname.match(/^\/(ar|en)(?:\/(.*))?$/);

    if (match) {
        const locale = match[1];
        const restPath = match[2] || '';

        if (restPath.length > 0) {
            const firstSegment = restPath.split('/')[0];
            if (!knownTopLevelRoutes.has(firstSegment)) {
                const url = request.nextUrl.clone();
                url.pathname = `/${locale}/error-test`;
                url.searchParams.set('code', '404');
                return NextResponse.rewrite(url);
            }
        }
    }

    return intlMiddleware(request);
}

export const config = {
    matcher: ['/', '/(ar|en)/:path*'],
};
