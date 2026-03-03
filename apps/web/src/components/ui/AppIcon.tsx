'use client';

import React from 'react';

export type AppIconName =
    | 'mosque'
    | 'imam'
    | 'halqa'
    | 'maintenance'
    | 'location'
    | 'map'
    | 'copy'
    | 'video'
    | 'images'
    | 'whatsapp'
    | 'share'
    | 'details'
    | 'search'
    | 'plus'
    | 'check'
    | 'chat'
    | 'flag'
    | 'target'
    | 'rocket'
    | 'handshake'
    | 'bulb'
    | 'wifi'
    | 'bell'
    | 'clock'
    | 'alert'
    | 'key'
    | 'lock'
    | 'tool'
    | 'audio';

const paths: Record<AppIconName, React.ReactNode> = {
    mosque: (
        <>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 20h18" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 20V9l7-5 7 5v11" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 20v-6h6v6" />
        </>
    ),
    imam: (
        <>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 12a4 4 0 100-8 4 4 0 000 8z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 20a8 8 0 0116 0" />
        </>
    ),
    halqa: (
        <>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h11a3 3 0 013 3v11H7a3 3 0 01-3-3V6z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 9h2a2 2 0 012 2v9h-4" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 6v14" />
        </>
    ),
    maintenance: (
        <>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.7 6.3a4 4 0 11-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 005.4-5.4z" />
        </>
    ),
    location: (
        <>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
        </>
    ),
    map: (
        <>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6l6-2 4 2 6-2v14l-6 2-4-2-6 2V6z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 4v14" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 6v14" />
        </>
    ),
    copy: (
        <>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 8h9a2 2 0 012 2v9a2 2 0 01-2 2H8a2 2 0 01-2-2v-9a2 2 0 012-2z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 16H5a2 2 0 01-2-2V5a2 2 0 012-2h9a2 2 0 012 2v1" />
        </>
    ),
    video: (
        <>
            <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 8l6 4-6 4V8z" />
        </>
    ),
    images: (
        <>
            <rect x="3" y="5" width="18" height="14" rx="2" ry="2" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 11l3 3 4-4 4 4" />
            <circle cx="9" cy="9" r="1.5" />
        </>
    ),
    whatsapp: (
        <>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h16v11a4 4 0 01-4 4H9l-5 3V4z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 9h8" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h5" />
        </>
    ),
    share: (
        <>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v12" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4" />
            <rect x="5" y="13" width="14" height="6" rx="2" ry="2" />
        </>
    ),
    details: (
        <>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 6l6 6-6 6" />
        </>
    ),
    search: (
        <>
            <circle cx="11" cy="11" r="7" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 16.5L20 20" />
        </>
    ),
    plus: (
        <>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
        </>
    ),
    check: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 12.5l2.5 2.5 4.5-5" />
        </>
    ),
    chat: (
        <>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16v10a3 3 0 01-3 3H8l-4 3V5z" />
        </>
    ),
    flag: (
        <>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v18" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 4h10l-2 4 2 4H5" />
        </>
    ),
    target: (
        <>
            <circle cx="12" cy="12" r="8" />
            <circle cx="12" cy="12" r="4" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v4M12 18v4M2 12h4M18 12h4" />
        </>
    ),
    rocket: (
        <>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c4.5 1.5 7 5 7 9l-5 5c-4 0-7.5-2.5-9-7l2-2c1.5-1.5 3-2.5 5-5z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16l-2 4 4-2" />
            <circle cx="14.5" cy="9.5" r="1.5" />
        </>
    ),
    handshake: (
        <>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l2-2a3 3 0 014 0l1 1a3 3 0 004 0l2-2" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2 12l4-4 4 4-4 4-4-4z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M22 12l-4-4-4 4 4 4 4-4z" />
        </>
    ),
    bulb: (
        <>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 18h6" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 21h4" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a6 6 0 00-3 11.2V16h6v-1.8A6 6 0 0012 3z" />
        </>
    ),
    wifi: (
        <>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 10a10 10 0 0114 0" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 13a6 6 0 018 0" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 16a2 2 0 012 0" />
        </>
    ),
    bell: (
        <>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 17h12" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a3 3 0 006 0" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 17V11a6 6 0 00-12 0v6l-2 2h16l-2-2z" />
        </>
    ),
    clock: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
        </>
    ),
    alert: (
        <>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l9 16H3l9-16z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16h.01" />
        </>
    ),
    key: (
        <>
            <circle cx="8" cy="12" r="3" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 12h9" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 12v3" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 12v2" />
        </>
    ),
    lock: (
        <>
            <rect x="5" y="11" width="14" height="9" rx="2" ry="2" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V8a4 4 0 018 0v3" />
        </>
    ),
    tool: (
        <>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.7 6.3a4 4 0 11-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 005.4-5.4z" />
        </>
    ),
    audio: (
        <>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 10v4a2 2 0 002 2h2l4 3V5L8 8H6a2 2 0 00-2 2z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 9a4 4 0 010 6" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7a7 7 0 010 10" />
        </>
    ),
};

export default function AppIcon({
    name,
    className,
    strokeWidth = 2,
}: {
    name: AppIconName;
    className?: string;
    strokeWidth?: number;
}) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            aria-hidden="true"
        >
            {paths[name]}
        </svg>
    );
}
