"use client";

import { type ReactNode, useEffect } from "react";

type Props = {
    open: boolean;
    title?: string;
    children: ReactNode;
    onClose: () => void;
    footer?: ReactNode;
};

export default function Modal({ open, title, children, onClose, footer }: Props) {
    useEffect(() => {
        if (!open) return;
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 dark:border-slate-800 dark:text-slate-100">
                    <span>{title ?? ""}</span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                        Fechar
                    </button>
                </div>
                <div className="px-4 py-3 text-sm text-slate-800 dark:text-slate-200">{children}</div>
                {footer ? <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3 dark:border-slate-800">{footer}</div> : null}
            </div>
        </div>
    );
}
