'use client';

import { useState, useRef, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useChatStore, useGeolocationStore } from '@/lib/store';
import { api } from '@/lib/api';

interface Intent {
    keywords: string[];
    action: string;
    url?: string;
}

const intents: Intent[] = [
    { keywords: ['إمام', 'imam', 'مسجد', 'mosque', 'أئمة'], action: 'findImam', url: '/imams' },
    { keywords: ['أطفال', 'children', 'تحفيظ', 'حلقة', 'quran', 'circle', 'halqa'], action: 'findHalqa', url: '/halaqat' },
    { keywords: ['صيانة', 'maintenance', 'إعمار', 'repair'], action: 'findMaintenance', url: '/maintenance' },
    { keywords: ['إضافة', 'add', 'submit', 'جديد', 'new'], action: 'addNew', url: '/imams/submit' },
    { keywords: ['الرياض', 'riyadh'], action: 'governorate', url: '/imams?governorate=الرياض' },
    { keywords: ['جدة', 'jeddah', 'jedd'], action: 'governorate', url: '/imams?governorate=جدة' },
    { keywords: ['الدمام', 'dammam'], action: 'governorate', url: '/imams?governorate=الدمام' },
    { keywords: ['مساعدة', 'help', 'مساعده'], action: 'help' },
];

function matchIntent(input: string): Intent | null {
    const lower = input.toLowerCase().trim();
    for (const intent of intents) {
        for (const keyword of intent.keywords) {
            if (lower.includes(keyword.toLowerCase())) {
                return intent;
            }
        }
    }
    return null;
}

export default function ChatWidget() {
    const t = useTranslations('chat');
    const locale = useLocale();
    const router = useRouter();
    const { isOpen, messages, toggleChat, addMessage } = useChatStore();
    const { lat, lng, requestLocation } = useGeolocationStore();
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => { requestLocation(); }, []);

    const handleSend = async () => {
        if (!input.trim()) return;
        addMessage('user', input);
        const intent = matchIntent(input);

        try {
            const chatRes = await api.chatNearest({ text: input, lat, lng });
            if (chatRes?.message) {
                addMessage('bot', chatRes.message);
            } else if (intent) {
                if (intent.action === 'help') {
                    addMessage('bot', t('helpOptions'));
                } else if (intent.url) {
                    addMessage('bot', locale === 'ar' ? 'جاري التوجيه...' : 'Redirecting...');
                    setTimeout(() => router.push(`/${locale}${intent.url}`), 800);
                }
            } else {
                addMessage('bot', locale === 'ar'
                    ? 'عذراً، لم أفهم طلبك. يمكنك السؤال عن: الأئمة، حلقات التحفيظ، صيانة المساجد، أو إضافة خدمة جديدة.'
                    : "Sorry, I didn't understand. You can ask about: imams, Quran circles, mosque maintenance, or adding a new service.");
            }
        } catch {
            addMessage('bot', locale === 'ar' ? 'حدث خطأ أثناء المعالجة.' : 'Something went wrong processing your request.');
        }
        setInput('');
    };

    const quickActions = [
        { label: t('findImam'), url: `/imams` },
        { label: t('findHalqa'), url: `/halaqat` },
        { label: t('findMaintenance'), url: `/maintenance` },
        { label: t('addNew'), url: `/imams/submit` },
    ];

    if (!isOpen) {
        return (
            <button
                onClick={toggleChat}
                className="fixed bottom-6 start-6 z-40 w-16 h-16 bg-primary text-white rounded-full shadow-fab flex items-center justify-center hover:shadow-shadow-gold transition-all hover:scale-110 active:scale-95 group"
                aria-label={t('title')}
            >
                <div className="absolute inset-0 bg-accent rounded-full animate-ping opacity-20 group-hover:opacity-40" />
                <svg className="w-8 h-8 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 start-6 z-40 w-80 sm:w-96 bg-white rounded-[24px] shadow-2xl border border-border animate-slide-up overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-primary-light px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                        <span className="text-xl">🕌</span>
                    </div>
                    <div>
                        <span className="text-white font-black text-sm block">{t('title')}</span>
                        <span className="text-[10px] text-white/70 font-bold uppercase tracking-widest">{locale === 'ar' ? 'متصل الآن' : 'Always Online'}</span>
                    </div>
                </div>
                <button onClick={toggleChat} className="text-white/60 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-colors">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Messages */}
            <div className="h-80 overflow-y-auto p-5 space-y-4 bg-cream/30">
                {/* Welcome */}
                <div className="bg-white border border-border rounded-2xl p-4 text-sm font-medium shadow-sm leading-relaxed">
                    <span className="block text-primary font-black mb-1">{locale === 'ar' ? 'قريب بوت:' : 'Qareeb Bot:'}</span>
                    {t('welcome')}
                </div>

                {/* Quick actions */}
                {messages.length === 0 && (
                    <div className="grid grid-cols-1 gap-2">
                        {quickActions.map((action, i) => (
                            <button
                                key={i}
                                onClick={() => router.push(`/${locale}${action.url}`)}
                                className="text-xs bg-white hover:bg-primary hover:text-white border border-border px-4 py-3 rounded-xl transition-all text-start font-bold flex items-center justify-between group shadow-sm"
                            >
                                {action.label}
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Chat messages */}
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-[20px] px-4 py-3 text-sm font-medium shadow-sm ${msg.from === 'user'
                            ? 'bg-primary text-white rounded-te-none'
                            : 'bg-white text-dark border border-border rounded-ts-none'
                            }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border p-4 bg-white flex gap-3">
                <input
                    type="text"
                    value={input}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder={t('placeholder')}
                    className="flex-1 px-4 py-3 bg-cream rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none border border-transparent focus:border-primary/30"
                />
                <button
                    onClick={handleSend}
                    className="bg-primary hover:bg-primary-dark text-white p-3 rounded-xl shadow-btn transition-all hover:scale-105 active:scale-95"
                >
                    <svg className="w-5 h-5 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
