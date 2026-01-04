import Link from "next/link";
import { headers } from "next/headers";

import { bffGet } from "@/app/lib/bff/fetcher";
import { type EdgeDto } from "@/app/workflow/WorkflowTypes";

export default async function EdgesPage() {
    const h = await headers();
    const cookie = h.get("cookie");
    const opts = cookie ? { headers: { cookie } } : undefined;

    const payload = await bffGet<EdgeDto[]>("/api/edges", opts);
    const edges = Array.isArray(payload.data) ? payload.data : [];
    const errorCode = payload.error?.code ?? null;

    return (
        <main className="min-h-screen px-3 py-4 text-slate-900 dark:text-white sm:px-4 sm:py-6">
            <div className="mx-auto w-full max-w-5xl">
                <div className="text-xs text-slate-500 dark:text-gray-300">Workflow / Edges</div>
                <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <h1 className="text-lg font-semibold text-slate-900 dark:text-white sm:text-xl">Edges</h1>
                    <Link
                        href="/workflow"
                        className="rounded-lg border border-slate-300 px-4 py-2 text-center text-sm hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
                    >
                        ← Voltar
                    </Link>
                </div>

                {errorCode ? (
                    <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                        Erro ao carregar edges: {errorCode}
                    </div>
                ) : null}

                <div className="mt-4 grid gap-3 sm:gap-4">
                    {edges.map((edge) => (
                        <Link
                            key={edge.id}
                            href={`/workflow/edges/${edge.id}`}
                            className="block rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-green-400 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-green-600"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-mono font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">
                                            #{edge.id}
                                        </span>
                                        <span className="text-sm text-slate-700 dark:text-slate-300">
                                            Node {edge.source_node_id} → Node {edge.destination_node_id}
                                        </span>
                                    </div>
                                    {edge.label && (
                                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                            {edge.label}
                                        </p>
                                    )}
                                </div>
                                <svg className="h-4 w-4 flex-shrink-0 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </Link>
                    ))}
                    {edges.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900">
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Nenhuma edge encontrada.
                            </p>
                        </div>
                    ) : null}
                </div>
            </div>
        </main>
    );
}
