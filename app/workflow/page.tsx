import Link from "next/link";
import { headers } from "next/headers";

import { bffGet } from "@/app/lib/bff/fetcher";
import { type NodeDto } from "@/app/workflow/WorkflowTypes";

type PageProps = {
    searchParams: Promise<{ order_by?: string }>;
};

export default async function WorkflowPage({ searchParams }: PageProps) {
    const h = await headers();
    const cookie = h.get("cookie");
    const opts = cookie ? { headers: { cookie } } : undefined;

    const params = await searchParams;
    const orderBy = params.order_by || "id";

    const url = orderBy ? `/api/nodes?order_by=${orderBy}` : "/api/nodes";
    const payload = await bffGet<NodeDto[]>(url, opts);
    const nodes = Array.isArray(payload.data) ? payload.data : [];
    const errorCode = payload.error?.code ?? null;

    return (
        <main className="min-h-screen px-3 py-4 text-slate-900 dark:text-white sm:px-4 sm:py-6">
            <div className="mx-auto w-full max-w-5xl">
                <div className="flex items-center justify-between gap-4">
                    <h1 className="text-lg font-semibold text-slate-900 dark:text-white sm:text-xl">Workflow - Nodes</h1>
                    <Link
                        href="/workflow/nodes/new"
                        className="rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-700"
                        title="Criar novo node"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </Link>
                </div>

                {errorCode ? (
                    <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                        Erro ao carregar nodes: {errorCode}
                    </div>
                ) : null}

                <div className="mt-4 grid gap-3 sm:gap-4">
                    {nodes.map((node) => (
                        <Link
                            key={node.id}
                            href={`/workflow/nodes/${node.id}`}
                            className="block rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-600"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-mono font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                            #{node.id}
                                        </span>
                                    </div>
                                    <p className="mt-1 line-clamp-2 text-sm text-slate-700 dark:text-slate-300">
                                        {node.prompt}
                                    </p>
                                </div>
                                <svg className="h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </Link>
                    ))}
                    {nodes.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900">
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Nenhum node encontrado.
                            </p>
                        </div>
                    ) : null}
                </div>
            </div>
        </main>
    );
}
