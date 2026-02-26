'use client';

import { useState, useRef, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useChatStore, useGeolocationStore } from '@/lib/store';
import { api } from '@/lib/api';

export default function ChatWidget() {
    const locale = useLocale();
    const router = useRouter();
    const { isOpen, messages, toggleChat, addMessage } = useChatStore();
    const { lat, lng, requestLocation } = useGeolocationStore();
    const [input, setInput] = useState('');
    const [cards, setCards] = useState<any[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, cards]);

    useEffect(() => { requestLocation(); }, []);

    const send = async (text?: string) => {
        const value = (text ?? input).trim();
        if (!value) return;
        addMessage('user', value);
        setInput('');

        try {
            const res = await api.chatNearest({ text: value, lat: lat ?? undefined, lng: lng ?? undefined });
            if (res?.message) addMessage('bot', res.message);
            setCards(Array.isArray(res?.cards) ? res.cards : []);
        } catch {
            addMessage('bot', locale === 'ar' ? '??? ??? ????? ????????.' : 'Something went wrong.');
            setCards([]);
        }
    };

    const quickButtons = [
        '???? ????',
        '???? ????',
        '???? ????? ?????',
    ];

    if (!isOpen) {
        return (
            <button onClick={toggleChat} className="fixed bottom-6 start-6 z-40 w-16 h-16 bg-primary text-white rounded-full shadow-fab flex items-center justify-center hover:scale-110 transition-all" aria-label="chat">
                ??
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 start-6 z-40 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-border overflow-hidden">
            <div className="bg-gradient-to-r from-primary to-primary-light px-5 py-4 flex items-center justify-between text-white">
                <span className="font-black">{locale === 'ar' ? '????? ????' : 'Qareeb Assistant'}</span>
                <button onClick={toggleChat} aria-label="close">×</button>
            </div>

            <div className="h-80 overflow-y-auto p-4 space-y-3 bg-cream/30">
                <div className="text-xs bg-white border border-border rounded-xl p-3">
                    {locale === 'ar' ? '???? ?? ?????? ??????? ?? ???? ???? ????.' : 'Ask religious questions or nearest services.'}
                </div>

                <div className="grid gap-2">
                    {quickButtons.map((label) => (
                        <button key={label} onClick={() => send(label)} className="text-xs bg-white border border-border px-3 py-2 rounded-xl text-start hover:bg-primary hover:text-white transition-colors">
                            {label}
                        </button>
                    ))}
                </div>

                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm ${msg.from === 'user' ? 'bg-primary text-white' : 'bg-white border border-border text-dark'}`}>{msg.text}</div>
                    </div>
                ))}

                {cards.length > 0 && (
                    <div className="space-y-2">
                        {cards.map((card) => (
                            <div key={card.id} className="bg-white border border-border rounded-xl p-3 text-xs space-y-2">
                                <p className="font-bold">{card.name}</p>
                                <p className="text-text-muted">{card.address}</p>
                                <div className="flex gap-2 flex-wrap">
                                    {card.googleMapUrl && <a className="btn-outline !py-1 !px-2 text-[11px]" href={card.googleMapUrl} target="_blank" rel="noreferrer">Google Maps</a>}
                                    <button className="btn-outline !py-1 !px-2 text-[11px]" onClick={() => router.push(`/${locale}/${card.type === 'halqa' ? 'halaqat' : card.type}/${card.id}`)}>{locale === 'ar' ? '??? ????????' : 'View details'}</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-border p-3 bg-white flex gap-2">
                <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder={locale === 'ar' ? '???? ?????...' : 'Ask...'} className="flex-1 px-3 py-2 bg-cream rounded-xl text-sm outline-none" />
                <button onClick={() => send()} className="bg-primary text-white px-3 rounded-xl">?</button>
            </div>
        </div>
    );
}

