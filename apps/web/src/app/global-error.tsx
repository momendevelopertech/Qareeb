'use client';

import AppIcon from '@/components/ui/AppIcon';

type GlobalErrorProps = {
  error: Error;
  reset: () => void;
};

export default function GlobalError({ reset }: GlobalErrorProps) {
  const locale =
    typeof window !== 'undefined'
      ? (window.location.pathname.split('/')[1] || 'ar')
      : 'ar';

  const isAr = locale === 'ar';

  return (
    <html lang={locale} dir={isAr ? 'rtl' : 'ltr'}>
      <body className="min-h-screen bg-gradient-to-br from-[#FFF5F5] via-[#FAF8F3] to-[#FFF9F0] flex items-center justify-center">
        <div className="max-w-md mx-auto bg-white/90 backdrop-blur rounded-3xl shadow-2xl border border-red-100 p-8 text-center space-y-4">
          <div className="text-5xl mb-2 flex justify-center text-red-600">
            <AppIcon name="alert" className="w-12 h-12" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-black text-red-700">
            {isAr ? 'حدث خطأ غير متوقع' : 'Something went wrong'}
          </h1>
          <p className="text-sm text-gray-600">
            {isAr
              ? 'حدثت مشكلة أثناء تحميل الصفحة. جرّب تحديث الصفحة أو الرجوع للرئيسية.'
              : 'An unexpected error occurred while rendering this page. Try refreshing or going back home.'}
          </p>
          <div className="flex flex-wrap gap-3 justify-center pt-2">
            <button
              type="button"
              onClick={() => reset()}
              className="px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold shadow-md hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <AppIcon name="clock" className="w-4 h-4" />
              {isAr ? 'إعادة المحاولة' : 'Try again'}
            </button>
            <a
              href={`/${locale}`}
              className="px-5 py-2.5 rounded-xl border border-red-200 text-sm font-bold text-red-700 hover:bg-red-50 transition-colors flex items-center gap-2"
            >
              <AppIcon name="mosque" className="w-4 h-4" />
              {isAr ? 'العودة للرئيسية' : 'Back home'}
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
