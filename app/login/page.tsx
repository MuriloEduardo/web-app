"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const email = String(formData.get("email") ?? "");
        const password = String(formData.get("password") ?? "");

        const result = await signIn("credentials", {
            redirect: false,
            email,
            password,
            callbackUrl,
        });

        setLoading(false);

        if (!result || result.error) {
            setError("Email ou senha inválidos");
            return;
        }

        router.push(result.url ?? callbackUrl);
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
            <main className="w-full max-w-sm rounded bg-white p-6 dark:bg-black dark:text-white">
                <h1 className="text-lg font-semibold">Entrar</h1>

                <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
                    <input
                        name="email"
                        type="email"
                        placeholder="Email"
                        className="rounded border px-3 py-2"
                        required
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
                        {loading ? "Entrando..." : "Entrar"}
                    </button>

                    <p className="text-sm text-zinc-600 dark:text-zinc-300">
                        Não tem conta?{" "}
                        <Link href="/register" className="underline">
                            Criar conta
                        </Link>
                    </p>
                </form>
            </main>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black" />
            }
        >
            <LoginForm />
        </Suspense>
    );
}
