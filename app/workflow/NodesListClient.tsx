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

    const [newPrompt, setNewPrompt] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    const [editingId, setEditingId] = useState<number | null>(null);
    const [editPrompt, setEditPrompt] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

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

    async function createNode() {
        const prompt = newPrompt.trim();
        if (!prompt) {
            setCreateError("PROMPT_REQUIRED");
            return;
        }

        setIsCreating(true);
        setCreateError(null);
        try {
            const res = await fetch("/api/nodes", {
                method: "POST",
                headers: {
                    accept: "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ prompt }),
            });

            const payload = (await res
                .json()
                .catch(() => null)) as Envelope<unknown> | null;

            if (!res.ok) {
                setCreateError(payload?.error?.code ?? "NODES_CREATE_FAILED");
                return;
            }

            setNewPrompt("");
            await rehydrate();
        } catch {
            setCreateError("NODES_CREATE_FAILED");
        } finally {
            setIsCreating(false);
        }
    }

    function beginEdit(node: NodeDto) {
        setEditingId(node.id);
        setEditPrompt(node.prompt);
        setSaveError(null);
    }

    function cancelEdit() {
        setEditingId(null);
        setEditPrompt("");
        setSaveError(null);
    }

    async function saveEdit(nodeId: number) {
        const prompt = editPrompt.trim();
        if (!prompt) {
            setSaveError("PROMPT_REQUIRED");
            return;
        }

        setIsSaving(true);
        setSaveError(null);
        try {
            const res = await fetch(`/api/nodes/${nodeId}`, {
                method: "PUT",
                headers: {
                    accept: "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ prompt }),
            });

            const payload = (await res
                .json()
                .catch(() => null)) as Envelope<unknown> | null;

            if (!res.ok) {
                setSaveError(payload?.error?.code ?? "NODES_UPDATE_FAILED");
                return;
            }

            cancelEdit();
            await rehydrate();
        } catch {
            setSaveError("NODES_UPDATE_FAILED");
        } finally {
            setIsSaving(false);
        }
    }

    async function deleteNode(nodeId: number) {
        if (!window.confirm(`Deletar node #${nodeId}?`)) return;

        setDeletingId(nodeId);
        setDeleteError(null);
        try {
            const res = await fetch(`/api/nodes/${nodeId}`, {
                method: "DELETE",
                headers: { accept: "application/json" },
            });

            const payload = (await res
                .json()
                .catch(() => null)) as Envelope<unknown> | null;

            if (!res.ok) {
                setDeleteError(payload?.error?.code ?? "NODES_DELETE_FAILED");
                return;
            }

            if (editingId === nodeId) cancelEdit();
            await rehydrate();
        } catch {
            setDeleteError("NODES_DELETE_FAILED");
        } finally {
            setDeletingId(null);
        }
    }

    useEffect(() => {
        const controller = new AbortController();
        rehydrate(controller.signal);
        return () => controller.abort();
    }, []);

    return (
        <section className="flex flex-col gap-4">
            <div className="rounded border p-4">
                <div className="text-sm font-semibold text-black dark:text-white">
                    Criar novo node
                </div>
                <textarea
                    value={newPrompt}
                    onChange={(e) => setNewPrompt(e.target.value)}
                    placeholder="Prompt do node…"
                    className="mt-2 w-full rounded border p-3 text-sm text-black dark:text-white"
                    rows={6}
                />
                <div className="mt-2 flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={() => createNode()}
                        disabled={isCreating}
                        className="rounded border px-3 py-1 text-sm text-black disabled:opacity-60 dark:text-white"
                    >
                        {isCreating ? "Criando…" : "Criar"}
                    </button>
                    {createError ? (
                        <div className="text-xs text-red-700 dark:text-red-300">
                            Erro: {createError}
                        </div>
                    ) : null}
                </div>
            </div>

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

            {deleteError ? (
                <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-transparent dark:text-red-300">
                    Erro ao deletar node: {deleteError}
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

                                {editingId === n.id ? (
                                    <div className="mt-2">
                                        <textarea
                                            value={editPrompt}
                                            onChange={(e) => setEditPrompt(e.target.value)}
                                            className="w-full rounded border p-3 text-sm text-black dark:text-white"
                                            rows={6}
                                        />
                                        <div className="mt-2 flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => saveEdit(n.id)}
                                                    disabled={isSaving}
                                                    className="rounded border px-3 py-1 text-sm text-black disabled:opacity-60 dark:text-white"
                                                >
                                                    {isSaving ? "Salvando…" : "Salvar"}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => cancelEdit()}
                                                    disabled={isSaving}
                                                    className="rounded border px-3 py-1 text-sm text-black disabled:opacity-60 dark:text-white"
                                                >
                                                    Cancelar
                                                </button>
                                            </div>
                                            {saveError ? (
                                                <div className="text-xs text-red-700 dark:text-red-300">
                                                    Erro: {saveError}
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">
                                            {preview(n.prompt)}
                                        </div>

                                        <div className="mt-2 flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => beginEdit(n)}
                                                className="rounded border px-3 py-1 text-sm text-black dark:text-white"
                                            >
                                                Editar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => deleteNode(n.id)}
                                                disabled={deletingId === n.id}
                                                className="rounded border px-3 py-1 text-sm text-black disabled:opacity-60 dark:text-white"
                                            >
                                                {deletingId === n.id ? "Deletando…" : "Deletar"}
                                            </button>
                                        </div>

                                        <details className="mt-2">
                                            <summary className="cursor-pointer text-xs text-zinc-600 dark:text-zinc-300">
                                                Ver prompt completo
                                            </summary>
                                            <pre className="mt-2 whitespace-pre-wrap rounded border p-3 text-xs text-black dark:text-white">{n.prompt}</pre>
                                        </details>
                                    </>
                                )}
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
