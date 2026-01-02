"use client";

import { useEffect, useMemo, useState } from "react";

type NodeDto = {
    id: number;
    company_id: number;
    prompt: string;
    created_at?: string;
    updated_at?: string;
};

type PropertyDto = {
    id: number;
    name: string;
    type: string;
    description?: string;
    created_at?: string;
    updated_at?: string;
};

type NodePropertyDto = {
    node_id: number;
    property_id: number;
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

    const [properties, setProperties] = useState<PropertyDto[] | null>(null);
    const [propertiesError, setPropertiesError] = useState<string | null>(null);

    const [newPropertyName, setNewPropertyName] = useState("");
    const [newPropertyType, setNewPropertyType] = useState("");
    const [newPropertyDescription, setNewPropertyDescription] = useState("");
    const [isCreatingProperty, setIsCreatingProperty] = useState(false);
    const [createPropertyError, setCreatePropertyError] = useState<string | null>(null);

    const [editingPropertyId, setEditingPropertyId] = useState<number | null>(null);
    const [editPropertyName, setEditPropertyName] = useState("");
    const [editPropertyType, setEditPropertyType] = useState("");
    const [editPropertyDescription, setEditPropertyDescription] = useState("");
    const [isSavingProperty, setIsSavingProperty] = useState(false);
    const [savePropertyError, setSavePropertyError] = useState<string | null>(null);

    const [deletingPropertyId, setDeletingPropertyId] = useState<number | null>(null);
    const [deletePropertyError, setDeletePropertyError] = useState<string | null>(null);
    const [nodePropertiesByNodeId, setNodePropertiesByNodeId] = useState<
        Record<number, NodePropertyDto[]>
    >({});
    const [nodePropertiesErrorByNodeId, setNodePropertiesErrorByNodeId] = useState<
        Record<number, string | null>
    >({});
    const [selectedPropertyIdByNodeId, setSelectedPropertyIdByNodeId] = useState<
        Record<number, number | null>
    >({});
    const [isMutatingPropsByNodeId, setIsMutatingPropsByNodeId] = useState<
        Record<number, boolean>
    >({});

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

    const propertyById = useMemo(() => {
        const map = new Map<number, PropertyDto>();
        for (const p of properties ?? []) {
            if (typeof p?.id === "number") map.set(p.id, p);
        }
        return map;
    }, [properties]);

    async function loadPropertiesIfNeeded(signal?: AbortSignal) {
        if (properties !== null) return;
        await reloadProperties(signal);
    }

    async function reloadProperties(signal?: AbortSignal) {
        setPropertiesError(null);
        try {
            const res = await fetch("/api/properties", {
                method: "GET",
                headers: { accept: "application/json" },
                signal,
            });
            const payload = (await res
                .json()
                .catch(() => null)) as Envelope<PropertyDto[]> | null;

            if (!res.ok) {
                setPropertiesError(payload?.error?.code ?? "PROPERTIES_FETCH_FAILED");
                setProperties([]);
                return;
            }

            setProperties(Array.isArray(payload?.data) ? payload!.data! : []);
        } catch {
            if (signal?.aborted) return;
            setPropertiesError("PROPERTIES_FETCH_FAILED");
            setProperties([]);
        }
    }

    async function createProperty() {
        const name = newPropertyName.trim();
        const type = newPropertyType.trim();
        const description = newPropertyDescription.trim();

        if (!name) {
            setCreatePropertyError("NAME_REQUIRED");
            return;
        }
        if (!type) {
            setCreatePropertyError("TYPE_REQUIRED");
            return;
        }

        setIsCreatingProperty(true);
        setCreatePropertyError(null);
        try {
            const res = await fetch("/api/properties", {
                method: "POST",
                headers: {
                    accept: "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name,
                    type,
                    ...(description ? { description } : {}),
                }),
            });

            const payload = (await res
                .json()
                .catch(() => null)) as Envelope<unknown> | null;

            if (!res.ok) {
                setCreatePropertyError(payload?.error?.code ?? "PROPERTIES_CREATE_FAILED");
                return;
            }

            setNewPropertyName("");
            setNewPropertyType("");
            setNewPropertyDescription("");
            await reloadProperties();
        } catch {
            setCreatePropertyError("PROPERTIES_CREATE_FAILED");
        } finally {
            setIsCreatingProperty(false);
        }
    }

    function beginEditProperty(p: PropertyDto) {
        setEditingPropertyId(p.id);
        setEditPropertyName(p.name ?? "");
        setEditPropertyType(p.type ?? "");
        setEditPropertyDescription(p.description ?? "");
        setSavePropertyError(null);
    }

    function cancelEditProperty() {
        setEditingPropertyId(null);
        setEditPropertyName("");
        setEditPropertyType("");
        setEditPropertyDescription("");
        setSavePropertyError(null);
    }

    async function saveProperty(propertyId: number) {
        const name = editPropertyName.trim();
        const type = editPropertyType.trim();
        const description = editPropertyDescription.trim();

        if (!name) {
            setSavePropertyError("NAME_REQUIRED");
            return;
        }
        if (!type) {
            setSavePropertyError("TYPE_REQUIRED");
            return;
        }

        setIsSavingProperty(true);
        setSavePropertyError(null);
        try {
            const res = await fetch(`/api/properties/${propertyId}`, {
                method: "PUT",
                headers: {
                    accept: "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name,
                    type,
                    ...(description ? { description } : { description: null }),
                }),
            });

            const payload = (await res
                .json()
                .catch(() => null)) as Envelope<unknown> | null;

            if (!res.ok) {
                setSavePropertyError(payload?.error?.code ?? "PROPERTIES_UPDATE_FAILED");
                return;
            }

            cancelEditProperty();
            await reloadProperties();
        } catch {
            setSavePropertyError("PROPERTIES_UPDATE_FAILED");
        } finally {
            setIsSavingProperty(false);
        }
    }

    async function deleteProperty(propertyId: number) {
        if (!window.confirm(`Deletar property #${propertyId}?`)) return;

        setDeletingPropertyId(propertyId);
        setDeletePropertyError(null);
        try {
            const res = await fetch(`/api/properties/${propertyId}`, {
                method: "DELETE",
                headers: { accept: "application/json" },
            });

            const payload = (await res
                .json()
                .catch(() => null)) as Envelope<unknown> | null;

            if (!res.ok) {
                setDeletePropertyError(payload?.error?.code ?? "PROPERTIES_DELETE_FAILED");
                return;
            }

            if (editingPropertyId === propertyId) cancelEditProperty();
            await reloadProperties();
        } catch {
            setDeletePropertyError("PROPERTIES_DELETE_FAILED");
        } finally {
            setDeletingPropertyId(null);
        }
    }

    async function loadNodeProperties(nodeId: number, signal?: AbortSignal) {
        setNodePropertiesErrorByNodeId((prev) => ({ ...prev, [nodeId]: null }));
        try {
            const res = await fetch(`/api/node-properties?node_id=${nodeId}`, {
                method: "GET",
                headers: { accept: "application/json" },
                signal,
            });
            const payload = (await res
                .json()
                .catch(() => null)) as Envelope<NodePropertyDto[]> | null;

            if (!res.ok) {
                setNodePropertiesErrorByNodeId((prev) => ({
                    ...prev,
                    [nodeId]: payload?.error?.code ?? "NODE_PROPERTIES_FETCH_FAILED",
                }));
                setNodePropertiesByNodeId((prev) => ({ ...prev, [nodeId]: [] }));
                return;
            }

            setNodePropertiesByNodeId((prev) => ({
                ...prev,
                [nodeId]: Array.isArray(payload?.data) ? payload!.data! : [],
            }));
        } catch {
            if (signal?.aborted) return;
            setNodePropertiesErrorByNodeId((prev) => ({
                ...prev,
                [nodeId]: "NODE_PROPERTIES_FETCH_FAILED",
            }));
            setNodePropertiesByNodeId((prev) => ({ ...prev, [nodeId]: [] }));
        }
    }

    async function linkProperty(nodeId: number) {
        const property_id = selectedPropertyIdByNodeId[nodeId] ?? null;
        if (!property_id) {
            setNodePropertiesErrorByNodeId((prev) => ({
                ...prev,
                [nodeId]: "PROPERTY_ID_REQUIRED",
            }));
            return;
        }

        setIsMutatingPropsByNodeId((prev) => ({ ...prev, [nodeId]: true }))
        setNodePropertiesErrorByNodeId((prev) => ({ ...prev, [nodeId]: null }));
        try {
            const res = await fetch("/api/node-properties", {
                method: "POST",
                headers: {
                    accept: "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ node_id: nodeId, property_id }),
            });
            const payload = (await res
                .json()
                .catch(() => null)) as Envelope<unknown> | null;
            if (!res.ok) {
                setNodePropertiesErrorByNodeId((prev) => ({
                    ...prev,
                    [nodeId]: payload?.error?.code ?? "NODE_PROPERTIES_CREATE_FAILED",
                }));
                return;
            }

            await loadNodeProperties(nodeId);
        } catch {
            setNodePropertiesErrorByNodeId((prev) => ({
                ...prev,
                [nodeId]: "NODE_PROPERTIES_CREATE_FAILED",
            }));
        } finally {
            setIsMutatingPropsByNodeId((prev) => ({ ...prev, [nodeId]: false }));
        }
    }

    async function unlinkProperty(nodeId: number, propertyId: number) {
        if (!window.confirm(`Remover property #${propertyId} do node #${nodeId}?`)) return;

        setIsMutatingPropsByNodeId((prev) => ({ ...prev, [nodeId]: true }));
        setNodePropertiesErrorByNodeId((prev) => ({ ...prev, [nodeId]: null }));
        try {
            const res = await fetch(`/api/node-properties/${nodeId}/${propertyId}`, {
                method: "DELETE",
                headers: { accept: "application/json" },
            });
            const payload = (await res
                .json()
                .catch(() => null)) as Envelope<unknown> | null;
            if (!res.ok) {
                setNodePropertiesErrorByNodeId((prev) => ({
                    ...prev,
                    [nodeId]: payload?.error?.code ?? "NODE_PROPERTIES_DELETE_FAILED",
                }));
                return;
            }

            await loadNodeProperties(nodeId);
        } catch {
            setNodePropertiesErrorByNodeId((prev) => ({
                ...prev,
                [nodeId]: "NODE_PROPERTIES_DELETE_FAILED",
            }));
        } finally {
            setIsMutatingPropsByNodeId((prev) => ({ ...prev, [nodeId]: false }));
        }
    }

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

    useEffect(() => {
        const controller = new AbortController();
        loadPropertiesIfNeeded(controller.signal);
        return () => controller.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <section className="flex flex-col gap-4">
            <div className="rounded border p-4">
                <div className="text-sm font-semibold text-black dark:text-white">
                    Catálogo de properties
                </div>

                <div className="mt-2 grid gap-2">
                    <input
                        value={newPropertyName}
                        onChange={(e) => setNewPropertyName(e.target.value)}
                        placeholder="Nome da property…"
                        className="w-full rounded border px-3 py-2 text-sm text-black dark:text-white"
                    />
                    <input
                        value={newPropertyType}
                        onChange={(e) => setNewPropertyType(e.target.value)}
                        placeholder="Tipo (ex: string, number)…"
                        className="w-full rounded border px-3 py-2 text-sm text-black dark:text-white"
                    />
                    <input
                        value={newPropertyDescription}
                        onChange={(e) => setNewPropertyDescription(e.target.value)}
                        placeholder="Descrição (opcional)…"
                        className="w-full rounded border px-3 py-2 text-sm text-black dark:text-white"
                    />
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => createProperty()}
                            disabled={isCreatingProperty}
                            className="rounded border px-3 py-1 text-sm text-black disabled:opacity-60 dark:text-white"
                        >
                            {isCreatingProperty ? "Criando…" : "Criar property"}
                        </button>
                        <button
                            type="button"
                            onClick={() => reloadProperties()}
                            className="rounded border px-3 py-1 text-sm text-black dark:text-white"
                        >
                            Recarregar
                        </button>
                    </div>
                    {createPropertyError ? (
                        <div className="text-xs text-red-700 dark:text-red-300">
                            Erro: {createPropertyError}
                        </div>
                    ) : null}
                </div>

                {propertiesError ? (
                    <div className="mt-2 text-xs text-red-700 dark:text-red-300">
                        Erro ao carregar properties: {propertiesError}
                    </div>
                ) : null}

                {deletePropertyError ? (
                    <div className="mt-2 text-xs text-red-700 dark:text-red-300">
                        Erro ao deletar property: {deletePropertyError}
                    </div>
                ) : null}

                <div className="mt-3">
                    <div className="text-xs font-semibold text-black dark:text-white">
                        Existentes
                    </div>
                    <ul className="mt-2 divide-y rounded border">
                        {(properties ?? []).map((p) => (
                            <li key={p.id} className="px-3 py-2">
                                {editingPropertyId === p.id ? (
                                    <div>
                                        <div className="grid gap-2">
                                            <input
                                                value={editPropertyName}
                                                onChange={(e) => setEditPropertyName(e.target.value)}
                                                className="w-full rounded border px-3 py-2 text-sm text-black dark:text-white"
                                            />
                                            <input
                                                value={editPropertyType}
                                                onChange={(e) => setEditPropertyType(e.target.value)}
                                                className="w-full rounded border px-3 py-2 text-sm text-black dark:text-white"
                                            />
                                            <input
                                                value={editPropertyDescription}
                                                onChange={(e) => setEditPropertyDescription(e.target.value)}
                                                className="w-full rounded border px-3 py-2 text-sm text-black dark:text-white"
                                                placeholder="Descrição (opcional)…"
                                            />
                                        </div>
                                        <div className="mt-2 flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => saveProperty(p.id)}
                                                    disabled={isSavingProperty}
                                                    className="rounded border px-3 py-1 text-sm text-black disabled:opacity-60 dark:text-white"
                                                >
                                                    {isSavingProperty ? "Salvando…" : "Salvar"}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => cancelEditProperty()}
                                                    disabled={isSavingProperty}
                                                    className="rounded border px-3 py-1 text-sm text-black disabled:opacity-60 dark:text-white"
                                                >
                                                    Cancelar
                                                </button>
                                            </div>
                                            {savePropertyError ? (
                                                <div className="text-xs text-red-700 dark:text-red-300">
                                                    Erro: {savePropertyError}
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-semibold text-black dark:text-white">
                                                {p.name} {p.type ? `(${p.type})` : ""}
                                            </div>
                                            {p.description ? (
                                                <div className="mt-0.5 truncate text-xs text-zinc-600 dark:text-zinc-300">
                                                    {p.description}
                                                </div>
                                            ) : null}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => beginEditProperty(p)}
                                                className="rounded border px-2 py-1 text-xs text-black dark:text-white"
                                            >
                                                Editar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => deleteProperty(p.id)}
                                                disabled={deletingPropertyId === p.id}
                                                className="rounded border px-2 py-1 text-xs text-black disabled:opacity-60 dark:text-white"
                                            >
                                                {deletingPropertyId === p.id ? "Deletando…" : "Deletar"}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </li>
                        ))}
                        {properties === null ? (
                            <li className="px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400">
                                Carregando…
                            </li>
                        ) : (properties ?? []).length === 0 ? (
                            <li className="px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400">
                                Nenhuma property cadastrada.
                            </li>
                        ) : null}
                    </ul>
                </div>
            </div>

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

                                        <details
                                            className="mt-3"
                                            onToggle={(e) => {
                                                const open = (e.currentTarget as HTMLDetailsElement).open;
                                                if (!open) return;
                                                if (nodePropertiesByNodeId[n.id]) return;
                                                const controller = new AbortController();
                                                loadNodeProperties(n.id, controller.signal);
                                            }}
                                        >
                                            <summary className="cursor-pointer text-xs text-zinc-600 dark:text-zinc-300">
                                                Gerenciar propriedades
                                            </summary>
                                            <div className="mt-2 rounded border p-3">
                                                <div className="text-xs text-zinc-600 dark:text-zinc-300">
                                                    {propertiesError
                                                        ? `Erro ao carregar propriedades: ${propertiesError}`
                                                        : properties === null
                                                            ? "Carregando propriedades…"
                                                            : `${properties.length} property(s) disponíveis`}
                                                </div>

                                                <div className="mt-2 flex items-center gap-2">
                                                    <select
                                                        value={selectedPropertyIdByNodeId[n.id] ?? ""}
                                                        onChange={(e) => {
                                                            const v = e.target.value;
                                                            setSelectedPropertyIdByNodeId((prev) => ({
                                                                ...prev,
                                                                [n.id]: v ? Number(v) : null,
                                                            }));
                                                        }}
                                                        className="w-full rounded border px-2 py-1 text-sm text-black dark:text-white"
                                                    >
                                                        <option value="">Selecione uma property…</option>
                                                        {(properties ?? []).map((p) => (
                                                            <option key={p.id} value={p.id}>
                                                                {p.name}
                                                                {p.type ? ` (${p.type})` : ""}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        type="button"
                                                        onClick={() => linkProperty(n.id)}
                                                        disabled={isMutatingPropsByNodeId[n.id]}
                                                        className="rounded border px-3 py-1 text-sm text-black disabled:opacity-60 dark:text-white"
                                                    >
                                                        Vincular
                                                    </button>
                                                </div>

                                                {nodePropertiesErrorByNodeId[n.id] ? (
                                                    <div className="mt-2 text-xs text-red-700 dark:text-red-300">
                                                        Erro: {nodePropertiesErrorByNodeId[n.id]}
                                                    </div>
                                                ) : null}

                                                <div className="mt-3">
                                                    <div className="text-xs font-semibold text-black dark:text-white">
                                                        Vinculadas
                                                    </div>
                                                    <ul className="mt-2 divide-y rounded border">
                                                        {(nodePropertiesByNodeId[n.id] ?? []).map((np) => {
                                                            const pid = np.property_id;
                                                            const property = propertyById.get(pid);
                                                            return (
                                                                <li key={`${np.node_id}-${np.property_id}`} className="flex items-center justify-between gap-2 px-3 py-2">
                                                                    <div className="min-w-0">
                                                                        <div className="truncate text-xs font-semibold text-black dark:text-white">
                                                                            {property?.name ?? `Property #${pid}`}
                                                                        </div>
                                                                        {property?.description ? (
                                                                            <div className="mt-0.5 truncate text-xs text-zinc-600 dark:text-zinc-300">
                                                                                {property.description}
                                                                            </div>
                                                                        ) : null}
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => unlinkProperty(n.id, pid)}
                                                                        disabled={isMutatingPropsByNodeId[n.id]}
                                                                        className="rounded border px-2 py-1 text-xs text-black disabled:opacity-60 dark:text-white"
                                                                    >
                                                                        Remover
                                                                    </button>
                                                                </li>
                                                            );
                                                        })}
                                                        {(nodePropertiesByNodeId[n.id] ?? []).length === 0 ? (
                                                            <li className="px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400">
                                                                Nenhuma property vinculada.
                                                            </li>
                                                        ) : null}
                                                    </ul>
                                                </div>
                                            </div>
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
