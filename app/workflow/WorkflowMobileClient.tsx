"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
    ArrowLeftIcon,
    PlusIcon,
    PencilSquareIcon,
} from "@heroicons/react/24/solid";

import { type NodeDto, type EdgeDto, type Envelope } from "@/app/workflow/WorkflowTypes";

function firstLine(text: string) {
    const trimmed = text.trim();
    const nl = trimmed.indexOf("\n");
    return nl === -1 ? trimmed : trimmed.slice(0, nl);
}

function preview(text: string, max = 80) {
    const normalized = text.replace(/\s+/g, " ").trim();
    if (normalized.length <= max) return normalized;
    return normalized.slice(0, max - 3) + "...";
}

function formatShortDate(value?: string) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
    }).format(date);
}

function EdgeBadge({ edges }: { edges: EdgeDto[] }) {
    if (!edges.length) {
        return <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">Sem conexões</span>;
    }

    const [first] = edges;
    const label = first?.label?.trim();
    const dest = first?.destination_node_id;

    return (
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {edges.length} conexão{edges.length > 1 ? "s" : ""}
            {label ? ` • ${label}` : ""}
            {dest ? ` • → ${dest}` : ""}
        </span>
    );
}

export function WorkflowMobileClient({ initialNodes, initialErrorCode }: { initialNodes: NodeDto[]; initialErrorCode?: string | null }) {
    const [nodes, setNodes] = useState<NodeDto[]>(initialNodes);
    const [errorCode, setErrorCode] = useState<string | null>(initialErrorCode ?? null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const [edgesBySourceNodeId, setEdgesBySourceNodeId] = useState<Record<number, EdgeDto[]>>({});
    const [edgesError, setEdgesError] = useState<string | null>(null);
    const [isLoadingEdges, setIsLoadingEdges] = useState(false);

    const sortedNodes = useMemo(() => nodes.slice().sort((a, b) => a.id - b.id), [nodes]);

    async function rehydrate(signal?: AbortSignal) {
        setIsRefreshing(true);
        try {
            const res = await fetch("/api/nodes", {
                method: "GET",
                headers: { accept: "application/json" },
                signal,
            });
            const payload = (await res.json().catch(() => null)) as Envelope<NodeDto[]> | null;
            if (!res.ok) {
                setErrorCode(payload?.error?.code ?? "NODES_FETCH_FAILED");
                return;
            }
            const items = Array.isArray(payload?.data) ? payload!.data! : [];
            setNodes(items);
            setErrorCode(null);
        } catch {
            if (signal?.aborted) return;
            setErrorCode("NODES_FETCH_FAILED");
        } finally {
            if (!signal?.aborted) setIsRefreshing(false);
        }
    }

    async function loadEdges(signal?: AbortSignal) {
        if (nodes.length === 0) {
            setEdgesBySourceNodeId({});
            return;
        }

        setIsLoadingEdges(true);
        setEdgesError(null);
        try {
            const results = await Promise.all(
                nodes.map(async (n) => {
                    const res = await fetch(`/api/edges?source_node_id=${n.id}`, {
                        method: "GET",
                        headers: { accept: "application/json" },
                        signal,
                    });
                    const payload = (await res.json().catch(() => null)) as Envelope<EdgeDto[]> | null;
                    if (!res.ok) {
                        return {
                            ok: false as const,
                            nodeId: n.id,
                            code: payload?.error?.code ?? "EDGES_FETCH_FAILED",
                        };
                    }
                    return {
                        ok: true as const,
                        nodeId: n.id,
                        edges: Array.isArray(payload?.data) ? payload!.data! : [],
                    };
                })
            );

            const next: Record<number, EdgeDto[]> = {};
            let firstError: string | null = null;
            for (const r of results) {
                if (!r.ok) {
                    if (!firstError) firstError = r.code;
                    next[r.nodeId] = [];
                } else {
                    next[r.nodeId] = r.edges.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
                }
            }

            setEdgesBySourceNodeId(next);
            setEdgesError(firstError);
        } catch {
            if (signal?.aborted) return;
            setEdgesError("EDGES_FETCH_FAILED");
        } finally {
            if (!signal?.aborted) setIsLoadingEdges(false);
        }
    }

    async function createNode() {
        const prompt = window.prompt("Prompt do novo node:")?.trim() ?? "";
        if (!prompt) return;

        setIsRefreshing(true);
        try {
            const res = await fetch("/api/nodes", {
                method: "POST",
                headers: {
                    accept: "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ prompt }),
            });
            const payload = (await res.json().catch(() => null)) as Envelope<unknown> | null;
            if (!res.ok) {
                setErrorCode(payload?.error?.code ?? "NODES_CREATE_FAILED");
                return;
            }
            await rehydrate();
        } catch {
            setErrorCode("NODES_CREATE_FAILED");
        } finally {
            setIsRefreshing(false);
        }
    }

    useEffect(() => {
        const controller = new AbortController();
        rehydrate(controller.signal);
        return () => controller.abort();
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        loadEdges(controller.signal);
        return () => controller.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodes.map((n) => n.id).join(",")]);

    return (
        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex items-center justify-between gap-3">
                <Link
                    href="/dashboard"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
                >
                    <ArrowLeftIcon className="h-5 w-5" />
                </Link>
                <div className="text-lg font-semibold">Workflow Automation</div>
                <Link
                    href="/workflow?view=graph"
                    className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 dark:bg-blue-500 dark:hover:bg-blue-400"
                >
                    <PencilSquareIcon className="h-4 w-4" />
                    Editar
                </Link>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300">
                {isRefreshing ? "Atualizando..." : `${nodes.length} etapa(s)`}
                {isLoadingEdges ? " • carregando conexões..." : ""}
                {edgesError ? ` • erro edges: ${edgesError}` : ""}
            </div>

            {errorCode ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-200">
                    Erro ao carregar nodes: {errorCode}
                </div>
            ) : null}

            <div className="space-y-3">
                {sortedNodes.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                        Nenhum node ainda. Toque em "Add Node" para começar.
                    </div>
                ) : null}

                {sortedNodes.map((node, index) => {
                    const edges = edgesBySourceNodeId[node.id] ?? [];
                    const title = firstLine(node.prompt) || `Node #${node.id}`;
                    const subtitle = preview(node.prompt, 90);
                    const updated = formatShortDate(node.updated_at ?? node.created_at);

                    return (
                        <div key={node.id} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            {index < sortedNodes.length - 1 ? (
                                <span className="absolute left-5 top-[76px] block h-10 w-px bg-slate-200 dark:bg-slate-700" aria-hidden />
                            ) : null}
                            <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white dark:bg-blue-500">
                                    {index + 1}
                                </div>
                                <div className="min-w-0 flex-1 space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="text-sm font-semibold leading-tight">{title}</div>
                                        <div className="text-[11px] text-slate-500 dark:text-slate-300">{updated}</div>
                                    </div>
                                    <div className="text-xs text-slate-600 dark:text-slate-300">{subtitle}</div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <EdgeBadge edges={edges} />
                                        <Link
                                            href={`/workflow/${node.id}`}
                                            className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-blue-500 dark:hover:bg-blue-400"
                                        >
                                            Propriedades
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="flex justify-center">
                <button
                    type="button"
                    onClick={() => createNode()}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                    <PlusIcon className="h-5 w-5" />
                    Add Node
                </button>
            </div>
        </section>
    );
}
