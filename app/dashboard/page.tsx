import { getServerSession } from "next-auth/next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { authOptions } from "@/app/lib/auth";

function getBaseUrlFromEnv(): string {
    const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl) return appUrl.replace(/\/$/, "");

    const vercelUrl = process.env.VERCEL_URL;
    if (vercelUrl) return `https://${vercelUrl}`;

    return "http://localhost:3000";
}

type Insights = {
    conversationsTotal: number;
    conversationsFetched: number;
    conversationsWithCounts: number;
    messagesTotal: number;
    activeConversations: number;
    mostActiveConversationId: number | null;
    mostActiveConversationMessages: number;
    lastActivityIso: string | null;
    generatedAt: string;
};

async function getInsights(): Promise<Insights | null> {
    const h = await headers();
    const cookie = h.get("cookie") ?? "";

    const res = await fetch(`${getBaseUrlFromEnv()}/api/dashboard/insights`, {
        cache: "no-store",
        headers: {
            ...(cookie ? { cookie } : {}),
        },
    });

    if (!res.ok) return null;

    const json = (await res.json()) as { data?: Insights };
    return json.data ?? null;
}

function formatIsoToPtBr(iso: string | null): string {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("pt-BR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.trim().toLowerCase();
    if (!email) redirect("/login");

    const insights = await getInsights();

    return (
        <div className="flex items-center justify-center font-sans pb-14">
            <main className="w-full max-w-3xl rounded p-6">
                <h1 className="text-lg font-semibold">Bem-vindo!</h1>
                <p className="mt-2 text-sm">
                    Você está logado como <b>{email}</b>
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="rounded border p-4 dark:border-gray-800">
                        <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                            Conversas
                        </div>
                        <div className="mt-2 text-2xl font-semibold">
                            {insights ? insights.conversationsTotal : "—"}
                        </div>
                        {insights && insights.conversationsFetched !== insights.conversationsTotal && (
                            <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                Amostra: {insights.conversationsFetched} conversas
                            </div>
                        )}
                    </div>

                    <div className="rounded border p-4 dark:border-gray-800">
                        <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                            Mensagens (total)
                        </div>
                        <div className="mt-2 text-2xl font-semibold">
                            {insights ? insights.messagesTotal : "—"}
                        </div>
                        {insights && insights.conversationsWithCounts !== insights.conversationsFetched && (
                            <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                Contagem disponível para {insights.conversationsWithCounts} conversas
                            </div>
                        )}
                    </div>

                    <div className="rounded border p-4 dark:border-gray-800">
                        <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                            Conversas ativas
                        </div>
                        <div className="mt-2 text-2xl font-semibold">
                            {insights ? insights.activeConversations : "—"}
                        </div>
                    </div>

                    <div className="rounded border p-4 dark:border-gray-800">
                        <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                            Última atividade
                        </div>
                        <div className="mt-2 text-lg font-semibold">
                            {formatIsoToPtBr(insights?.lastActivityIso ?? null)}
                        </div>
                    </div>
                </div>

                <div className="mt-3 rounded border p-4 dark:border-gray-800">
                    <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Conversa mais ativa
                    </div>
                    <div className="mt-2 text-sm">
                        {insights && insights.mostActiveConversationId !== null
                            ? `#${insights.mostActiveConversationId} (${insights.mostActiveConversationMessages} mensagens)`
                            : "—"}
                    </div>
                </div>
            </main>
        </div>
    );
}
