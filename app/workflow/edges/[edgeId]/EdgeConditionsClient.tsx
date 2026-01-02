"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PlusIcon, ArrowLeftIcon } from "@heroicons/react/24/solid";

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

    async function createCondition() {
        const operator = window.prompt("Operador (ex: equals, contains)")?.trim() ?? "";
        if (!operator) return;
        const compare_value = window.prompt("Valor de comparação")?.trim() ?? "";
        if (!compare_value) return;

        setIsSaving(true);
        try {
            const res = await fetch(`/api/conditions?edge_id=${edgeId}&source_node_id=${sourceNodeId}`, {
                method: "POST",
                headers: {
                    accept: "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ operator, compare_value }),
            });
            const payload = (await res.json().catch(() => null)) as Envelope<ConditionDto> | null;
            if (!res.ok) {
                setErrorCode(payload?.error?.code ?? "CONDITIONS_CREATE_FAILED");
                return;
            }
            await refreshConditions();
        } catch {
            setErrorCode("CONDITIONS_CREATE_FAILED");
        } finally {
            setIsSaving(false);
        }
    }

    async function deleteCondition(conditionId: number) {
        if (!window.confirm("Remover condição?")) return;
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

    async function editCondition(condition: ConditionDto) {
        const operator = window.prompt("Operador", condition.operator)?.trim() ?? "";
        if (!operator) return;
        const compare_value = window.prompt("Valor de comparação", condition.compare_value)?.trim() ?? "";
        if (!compare_value) return;

        setIsSaving(true);
        try {
            const res = await fetch(
                `/api/conditions/${condition.id}?edge_id=${edgeId}&source_node_id=${sourceNodeId}`,
                {
                    method: "PUT",
                    headers: {
                        accept: "application/json",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ operator, compare_value }),
                }
            );
            const payload = (await res.json().catch(() => null)) as Envelope<ConditionDto> | null;
            if (!res.ok) {
                setErrorCode(payload?.error?.code ?? "CONDITIONS_UPDATE_FAILED");
                return;
            }
            await refreshConditions();
        } catch {
            setErrorCode("CONDITIONS_UPDATE_FAILED");
        } finally {
            setIsSaving(false);
        }
    }

    async function addProperty(conditionId: number) {
        const propertyOptions = properties
            .map((p) => `${p.id} - ${p.name ?? p.key ?? "(sem nome)"}`)
            .join("\n");
        const chosen = window.prompt(`ID da propriedade para vincular:\n${propertyOptions}`)?.trim() ?? "";
        if (!chosen) return;
        const property_id = Number(chosen);
        if (!Number.isInteger(property_id) || property_id <= 0) {
            setErrorCode("INVALID_PROPERTY_ID");
            return;
        }

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
                    body: JSON.stringify({ property_id }),
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

    async function deleteProperty(conditionId: number, cpId: number) {
        if (!window.confirm("Remover vínculo de propriedade?")) return;
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
                    onClick={() => createCondition()}
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
                                    onClick={() => editCondition(c)}
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
                                        onClick={() => addProperty(c.id)}
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
        </section>
    );
}
