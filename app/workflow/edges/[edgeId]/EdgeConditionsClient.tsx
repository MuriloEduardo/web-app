"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PlusIcon, ArrowLeftIcon } from "@heroicons/react/24/solid";
import { useConfirm } from "@/app/components/ConfirmProvider";
import Modal from "@/app/components/Modal";

import {
    type ConditionDto,
    type ConditionPropertyDto,
    type PropertyDto,
    type Envelope,
} from "@/app/workflow/WorkflowTypes";

function contrastBadge(text: string, tone: "emerald" | "sky" | "amber" | "slate" = "emerald") {
    const map: Record<typeof tone, string> = {
        emerald: "bg-emerald-50 text-emerald-800 border border-emerald-100",
        sky: "bg-sky-50 text-sky-800 border border-sky-100",
        amber: "bg-amber-50 text-amber-800 border border-amber-100",
        slate: "bg-slate-100 text-slate-800 border border-slate-200",
    } as const;
    return <span className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold ${map[tone]}`}>{text}</span>;
}

function errorBanner(code: string | null) {
    if (!code) return null;
    return (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            Erro: {code}
        </div>
    );
}

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
    if (!Number.isInteger(edgeId) || edgeId <= 0 || !Number.isInteger(sourceNodeId) || sourceNodeId <= 0) {
        return (
            <section className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-800">
                Parâmetros inválidos para edge/Source. Volte pelo modo grafo.
            </section>
        );
    }

    const [conditions, setConditions] = useState<ConditionDto[]>(initialConditions);
    const [conditionProps, setConditionProps] = useState<ConditionMap>(initialConditionProps);
    const [properties, setProperties] = useState<PropertyDto[]>(initialProperties);

    const [errorCode, setErrorCode] = useState<string | null>(initialErrorCode);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState<number | null>(null);
    const [isDeletingProp, setIsDeletingProp] = useState<number | null>(null);

    const [conditionModalOpen, setConditionModalOpen] = useState(false);
    const [conditionOperator, setConditionOperator] = useState("");
    const [conditionCompare, setConditionCompare] = useState("");
    const [editingCondition, setEditingCondition] = useState<ConditionDto | null>(null);

    const [propertyModalOpen, setPropertyModalOpen] = useState(false);
    const [propertyTargetConditionId, setPropertyTargetConditionId] = useState<number | null>(null);
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");

    const sortedConditions = useMemo(() => conditions.slice().sort((a, b) => a.id - b.id), [conditions]);
    const propertiesById = useMemo(() => {
        const map: Record<number, PropertyDto> = {};
        for (const p of properties) {
            if (typeof p.id === "number") map[p.id] = p;
        }
        return map;
    }, [properties]);

    async function submitConditionForm() {
        const operator = conditionOperator.trim();
        const compare_value = conditionCompare.trim();
        if (!operator || !compare_value) return;

        const isEditing = !!editingCondition;
        setIsSaving(true);
        try {
            const url = isEditing
                ? `/api/conditions/${editingCondition!.id}?edge_id=${edgeId}&source_node_id=${sourceNodeId}`
                : `/api/conditions?edge_id=${edgeId}&source_node_id=${sourceNodeId}`;
            const method = isEditing ? "PUT" : "POST";
            const res = await fetch(url, {
                method,
                headers: {
                    accept: "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ operator, compare_value }),
            });
            const payload = (await res.json().catch(() => null)) as Envelope<ConditionDto> | null;
            if (!res.ok) {
                setErrorCode(payload?.error?.code ?? (isEditing ? "CONDITIONS_UPDATE_FAILED" : "CONDITIONS_CREATE_FAILED"));
                return;
            }
            setConditionModalOpen(false);
            setEditingCondition(null);
            setConditionOperator("");
            setConditionCompare("");
            await refreshConditions();
        } catch {
            setErrorCode(isEditing ? "CONDITIONS_UPDATE_FAILED" : "CONDITIONS_CREATE_FAILED");
        } finally {
            setIsSaving(false);
        }
    }

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

            // refresh condition-properties for these conditions
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

    function startCreateCondition() {
        setEditingCondition(null);
        setConditionOperator("");
        setConditionCompare("");
        setConditionModalOpen(true);
    }

    async function deleteCondition(conditionId: number) {
        const ok = await confirm("Remover condição?");
        if (!ok) return;
        setIsDeleting(conditionId);
        try {
            const res = await fetch(
                `/api/conditions/${conditionId}?edge_id=${edgeId}&source_node_id=${sourceNodeId}`,
                { method: "DELETE", headers: { accept: "application/json" } }
            );
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

    function startEditCondition(condition: ConditionDto) {
        setEditingCondition(condition);
        setConditionOperator(condition.operator ?? "");
        setConditionCompare(condition.compare_value ?? "");
        setConditionModalOpen(true);
    }

    async function addProperty(conditionId: number, propertyId: number) {
        setIsSaving(true);
        try {
            const res = await fetch(
                `/api/condition-properties?condition_id=${conditionId}&edge_id=${edgeId}&source_node_id=${sourceNodeId}`,
                {
                    method: "POST",
                    headers: {
                        accept: "application/json",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ property_id: propertyId }),
                }
            );
            const payload = (await res.json().catch(() => null)) as Envelope<ConditionPropertyDto> | null;
            if (!res.ok) {
                setErrorCode(payload?.error?.code ?? "CONDITION_PROPERTIES_CREATE_FAILED");
                return;
            }
            await refreshConditions();
        } catch {
            setErrorCode("CONDITION_PROPERTIES_CREATE_FAILED");
        } finally {
            setIsSaving(false);
        }
    }

    function startAddProperty(conditionId: number) {
        setPropertyTargetConditionId(conditionId);
        setSelectedPropertyId("");
        setPropertyModalOpen(true);
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
        <section className="mx-auto w-full max-w-xl rounded-3xl bg-gradient-to-b from-slate-50 to-white px-4 py-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <Link
                    href="/workflow?view=graph"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow ring-1 ring-slate-200"
                >
                    <ArrowLeftIcon className="h-5 w-5 text-slate-700" />
                </Link>
                <div className="text-base font-semibold text-slate-900">Condições da Edge #{edgeId}</div>
                <button
                    type="button"
                    onClick={() => startCreateCondition()}
                    className="flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-sm font-medium text-white shadow"
                >
                    <PlusIcon className="h-4 w-4" />
                    Nova condição
                </button>
            </div>

            <div className="mt-1 text-xs text-slate-500">
                Edge #{edgeId} • source {sourceNodeId}
                {isLoading ? " • carregando..." : ""}
                {isSaving ? " • salvando..." : ""}
            </div>

            {errorBanner(errorCode)}

            <div className="mt-5 space-y-4">
                {sortedConditions.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-600">
                        Nenhuma condição. Toque em "Nova condição".
                    </div>
                ) : null}

                {sortedConditions.map((c) => {
                    const props = conditionProps[c.id] ?? [];
                    return (
                        <div key={c.id} className="rounded-2xl bg-white px-4 py-4 shadow-md ring-1 ring-slate-100">
                            <div className="flex items-start justify-between gap-2">
                                <div className="space-y-1">
                                    <div className="text-sm font-semibold text-slate-900">Condição #{c.id}</div>
                                    <div className="text-xs text-slate-600">{c.operator} • {c.compare_value}</div>
                                    <div className="flex flex-wrap gap-2">
                                        {contrastBadge(`edge ${c.edge_id}`, "sky")}
                                        {contrastBadge(`props ${props.length}`, "amber")}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => deleteCondition(c.id)}
                                    disabled={isDeleting === c.id}
                                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 disabled:opacity-50"
                                >
                                    {isDeleting === c.id ? "..." : "Excluir"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => startEditCondition(c)}
                                    disabled={isSaving}
                                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 disabled:opacity-50"
                                >
                                    {isSaving ? "..." : "Editar"}
                                </button>
                            </div>

                            <div className="mt-3 rounded-xl bg-slate-50 px-3 py-3 ring-1 ring-slate-200">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="text-[13px] font-semibold text-slate-800">Propriedades vinculadas</div>
                                    <button
                                        type="button"
                                        onClick={() => startAddProperty(c.id)}
                                        className="flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white shadow"
                                    >
                                        <PlusIcon className="h-4 w-4" />
                                        Adicionar
                                    </button>
                                </div>
                                <div className="mt-2 space-y-2">
                                    {props.length === 0 ? (
                                        <div className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                                            Nenhuma propriedade vinculada.
                                        </div>
                                    ) : null}
                                    {props.map((p) => {
                                        const refProp = propertiesById[p.property_id];
                                        return (
                                            <div key={p.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200">
                                                <div className="min-w-0">
                                                    <div className="text-[13px] font-semibold text-slate-900">
                                                        {refProp?.name || refProp?.key || `Propriedade #${p.property_id}`}
                                                    </div>
                                                    <div className="text-[11px] text-slate-500">ID {p.property_id}</div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => deleteProperty(c.id, p.id)}
                                                    disabled={isDeletingProp === p.id}
                                                    className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-700 disabled:opacity-50"
                                                >
                                                    {isDeletingProp === p.id ? "..." : "Remover"}
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

            <Modal
                open={conditionModalOpen}
                title={editingCondition ? `Editar condição #${editingCondition.id}` : "Nova condição"}
                onClose={() => {
                    setConditionModalOpen(false);
                    setEditingCondition(null);
                }}
                footer={
                    <>
                        <button
                            type="button"
                            onClick={() => {
                                setConditionModalOpen(false);
                                setEditingCondition(null);
                            }}
                            className="rounded border border-slate-300 px-3 py-1 text-sm text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={() => submitConditionForm()}
                            className="rounded bg-blue-600 px-3 py-1 text-sm font-semibold text-white transition hover:bg-blue-500"
                        >
                            Salvar
                        </button>
                    </>
                }
            >
                <div className="space-y-3">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Operador</label>
                        <input
                            value={conditionOperator}
                            onChange={(e) => setConditionOperator(e.target.value)}
                            placeholder="equals, contains..."
                            className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Valor de comparação</label>
                        <input
                            value={conditionCompare}
                            onChange={(e) => setConditionCompare(e.target.value)}
                            placeholder="valor"
                            className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                    </div>
                </div>
            </Modal>

            <Modal
                open={propertyModalOpen}
                title="Selecionar propriedade"
                onClose={() => {
                    setPropertyModalOpen(false);
                    setPropertyTargetConditionId(null);
                    setSelectedPropertyId("");
                }}
                footer={
                    <>
                        <button
                            type="button"
                            onClick={() => {
                                setPropertyModalOpen(false);
                                setPropertyTargetConditionId(null);
                                setSelectedPropertyId("");
                            }}
                            className="rounded border border-slate-300 px-3 py-1 text-sm text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            disabled={!propertyTargetConditionId || !selectedPropertyId}
                            onClick={() => {
                                if (!propertyTargetConditionId) return;
                                const id = Number(selectedPropertyId);
                                if (!Number.isInteger(id)) return;
                                setPropertyModalOpen(false);
                                void addProperty(propertyTargetConditionId, id);
                            }}
                            className="rounded bg-blue-600 px-3 py-1 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
                        >
                            Vincular
                        </button>
                    </>
                }
            >
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Property</label>
                    <select
                        value={selectedPropertyId}
                        onChange={(e) => setSelectedPropertyId(e.target.value)}
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                        <option value="">Selecione</option>
                        {properties.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.id} - {p.name ?? p.key ?? "(sem nome)"}
                            </option>
                        ))}
                    </select>
                </div>
            </Modal>
        </section>
    );
}
