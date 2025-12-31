"use client";

import { useCallback, useMemo, useState } from "react";

type Props = {
    conversationId: number;
    initialSkipsForwarding?: boolean;
};

export function AutoPilotToggle({ conversationId, initialSkipsForwarding }: Props) {
    const [skipsForwarding, setSkipsForwarding] = useState<boolean | undefined>(
        initialSkipsForwarding
    );
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const autopilotEnabled = useMemo(() => {
        if (skipsForwarding === undefined) return undefined;
        return !skipsForwarding;
    }, [skipsForwarding]);

    const onToggle = useCallback(async () => {
        setError(null);

        const current = skipsForwarding ?? false;
        const next = !current;

        setIsSaving(true);
        try {
            const res = await fetch(`/api/sessions/${conversationId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ skips_forwarding: next }),
            });

            if (!res.ok) {
                const body = (await res.json().catch(() => null)) as unknown;
                const message =
                    typeof (body as { error?: { code?: string } })?.error?.code === "string"
                        ? (body as { error?: { code?: string } }).error!.code!
                        : "PATCH_FAILED";
                throw new Error(message);
            }

            setSkipsForwarding(next);
        } catch (e) {
            setError(e instanceof Error ? e.message : "PATCH_FAILED");
        } finally {
            setIsSaving(false);
        }
    }, [conversationId, skipsForwarding]);

    const label =
        autopilotEnabled === undefined
            ? "Piloto automático"
            : autopilotEnabled
                ? "Desativar piloto"
                : "Ativar piloto";

    const sublabel =
        autopilotEnabled === undefined
            ? "—"
            : autopilotEnabled
                ? "Ativado"
                : "Desativado";

    return (
        <div className="flex items-end gap-2">
            <button
                type="button"
                onClick={onToggle}
                disabled={isSaving}
                className="text-xs px-3 py-2 rounded-full hover:bg-gray-100 hover:dark:bg-gray-800 active:bg-gray-200 active:dark:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={label}
                title={label}
            >
                {label}
                <span className="ml-2 text-zinc-500 dark:text-zinc-400">
                    {sublabel}
                </span>
            </button>

            {error && (
                <div className="text-[11px] text-red-600 dark:text-red-400 leading-none pb-2">
                    {error}
                </div>
            )}
        </div>
    );
}
