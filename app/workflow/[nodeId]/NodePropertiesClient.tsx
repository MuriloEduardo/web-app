"use client";

import { useMemo, useState } from "react";
import { useConfirm } from "@/app/components/ConfirmProvider";

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
    node: NodeDto | null;
    nodeErrorCode?: string | null;
    initialProperties: PropertyDto[];
    propertiesErrorCode?: string | null;
    initialNodeProperties: NodePropertyDto[];
    nodePropertiesErrorCode?: string | null;
};

export function NodePropertiesClient({
    node,
    nodeErrorCode,
    initialProperties,
    propertiesErrorCode,
    initialNodeProperties,
    nodePropertiesErrorCode,
}: Props) {
    const confirm = useConfirm();
    const nodeId = node?.id ?? null;

    const [properties, setProperties] = useState<PropertyDto[]>(initialProperties);
    const [propertiesError, setPropertiesError] = useState<string | null>(propertiesErrorCode ?? null);

    const [nodeProperties, setNodeProperties] = useState<NodePropertyDto[]>(initialNodeProperties);
    const [nodePropertiesError, setNodePropertiesError] = useState<string | null>(nodePropertiesErrorCode ?? null);

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

    const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
    const [isMutatingNodeProperties, setIsMutatingNodeProperties] = useState(false);

    const propertyById = useMemo(() => {
        const map = new Map<number, PropertyDto>();
        for (const p of properties) map.set(p.id, p);
        return map;
    }, [properties]);

    async function reloadProperties() {
        setPropertiesError(null);
        try {
            const res = await fetch("/api/properties", { method: "GET", headers: { accept: "application/json" } });
            const payload = (await res.json().catch(() => null)) as Envelope<PropertyDto[]> | null;
            if (!res.ok) {
                setPropertiesError(payload?.error?.code ?? "PROPERTIES_FETCH_FAILED");
                setProperties([]);
                return;
            }
            setProperties(Array.isArray(payload?.data) ? payload!.data! : []);
        } catch {
            setPropertiesError("PROPERTIES_FETCH_FAILED");
            setProperties([]);
        }
    }

    async function reloadNodeProperties() {
        if (!nodeId) return;
        setNodePropertiesError(null);
        try {
            const res = await fetch(`/api/node-properties?node_id=${nodeId}`, {
                method: "GET",
                headers: { accept: "application/json" },
            });
            const payload = (await res.json().catch(() => null)) as Envelope<NodePropertyDto[]> | null;
            if (!res.ok) {
                setNodePropertiesError(payload?.error?.code ?? "NODE_PROPERTIES_FETCH_FAILED");
                setNodeProperties([]);
                return;
            }
            setNodeProperties(Array.isArray(payload?.data) ? payload!.data! : []);
        } catch {
            setNodePropertiesError("NODE_PROPERTIES_FETCH_FAILED");
            setNodeProperties([]);
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
                headers: { accept: "application/json", "Content-Type": "application/json" },
                body: JSON.stringify({ name, type, ...(description ? { description } : {}) }),
            });
            const payload = (await res.json().catch(() => null)) as Envelope<unknown> | null;
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
                headers: { accept: "application/json", "Content-Type": "application/json" },
                body: JSON.stringify({ name, type, ...(description ? { description } : { description: null }) }),
            });
            const payload = (await res.json().catch(() => null)) as Envelope<unknown> | null;
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
        const ok = await confirm(`Deletar property #${propertyId}?`);
        if (!ok) return;

        setDeletingPropertyId(propertyId);
        setDeletePropertyError(null);
        try {
            const res = await fetch(`/api/properties/${propertyId}`, {
                method: "DELETE",
                headers: { accept: "application/json" },
            });
            const payload = (await res.json().catch(() => null)) as Envelope<unknown> | null;
            if (!res.ok) {
                setDeletePropertyError(payload?.error?.code ?? "PROPERTIES_DELETE_FAILED");
                return;
            }

            if (editingPropertyId === propertyId) cancelEditProperty();
            await reloadProperties();
            await reloadNodeProperties();
        } catch {
            setDeletePropertyError("PROPERTIES_DELETE_FAILED");
        } finally {
            setDeletingPropertyId(null);
        }
    }

    async function linkProperty() {
        if (!nodeId) return;
        const property_id = selectedPropertyId;
        if (!property_id) {
            setNodePropertiesError("PROPERTY_ID_REQUIRED");
            return;
        }

        setIsMutatingNodeProperties(true);
        setNodePropertiesError(null);
        try {
            const res = await fetch("/api/node-properties", {
                method: "POST",
                headers: { accept: "application/json", "Content-Type": "application/json" },
                body: JSON.stringify({ node_id: nodeId, property_id }),
            });
            const payload = (await res.json().catch(() => null)) as Envelope<unknown> | null;
            if (!res.ok) {
                setNodePropertiesError(payload?.error?.code ?? "NODE_PROPERTIES_CREATE_FAILED");
                return;
            }

            await reloadNodeProperties();
        } catch {
            setNodePropertiesError("NODE_PROPERTIES_CREATE_FAILED");
        } finally {
            setIsMutatingNodeProperties(false);
        }
    }

    async function unlinkProperty(propertyId: number) {
        if (!nodeId) return;
        const ok = await confirm(`Remover property #${propertyId} do node #${nodeId}?`);
        if (!ok) return;

        setIsMutatingNodeProperties(true);
        setNodePropertiesError(null);
        try {
            const res = await fetch(`/api/node-properties/${nodeId}/${propertyId}`, {
                method: "DELETE",
                headers: { accept: "application/json" },
            });
            const payload = (await res.json().catch(() => null)) as Envelope<unknown> | null;
            if (!res.ok) {
                setNodePropertiesError(payload?.error?.code ?? "NODE_PROPERTIES_DELETE_FAILED");
                return;
            }

            await reloadNodeProperties();
        } catch {
            setNodePropertiesError("NODE_PROPERTIES_DELETE_FAILED");
        } finally {
            setIsMutatingNodeProperties(false);
        }
    }

    if (nodeErrorCode) {
        return (
            <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-transparent dark:text-red-300">
                Erro ao carregar node: {nodeErrorCode}
            </div>
        );
    }

    if (!node) {
        return (
            <div className="rounded border p-3 text-sm text-zinc-600 dark:text-zinc-300">
                Node não encontrado.
            </div>
        );
    }

    return (
        <section className="flex flex-col gap-4">
            <div className="rounded border p-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-black dark:text-white">Node #{node.id}</div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-300">{node.updated_at ?? node.created_at ?? ""}</div>
                </div>
                <div className="mt-2 rounded border p-3 text-xs text-black dark:text-white whitespace-pre-wrap">
                    {node.prompt}
                </div>
            </div>

            <div className="rounded border p-4">
                <div className="text-sm font-semibold text-black dark:text-white">Catálogo de properties</div>

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
                        <div className="text-xs text-red-700 dark:text-red-300">Erro: {createPropertyError}</div>
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
                    <div className="text-xs font-semibold text-black dark:text-white">Existentes</div>
                    <ul className="mt-2 divide-y rounded border">
                        {properties.map((p) => (
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
                                                <div className="text-xs text-red-700 dark:text-red-300">Erro: {savePropertyError}</div>
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
                        {properties.length === 0 ? (
                            <li className="px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400">Nenhuma property cadastrada.</li>
                        ) : null}
                    </ul>
                </div>
            </div>

            <div className="rounded border p-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-black dark:text-white">Propriedades do node</div>
                    <button
                        type="button"
                        onClick={() => reloadNodeProperties()}
                        className="rounded border px-3 py-1 text-sm text-black dark:text-white"
                    >
                        Recarregar
                    </button>
                </div>

                <div className="mt-2 flex items-center gap-2">
                    <select
                        value={selectedPropertyId ?? ""}
                        onChange={(e) => {
                            const v = e.target.value;
                            setSelectedPropertyId(v ? Number(v) : null);
                        }}
                        className="w-full rounded border px-2 py-2 text-sm text-black dark:text-white"
                    >
                        <option value="">Selecione uma property…</option>
                        {properties.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name}
                                {p.type ? ` (${p.type})` : ""}
                            </option>
                        ))}
                    </select>
                    <button
                        type="button"
                        onClick={() => linkProperty()}
                        disabled={isMutatingNodeProperties}
                        className="rounded border px-3 py-2 text-sm text-black disabled:opacity-60 dark:text-white"
                    >
                        Vincular
                    </button>
                </div>

                {nodePropertiesError ? (
                    <div className="mt-2 text-xs text-red-700 dark:text-red-300">Erro: {nodePropertiesError}</div>
                ) : null}

                <div className="mt-3">
                    <div className="text-xs font-semibold text-black dark:text-white">Vinculadas</div>
                    <ul className="mt-2 divide-y rounded border">
                        {nodeProperties.map((np) => {
                            const property = propertyById.get(np.property_id);
                            return (
                                <li key={`${np.node_id}-${np.property_id}`} className="flex items-center justify-between gap-2 px-3 py-2">
                                    <div className="min-w-0">
                                        <div className="truncate text-xs font-semibold text-black dark:text-white">
                                            {property?.name ?? `Property #${np.property_id}`}
                                        </div>
                                        {property?.description ? (
                                            <div className="mt-0.5 truncate text-xs text-zinc-600 dark:text-zinc-300">
                                                {property.description}
                                            </div>
                                        ) : null}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => unlinkProperty(np.property_id)}
                                        disabled={isMutatingNodeProperties}
                                        className="rounded border px-2 py-1 text-xs text-black disabled:opacity-60 dark:text-white"
                                    >
                                        Remover
                                    </button>
                                </li>
                            );
                        })}
                        {nodeProperties.length === 0 ? (
                            <li className="px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400">Nenhuma property vinculada.</li>
                        ) : null}
                    </ul>
                </div>
            </div>
        </section>
    );
}
