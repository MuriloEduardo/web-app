"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
    const router = useRouter();

    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const email = String(formData.get("email") ?? "");
        const phone_number = String(formData.get("phone_number") ?? "");
        const password = String(formData.get("password") ?? "");

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, phone_number, password }),
            });

            const data = (await res.json()) as { ok?: boolean; error?: string };

            if (!res.ok || !data.ok) {
                setError(data.error || "Não foi possível criar sua conta");
                setLoading(false);
                return;
            }

            router.push("/login");
        } catch {
            setError("Não foi possível criar sua conta");
            setLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center font-sans">
            <main className="w-full max-w-sm rounded p-6 flex flex-col gap-3">
                <h1 className="text-lg font-semibold">Criar conta</h1>

                <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
                    <input
                        name="email"
                        type="email"
                        placeholder="Email"
                        className="rounded border px-3 py-2"
                        required
                    />
                    <input
                        name="phone_number"
                        type="tel"
                        placeholder="Telefone (opcional)"
                        className="rounded border px-3 py-2"
                    />
                    <input
                        name="password"
                        type="password"
                        placeholder="Senha"
                        className="rounded border px-3 py-2"
                        required
                    />

                    {error ? <p className="text-sm text-red-600">{error}</p> : null}

                    <button
                        type="submit"
                        className="rounded bg-black px-3 py-2 disabled:opacity-60"
                        disabled={loading}
                    >
                        {loading ? "Criando..." : "Criar conta"}
                    </button>
                </form>

                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                    Já possui uma conta?{" "}
                    <Link href="/login" className="underline">
                        Entrar
                    </Link>
                </p>
            </main>
        </div>
    );
}
