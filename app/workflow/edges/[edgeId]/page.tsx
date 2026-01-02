import { headers } from "next/headers";

import { bffGet } from "@/app/lib/bff/fetcher";
import { EdgeConditionsClient } from "@/app/workflow/edges/[edgeId]/EdgeConditionsClient";
import {
    type ConditionDto,
    type ConditionPropertyDto,
    type PropertyDto,
    type NodeDto,
    type EdgeDto,
} from "@/app/workflow/WorkflowTypes";

async function fetchConditions(cookie: string | null, edgeId: number, source_node_id: number) {
    const payload = await bffGet<ConditionDto[]>(
        `/api/conditions?edge_id=${edgeId}&source_node_id=${source_node_id}`,
        cookie ? { headers: { cookie } } : undefined
    );
    return payload;
}

async function fetchConditionProperties(
    cookie: string | null,
    edgeId: number,
    source_node_id: number,
    conditionIds: number[]
) {
    const results = await Promise.all(
        conditionIds.map((id) =>
            bffGet<ConditionPropertyDto[]>(
                `/api/condition-properties?condition_id=${id}&edge_id=${edgeId}&source_node_id=${source_node_id}`,
                cookie ? { headers: { cookie } } : undefined
            )
        )
    );
    const map: Record<number, ConditionPropertyDto[]> = {};
    results.forEach((res, idx) => {
        const cid = conditionIds[idx];
        map[cid] = Array.isArray(res.data) ? res.data : [];
    });
    const firstError = results.find((r) => r.error)?.error;
    return { map, error: firstError };
}

async function fetchProperties(cookie: string | null) {
    const payload = await bffGet<PropertyDto[]>(
        "/api/properties",
        cookie ? { headers: { cookie } } : undefined
    );
    return payload;
}

async function inferSourceNodeId(edgeId: number, cookie: string | null): Promise<number | null> {
    const nodesRes = await bffGet<NodeDto[]>("/api/nodes", cookie ? { headers: { cookie } } : undefined);
    const nodes = Array.isArray(nodesRes.data) ? nodesRes.data : [];
    for (const n of nodes) {
        const edgesRes = await bffGet<EdgeDto[]>(
            `/api/edges?source_node_id=${n.id}`,
            cookie ? { headers: { cookie } } : undefined
        );
        const edges = Array.isArray(edgesRes.data) ? edgesRes.data : [];
        if (edges.some((e) => e.id === edgeId)) {
            return n.id;
        }
    }
    return null;
}

export default async function EdgeConditionsPage({ params, searchParams }: { params: Promise<{ edgeId: string }>; searchParams?: { source_node_id?: string } }) {
    const h = await headers();
    const cookie = h.get("cookie");

    const awaitedParams = await params;
    const edgeId = Number(awaitedParams.edgeId);
    const rawSource = Array.isArray(searchParams?.source_node_id)
        ? searchParams?.source_node_id[0]
        : searchParams?.source_node_id;
    let source_node_id = Number(rawSource ?? "");
    const initialEdgeError = !Number.isInteger(edgeId) || edgeId <= 0 ? "INVALID_EDGE_ID" : null;
    let initialSourceError = !Number.isInteger(source_node_id) || source_node_id <= 0 ? "INVALID_SOURCE_NODE_ID" : null;

    if (!initialEdgeError && initialSourceError) {
        const inferred = await inferSourceNodeId(edgeId, cookie);
        if (inferred && Number.isInteger(inferred) && inferred > 0) {
            source_node_id = inferred;
            initialSourceError = null;
        }
    }

    if (initialEdgeError || initialSourceError) {
        const message = initialEdgeError ? "Edge invalida" : "source_node_id ausente";
        return (
            <main className="mx-auto w-full max-w-3xl px-4 py-6">
                <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-800">
                    {message}. Abra esta tela a partir do modo grafo clicando em "Condicoes" da edge.
                </div>
                <div className="mt-4">
                    <a
                        href="/workflow?view=graph"
                        className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow"
                    >
                        Voltar ao grafo
                    </a>
                </div>
                {initialEdgeError ? null : (
                    <form className="mt-4 space-y-2" method="get">
                        <label className="block text-sm font-semibold text-slate-800" htmlFor="source_node_id">
                            Se souber o source_node_id, informe aqui
                        </label>
                        <input
                            id="source_node_id"
                            name="source_node_id"
                            type="number"
                            min="1"
                            className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                            placeholder="ex: 10"
                            required
                        />
                        <button
                            type="submit"
                            className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow"
                        >
                            Ir para a edge
                        </button>
                    </form>
                )}
            </main>
        );
    }

    let conditionsPayload: Awaited<ReturnType<typeof fetchConditions>> | null = null;
    let conditionPropsPayload: Awaited<ReturnType<typeof fetchConditionProperties>> | null = null;
    let propertiesPayload: Awaited<ReturnType<typeof fetchProperties>> | null = null;

    conditionsPayload = await fetchConditions(cookie, edgeId, source_node_id);
    const conditionIds = Array.isArray(conditionsPayload.data)
        ? conditionsPayload.data.map((c) => c.id)
        : [];
    conditionPropsPayload = await fetchConditionProperties(cookie, edgeId, source_node_id, conditionIds);
    propertiesPayload = await fetchProperties(cookie);

    return (
        <main className="mx-auto w-full max-w-3xl px-4 py-6">
            <EdgeConditionsClient
                edgeId={edgeId}
                sourceNodeId={source_node_id}
                initialConditions={conditionsPayload?.data ?? []}
                initialConditionProps={conditionPropsPayload?.map ?? {}}
                initialProperties={propertiesPayload?.data ?? []}
                initialErrorCode={conditionsPayload?.error?.code || conditionPropsPayload?.error?.code || null}
            />
        </main>
    );
}
