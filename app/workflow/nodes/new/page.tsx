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
        <main className="min-h-screen px-3 py-4 text-slate-900 dark:text-white sm:px-4 sm:py-6">
            <div className="mx-auto w-full max-w-3xl">
                <div className="text-xs text-slate-500 dark:text-gray-300">Workflow / Nodes / Novo</div>
                <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <h1 className="text-lg font-semibold text-slate-900 dark:text-white sm:text-xl">Criar node</h1>
                    <Link href="/workflow/nodes" className="rounded border px-3 py-1.5 text-center text-sm text-slate-900 dark:text-white">
                    Voltar
                </Link>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3 sm:mt-6">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-100 sm:text-sm">
                    Prompt
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="mt-1 w-full rounded border px-3 py-2 text-sm text-slate-900 dark:text-white"
                        rows={6}
                        placeholder="Descreva o comportamento do node"
                    />
                </label>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full rounded border px-3 py-2 text-sm text-slate-900 dark:text-white disabled:opacity-60 sm:w-auto"
                    >
                        {isSubmitting ? "Salvando..." : "Salvar"}
                    </button>
                    {errorCode ? <span className="text-xs text-red-700 sm:text-sm">Erro: {errorCode}</span> : null}
                </div>
            </form>
            </div>
        </main>
    );
}
