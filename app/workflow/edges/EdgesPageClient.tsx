"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useConfirm } from "@/app/components/ConfirmProvider";
import { type EdgeDto, type NodeDto, type Envelope } from "@/app/workflow/WorkflowTypes";

type Props = {
    nodes: NodeDto[];
    nodesErrorCode: string | null;
    selectedSourceId: number | null;
    initialEdges: EdgeDto[];
    edgesErrorCode: string | null;
};

function numeric(value: string) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

export function EdgesPageClient({ nodes, nodesErrorCode, selectedSourceId, initialEdges, edgesErrorCode }: Props) {
    const router = useRouter();
    const confirm = useConfirm();

    const [sourceId, setSourceId] = useState<number | null>(selectedSourceId);
    const [edges, setEdges] = useState<EdgeDto[]>(initialEdges);
    const [edgeError, setEdgeError] = useState<string | null>(edgesErrorCode ?? null);
    const [isLoading, setIsLoading] = useState(false);

    const [createDestination, setCreateDestination] = useState("");
    const [createLabel, setCreateLabel] = useState("");
    const [createPriority, setCreatePriority] = useState("0");
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    const [editingId, setEditingId] = useState<number | null>(null);
    const [editDestination, setEditDestination] = useState("");
    const [editLabel, setEditLabel] = useState("");
    const [editPriority, setEditPriority] = useState("0");
    const [isSaving, setIsSaving] = useState(false);

    const [deletingId, setDeletingId] = useState<number | null>(null);

    useEffect(() => {
        setSourceId(selectedSourceId);
        setEdges(initialEdges);
        setEdgeError(edgesErrorCode ?? null);
    }, [selectedSourceId, initialEdges, edgesErrorCode]);

    async function reloadEdges(nextSourceId: number | null) {
        if (!nextSourceId) return;
        setIsLoading(true);
        setEdgeError(null);
        try {
            const res = await fetch(`/api/edges?source_node_id=${nextSourceId}`, {
                headers: { accept: "application/json" },
            });
            const payload = (await res.json().catch(() => null)) as Envelope<EdgeDto[]> | null;
            if (!res.ok) {
                setEdgeError(payload?.error?.code ?? "EDGES_FETCH_FAILED");
                setEdges([]);
                return;
            }
            setEdges(Array.isArray(payload?.data) ? payload!.data! : []);
        } catch {
            setEdgeError("EDGES_FETCH_FAILED");
            setEdges([]);
        } finally {
            setIsLoading(false);
        }
    }

    function handleChangeSource(next: string) {
        if (!next) {
            setSourceId(null);
            setEdges([]);
            router.push("/workflow/edges");
            return;
        }
        const parsed = numeric(next);
        setSourceId(parsed);
        router.push(`/workflow/edges?source_node_id=${parsed}`);
    }

    function startEdit(edge: EdgeDto) {
        setEditingId(edge.id);
        setEditDestination(String(edge.destination_node_id));
        setEditLabel(edge.label ?? "");
        setEditPriority(String(edge.priority ?? 0));
    }

    function cancelEdit() {
        setEditingId(null);
        setEditDestination("");
        setEditLabel("");
        setEditPriority("0");
    }

    async function saveEdge(edgeId: number) {
        if (!sourceId) return;
        const destination_node_id = Number(editDestination);
        const label = editLabel.trim();
        const priority = Number(editPriority.trim() || "0");

        if (!destination_node_id || destination_node_id <= 0) {
            setEdgeError("INVALID_DESTINATION_NODE_ID");
            return;
        }
        if (!label) {
            setEdgeError("LABEL_REQUIRED");
            return;
        }
        if (!Number.isInteger(priority)) {
            setEdgeError("INVALID_PRIORITY");
            return;
        }

        setIsSaving(true);
        setEdgeError(null);
        try {
            const res = await fetch(`/api/edges/${edgeId}`, {
                method: "PUT",
                headers: {
                    accept: "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    source_node_id: sourceId,
                    destination_node_id,
                    label,
                    priority,
                }),
            });
            const payload = (await res.json().catch(() => null)) as Envelope<EdgeDto> | null;
            if (!res.ok) {
                setEdgeError(payload?.error?.code ?? "EDGES_UPDATE_FAILED");
                return;
            }
            cancelEdit();
            await reloadEdges(sourceId);
        } catch {
            setEdgeError("EDGES_UPDATE_FAILED");
        } finally {
            setIsSaving(false);
        }
    }

    async function deleteEdge(edgeId: number) {
        if (!sourceId) return;
        const ok = await confirm(`Remover edge #${edgeId}?`);
        if (!ok) return;
        setDeletingId(edgeId);
        setEdgeError(null);
        try {
            const res = await fetch(`/api/edges/${edgeId}?source_node_id=${sourceId}`, {
                method: "DELETE",
                headers: { accept: "application/json" },
            });
            const payload = (await res.json().catch(() => null)) as Envelope<unknown> | null;
            if (!res.ok) {
                setEdgeError(payload?.error?.code ?? "EDGES_DELETE_FAILED");
                return;
            }
            await reloadEdges(sourceId);
        } catch {
            setEdgeError("EDGES_DELETE_FAILED");
        } finally {
            setDeletingId(null);
        }
    }

    async function createEdge() {
        if (!sourceId) {
            setCreateError("SOURCE_NODE_ID_REQUIRED");
            return;
        }
        const destination_node_id = Number(createDestination);
        const label = createLabel.trim();
        const priority = Number(createPriority.trim() || "0");

        if (!destination_node_id || destination_node_id <= 0) {
            setCreateError("INVALID_DESTINATION_NODE_ID");
            return;
        }
        if (!label) {
            setCreateError("LABEL_REQUIRED");
            return;
        }
        if (!Number.isInteger(priority)) {
            setCreateError("INVALID_PRIORITY");
            return;
        }

        setIsCreating(true);
        setCreateError(null);
        try {
            const res = await fetch("/api/edges", {
                method: "POST",
                headers: {
                    accept: "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    source_node_id: sourceId,
                    destination_node_id,
                    label,
                    priority,
                }),
            });
            const payload = (await res.json().catch(() => null)) as Envelope<EdgeDto> | null;
            if (!res.ok) {
                setCreateError(payload?.error?.code ?? "EDGES_CREATE_FAILED");
                return;
            }
            setCreateDestination("");
            setCreateLabel("");
            setCreatePriority("0");
            await reloadEdges(sourceId);
        } catch {
            setCreateError("EDGES_CREATE_FAILED");
        } finally {
            setIsCreating(false);
        }
    }

    return (
        <section className="space-y-5">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <div className="text-xs text-slate-600">Workflow / Edges</div>
                    <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Edges</h1>
                </div>
                <Link href="/workflow/nodes" className="rounded border px-3 py-1 text-sm text-slate-900 dark:text-white">
                    Nodes
                </Link>
            </div>

            <div className="rounded border p-4">
                <label className="text-sm font-medium text-slate-800">
                    Node de origem
                    <select
                        value={sourceId ?? ""}
                        onChange={(e) => handleChangeSource(e.target.value)}
                        className="mt-1 w-full max-w-sm rounded border px-3 py-2 text-sm text-slate-900 dark:text-white"
                    >
                        <option value="">Selecione um node</option>
                        {nodes.map((n) => (
                            <option key={n.id} value={n.id}>
                                #{n.id} • {n.prompt}
                            </option>
                        ))}
                    </select>
                </label>
                {nodesErrorCode ? (
                    <div className="mt-2 text-sm text-red-700">Erro ao carregar nodes: {nodesErrorCode}</div>
                ) : null}
            </div>

            {sourceId ? (
                <div className="rounded border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">Criar edge</div>
                        <button
                            type="button"
                            onClick={() => reloadEdges(sourceId)}
                            className="rounded border px-3 py-1 text-xs text-slate-900 dark:text-white"
                        >
                            Recarregar
                        </button>
                    </div>
                    <div className="mt-3 grid gap-2 md:grid-cols-4">
                        <label className="text-xs text-slate-700">
                            Destino
                            <input
                                value={createDestination}
                                onChange={(e) => setCreateDestination(e.target.value)}
                                className="mt-1 w-full rounded border px-3 py-2 text-sm text-slate-900 dark:text-white"
                                placeholder="id"
                                inputMode="numeric"
                            />
                        </label>
                        <label className="text-xs text-slate-700 md:col-span-2">
                            Label
                            <input
                                value={createLabel}
                                onChange={(e) => setCreateLabel(e.target.value)}
                                className="mt-1 w-full rounded border px-3 py-2 text-sm text-slate-900 dark:text-white"
                            />
                        </label>
                        <label className="text-xs text-slate-700">
                            Prioridade
                            <input
                                value={createPriority}
                                onChange={(e) => setCreatePriority(e.target.value)}
                                className="mt-1 w-full rounded border px-3 py-2 text-sm text-slate-900 dark:text-white"
                                inputMode="numeric"
                            />
                        </label>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => createEdge()}
                            disabled={isCreating}
                            className="rounded border px-3 py-2 text-sm text-slate-900 dark:text-white disabled:opacity-60"
                        >
                            {isCreating ? "Salvando..." : "Criar"}
                        </button>
                        {createError ? <span className="text-sm text-red-700">Erro: {createError}</span> : null}
                    </div>
                </div>
            ) : null}

            {sourceId ? (
                <div className="rounded border p-4">
                    <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">Edges do node {sourceId}</div>
                        {isLoading ? <span className="text-xs text-slate-600">Carregando...</span> : null}
                    </div>
                    {edgeError ? (
                        <div className="mt-2 text-sm text-red-700">Erro: {edgeError}</div>
                    ) : null}

                    <div className="mt-3 overflow-hidden rounded border">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
                                <tr>
                                    <th className="px-3 py-2">ID</th>
                                    <th className="px-3 py-2">Destino</th>
                                    <th className="px-3 py-2">Label</th>
                                    <th className="px-3 py-2">Prioridade</th>
                                    <th className="px-3 py-2">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {edges.map((e) => (
                                    <tr key={e.id} className="border-t">
                                        <td className="px-3 py-2 align-top text-slate-900 dark:text-white">{e.id}</td>
                                        <td className="px-3 py-2 align-top text-slate-900 dark:text-white">
                                            {editingId === e.id ? (
                                                <input
                                                    value={editDestination}
                                                    onChange={(ev) => setEditDestination(ev.target.value)}
                                                    className="w-full rounded border px-2 py-1 text-sm text-slate-900 dark:text-white"
                                                />
                                            ) : (
                                                e.destination_node_id
                                            )}
                                        </td>
                                        <td className="px-3 py-2 align-top text-slate-900 dark:text-white">
                                            {editingId === e.id ? (
                                                <input
                                                    value={editLabel}
                                                    onChange={(ev) => setEditLabel(ev.target.value)}
                                                    className="w-full rounded border px-2 py-1 text-sm text-slate-900 dark:text-white"
                                                />
                                            ) : (
                                                e.label
                                            )}
                                        </td>
                                        <td className="px-3 py-2 align-top text-slate-900 dark:text-white">
                                            {editingId === e.id ? (
                                                <input
                                                    value={editPriority}
                                                    onChange={(ev) => setEditPriority(ev.target.value)}
                                                    className="w-full rounded border px-2 py-1 text-sm text-slate-900 dark:text-white"
                                                    inputMode="numeric"
                                                />
                                            ) : (
                                                e.priority
                                            )}
                                        </td>
                                        <td className="px-3 py-2 align-top">
                                            {editingId === e.id ? (
                                                <div className="flex flex-wrap gap-2 text-xs">
                                                    <button
                                                        type="button"
                                                        onClick={() => saveEdge(e.id)}
                                                        disabled={isSaving}
                                                        className="rounded border px-2 py-1 text-slate-900 dark:text-white disabled:opacity-60"
                                                    >
                                                        {isSaving ? "Salvando..." : "Salvar"}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => cancelEdit()}
                                                        className="rounded border px-2 py-1 text-slate-900 dark:text-white"
                                                    >
                                                        Cancelar
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex flex-wrap gap-2 text-xs">
                                                    <Link
                                                        href={`/workflow/edges/${e.id}?source_node_id=${sourceId}`}
                                                        className="rounded border px-2 py-1 text-slate-900 dark:text-white"
                                                    >
                                                        Condições
                                                    </Link>
                                                    <button
                                                        type="button"
                                                        onClick={() => startEdit(e)}
                                                        className="rounded border px-2 py-1 text-slate-900 dark:text-white"
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteEdge(e.id)}
                                                        disabled={deletingId === e.id}
                                                        className="rounded border border-red-300 px-2 py-1 text-red-700 disabled:opacity-60"
                                                    >
                                                        {deletingId === e.id ? "Removendo..." : "Excluir"}
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {edges.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-3 py-6 text-center text-sm text-slate-600">
                                            Nenhuma edge para este node.
                                        </td>
                                    </tr>
                                ) : null}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="rounded border p-4 text-sm text-slate-700">Selecione um node para ver edges.</div>
            )}
        </section>
    );
}
