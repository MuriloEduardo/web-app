"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
    ArrowLeftIcon,
    PlusIcon,
    PencilSquareIcon,
} from "@heroicons/react/24/solid";

import { type NodeDto, type EdgeDto, type Envelope } from "@/app/workflow/WorkflowTypes";

const palette = [
    "bg-emerald-500",
    "bg-sky-500",
    "bg-violet-500",
    "bg-amber-500",
    "bg-indigo-500",
];

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
        return <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600">Sem conexões</span>;
    }

    const [first] = edges;
    const label = first?.label?.trim();
    const dest = first?.destination_node_id;

    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
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
        <section className="mx-auto w-full max-w-xl rounded-3xl bg-gradient-to-b from-slate-50 to-white px-4 py-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <Link
                    href="/dashboard"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow ring-1 ring-slate-200"
                >
                    <ArrowLeftIcon className="h-5 w-5 text-slate-700" />
                </Link>
                <div className="text-base font-semibold text-slate-900">Workflow Automation</div>
                <Link
                    href="/workflow?view=graph"
                    className="flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-sm font-medium text-white shadow"
                >
                    <PencilSquareIcon className="h-4 w-4" />
                    Editar
                </Link>
            </div>

            <div className="mt-1 text-xs text-slate-500">
                {isRefreshing ? "Atualizando..." : `${nodes.length} etapa(s)`}
                {isLoadingEdges ? " • carregando conexões..." : ""}
                {edgesError ? ` • erro edges: ${edgesError}` : ""}
            </div>

            {errorCode ? (
                <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                    Erro ao carregar nodes: {errorCode}
                </div>
            ) : null}

            <div className="mt-6 space-y-4">
                {sortedNodes.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-600">
                        Nenhum node ainda. Toque em "Add Node" para começar.
                    </div>
                ) : null}

                {sortedNodes.map((node, index) => {
                    const edges = edgesBySourceNodeId[node.id] ?? [];
                    const color = palette[index % palette.length];
                    const title = firstLine(node.prompt) || `Node #${node.id}`;
                    const subtitle = preview(node.prompt, 90);
                    const updated = formatShortDate(node.updated_at ?? node.created_at);

                    return (
                        <div key={node.id} className="relative pl-7">
                            {index < sortedNodes.length - 1 ? (
                                <span className="absolute left-6 top-[72px] block h-[36px] w-px bg-slate-200" aria-hidden />
                            ) : null}
                            <div className="flex items-start gap-3 rounded-2xl bg-white px-4 py-4 shadow-md ring-1 ring-slate-100">
                                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-white ${color}`}>
                                    <span className="text-base font-semibold">{index + 1}</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="text-sm font-semibold text-slate-900">{title}</div>
                                        <div className="text-[11px] text-slate-400">{updated}</div>
                                    </div>
                                    <div className="mt-1 line-clamp-2 text-xs text-slate-600">{subtitle}</div>
                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                        <EdgeBadge edges={edges} />
                                        <Link
                                            href={`/workflow/${node.id}`}
                                            className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-medium text-white shadow"
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

            <div className="mt-6 flex justify-center">
                <button
                    type="button"
                    onClick={() => createNode()}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow ring-1 ring-slate-200"
                >
                    <PlusIcon className="h-5 w-5 text-slate-700" />
                    Add Node
                </button>
            </div>
        </section>
    );
}
