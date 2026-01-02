import { headers } from "next/headers";

import { bffGet } from "@/app/lib/bff/fetcher";
import { EdgeConditionsClient } from "@/app/workflow/edges/[edgeId]/EdgeConditionsClient";
import { type ConditionDto, type ConditionPropertyDto, type PropertyDto } from "@/app/workflow/WorkflowTypes";

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

export default async function EdgeConditionsPage({ params, searchParams }: { params: { edgeId: string }; searchParams?: { source_node_id?: string } }) {
    const h = await headers();
    const cookie = h.get("cookie");

    const edgeId = Number(params.edgeId);
    const source_node_id = Number(searchParams?.source_node_id ?? "0");
    const initialEdgeError = !Number.isInteger(edgeId) || edgeId <= 0 ? "INVALID_EDGE_ID" : null;
    const initialSourceError = !Number.isInteger(source_node_id) || source_node_id <= 0 ? "INVALID_SOURCE_NODE_ID" : null;

    let conditionsPayload: Awaited<ReturnType<typeof fetchConditions>> | null = null;
    let conditionPropsPayload: Awaited<ReturnType<typeof fetchConditionProperties>> | null = null;
    let propertiesPayload: Awaited<ReturnType<typeof fetchProperties>> | null = null;

    if (!initialEdgeError && !initialSourceError) {
        conditionsPayload = await fetchConditions(cookie, edgeId, source_node_id);
        const conditionIds = Array.isArray(conditionsPayload.data)
            ? conditionsPayload.data.map((c) => c.id)
            : [];
        conditionPropsPayload = await fetchConditionProperties(cookie, edgeId, source_node_id, conditionIds);
        propertiesPayload = await fetchProperties(cookie);
    }

    return (
        <main className="mx-auto w-full max-w-3xl px-4 py-6">
            <EdgeConditionsClient
                edgeId={edgeId}
                sourceNodeId={source_node_id}
                initialConditions={conditionsPayload?.data ?? []}
                initialConditionProps={conditionPropsPayload?.map ?? {}}
                initialProperties={propertiesPayload?.data ?? []}
                initialErrorCode={initialEdgeError || initialSourceError || conditionsPayload?.error?.code || null}
            />
        </main>
    );
}
