"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { type NodeDto, type EdgeDto, type Envelope } from "@/app/workflow/WorkflowTypes";

type Props = {
    initialNodes: NodeDto[];
    initialErrorCode?: string | null;
};

const GRAPH_NODE_W = 240;
const GRAPH_NODE_H = 88;
const GRAPH_COL_GAP = 300;
const GRAPH_ROW_GAP = 140;
const GRAPH_PADDING = 24;

function preview(text: string, max = 120) {
    const normalized = text.replace(/\s+/g, " ").trim();
    if (normalized.length <= max) return normalized;
    return normalized.slice(0, max - 1) + "…";
}

function computeGraphLayout(nodes: NodeDto[], edges: EdgeDto[]) {
    const nodeIds = nodes.map((n) => n.id);
    const nodeIdSet = new Set(nodeIds);

    const outgoing = new Map<number, number[]>();
    const indegree = new Map<number, number>();
    for (const id of nodeIds) {
        outgoing.set(id, []);
        indegree.set(id, 0);
    }

    for (const e of edges) {
        if (!nodeIdSet.has(e.source_node_id) || !nodeIdSet.has(e.destination_node_id)) continue;
        outgoing.get(e.source_node_id)!.push(e.destination_node_id);
        indegree.set(e.destination_node_id, (indegree.get(e.destination_node_id) ?? 0) + 1);
    }

    const queue: number[] = [];
    for (const [id, deg] of indegree.entries()) {
        if (deg === 0) queue.push(id);
    }
    queue.sort((a, b) => a - b);

    const layer = new Map<number, number>();
    for (const id of nodeIds) layer.set(id, 0);

    const remainingIndegree = new Map(indegree);
    while (queue.length) {
        const id = queue.shift()!;
        const nexts = outgoing.get(id) ?? [];
        for (const dest of nexts) {
            layer.set(dest, Math.max(layer.get(dest) ?? 0, (layer.get(id) ?? 0) + 1));
            remainingIndegree.set(dest, (remainingIndegree.get(dest) ?? 0) - 1);
            if ((remainingIndegree.get(dest) ?? 0) === 0) {
                queue.push(dest);
                queue.sort((a, b) => a - b);
            }
        }
    }

    const layers = new Map<number, number[]>();
    let maxLayer = 0;
    for (const id of nodeIds) {
        const l = layer.get(id) ?? 0;
        maxLayer = Math.max(maxLayer, l);
        const list = layers.get(l) ?? [];
        list.push(id);
        layers.set(l, list);
    }
    for (const [l, list] of layers.entries()) {
        list.sort((a, b) => a - b);
        layers.set(l, list);
    }

    const positions = new Map<number, { x: number; y: number; layer: number; row: number }>();
    let maxRows = 0;
    for (let l = 0; l <= maxLayer; l++) {
        const list = layers.get(l) ?? [];
        maxRows = Math.max(maxRows, list.length);
        for (let row = 0; row < list.length; row++) {
            const id = list[row];
            const x = GRAPH_PADDING + l * GRAPH_COL_GAP;
            const y = GRAPH_PADDING + row * GRAPH_ROW_GAP;
            positions.set(id, { x, y, layer: l, row });
        }
    }

    const width =
        GRAPH_PADDING * 2 +
        Math.max(1, maxLayer + 1) * GRAPH_COL_GAP +
        (GRAPH_NODE_W - GRAPH_COL_GAP);
    const height =
        GRAPH_PADDING * 2 +
        Math.max(1, maxRows) * GRAPH_ROW_GAP +
        (GRAPH_NODE_H - GRAPH_ROW_GAP);

    return {
        positions,
        width: Math.max(900, width),
        height: Math.max(520, height),
        maxLayer,
    };
}

export function WorkflowGraphClient({ initialNodes, initialErrorCode }: Props) {
    const [nodes, setNodes] = useState<NodeDto[]>(initialNodes);
    const [errorCode, setErrorCode] = useState<string | null>(initialErrorCode ?? null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const [edgesBySourceNodeId, setEdgesBySourceNodeId] = useState<Record<number, EdgeDto[]>>({});
    const [graphError, setGraphError] = useState<string | null>(null);
    const [isLoadingGraph, setIsLoadingGraph] = useState(false);

    const [activeNodeId, setActiveNodeId] = useState<number | null>(initialNodes?.[0]?.id ?? null);
    const [connectingFromNodeId, setConnectingFromNodeId] = useState<number | null>(null);
    const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);

    const [isCreatingNode, setIsCreatingNode] = useState(false);
    const [createNodeError, setCreateNodeError] = useState<string | null>(null);

    const [isCreatingEdge, setIsCreatingEdge] = useState(false);
    const [createEdgeError, setCreateEdgeError] = useState<string | null>(null);

    const [isDeletingEdgeId, setIsDeletingEdgeId] = useState<number | null>(null);
    const [deleteEdgeError, setDeleteEdgeError] = useState<string | null>(null);

    const containerRef = useRef<HTMLDivElement | null>(null);

    const allEdges = useMemo(() => {
        const lists = Object.values(edgesBySourceNodeId);
        const flat: EdgeDto[] = [];
        for (const list of lists) flat.push(...list);
        return flat;
    }, [edgesBySourceNodeId]);

    const layout = useMemo(() => computeGraphLayout(nodes, allEdges), [nodes, allEdges]);

    const outgoingEdgesForActive = useMemo(() => {
        if (!activeNodeId) return [];
        return (edgesBySourceNodeId[activeNodeId] ?? [])
            .slice()
            .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
    }, [activeNodeId, edgesBySourceNodeId]);

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

            setActiveNodeId((prev) => {
                if (prev && items.some((n) => n.id === prev)) return prev;
                return items?.[0]?.id ?? null;
            });
        } catch {
            if (signal?.aborted) return;
            setErrorCode("NODES_FETCH_FAILED");
        } finally {
            if (!signal?.aborted) setIsRefreshing(false);
        }
    }

    async function loadGraphEdges(signal?: AbortSignal) {
        if (nodes.length === 0) {
            setEdgesBySourceNodeId({});
            return;
        }

        setIsLoadingGraph(true);
        setGraphError(null);
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

            const nextMap: Record<number, EdgeDto[]> = {};
            let firstError: string | null = null;
            for (const r of results) {
                if (!r.ok) {
                    if (!firstError) firstError = r.code;
                    nextMap[r.nodeId] = [];
                    continue;
                }
                nextMap[r.nodeId] = r.edges;
            }

            setEdgesBySourceNodeId(nextMap);
            setGraphError(firstError);
        } catch {
            if (signal?.aborted) return;
            setGraphError("EDGES_FETCH_FAILED");
        } finally {
            if (!signal?.aborted) setIsLoadingGraph(false);
        }
    }

    async function createNodeFromGraph() {
        const prompt = window.prompt("Prompt do novo node:")?.trim() ?? "";
        if (!prompt) return;

        setIsCreatingNode(true);
        setCreateNodeError(null);
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
                setCreateNodeError(payload?.error?.code ?? "NODES_CREATE_FAILED");
                return;
            }

            await rehydrate();
        } catch {
            setCreateNodeError("NODES_CREATE_FAILED");
        } finally {
            setIsCreatingNode(false);
        }
    }

    async function createEdgeFromGraph(sourceNodeId: number, destinationNodeId: number) {
        if (sourceNodeId === destinationNodeId) {
            setCreateEdgeError("DESTINATION_MUST_BE_DIFFERENT");
            return;
        }

        const label = window.prompt("Label da edge:")?.trim() ?? "";
        if (!label) {
            setCreateEdgeError("LABEL_REQUIRED");
            return;
        }

        const priorityRaw = window.prompt("Priority (inteiro):", "0")?.trim() ?? "0";
        const priority = Number(priorityRaw);
        if (!Number.isFinite(priority) || !Number.isInteger(priority)) {
            setCreateEdgeError("INVALID_PRIORITY");
            return;
        }

        setIsCreatingEdge(true);
        setCreateEdgeError(null);
        try {
            const res = await fetch("/api/edges", {
                method: "POST",
                headers: {
                    accept: "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    source_node_id: sourceNodeId,
                    destination_node_id: destinationNodeId,
                    label,
                    priority,
                }),
            });
            const payload = (await res.json().catch(() => null)) as Envelope<unknown> | null;
            if (!res.ok) {
                setCreateEdgeError(payload?.error?.code ?? "EDGES_CREATE_FAILED");
                return;
            }

            const controller = new AbortController();
            await loadGraphEdges(controller.signal);
        } catch {
            setCreateEdgeError("EDGES_CREATE_FAILED");
        } finally {
            setIsCreatingEdge(false);
        }
    }

    async function deleteEdge(edge: EdgeDto) {
        if (!window.confirm(`Deletar edge #${edge.id}?`)) return;

        setIsDeletingEdgeId(edge.id);
        setDeleteEdgeError(null);
        try {
            const res = await fetch(`/api/edges/${edge.id}?source_node_id=${edge.source_node_id}`, {
                method: "DELETE",
                headers: { accept: "application/json" },
            });
            const payload = (await res.json().catch(() => null)) as Envelope<unknown> | null;
            if (!res.ok) {
                setDeleteEdgeError(payload?.error?.code ?? "EDGES_DELETE_FAILED");
                return;
            }

            const controller = new AbortController();
            await loadGraphEdges(controller.signal);
        } catch {
            setDeleteEdgeError("EDGES_DELETE_FAILED");
        } finally {
            setIsDeletingEdgeId(null);
        }
    }

    useEffect(() => {
        const controller = new AbortController();
        rehydrate(controller.signal);
        return () => controller.abort();
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        loadGraphEdges(controller.signal);
        return () => controller.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodes.map((n) => n.id).join(",")]);

    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") {
                setConnectingFromNodeId(null);
                setCursor(null);
            }
        }
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    function updateCursorFromEvent(ev: React.MouseEvent) {
        const el = containerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        setCursor({ x: ev.clientX - rect.left, y: ev.clientY - rect.top });
    }

    const plusX = GRAPH_PADDING + (layout.maxLayer + 1) * GRAPH_COL_GAP;
    const plusY = GRAPH_PADDING;

    return (
        <section className="flex flex-col gap-4">
            {errorCode ? (
                <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-transparent dark:text-red-300">
                    Erro ao carregar nodes: {errorCode}
                </div>
            ) : null}

            <div className="rounded border p-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-black dark:text-white">Workflow (Grafo)</div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => rehydrate()}
                            className="rounded border px-3 py-1 text-sm text-black dark:text-white"
                        >
                            {isRefreshing ? "Atualizando…" : "Recarregar nodes"}
                        </button>
                        <button
                            type="button"
                            onClick={() => loadGraphEdges()}
                            className="rounded border px-3 py-1 text-sm text-black dark:text-white"
                        >
                            {isLoadingGraph ? "Atualizando…" : "Recarregar edges"}
                        </button>
                    </div>
                </div>

                <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                    {nodes.length} node(s) • {allEdges.length} edge(s)
                    {graphError ? ` • erro: ${graphError}` : ""}
                    {connectingFromNodeId ? " • modo: criando edge (ESC cancela)" : ""}
                </div>

                {createNodeError ? (
                    <div className="mt-2 text-xs text-red-700 dark:text-red-300">Erro: {createNodeError}</div>
                ) : null}
                {createEdgeError ? (
                    <div className="mt-2 text-xs text-red-700 dark:text-red-300">Erro: {createEdgeError}</div>
                ) : null}
                {deleteEdgeError ? (
                    <div className="mt-2 text-xs text-red-700 dark:text-red-300">Erro: {deleteEdgeError}</div>
                ) : null}

                <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_320px]">
                    <div
                        ref={containerRef}
                        className="relative overflow-auto rounded border"
                        style={{ height: 620 }}
                        onMouseMove={(ev) => {
                            if (!connectingFromNodeId) return;
                            updateCursorFromEvent(ev);
                        }}
                        onMouseDown={(ev) => {
                            if (!connectingFromNodeId) return;
                            // clicking on background cancels
                            if (ev.target === ev.currentTarget) {
                                setConnectingFromNodeId(null);
                                setCursor(null);
                            }
                        }}
                    >
                        <div className="relative" style={{ width: layout.width + GRAPH_COL_GAP, height: layout.height }}>
                            <svg
                                className="absolute inset-0 h-full w-full text-zinc-400 dark:text-zinc-600"
                                viewBox={`0 0 ${layout.width + GRAPH_COL_GAP} ${layout.height}`}
                                preserveAspectRatio="none"
                            >
                                <defs>
                                    <marker id="arrow" markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto">
                                        <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
                                    </marker>
                                </defs>

                                {allEdges.map((e) => {
                                    const a = layout.positions.get(e.source_node_id);
                                    const b = layout.positions.get(e.destination_node_id);
                                    if (!a || !b) return null;

                                    const x1 = a.x + GRAPH_NODE_W;
                                    const y1 = a.y + GRAPH_NODE_H / 2;
                                    const x2 = b.x;
                                    const y2 = b.y + GRAPH_NODE_H / 2;

                                    const dx = Math.max(80, Math.min(220, Math.abs(x2 - x1) / 2));
                                    const c1x = x1 + dx;
                                    const c1y = y1;
                                    const c2x = x2 - dx;
                                    const c2y = y2;

                                    return (
                                        <path
                                            key={e.id}
                                            d={`M ${x1} ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`}
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth={2}
                                            markerEnd="url(#arrow)"
                                        />
                                    );
                                })}

                                {connectingFromNodeId && cursor ? (() => {
                                    const a = layout.positions.get(connectingFromNodeId);
                                    if (!a) return null;
                                    const x1 = a.x + GRAPH_NODE_W;
                                    const y1 = a.y + GRAPH_NODE_H / 2;
                                    const x2 = cursor.x;
                                    const y2 = cursor.y;
                                    const dx = Math.max(80, Math.min(220, Math.abs(x2 - x1) / 2));
                                    const c1x = x1 + dx;
                                    const c1y = y1;
                                    const c2x = x2 - dx;
                                    const c2y = y2;
                                    return (
                                        <path
                                            d={`M ${x1} ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`}
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth={2}
                                            strokeDasharray="6 6"
                                        />
                                    );
                                })() : null}
                            </svg>

                            {nodes.map((n) => {
                                const p = layout.positions.get(n.id);
                                if (!p) return null;
                                const isActive = activeNodeId === n.id;
                                return (
                                    <div
                                        key={n.id}
                                        className={`absolute rounded border bg-white p-3 text-black dark:bg-transparent dark:text-white ${
                                            isActive ? "ring-1 ring-zinc-400 dark:ring-zinc-600" : ""
                                        }`}
                                        style={{ left: p.x, top: p.y, width: GRAPH_NODE_W, height: GRAPH_NODE_H }}
                                        onMouseDown={(ev) => {
                                            ev.stopPropagation();
                                            setActiveNodeId(n.id);
                                            if (connectingFromNodeId && connectingFromNodeId !== n.id) {
                                                void createEdgeFromGraph(connectingFromNodeId, n.id);
                                                setConnectingFromNodeId(null);
                                                setCursor(null);
                                            }
                                        }}
                                    >
                                        <div className="absolute left-[-6px] top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border bg-white dark:bg-transparent" />
                                        <button
                                            type="button"
                                            title="Criar edge a partir deste node"
                                            className="absolute right-[-10px] top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border bg-white text-xs text-black dark:bg-transparent dark:text-white"
                                            onMouseDown={(ev) => {
                                                ev.stopPropagation();
                                                setActiveNodeId(n.id);
                                                setConnectingFromNodeId(n.id);
                                                setCreateEdgeError(null);
                                                setDeleteEdgeError(null);
                                            }}
                                        >
                                            +
                                        </button>

                                        <div className="flex items-center justify-between gap-2">
                                            <div className="text-sm font-semibold">Node #{n.id}</div>
                                            <div className="text-[10px] text-zinc-600 dark:text-zinc-300">
                                                {n.updated_at ?? n.created_at ?? ""}
                                            </div>
                                        </div>
                                        <div className="mt-1 line-clamp-2 text-xs text-zinc-700 dark:text-zinc-200">
                                            {preview(n.prompt)}
                                        </div>

                                        <div className="mt-2 flex items-center justify-between gap-2">
                                            <Link
                                                href={`/workflow/${n.id}`}
                                                className="rounded border px-2 py-1 text-[11px] text-black dark:text-white"
                                                onMouseDown={(ev) => ev.stopPropagation()}
                                            >
                                                Propriedades
                                            </Link>
                                            <div className="text-[11px] text-zinc-600 dark:text-zinc-300">
                                                {connectingFromNodeId === n.id ? "Selecionar destino…" : ""}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* New node button beside the last column */}
                            <button
                                type="button"
                                className="absolute rounded border bg-white p-3 text-left text-black disabled:opacity-60 dark:bg-transparent dark:text-white"
                                style={{ left: plusX, top: plusY, width: GRAPH_NODE_W, height: GRAPH_NODE_H }}
                                onMouseDown={(ev) => {
                                    ev.stopPropagation();
                                    void createNodeFromGraph();
                                }}
                                disabled={isCreatingNode}
                                title="Criar novo node"
                            >
                                <div className="text-sm font-semibold">
                                    {isCreatingNode ? "Criando…" : "+ Novo node"}
                                </div>
                                <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                                    Ao lado do último node
                                </div>
                            </button>
                        </div>
                    </div>

                    <div className="rounded border p-3">
                        <div className="text-sm font-semibold text-black dark:text-white">Edge(s) do node</div>
                        <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                            {activeNodeId ? `Node #${activeNodeId}` : "Selecione um node"}
                        </div>

                        {activeNodeId ? (
                            <div className="mt-2">
                                <div className="text-xs text-zinc-600 dark:text-zinc-300">
                                    Clique no botão “+” do node para criar uma edge.
                                </div>

                                <ul className="mt-2 divide-y rounded border">
                                    {outgoingEdgesForActive.map((e) => (
                                        <li key={e.id} className="flex items-center justify-between gap-2 px-2 py-2">
                                            <div className="min-w-0">
                                                <div className="truncate text-xs font-semibold text-black dark:text-white">
                                                    → Node #{e.destination_node_id}
                                                </div>
                                                <div className="truncate text-[11px] text-zinc-600 dark:text-zinc-300">
                                                    {e.label} • priority {e.priority}
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => deleteEdge(e)}
                                                disabled={isDeletingEdgeId === e.id}
                                                className="rounded border px-2 py-1 text-[11px] text-black disabled:opacity-60 dark:text-white"
                                            >
                                                {isDeletingEdgeId === e.id ? "…" : "Deletar"}
                                            </button>
                                        </li>
                                    ))}
                                    {outgoingEdgesForActive.length === 0 ? (
                                        <li className="px-2 py-2 text-xs text-zinc-500 dark:text-zinc-400">
                                            Nenhuma edge.
                                        </li>
                                    ) : null}
                                </ul>

                                {isCreatingEdge ? (
                                    <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">
                                        Criando edge…
                                    </div>
                                ) : null}
                            </div>
                        ) : (
                            <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                                Clique em um node para ver as edges.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
