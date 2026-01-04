"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useConfirm } from "@/app/components/ConfirmProvider";
import { type ConditionDto, type ConditionPropertyDto, type PropertyDto, type Envelope } from "@/app/workflow/WorkflowTypes";

type ConditionMap = Record<number, ConditionPropertyDto[]>;

type Props = {
    edgeId: number;
    sourceNodeId: number;
    initialConditions: ConditionDto[];
    initialConditionProps: ConditionMap;
    initialProperties: PropertyDto[];
    initialErrorCode: string | null;
};

export function EdgeConditionsClient({
    edgeId,
    sourceNodeId,
    initialConditions,
    initialConditionProps,
    initialProperties,
    initialErrorCode,
}: Props) {
    const confirm = useConfirm();

    const [conditions, setConditions] = useState<ConditionDto[]>(initialConditions);
    const [conditionProps, setConditionProps] = useState<ConditionMap>(initialConditionProps);
    const [properties] = useState<PropertyDto[]>(initialProperties);

    const [errorCode, setErrorCode] = useState<string | null>(initialErrorCode);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState<number | null>(null);
    const [isDeletingProp, setIsDeletingProp] = useState<number | null>(null);

    const [editingCondition, setEditingCondition] = useState<ConditionDto | null>(null);
    const [operatorInput, setOperatorInput] = useState("");
    const [compareInput, setCompareInput] = useState("");

    const [propertyTargetId, setPropertyTargetId] = useState<number | null>(null);
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");

    const sortedConditions = useMemo(() => conditions.slice().sort((a, b) => a.id - b.id), [conditions]);
    const propertiesById = useMemo(() => {
        const map: Record<number, PropertyDto> = {};
        for (const p of properties) {
            if (typeof p.id === "number") map[p.id] = p;
        }
        return map;
    }, [properties]);

    async function refreshConditions() {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/conditions?edge_id=${edgeId}&source_node_id=${sourceNodeId}`, {
                headers: { accept: "application/json" },
            });
            const payload = (await res.json().catch(() => null)) as Envelope<ConditionDto[]> | null;
            if (!res.ok) {
                setErrorCode(payload?.error?.code ?? "CONDITIONS_FETCH_FAILED");
                return;
            }
            const items = Array.isArray(payload?.data) ? payload!.data! : [];
            setConditions(items);
            setErrorCode(null);

            const results = await Promise.all(
                items.map((c) =>
                    fetch(
                        `/api/condition-properties?condition_id=${c.id}&edge_id=${edgeId}&source_node_id=${sourceNodeId}`,
                        { headers: { accept: "application/json" } }
                    ).then(async (r) => ({
                        res: r,
                        data: (await r.json().catch(() => null)) as Envelope<ConditionPropertyDto[]> | null,
                        conditionId: c.id,
                    }))
                )
            );
            const nextMap: ConditionMap = {};
            for (const r of results) {
                if (!r.res.ok) continue;
                nextMap[r.conditionId] = Array.isArray(r.data?.data) ? r.data!.data! : [];
            }
            setConditionProps(nextMap);
        } catch {
            setErrorCode("CONDITIONS_FETCH_FAILED");
        } finally {
            setIsLoading(false);
        }
    }

    function startNewCondition() {
        setEditingCondition(null);
        setOperatorInput("");
        setCompareInput("");
    }

    function startEditCondition(condition: ConditionDto) {
        setEditingCondition(condition);
        setOperatorInput(condition.operator ?? "");
        setCompareInput(condition.compare_value ?? "");
    }

    async function submitCondition() {
        const operator = operatorInput.trim();
        const compare_value = compareInput.trim();
        if (!operator || !compare_value) {
            setErrorCode("OPERATOR_AND_VALUE_REQUIRED");
            return;
        }

        const isEditing = !!editingCondition;
        setIsSaving(true);
        try {
            const url = isEditing
                ? `/api/conditions/${editingCondition!.id}?edge_id=${edgeId}&source_node_id=${sourceNodeId}`
                : `/api/conditions?edge_id=${edgeId}&source_node_id=${sourceNodeId}`;
            const method = isEditing ? "PUT" : "POST";
            const res = await fetch(url, {
                method,
                headers: { accept: "application/json", "Content-Type": "application/json" },
                body: JSON.stringify({ operator, compare_value }),
            });
            const payload = (await res.json().catch(() => null)) as Envelope<ConditionDto> | null;
            if (!res.ok) {
                setErrorCode(payload?.error?.code ?? (isEditing ? "CONDITIONS_UPDATE_FAILED" : "CONDITIONS_CREATE_FAILED"));
                return;
            }
            setEditingCondition(null);
            setOperatorInput("");
            setCompareInput("");
            await refreshConditions();
        } catch {
            setErrorCode(isEditing ? "CONDITIONS_UPDATE_FAILED" : "CONDITIONS_CREATE_FAILED");
        } finally {
            setIsSaving(false);
        }
    }

    async function deleteCondition(conditionId: number) {
        const ok = await confirm("Remover condição?");
        if (!ok) return;
        setIsDeleting(conditionId);
        try {
            const res = await fetch(`/api/conditions/${conditionId}?edge_id=${edgeId}&source_node_id=${sourceNodeId}`, {
                method: "DELETE",
                headers: { accept: "application/json" },
            });
            const payload = (await res.json().catch(() => null)) as Envelope<unknown> | null;
            if (!res.ok) {
                setErrorCode(payload?.error?.code ?? "CONDITIONS_DELETE_FAILED");
                return;
            }
            await refreshConditions();
        } catch {
            setErrorCode("CONDITIONS_DELETE_FAILED");
        } finally {
            setIsDeleting(null);
        }
    }

    async function addProperty(conditionId: number) {
        const property_id = Number(selectedPropertyId);
        if (!property_id) {
            setErrorCode("PROPERTY_ID_REQUIRED");
            return;
        }

        setIsSaving(true);
        try {
            const res = await fetch(
                `/api/condition-properties?condition_id=${conditionId}&edge_id=${edgeId}&source_node_id=${sourceNodeId}`,
                {
                    method: "POST",
                    headers: { accept: "application/json", "Content-Type": "application/json" },
                    body: JSON.stringify({ property_id }),
                }
            );
            const payload = (await res.json().catch(() => null)) as Envelope<ConditionPropertyDto> | null;
            if (!res.ok) {
                setErrorCode(payload?.error?.code ?? "CONDITION_PROPERTIES_CREATE_FAILED");
                return;
            }
            setSelectedPropertyId("");
            setPropertyTargetId(null);
            await refreshConditions();
        } catch {
            setErrorCode("CONDITION_PROPERTIES_CREATE_FAILED");
        } finally {
            setIsSaving(false);
        }
    }

    async function deleteProperty(conditionId: number, cpId: number) {
        const ok = await confirm("Remover vínculo de propriedade?");
        if (!ok) return;
        setIsDeletingProp(cpId);
        try {
            const res = await fetch(
                `/api/condition-properties/${cpId}?condition_id=${conditionId}&edge_id=${edgeId}&source_node_id=${sourceNodeId}`,
                { method: "DELETE", headers: { accept: "application/json" } }
            );
            const payload = (await res.json().catch(() => null)) as Envelope<unknown> | null;
            if (!res.ok) {
                setErrorCode(payload?.error?.code ?? "CONDITION_PROPERTIES_DELETE_FAILED");
                return;
            }
            await refreshConditions();
        } catch {
            setErrorCode("CONDITION_PROPERTIES_DELETE_FAILED");
        } finally {
            setIsDeletingProp(null);
        }
    }

    useEffect(() => {
        if (initialErrorCode) return;
        refreshConditions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <div className="text-xs text-slate-500 dark:text-gray-300">Workflow / Edges / {edgeId} / Condições</div>
                    <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Edge #{edgeId}</h1>
                    <div className="text-xs text-slate-500 dark:text-gray-300">source_node_id {sourceNodeId}</div>
                </div>
                <Link href={`/workflow/edges?source_node_id=${sourceNodeId}`} className="rounded border px-3 py-1 text-sm text-slate-900 dark:text-white">
                    Voltar
                </Link>
            </div>

            {errorCode ? (
                <div className="rounded border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">Erro: {errorCode}</div>
            ) : null}
            {isLoading ? <div className="text-xs text-slate-500 dark:text-gray-300">Carregando...</div> : null}

            <div className="rounded border p-4">
                <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{editingCondition ? `Editar condição #${editingCondition.id}` : "Nova condição"}</div>
                    <button type="button" onClick={() => startNewCondition()} className="rounded border px-3 py-1 text-xs text-slate-900 dark:text-white">
                        Limpar formulário
                    </button>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                    <label className="text-xs text-gray-100">
                        Operador
                        <input
                            value={operatorInput}
                            onChange={(e) => setOperatorInput(e.target.value)}
                            className="mt-1 w-full rounded border px-3 py-2 text-sm text-slate-900 dark:text-white"
                            placeholder="ex: ="
                        />
                    </label>
                    <label className="text-xs text-gray-100">
                        Valor de comparação
                        <input
                            value={compareInput}
                            onChange={(e) => setCompareInput(e.target.value)}
                            className="mt-1 w-full rounded border px-3 py-2 text-sm text-slate-900 dark:text-white"
                        />
                    </label>
                </div>
                <div className="mt-2 flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => submitCondition()}
                        disabled={isSaving}
                        className="rounded border px-3 py-2 text-sm text-slate-900 dark:text-white disabled:opacity-60"
                    >
                        {isSaving ? "Salvando..." : editingCondition ? "Salvar" : "Criar"}
                    </button>
                </div>
            </div>

            <div className="rounded border p-4">
                <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">Condições</div>
                    <button type="button" onClick={() => refreshConditions()} className="rounded border px-3 py-1 text-xs text-slate-900 dark:text-white">
                        Recarregar
                    </button>
                </div>

                <div className="mt-3 space-y-3">
                        {sortedConditions.length === 0 ? (
                            <div className="rounded border border-dashed px-3 py-4 text-sm text-slate-500 dark:text-gray-300">Nenhuma condição cadastrada.</div>
                        ) : null}

                    {sortedConditions.map((c) => {
                        const props = conditionProps[c.id] ?? [];
                        return (
                            <div key={c.id} className="rounded border px-3 py-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <div className="text-sm font-semibold text-slate-900 dark:text-white">Condição #{c.id}</div>
                                        <div className="text-xs text-slate-500 dark:text-gray-300">{c.operator} • {c.compare_value}</div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-xs">
                                        <button
                                            type="button"
                                            onClick={() => startEditCondition(c)}
                                            className="rounded border px-2 py-1 text-slate-900 dark:text-white"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => deleteCondition(c.id)}
                                            disabled={isDeleting === c.id}
                                            className="rounded border border-red-300 px-2 py-1 text-red-700 disabled:opacity-60"
                                        >
                                            {isDeleting === c.id ? "Removendo..." : "Excluir"}
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-3 rounded border p-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className="text-sm font-semibold text-slate-900 dark:text-white">Properties</div>
                                        <select
                                            value={propertyTargetId === c.id ? selectedPropertyId : ""}
                                            onChange={(e) => {
                                                setPropertyTargetId(c.id);
                                                setSelectedPropertyId(e.target.value);
                                            }}
                                            className="rounded border px-3 py-2 text-sm text-slate-900 dark:text-white"
                                        >
                                            <option value="">Selecionar property</option>
                                            {properties.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    #{p.id} • {p.name || p.key} ({p.type})
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPropertyTargetId(c.id);
                                                addProperty(c.id);
                                            }}
                                            disabled={isSaving}
                                            className="rounded border px-3 py-2 text-sm text-slate-900 dark:text-white disabled:opacity-60"
                                        >
                                            Adicionar property
                                        </button>
                                    </div>

                                    <div className="mt-2 divide-y rounded border">
                                        {props.length === 0 ? (
                                            <div className="px-3 py-2 text-sm text-slate-500 dark:text-gray-300">Nenhuma property vinculada.</div>
                                        ) : null}
                                        {props.map((p) => {
                                            const refProp = propertiesById[p.property_id];
                                            return (
                                                <div key={p.id ?? `${c.id}-${p.property_id}`} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                                                    <div className="text-slate-900 dark:text-white">{refProp?.name || refProp?.key || `Property #${p.property_id}`}</div>
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteProperty(c.id, p.id!)}
                                                        disabled={isDeletingProp === p.id}
                                                        className="rounded border px-2 py-1 text-xs text-slate-900 dark:text-white disabled:opacity-60"
                                                    >
                                                        {isDeletingProp === p.id ? "Removendo..." : "Remover"}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
