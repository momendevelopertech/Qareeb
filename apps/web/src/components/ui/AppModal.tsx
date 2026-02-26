'use client';

import { useEffect, useMemo, useRef } from 'react';

type ModalType = 'view' | 'edit' | 'video' | 'images';

type AppModalProps = {
    isOpen: boolean;
    type: ModalType;
    title: string;
    onClose: () => void;
    children: React.ReactNode;
};

const FOCUSABLE_SELECTOR = [
    'button',
    'a[href]',
    'input',
    'select',
    'textarea',
    '[tabindex]:not([tabindex="-1"])',
].join(',');

export default function AppModal({ isOpen, title, onClose, children }: AppModalProps) {
    const panelRef = useRef<HTMLDivElement>(null);
    const titleId = useMemo(() => `modal-title-${Math.random().toString(36).slice(2)}`, []);

    useEffect(() => {
        if (!isOpen) return;

        const onEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };

        const trap = (event: KeyboardEvent) => {
            if (event.key !== 'Tab') return;
            const panel = panelRef.current;
            if (!panel) return;
            const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
                .filter((node) => !node.hasAttribute('disabled'));
            if (!nodes.length) return;
            const first = nodes[0];
            const last = nodes[nodes.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', onEsc);
        document.addEventListener('keydown', trap);
        document.body.style.overflow = 'hidden';
        const firstFocusable = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
        firstFocusable?.focus();

        return () => {
            document.removeEventListener('keydown', onEsc);
            document.removeEventListener('keydown', trap);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[1100] bg-black/40 p-4 flex items-center justify-center"
            onClick={onClose}
            role="presentation"
        >
            <div
                ref={panelRef}
                className="w-full max-w-3xl max-h-[90vh] overflow-auto bg-white rounded-2xl border border-border shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                onClick={(event) => event.stopPropagation()}
            >
                <div className="sticky top-0 bg-white border-b border-border px-5 py-4 flex items-center justify-between">
                    <h3 id={titleId} className="text-lg font-black text-dark">{title}</h3>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-lg border border-border hover:bg-cream"
                        aria-label="Close modal"
                    >
                        ×
                    </button>
                </div>
                <div className="p-5">
                    {children}
                </div>
            </div>
        </div>
    );
}
