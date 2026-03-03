'use client';

import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import AppIcon, { AppIconName } from '@/components/ui/AppIcon';
import { useEffect, useState } from 'react';

interface ErrorScreenProps {
  status: number;
  locale: string;
  reset?: () => void;
}

const errorConfig: Record<number, { bg?: string; orbs: Array<React.CSSProperties>; icon: AppIconName; retry?: boolean }> = {
  0: {
    bg: 'linear-gradient(160deg,#FFF8F0,#FAF8F3)',
    orbs: [
      {
        width: 440,
        height: 440,
        background: 'radial-gradient(circle,rgba(201,150,42,.06),transparent 70%)',
        top: -90,
        left: -90,
      },
    ],
    icon: 'wifi',
    retry: true,
  },
  404: {
    bg: undefined,
    orbs: [
      {
        width: 480,
        height: 480,
        background: 'radial-gradient(circle,rgba(27,107,69,.07),transparent 70%)',
        top: -100,
        right: -100,
      },
      {
        width: 360,
        height: 360,
        background: 'radial-gradient(circle,rgba(201,150,42,.05),transparent 70%)',
        bottom: -80,
        left: -80,
      },
    ],
    icon: 'search',
  },
  429: {
    bg: 'linear-gradient(160deg,#FFF8E1,#FAF8F3)',
    orbs: [
      {
        width: 440,
        height: 440,
        background: 'radial-gradient(circle,rgba(201,150,42,.06),transparent 70%)',
        top: -90,
        left: -90,
      },
    ],
    icon: 'clock',
    retry: true,
  },
  500: {
    bg: 'linear-gradient(160deg,#FFF5F5,#FAF8F3)',
    orbs: [
      {
        width: 440,
        height: 440,
        background: 'radial-gradient(circle,rgba(192,57,43,.06),transparent 70%)',
        top: -90,
        left: -90,
      },
    ],
    icon: 'alert',
    retry: true,
  },
  401: {
    bg: 'linear-gradient(160deg,#EEF2FF,#FAF8F3)',
    orbs: [
      {
        width: 420,
        height: 420,
        background: 'radial-gradient(circle,rgba(57,73,171,.07),transparent 70%)',
        bottom: -80,
        right: -80,
      },
    ],
    icon: 'key',
  },
  403: {
    bg: 'linear-gradient(160deg,#FFF8E7,#FAF8F3)',
    orbs: [
      {
        width: 420,
        height: 420,
        background: 'radial-gradient(circle,rgba(201,150,42,.07),transparent 70%)',
        top: -80,
        right: -80,
      },
    ],
    icon: 'lock',
  },
  408: {
    bg: 'linear-gradient(160deg,#E0F2F1,#FAF8F3)',
    orbs: [
      {
        width: 440,
        height: 440,
        background: 'radial-gradient(circle,rgba(0,121,107,.07),transparent 70%)',
        bottom: -90,
        left: -90,
      },
    ],
    icon: 'wifi',
    retry: true,
  },
  503: {
    bg: 'linear-gradient(160deg,#F0F4FF,#FAF8F3)',
    orbs: [
      {
        width: 440,
        height: 440,
        background: 'radial-gradient(circle,rgba(27,107,69,.06),transparent 70%)',
        bottom: -90,
        right: -90,
      },
      {
        width: 360,
        height: 360,
        background: 'radial-gradient(circle,rgba(192,57,43,.05),transparent 70%)',
        top: 120,
        left: -80,
      },
    ],
    icon: 'tool',
    retry: true,
  },
};

const textConfig: Record<
  number,
  {
    tagAr: string;
    tagEn: string;
    titleAr: string;
    titleEn: string;
    subAr: string;
    subEn: string;
  }
> = {
  404: {
    tagAr: 'الصفحة غير موجودة',
    tagEn: 'Page not found',
    titleAr: 'يبدو أن هذه الصفحة<br/>غير موجودة!',
    titleEn: 'Looks like this page<br/>is not on our map!',
    subAr:
      'الصفحة التي تبحث عنها غير موجودة أو تم نقلها. يمكنك العودة للرئيسية أو البحث من جديد.',
    subEn:
      'The page you are looking for does not exist or was moved. You can go back home or search again.',
  },
  500: {
    tagAr: 'خطأ في الخادم',
    tagEn: 'Server error',
    titleAr: 'حدث خطأ من جهتنا<br/>نعتذر منك!',
    titleEn: 'Something went wrong<br/>on our side. Sorry!',
    subAr:
      'حصل خطأ غير متوقع في الخادم. فريقنا يعمل على حل المشكلة حالياً.',
    subEn:
      'An unexpected error occurred on the server. Our team is working on a fix.',
  },
  401: {
    tagAr: 'غير مصرح',
    tagEn: 'Unauthorized',
    titleAr: 'مطلوب تسجيل الدخول<br/>أولاً',
    titleEn: 'You need to<br/>sign in first',
    subAr:
      'هذه الصفحة تتطلب تسجيل الدخول. يرجى تسجيل الدخول ثم المحاولة مرة أخرى.',
    subEn:
      'This page requires authentication. Please sign in and try again.',
  },
  403: {
    tagAr: 'الدخول مرفوض',
    tagEn: 'Forbidden',
    titleAr: 'ليس لديك صلاحية<br/>لهذه الصفحة',
    titleEn: 'You are not allowed<br/>to access this page',
    subAr:
      'لا تملك صلاحية الوصول لهذه الصفحة. إذا كنت ترى أن هذا خطأ تواصل مع الإدارة.',
    subEn:
      'You do not have permission to access this page. Contact admin if this is unexpected.',
  },
  408: {
    tagAr: 'انتهى وقت الطلب',
    tagEn: 'Request timeout',
    titleAr: 'الطلب استغرق وقتًا<br/>أطول من المتوقع',
    titleEn: 'The request took<br/>too long to respond',
    subAr:
      'قد يكون هناك بطء في الشبكة أو ضغط مؤقت على الخادم. حاول مرة أخرى.',
    subEn:
      'There may be a network delay or temporary server load. Please try again.',
  },
  429: {
    tagAr: 'طلبات كثيرة',
    tagEn: 'Too many requests',
    titleAr: 'تم إرسال طلبات كثيرة<br/>يرجى الانتظار',
    titleEn: 'Too many requests<br/>please wait a bit',
    subAr:
      'لقد أرسلت عددًا كبيرًا من الطلبات في وقت قصير. انتظر قليلاً ثم أعد المحاولة.',
    subEn:
      'You sent too many requests in a short time. Wait a little and try again.',
  },
  503: {
    tagAr: 'الخدمة غير متاحة',
    tagEn: 'Service unavailable',
    titleAr: 'النظام تحت الصيانة<br/>وسنعود قريبًا',
    titleEn: 'The service is under<br/>maintenance',
    subAr:
      'نجري تحديثات لتحسين الأداء. شكرًا لصبرك.',
    subEn:
      'We are applying updates to improve performance. Thanks for your patience.',
  },
  0: {
    tagAr: 'مشكلة اتصال',
    tagEn: 'Connection issue',
    titleAr: 'يبدو أن اتصال الإنترنت<br/>غير مستقر',
    titleEn: 'Your internet connection<br/>looks unstable',
    subAr:
      'تأكد من اتصالك بالشبكة ثم حاول مرة أخرى.',
    subEn:
      'Please check your network connection and try again.',
  },
};

export default function ErrorScreen({ status, locale, reset }: ErrorScreenProps) {
  const isAr = locale === 'ar';
  const info = (errorConfig as any)[status] || errorConfig[500];
  const textInfo = textConfig[status] || textConfig[500];

  const tag = isAr ? textInfo.tagAr : textInfo.tagEn;
  const title = isAr ? textInfo.titleAr : textInfo.titleEn;
  const sub = isAr ? textInfo.subAr : textInfo.subEn;

  const [cooldown, setCooldown] = useState(status === 429 ? 60 : 0);

  useEffect(() => {
    if (status !== 429) return;
    setCooldown(60);
    let current = 60;
    const id = setInterval(() => {
      current -= 1;
      setCooldown(current);
      if (current <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [status]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center">
        <div className="error-page active" id={`e${status}`} style={info.bg ? { background: info.bg } : undefined}>
          <div className="bg-grid"></div>
          {info.orbs.map((style: React.CSSProperties, i: number) => (
            <div key={i} className="orb" style={style}></div>
          ))}
          <div className="error-card">
            <div className="error-code-wrap">
              <div className="error-code">{status}</div>
              <div className="error-icon-badge">
                <AppIcon name={info.icon} className="w-7 h-7" />
              </div>
            </div>
            <div className="error-tag">{tag}</div>
            <div className="error-title" dangerouslySetInnerHTML={{ __html: title }} />
            <div className="error-sub">{sub}</div>

            {status === 429 && (
              <div className="countdown-wrap">
                <div className="countdown-num">{cooldown > 0 ? cooldown : 0}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#7B1FA2' }}>{isAr ? 'ثانية' : 'seconds'}</div>
                  <div className="countdown-lbl">{isAr ? 'ثم يمكنك المحاولة مجددًا' : 'until you can try again'}</div>
                </div>
              </div>
            )}

            {status === 503 && (
              <div className="status-list">
                <div className="status-row"><div className="status-dot ok" /><div className="status-name">{isAr ? 'قاعدة البيانات' : 'Database'}</div><div className="status-val ok">{isAr ? 'تعمل' : 'Operational'}</div></div>
                <div className="status-row"><div className="status-dot warn" /><div className="status-name">{isAr ? 'الخادم الرئيسي' : 'Main server'}</div><div className="status-val warn">{isAr ? 'تحديث' : 'Updating'}</div></div>
                <div className="status-row"><div className="status-dot err" /><div className="status-name">{isAr ? 'واجهة المستخدم' : 'Frontend'}</div><div className="status-val err">{isAr ? 'صيانة' : 'Maintenance'}</div></div>
                <div className="status-row"><div className="status-dot ok" /><div className="status-name">{isAr ? 'نظام الواتساب' : 'WhatsApp system'}</div><div className="status-val ok">{isAr ? 'تعمل' : 'Operational'}</div></div>
              </div>
            )}

            <div className="error-btns">
              {info.retry && reset && (
                <button onClick={() => reset()} className="btn-primary flex items-center justify-center gap-2" disabled={status === 429 && cooldown > 0}>
                  <AppIcon name="clock" className="w-4 h-4" />
                  {isAr ? 'إعادة المحاولة' : 'Retry'}
                </button>
              )}
              <Link href={`/${locale}`} className="btn-outline flex items-center justify-center gap-2">
                <AppIcon name="mosque" className="w-4 h-4" />
                {isAr ? 'الرئيسية' : 'Home'}
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
