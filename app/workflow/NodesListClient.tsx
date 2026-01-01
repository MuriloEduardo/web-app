"use client";

import { useEffect, useMemo, useState } from "react";

type NodeDto = {
    id: number;
    company_id: number;
    prompt: string;
    created_at?: string;
    updated_at?: string;
};

type Envelope<T> = {
    data?: T;
    error?: {
        code: string;
        details?: unknown;
    };
};

type Props = {
    initialNodes: NodeDto[];
    initialErrorCode?: string | null;
};

function preview(text: string, max = 140) {
    const normalized = text.replace(/\s+/g, " ").trim();
    if (normalized.length <= max) return normalized;
    return normalized.slice(0, max - 1) + "…";
}

export function NodesListClient({ initialNodes, initialErrorCode }: Props) {
    const [nodes, setNodes] = useState<NodeDto[]>(initialNodes);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [errorCode, setErrorCode] = useState<string | null>(
        initialErrorCode ?? null
    );

    const count = nodes.length;

    const groupedByCompany = useMemo(() => {
        const map = new Map<number, NodeDto[]>();
        for (const n of nodes) {
            const list = map.get(n.company_id) ?? [];
            list.push(n);
            map.set(n.company_id, list);
        }
        return Array.from(map.entries()).sort(([a], [b]) => a - b);
    }, [nodes]);

    async function rehydrate(signal?: AbortSignal) {
        setIsRefreshing(true);
        try {
            const res = await fetch("/api/nodes", {
                method: "GET",
                headers: { accept: "application/json" },
                signal,
            });

            const payload = (await res
                .json()
                .catch(() => null)) as Envelope<NodeDto[]> | null;

            if (!res.ok) {
                const code = payload?.error?.code ?? "NODES_FETCH_FAILED";
                setErrorCode(code);
                return;
            }

            const items = Array.isArray(payload?.data) ? payload!.data! : [];
            setNodes(items);
            setErrorCode(null);
        } catch {
            // Ignore abort.
            if (signal?.aborted) return;
            setErrorCode("NODES_FETCH_FAILED");
        } finally {
            if (!signal?.aborted) setIsRefreshing(false);
        }
    }

    useEffect(() => {
        const controller = new AbortController();
        rehydrate(controller.signal);
        return () => controller.abort();
    }, []);

    return (
        <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-zinc-600 dark:text-zinc-300">
                    {count} node(s)
                    {isRefreshing ? " • atualizando…" : ""}
                </div>
                <button
                    type="button"
                    onClick={() => rehydrate()}
                    className="rounded border px-3 py-1 text-sm text-black dark:text-white"
                >
                    Recarregar
                </button>
            </div>

            {errorCode ? (
                <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-transparent dark:text-red-300">
                    Erro ao carregar nodes: {errorCode}
                </div>
            ) : null}

            {groupedByCompany.map(([companyId, items]) => (
                <div key={companyId} className="rounded border">
                    <div className="border-b px-4 py-2 text-sm font-semibold text-black dark:text-white">
                        Company {companyId}
                    </div>
                    <ul className="divide-y">
                        {items.map((n) => (
                            <li key={n.id} className="px-4 py-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="text-sm font-semibold text-black dark:text-white">
                                        Node #{n.id}
                                    </div>
                                    <div className="text-xs text-zinc-600 dark:text-zinc-300">
                                        {n.updated_at ?? n.created_at ?? ""}
                                    </div>
                                </div>
                                <div className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">
                                    {preview(n.prompt)}
                                </div>
                                <details className="mt-2">
                                    <summary className="cursor-pointer text-xs text-zinc-600 dark:text-zinc-300">
                                        Ver prompt completo
                                    </summary>
                                    <pre className="mt-2 whitespace-pre-wrap rounded border p-3 text-xs text-black dark:text-white">{n.prompt}</pre>
                                </details>
                            </li>
                        ))}
                        {items.length === 0 ? (
                            <li className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                                Nenhum node encontrado.
                            </li>
                        ) : null}
                    </ul>
                </div>
            ))}

            {groupedByCompany.length === 0 ? (
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                    Nenhum node encontrado.
                </div>
            ) : null}
        </section>
    );
}
