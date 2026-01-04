"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { type NodeDto, type EdgeDto, type Envelope } from "@/app/workflow/WorkflowTypes";
import { useConfirm } from "@/app/components/ConfirmProvider";
import Modal from "@/app/components/Modal";

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
    const confirm = useConfirm();
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
    const [nodeModalOpen, setNodeModalOpen] = useState(false);
    const [nodePrompt, setNodePrompt] = useState("");

    const [isCreatingEdge, setIsCreatingEdge] = useState(false);
    const [createEdgeError, setCreateEdgeError] = useState<string | null>(null);
    const [edgeModalOpen, setEdgeModalOpen] = useState(false);
    const [edgeLabel, setEdgeLabel] = useState("");
    const [edgePriority, setEdgePriority] = useState("0");
    const [edgeSourceId, setEdgeSourceId] = useState<number | null>(null);
    const [edgeDestId, setEdgeDestId] = useState<number | null>(null);

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

    function startCreateNode() {
        setCreateNodeError(null);
        setNodePrompt("");
        setNodeModalOpen(true);
    }

    async function submitCreateNode() {
        const prompt = nodePrompt.trim();
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

            setNodeModalOpen(false);
            setNodePrompt("");
            await rehydrate();
        } catch {
            setCreateNodeError("NODES_CREATE_FAILED");
        } finally {
            setIsCreatingNode(false);
        }
    }

    function startEdgeModal(sourceNodeId: number, destinationNodeId: number) {
        if (sourceNodeId === destinationNodeId) {
            setCreateEdgeError("DESTINATION_MUST_BE_DIFFERENT");
            setConnectingFromNodeId(null);
            setCursor(null);
            return;
        }

        setEdgeSourceId(sourceNodeId);
        setEdgeDestId(destinationNodeId);
        setEdgeLabel("");
        setEdgePriority("0");
        setEdgeModalOpen(true);
        setConnectingFromNodeId(null);
        setCursor(null);
        setCreateEdgeError(null);
    }

    async function submitEdgeForm() {
        const sourceNodeId = edgeSourceId;
        const destinationNodeId = edgeDestId;
        if (!sourceNodeId || !destinationNodeId) return;

        const label = edgeLabel.trim();
        if (!label) {
            setCreateEdgeError("LABEL_REQUIRED");
            return;
        }

        const priority = Number(edgePriority.trim() || "0");
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

            setEdgeModalOpen(false);
            setEdgeSourceId(null);
            setEdgeDestId(null);
            setEdgeLabel("");
            setEdgePriority("0");

            const controller = new AbortController();
            await loadGraphEdges(controller.signal);
        } catch {
            setCreateEdgeError("EDGES_CREATE_FAILED");
        } finally {
            setIsCreatingEdge(false);
        }
    }

    async function deleteEdge(edge: EdgeDto) {
        const ok = await confirm(`Deletar edge #${edge.id}?`);
        if (!ok) return;

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
        <section className="space-y-4">
            {errorCode ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-200">
                    Erro ao carregar nodes: {errorCode}
                </div>
            ) : null}

            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-base font-semibold">Workflow (Grafo)</div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => rehydrate()}
                            className="rounded border border-slate-300 px-3 py-1 text-sm text-slate-900 shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
                        >
                            {isRefreshing ? "Atualizando…" : "Recarregar nodes"}
                        </button>
                        <button
                            type="button"
                            onClick={() => loadGraphEdges()}
                            className="rounded border border-slate-300 px-3 py-1 text-sm text-slate-900 shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
                        >
                            {isLoadingGraph ? "Atualizando…" : "Recarregar edges"}
                        </button>
                    </div>
                </div>

                <div className="text-xs text-slate-600 dark:text-gray-300">
                    {nodes.length} node(s) • {allEdges.length} edge(s)
                    {graphError ? ` • erro: ${graphError}` : ""}
                    {connectingFromNodeId ? " • modo: criando edge (ESC cancela)" : ""}
                </div>

                {createNodeError ? (
                    <div className="text-xs text-rose-600 dark:text-rose-300">Erro: {createNodeError}</div>
                ) : null}
                {createEdgeError ? (
                    <div className="text-xs text-rose-600 dark:text-rose-300">Erro: {createEdgeError}</div>
                ) : null}
                {deleteEdgeError ? (
                    <div className="text-xs text-rose-600 dark:text-rose-300">Erro: {deleteEdgeError}</div>
                ) : null}

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div
                        ref={containerRef}
                        className="relative overflow-auto rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                        style={{ height: 620 }}
                        onMouseMove={(ev) => {
                            if (!connectingFromNodeId) return;
                            updateCursorFromEvent(ev);
                        }}
                        onMouseDown={(ev) => {
                            if (!connectingFromNodeId) return;
                            if (ev.target === ev.currentTarget) {
                                setConnectingFromNodeId(null);
                                setCursor(null);
                            }
                        }}
                    >
                        <div style={{ position: "relative", width: layout.width + GRAPH_COL_GAP, height: layout.height }}>
                            <svg
                                className="absolute inset-0 h-full w-full text-slate-400 dark:text-slate-500"
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
                                        className={`absolute rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900/70 ${isActive ? "ring-2 ring-blue-400 dark:ring-blue-500" : ""}`}
                                        style={{ left: p.x, top: p.y, width: GRAPH_NODE_W, height: GRAPH_NODE_H }}
                                        onMouseDown={(ev) => {
                                            ev.stopPropagation();
                                            setActiveNodeId(n.id);
                                            if (connectingFromNodeId && connectingFromNodeId !== n.id) {
                                                startEdgeModal(connectingFromNodeId, n.id);
                                            }
                                        }}
                                    >
                                        <div className="absolute left-[-6px] top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800" />
                                        <button
                                            type="button"
                                            title="Criar edge a partir deste node"
                                            className="absolute right-[-10px] top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300 bg-white text-xs text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
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
                                        <div className="flex items-center justify-between gap-2 text-xs">
                                            <div className="font-semibold">Node #{n.id}</div>
                                            <div className="text-[10px] text-slate-500 dark:text-gray-300">{n.updated_at ?? n.created_at ?? ""}</div>
                                        </div>
                                        <div className="mt-1 text-xs text-gray-100 line-clamp-2 dark:text-slate-200">
                                            {preview(n.prompt)}
                                        </div>
                                        <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
                                            <Link
                                                href={`/workflow/${n.id}`}
                                                className="rounded border border-slate-300 px-2 py-1 text-slate-900 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
                                                onMouseDown={(ev) => ev.stopPropagation()}
                                            >
                                                Propriedades
                                            </Link>
                                            <div className="text-slate-500 dark:text-gray-300">{connectingFromNodeId === n.id ? "Selecionar destino…" : ""}</div>
                                        </div>
                                    </div>
                                );
                            })}

                            <button
                                type="button"
                                className="absolute rounded-lg border border-dashed border-slate-300 bg-white p-3 text-left text-sm text-slate-900 shadow-sm transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:bg-slate-800"
                                style={{ left: plusX, top: plusY, width: GRAPH_NODE_W, height: GRAPH_NODE_H }}
                                onMouseDown={(ev) => {
                                    ev.stopPropagation();
                                    startCreateNode();
                                }}
                                disabled={isCreatingNode}
                                title="Criar novo node"
                            >
                                <div className="font-semibold">{isCreatingNode ? "Criando…" : "+ Novo node"}</div>
                                <div className="mt-1 text-xs text-slate-600 dark:text-gray-300">Ao lado do último node</div>
                            </button>
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                        <div className="text-sm font-semibold">Edge(s) do node</div>
                        <div className="text-xs text-slate-600 dark:text-gray-300">{activeNodeId ? `Node #${activeNodeId}` : "Selecione um node"}</div>

                        {activeNodeId ? (
                            <div className="mt-2 space-y-2 text-xs text-gray-100 dark:text-slate-200">
                                <div>Clique no botão “+” do node para criar uma edge.</div>

                                <ul className="divide-y divide-slate-200 overflow-hidden rounded border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                                    {outgoingEdgesForActive.map((e) => (
                                        <li key={e.id} className="flex items-center justify-between gap-2 px-2 py-2">
                                            <div className="min-w-0">
                                                <div className="truncate font-semibold">→ Node #{e.destination_node_id}</div>
                                                <div className="truncate text-[11px] text-slate-500 dark:text-gray-300">{e.label} • priority {e.priority}</div>
                                            </div>
                                            <div className="flex items-center gap-2 text-[11px]">
                                                <Link
                                                    href={`/workflow/edges/${e.id}?source_node_id=${e.source_node_id}`}
                                                    className="rounded border border-slate-300 px-2 py-1 text-slate-900 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
                                                >
                                                    Condições
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={() => deleteEdge(e)}
                                                    disabled={isDeletingEdgeId === e.id}
                                                    className="rounded border border-slate-300 px-2 py-1 text-slate-900 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
                                                >
                                                    {isDeletingEdgeId === e.id ? "…" : "Deletar"}
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                    {outgoingEdgesForActive.length === 0 ? <li className="px-2 py-2 text-slate-500 dark:text-gray-300">Nenhuma edge.</li> : null}
                                </ul>

                                {isCreatingEdge ? <div>Criando edge…</div> : null}
                            </div>
                        ) : (
                            <div className="mt-2 text-xs text-slate-500 dark:text-gray-300">Clique em um node para ver as edges.</div>
                        )}
                    </div>
                </div>
            </div>

            <Modal
                open={nodeModalOpen}
                title="Novo node"
                onClose={() => setNodeModalOpen(false)}
                footer={
                    <>
                        <button
                            type="button"
                            onClick={() => setNodeModalOpen(false)}
                            className="rounded border border-slate-300 px-3 py-1 text-sm text-gray-100 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={() => submitCreateNode()}
                            className="rounded bg-blue-600 px-3 py-1 text-sm font-semibold text-white transition hover:bg-blue-500"
                            disabled={isCreatingNode}
                        >
                            {isCreatingNode ? "Criando…" : "Criar"}
                        </button>
                    </>
                }
            >
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-100 dark:text-slate-200">Prompt</label>
                    <textarea
                        value={nodePrompt}
                        onChange={(e) => setNodePrompt(e.target.value)}
                        className="min-h-[120px] w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        placeholder="Descreva o comportamento do node"
                    />
                </div>
            </Modal>

            <Modal
                open={edgeModalOpen}
                title={`Criar edge${edgeSourceId ? ` do node #${edgeSourceId}` : ""}${edgeDestId ? ` → #${edgeDestId}` : ""}`}
                onClose={() => {
                    setEdgeModalOpen(false);
                    setEdgeSourceId(null);
                    setEdgeDestId(null);
                    setEdgeLabel("");
                    setEdgePriority("0");
                    setCreateEdgeError(null);
                }}
                footer={
                    <>
                        <button
                            type="button"
                            onClick={() => {
                                setEdgeModalOpen(false);
                                setEdgeSourceId(null);
                                setEdgeDestId(null);
                                setEdgeLabel("");
                                setEdgePriority("0");
                                setCreateEdgeError(null);
                            }}
                            className="rounded border border-slate-300 px-3 py-1 text-sm text-gray-100 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={() => submitEdgeForm()}
                            className="rounded bg-blue-600 px-3 py-1 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
                            disabled={isCreatingEdge}
                        >
                            {isCreatingEdge ? "Criando…" : "Criar edge"}
                        </button>
                    </>
                }
            >
                <div className="space-y-3">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-100 dark:text-slate-200">Label</label>
                        <input
                            value={edgeLabel}
                            onChange={(e) => setEdgeLabel(e.target.value)}
                            className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            placeholder="Nome da edge"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-100 dark:text-slate-200">Prioridade (inteiro)</label>
                        <input
                            value={edgePriority}
                            onChange={(e) => setEdgePriority(e.target.value)}
                            className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            placeholder="0"
                        />
                    </div>
                </div>
            </Modal>
        </section>
    );
}
