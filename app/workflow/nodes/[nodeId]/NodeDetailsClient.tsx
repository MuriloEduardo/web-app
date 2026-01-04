"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useConfirm } from "@/app/components/ConfirmProvider";

export type NodeDto = {
    id: number;
    company_id: number;
    prompt: string;
    created_at?: string;
    updated_at?: string;
};

export type PropertyDto = {
    id: number;
    name: string;
    type: string;
    description?: string | null;
};

export type NodePropertyDto = {
    id?: number;
    node_id: number;
    property_id: number;
};

export type EdgeDto = {
    id: number;
    source_node_id: number;
    destination_node_id: number;
    label: string;
    priority: number;
};

export type Envelope<T> = {
    data?: T;
    error?: { code?: string };
};

type Props = {
    node: NodeDto | null;
    nodeErrorCode?: string | null;
    properties: PropertyDto[];
    propertiesErrorCode?: string | null;
    nodeProperties: NodePropertyDto[];
    nodePropertiesErrorCode?: string | null;
    edges: EdgeDto[];
    edgesErrorCode?: string | null;
};

export function NodeDetailsClient({
    node,
    nodeErrorCode,
    properties,
    propertiesErrorCode,
    nodeProperties,
    nodePropertiesErrorCode,
    edges,
    edgesErrorCode,
}: Props) {
    const router = useRouter();
    const confirm = useConfirm();

    const nodeId = node?.id ?? null;

    const [prompt, setPrompt] = useState(node?.prompt ?? "");
    const [isSavingNode, setIsSavingNode] = useState(false);
    const [nodeSaveError, setNodeSaveError] = useState<string | null>(null);
    const [nodeDeleteError, setNodeDeleteError] = useState<string | null>(null);

    const [availableProperties, setAvailableProperties] = useState<PropertyDto[]>(properties);
    const [propertiesError, setPropertiesError] = useState<string | null>(propertiesErrorCode ?? null);
    const [linkedProps, setLinkedProps] = useState<NodePropertyDto[]>(nodeProperties);
    const [nodePropsError, setNodePropsError] = useState<string | null>(nodePropertiesErrorCode ?? null);
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
    const [isLinking, setIsLinking] = useState(false);
    const [isUnlinking, setIsUnlinking] = useState<number | null>(null);

    const [edgeList, setEdgeList] = useState<EdgeDto[]>(edges);
    const [edgesError, setEdgesError] = useState<string | null>(edgesErrorCode ?? null);
    const [newEdgeDestination, setNewEdgeDestination] = useState<string>("");
    const [newEdgeLabel, setNewEdgeLabel] = useState("");
    const [newEdgePriority, setNewEdgePriority] = useState("0");
    const [isSavingEdge, setIsSavingEdge] = useState(false);
    const [edgeSaveError, setEdgeSaveError] = useState<string | null>(null);

    useEffect(() => {
        setPrompt(node?.prompt ?? "");
    }, [node?.prompt]);

    async function reloadProperties() {
        try {
            const res = await fetch("/api/properties", { headers: { accept: "application/json" } });
            const payload = (await res.json().catch(() => null)) as Envelope<PropertyDto[]> | null;
            if (!res.ok) {
                setPropertiesError(payload?.error?.code ?? "PROPERTIES_FETCH_FAILED");
                setAvailableProperties([]);
                return;
            }
            setAvailableProperties(Array.isArray(payload?.data) ? payload!.data! : []);
            setPropertiesError(null);
        } catch {
            setPropertiesError("PROPERTIES_FETCH_FAILED");
            setAvailableProperties([]);
        }
    }

    async function reloadNodeProperties() {
        if (!nodeId) return;
        try {
            const res = await fetch(`/api/node-properties?node_id=${nodeId}`, {
                headers: { accept: "application/json" },
            });
            const payload = (await res.json().catch(() => null)) as Envelope<NodePropertyDto[]> | null;
            if (!res.ok) {
                setNodePropsError(payload?.error?.code ?? "NODE_PROPERTIES_FETCH_FAILED");
                setLinkedProps([]);
                return;
            }
            setLinkedProps(Array.isArray(payload?.data) ? payload!.data! : []);
            setNodePropsError(null);
        } catch {
            setNodePropsError("NODE_PROPERTIES_FETCH_FAILED");
            setLinkedProps([]);
        }
    }

    async function reloadEdges() {
        if (!nodeId) return;
        try {
            const res = await fetch(`/api/edges?source_node_id=${nodeId}`, {
                headers: { accept: "application/json" },
            });
            const payload = (await res.json().catch(() => null)) as Envelope<EdgeDto[]> | null;
            if (!res.ok) {
                setEdgesError(payload?.error?.code ?? "EDGES_FETCH_FAILED");
                setEdgeList([]);
                return;
            }
            setEdgeList(Array.isArray(payload?.data) ? payload!.data! : []);
            setEdgesError(null);
        } catch {
            setEdgesError("EDGES_FETCH_FAILED");
            setEdgeList([]);
        }
    }

    async function saveNode() {
        if (!nodeId) return;
        const trimmed = prompt.trim();
        if (!trimmed) {
            setNodeSaveError("PROMPT_REQUIRED");
            return;
        }
        setIsSavingNode(true);
        setNodeSaveError(null);
        try {
            const res = await fetch(`/api/nodes/${nodeId}`, {
                method: "PUT",
                headers: { accept: "application/json", "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: trimmed }),
            });
            const payload = (await res.json().catch(() => null)) as Envelope<NodeDto> | null;
            if (!res.ok) {
                setNodeSaveError(payload?.error?.code ?? "NODES_UPDATE_FAILED");
                return;
            }
        } catch {
            setNodeSaveError("NODES_UPDATE_FAILED");
        } finally {
            setIsSavingNode(false);
        }
    }

    async function deleteNode() {
        if (!nodeId) return;
        const ok = await confirm(`Remover node #${nodeId}?`);
        if (!ok) return;
        setNodeDeleteError(null);
        try {
            const res = await fetch(`/api/nodes/${nodeId}`, {
                method: "DELETE",
                headers: { accept: "application/json" },
            });
            const payload = (await res.json().catch(() => null)) as Envelope<unknown> | null;
            if (!res.ok) {
                setNodeDeleteError(payload?.error?.code ?? "NODES_DELETE_FAILED");
                return;
            }
            router.push("/workflow/nodes");
        } catch {
            setNodeDeleteError("NODES_DELETE_FAILED");
        }
    }

    async function linkProperty() {
        if (!nodeId) return;
        const property_id = Number(selectedPropertyId);
        if (!property_id) {
            setNodePropsError("PROPERTY_ID_REQUIRED");
            return;
        }
        setIsLinking(true);
        setNodePropsError(null);
        try {
            const res = await fetch("/api/node-properties", {
                method: "POST",
                headers: { accept: "application/json", "Content-Type": "application/json" },
                body: JSON.stringify({ node_id: nodeId, property_id }),
            });
            const payload = (await res.json().catch(() => null)) as Envelope<NodePropertyDto> | null;
            if (!res.ok) {
                setNodePropsError(payload?.error?.code ?? "NODE_PROPERTIES_CREATE_FAILED");
                return;
            }
            setSelectedPropertyId("");
            await reloadNodeProperties();
        } catch {
            setNodePropsError("NODE_PROPERTIES_CREATE_FAILED");
        } finally {
            setIsLinking(false);
        }
    }

    async function unlinkProperty(propertyId: number) {
        if (!nodeId) return;
        const ok = await confirm(`Remover property #${propertyId} do node #${nodeId}?`);
        if (!ok) return;
        setIsUnlinking(propertyId);
        setNodePropsError(null);
        try {
            const res = await fetch(`/api/node-properties/${nodeId}/${propertyId}`, {
                method: "DELETE",
                headers: { accept: "application/json" },
            });
            const payload = (await res.json().catch(() => null)) as Envelope<unknown> | null;
            if (!res.ok) {
                setNodePropsError(payload?.error?.code ?? "NODE_PROPERTIES_DELETE_FAILED");
                return;
            }
            await reloadNodeProperties();
        } catch {
            setNodePropsError("NODE_PROPERTIES_DELETE_FAILED");
        } finally {
            setIsUnlinking(null);
        }
    }

    async function createEdge() {
        if (!nodeId) return;
        const destination_node_id = Number(newEdgeDestination);
        const label = newEdgeLabel.trim();
        const priority = Number(newEdgePriority.trim() || "0");

        if (!destination_node_id || destination_node_id <= 0) {
            setEdgeSaveError("INVALID_DESTINATION_NODE_ID");
            return;
        }
        if (!label) {
            setEdgeSaveError("LABEL_REQUIRED");
            return;
        }
        if (!Number.isInteger(priority)) {
            setEdgeSaveError("INVALID_PRIORITY");
            return;
        }

        setIsSavingEdge(true);
        setEdgeSaveError(null);
        try {
            const res = await fetch("/api/edges", {
                method: "POST",
                headers: {
                    accept: "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    source_node_id: nodeId,
                    destination_node_id,
                    label,
                    priority,
                }),
            });
            const payload = (await res.json().catch(() => null)) as Envelope<EdgeDto> | null;
            if (!res.ok) {
                setEdgeSaveError(payload?.error?.code ?? "EDGES_CREATE_FAILED");
                return;
            }
            setNewEdgeDestination("");
            setNewEdgeLabel("");
            setNewEdgePriority("0");
            await reloadEdges();
        } catch {
            setEdgeSaveError("EDGES_CREATE_FAILED");
        } finally {
            setIsSavingEdge(false);
        }
    }

    if (nodeErrorCode) {
        return (
            <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                Erro ao carregar node: {nodeErrorCode}
            </div>
        );
    }

    if (!node) {
        return (
            <div className="rounded border p-3 text-sm text-gray-100">Node não encontrado.</div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="rounded border p-4">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <div className="text-sm text-slate-500 dark:text-gray-300">Workflow / Nodes / {node.id}</div>
                        <div className="text-xl font-semibold text-slate-900 dark:text-white">Node #{node.id}</div>
                        <div className="text-xs text-slate-500 dark:text-gray-300">Atualizado: {node.updated_at ?? node.created_at ?? ""}</div>
                    </div>
                    <Link href="/workflow/nodes" className="rounded border px-3 py-1 text-sm text-slate-900 dark:text-white">
                        Voltar
                    </Link>
                </div>

                <label className="mt-4 block text-sm font-medium text-gray-100">
                    Prompt
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="mt-1 w-full rounded border px-3 py-2 text-sm text-slate-900 dark:text-white"
                        rows={6}
                    />
                </label>
                <div className="mt-2 flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => saveNode()}
                        disabled={isSavingNode}
                        className="rounded border px-3 py-1 text-sm text-slate-900 dark:text-white disabled:opacity-60"
                    >
                        {isSavingNode ? "Salvando..." : "Salvar alterações"}
                    </button>
                    <button
                        type="button"
                        onClick={() => deleteNode()}
                        className="rounded border border-red-300 px-3 py-1 text-sm text-red-700"
                    >
                        Remover node
                    </button>
                    {nodeSaveError ? <span className="text-sm text-red-700">Erro: {nodeSaveError}</span> : null}
                    {nodeDeleteError ? <span className="text-sm text-red-700">Erro: {nodeDeleteError}</span> : null}
                </div>
            </div>

            <div className="rounded border p-4">
                <div className="flex items-center justify-between gap-2">
                    <div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">Properties vinculadas</div>
                        <div className="text-xs text-slate-500 dark:text-gray-300">Escolha uma property e vincule ao node.</div>
                    </div>
                    <button
                        type="button"
                        onClick={() => reloadProperties()}
                        className="rounded border px-3 py-1 text-xs text-slate-900 dark:text-white"
                    >
                        Recarregar catálogo
                    </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                    <select
                        value={selectedPropertyId}
                        onChange={(e) => setSelectedPropertyId(e.target.value)}
                        className="min-w-[200px] rounded border px-3 py-2 text-sm text-slate-900 dark:text-white"
                    >
                        <option value="">Selecione uma property</option>
                        {availableProperties.map((p) => (
                            <option key={p.id} value={p.id}>
                                #{p.id} • {p.name} ({p.type})
                            </option>
                        ))}
                    </select>
                    <button
                        type="button"
                        onClick={() => linkProperty()}
                        disabled={isLinking}
                        className="rounded border px-3 py-2 text-sm text-slate-900 dark:text-white disabled:opacity-60"
                    >
                        {isLinking ? "Vinculando..." : "Vincular"}
                    </button>
                    <Link href="/workflow/properties" className="text-xs text-blue-700 underline">
                        Gerenciar properties
                    </Link>
                    {nodePropsError ? <span className="text-sm text-red-700">Erro: {nodePropsError}</span> : null}
                    {propertiesError ? <span className="text-sm text-red-700">Erro catálogo: {propertiesError}</span> : null}
                </div>

                <div className="mt-3 divide-y rounded border">
                    {linkedProps.length === 0 ? (
                        <div className="px-3 py-3 text-sm text-slate-500 dark:text-gray-300">Nenhuma property vinculada.</div>
                    ) : null}
                    {linkedProps.map((p) => (
                        <div key={`${p.node_id}-${p.property_id}`} className="flex items-center justify-between px-3 py-2 text-sm">
                            <div className="text-slate-900 dark:text-white">Property #{p.property_id}</div>
                            <button
                                type="button"
                                onClick={() => unlinkProperty(p.property_id)}
                                disabled={isUnlinking === p.property_id}
                                className="rounded border px-2 py-1 text-xs text-slate-900 dark:text-white disabled:opacity-60"
                            >
                                {isUnlinking === p.property_id ? "Removendo..." : "Remover"}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="rounded border p-4">
                <div className="flex items-center justify-between gap-2">
                    <div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">Edges de saída</div>
                        <div className="text-xs text-slate-500 dark:text-gray-300">Crie edges a partir deste node.</div>
                    </div>
                    <button
                        type="button"
                        onClick={() => reloadEdges()}
                        className="rounded border px-3 py-1 text-xs text-slate-900 dark:text-white"
                    >
                        Recarregar edges
                    </button>
                </div>

                <div className="mt-3 grid gap-2 md:grid-cols-4">
                    <label className="text-xs text-gray-100">
                        Destino
                        <input
                            value={newEdgeDestination}
                            onChange={(e) => setNewEdgeDestination(e.target.value)}
                            className="mt-1 w-full rounded border px-3 py-2 text-sm text-slate-900 dark:text-white"
                            placeholder="node id"
                            inputMode="numeric"
                        />
                    </label>
                    <label className="text-xs text-gray-100 md:col-span-2">
                        Label
                        <input
                            value={newEdgeLabel}
                            onChange={(e) => setNewEdgeLabel(e.target.value)}
                            className="mt-1 w-full rounded border px-3 py-2 text-sm text-slate-900 dark:text-white"
                        />
                    </label>
                    <label className="text-xs text-gray-100">
                        Prioridade
                        <input
                            value={newEdgePriority}
                            onChange={(e) => setNewEdgePriority(e.target.value)}
                            className="mt-1 w-full rounded border px-3 py-2 text-sm text-slate-900 dark:text-white"
                            inputMode="numeric"
                        />
                    </label>
                </div>
                <div className="mt-2 flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => createEdge()}
                        disabled={isSavingEdge}
                        className="rounded border px-3 py-2 text-sm text-slate-900 dark:text-white disabled:opacity-60"
                    >
                        {isSavingEdge ? "Salvando..." : "Criar edge"}
                    </button>
                    {edgeSaveError ? <span className="text-sm text-red-700">Erro: {edgeSaveError}</span> : null}
                    {edgesError ? <span className="text-sm text-red-700">Erro lista: {edgesError}</span> : null}
                </div>

                <div className="mt-3 divide-y rounded border">
                    {edgeList.length === 0 ? (
                        <div className="px-3 py-3 text-sm text-slate-500 dark:text-gray-300">Nenhuma edge cadastrada.</div>
                    ) : null}
                    {edgeList.map((e) => (
                        <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                            <div className="space-y-1">
                                <div className="text-slate-900 dark:text-white">Edge #{e.id}</div>
                                <div className="text-gray-100">{e.label}</div>
                                <div className="text-xs text-slate-500">destino {e.destination_node_id} • prioridade {e.priority}</div>
                            </div>
                            <div className="flex gap-2 text-xs">
                                <Link
                                    href={`/workflow/edges/${e.id}?source_node_id=${nodeId}`}
                                    className="rounded border px-2 py-1 text-slate-900 dark:text-white"
                                >
                                    Ver condições
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
