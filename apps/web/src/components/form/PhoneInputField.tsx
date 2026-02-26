'use client';

import { useEffect, useMemo, useState } from 'react';
import PhoneInput from 'react-phone-number-input';
import { CountryCode, isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js';
import { api } from '@/lib/api';
import { useLocale } from 'next-intl';

type Props = {
    value?: string;
    onChange: (value?: string) => void;
    defaultCountry?: CountryCode;
    detectCountryFromIP?: boolean;
    label?: string;
    required?: boolean;
    id?: string;
    className?: string;
};

async function reverseGeocodeCountry(lat: number, lng: number): Promise<CountryCode | null> {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
        if (!response.ok) return null;
        const payload = await response.json() as any;
        const code = (payload?.address?.country_code || '').toUpperCase();
        return (code || null) as CountryCode | null;
    } catch {
        return null;
    }
}

export default function PhoneInputField({
    value,
    onChange,
    defaultCountry = 'EG',
    detectCountryFromIP = true,
    label,
    required = false,
    id,
    className,
}: Props) {
    const locale = useLocale();
    const [country, setCountry] = useState<CountryCode>(defaultCountry);
    const [touched, setTouched] = useState(false);

    useEffect(() => {
        let stopped = false;

        const detect = async () => {
            if (typeof navigator !== 'undefined' && navigator.geolocation) {
                try {
                    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
                    });
                    const byGeo = await reverseGeocodeCountry(position.coords.latitude, position.coords.longitude);
                    if (!stopped && byGeo) {
                        setCountry(byGeo);
                        return;
                    }
                } catch {
                    // Continue to IP fallback
                }
            }

            if (detectCountryFromIP) {
                try {
                    const geo = await api.getGeoCountry();
                    if (!stopped && geo?.country) {
                        setCountry(geo.country as CountryCode);
                        return;
                    }
                } catch {
                    // fallback below
                }
            }

            if (!stopped) setCountry(defaultCountry);
        };

        void detect();
        return () => {
            stopped = true;
        };
    }, [defaultCountry, detectCountryFromIP]);

    const valid = useMemo(() => {
        if (!value) return !required;
        return isValidPhoneNumber(value);
    }, [value, required]);

    const localizedError = locale === 'ar'
        ? 'رقم الهاتف غير صالح لهذه الدولة.'
        : 'Invalid phone number for selected country.';

    return (
        <div className={className}>
            {label && (
                <label htmlFor={id} className="block text-sm font-semibold mb-1.5">
                    {label} {required ? '*' : ''}
                </label>
            )}
            <div className="input-field">
                <PhoneInput
                    id={id}
                    international
                    defaultCountry={country}
                    country={country}
                    countryCallingCodeEditable={false}
                    value={value}
                    onChange={(next) => {
                        setTouched(true);
                        onChange(next || undefined);
                    }}
                    onCountryChange={(next) => {
                        if (next) setCountry(next);
                    }}
                    placeholder={locale === 'ar' ? 'رقم الهاتف' : 'Phone number'}
                />
            </div>
            {touched && !valid && (
                <p className="text-xs text-red-600 mt-1">{localizedError}</p>
            )}
            {value && valid && (
                <p className="text-xs text-text-muted mt-1">
                    {parsePhoneNumber(value)?.formatInternational() || value}
                </p>
            )}
        </div>
    );
}
