"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import Modal from "@/app/components/Modal";

type ConfirmContextValue = {
    confirm: (message: string) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
    const [message, setMessage] = useState<string | null>(null);
    const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);

    const confirm = useCallback((text: string) => {
        return new Promise<boolean>((resolve) => {
            setMessage(text);
            setResolver(() => resolve);
        });
    }, []);

    const handleClose = useCallback(
        (result: boolean) => {
            resolver?.(result);
            setMessage(null);
            setResolver(null);
        },
        [resolver]
    );

    const value = useMemo(() => ({ confirm }), [confirm]);

    return (
        <ConfirmContext.Provider value={value}>
            {children}
            <Modal
                open={!!message}
                title="Confirmação"
                onClose={() => handleClose(false)}
                footer={
                    <>
                        <button
                            type="button"
                            onClick={() => handleClose(false)}
                            className="rounded border border-slate-300 px-3 py-1 text-sm text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={() => handleClose(true)}
                            className="rounded bg-blue-600 px-3 py-1 text-sm font-semibold text-white transition hover:bg-blue-500"
                        >
                            Confirmar
                        </button>
                    </>
                }
            >
                {message}
            </Modal>
        </ConfirmContext.Provider>
    );
}

export function useConfirm() {
    const ctx = useContext(ConfirmContext);
    if (!ctx) throw new Error("useConfirm must be used inside ConfirmProvider");
    return ctx.confirm;
}
