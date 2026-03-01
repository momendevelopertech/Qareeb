'use client';

import { useEffect, useMemo, useState } from 'react';

type Props = {
    value?: string;
    onChange: (value: string) => void;
    label?: string;
    required?: boolean;
    id?: string;
    className?: string;
    error?: string;
};

function extractLocalEgyptNumber(value?: string): string {
    const digits = (value || '').replace(/\D/g, '');
    if (!digits) return '';

    if (digits.startsWith('20')) {
        return digits.slice(2, 12);
    }

    if (digits.startsWith('0')) {
        return digits.slice(1, 11);
    }

    return digits.slice(0, 10);
}

export default function EgyptWhatsAppInput({
    value,
    onChange,
    label,
    required = false,
    id,
    className,
    error,
}: Props) {
    const [localNumber, setLocalNumber] = useState('');

    useEffect(() => {
        setLocalNumber(extractLocalEgyptNumber(value));
    }, [value]);

    const helperText = useMemo(() => {
        if (error) return error;
        if (required) return 'اكتب رقم واتساب مصري صحيح (10 أرقام بعد +20)';
        return 'اختياري: اكتب رقم واتساب مصري صحيح إذا توفر';
    }, [error, required]);

    return (
        <div className={className}>
            {label && (
                <label htmlFor={id} className="block text-sm font-black text-dark mb-2 ms-1">
                    {label} {required ? <span className="text-red-500">*</span> : null}
                </label>
            )}

            <div
                dir="ltr"
                className={`flex items-stretch rounded-2xl border-2 bg-cream overflow-hidden transition-colors ${error ? 'border-red-500' : 'border-transparent focus-within:border-primary focus-within:bg-white'}`}
            >
                <div className="shrink-0 inline-flex items-center gap-2 px-3 sm:px-4 border-e border-border bg-white/75 text-dark font-black text-sm sm:text-base">
                    <span aria-hidden="true" className="text-lg leading-none">🇪🇬</span>
                    <span dir="ltr">+20</span>
                </div>
                <input
                    id={id}
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    className="min-w-0 flex-1 px-3 sm:px-4 py-3.5 sm:py-4 bg-transparent outline-none font-bold text-sm sm:text-base text-left"
                    placeholder="10XXXXXXXX"
                    value={localNumber}
                    onChange={(e) => {
                        const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setLocalNumber(digitsOnly);
                        onChange(digitsOnly ? `20${digitsOnly}` : '');
                    }}
                    dir="ltr"
                />
            </div>

            <p className={`text-xs mt-1 ms-1 ${error ? 'text-red-600' : 'text-text-muted'}`}>{helperText}</p>
        </div>
    );
}
