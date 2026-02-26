import type { Config } from 'tailwindcss';

const config: Config = {
    content: [
        './src/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#1B6B45',
                    light: '#2D8A5E',
                    dark: '#145336',
                    50: '#F2FAF5',
                    100: '#E8F5EE',
                    500: '#1B6B45',
                    600: '#145336',
                },
                accent: {
                    DEFAULT: '#C9962A',
                    dark: '#B8851F',
                },
                background: '#FAF8F3',
                cream: '#FAF8F3',
                dark: '#1A1A2E',
                card: '#FFFFFF',
                text: {
                    DEFAULT: '#2D3748',
                    muted: '#718096',
                },
                border: '#E2E8F0',
                imam: '#1B6B45',
                halqa: '#E67E22',
                maintenance: '#E74C3C',
            },
            fontFamily: {
                arabic: ['var(--font-cairo)', 'var(--font-tajawal)', 'sans-serif'],
                tajawal: ['var(--font-tajawal)', 'var(--font-cairo)', 'sans-serif'],
                english: ['var(--font-tajawal)', 'sans-serif'],
            },
            borderRadius: {
                card: '16px',
                btn: '10px',
                full: '9999px',
            },
            boxShadow: {
                card: '0 2px 12px rgba(0,0,0,0.08)',
                'card-hover': '0 8px 30px rgba(0,0,0,0.12)',
                fab: '0 4px 20px rgba(13,110,110,0.3)',
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-out',
                'slide-up': 'slideUp 0.4s ease-out',
                'slide-in-right': 'slideInRight 0.3s ease-out',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'bounce-gentle': 'bounceGentle 2s infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideInRight: {
                    '0%': { opacity: '0', transform: 'translateX(20px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
                bounceGentle: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-5px)' },
                },
            },
        },
    },
    plugins: [],
};

export default config;
