"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewNodePage() {
    const router = useRouter();
    const [prompt, setPrompt] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorCode, setErrorCode] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const trimmed = prompt.trim();
        if (!trimmed) {
            setErrorCode("PROMPT_REQUIRED");
            return;
        }

        setIsSubmitting(true);
        setErrorCode(null);
        try {
            const res = await fetch("/api/nodes", {
                method: "POST",
                headers: {
                    accept: "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ prompt: trimmed }),
            });
            const payload = (await res.json().catch(() => null)) as { error?: { code?: string } } | null;
            if (!res.ok) {
                setErrorCode(payload?.error?.code ?? "NODES_CREATE_FAILED");
                return;
            }
            router.push("/workflow/nodes");
        } catch {
            setErrorCode("NODES_CREATE_FAILED");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <main className="mx-auto w-full max-w-3xl px-4 py-6 min-h-screen text-slate-900 dark:text-white">
            <div className="text-xs text-slate-600">Workflow / Nodes / Novo</div>
            <div className="mt-1 flex items-center justify-between gap-3">
                <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Criar node</h1>
                <Link href="/workflow/nodes" className="rounded border px-3 py-1 text-sm text-slate-900 dark:text-white">
                    Voltar
                </Link>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-3">
                <label className="block text-sm font-medium text-slate-800">
                    Prompt
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="mt-1 w-full rounded border px-3 py-2 text-sm text-slate-900 dark:text-white"
                        rows={6}
                        placeholder="Descreva o comportamento do node"
                    />
                </label>

                <div className="flex items-center gap-2">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="rounded border px-3 py-2 text-sm text-slate-900 dark:text-white disabled:opacity-60"
                    >
                        {isSubmitting ? "Salvando..." : "Salvar"}
                    </button>
                    {errorCode ? <span className="text-sm text-red-700">Erro: {errorCode}</span> : null}
                </div>
            </form>
        </main>
    );
}
