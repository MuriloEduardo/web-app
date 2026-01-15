import Link from "next/link";
import { headers } from "next/headers";

import { bffGet } from "@/app/lib/bff/fetcher";
import { type EdgeDto, type ConditionDto, type PropertyDto } from "@/app/workflow/WorkflowTypes";
import EdgeActions from "./EdgeActions";
import DeleteConditionButton from "./DeleteConditionButton";

type Params = Promise<{ edgeId: string }>;

export default async function EdgeDetailsPage({
    params,
}: {
    params: Params;
}) {
    const { edgeId } = await params;

    const idNum = Number(edgeId);
    const h = await headers();
    const cookie = h.get("cookie");
    const opts = cookie ? { headers: { cookie } } : undefined;

    const edgePayload = await bffGet<EdgeDto>(`/api/edges/${idNum}`, opts);
    const edge = edgePayload.data;

    let conditions: ConditionDto[] = [];
    const conditionPropertiesMap = new Map<number, PropertyDto[]>();

    if (edge) {
        const conditionsPayload = await bffGet<ConditionDto[]>(
            `/api/conditions?edge_id=${idNum}&source_node_id=${edge.source_node_id}`,
            opts
        );
        conditions = Array.isArray(conditionsPayload.data) ? conditionsPayload.data : [];

        // Fetch all properties once
        const allPropertiesPayload = await bffGet<PropertyDto[]>(`/api/properties`, opts);
        const allProperties = Array.isArray(allPropertiesPayload.data) ? allPropertiesPayload.data : [];

        // Fetch condition-properties for each condition
        for (const condition of conditions) {
            const conditionPropertiesPayload = await bffGet<Array<{ condition_id: number; property_id: number }>>(
                `/api/condition-properties?condition_id=${condition.id}&edge_id=${idNum}&source_node_id=${edge.source_node_id}`,
                opts
            );
            const conditionPropertyIds = Array.isArray(conditionPropertiesPayload.data) ? conditionPropertiesPayload.data : [];
            const propertyIds = new Set(conditionPropertyIds.map(cp => cp.property_id));
            const properties = allProperties.filter(p => propertyIds.has(p.id));
            conditionPropertiesMap.set(condition.id, properties);
        }
    }

    if (!edge) {
        return (
            <main className="min-h-screen px-3 py-4 sm:px-4 sm:py-6">
                <div className="mx-auto max-w-4xl">
                    <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
                        Edge não encontrada
                    </div>
                    <Link href="/workflow/nodes" className="mt-4 inline-block text-blue-600 hover:underline">
                        ← Voltar para nodes
                    </Link>
                </div>
            </main>
        );
    }

    const getConditionProperties = (conditionId: number): PropertyDto[] => {
        return conditionPropertiesMap.get(conditionId) || [];
    };

    return (
        <main className="min-h-screen px-3 py-4 text-slate-900 dark:text-white sm:px-4 sm:py-6">
            <div className="mx-auto w-full max-w-4xl">
                {/* Breadcrumb with Back Button */}
                <div className="flex items-center gap-3">
                    <Link
                        href={`/workflow/nodes/${edge.source_node_id}`}
                        className="rounded-lg border border-slate-300 p-2 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700"
                        title="Voltar"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-gray-300">
                        <Link href="/workflow" className="hover:text-blue-600">
                            Workflow
                        </Link>
                        <span>/</span>
                        <Link href={`/workflow/nodes/${edge.source_node_id}`} className="hover:text-blue-600">
                            Node #{edge.source_node_id}
                        </Link>
                        <span>/</span>
                        <span>Edge #{edge.id}</span>
                    </div>
                </div>

                {/* Header */}
                <div className="mt-4">
                    <h1 className="text-xl font-bold sm:text-2xl">Edge #{edge.id}</h1>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                        <span className="text-slate-600 dark:text-slate-400">
                            Node #{edge.source_node_id} → Node #{edge.destination_node_id}
                        </span>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-700">
                            Prioridade: {edge.priority}
                        </span>
                    </div>
                </div>

                {/* Edge Actions */}
                <EdgeActions
                    edgeId={edge.id}
                    sourceNodeId={edge.source_node_id}
                    label={edge.label}
                    priority={edge.priority}
                />

                {/* Conditions Section */}
                <div className="mt-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">Conditions ({conditions.length})</h2>
                        <Link
                            href={`/workflow/edges/${edge.id}/conditions/new?source_node_id=${edge.source_node_id}`}
                            className="rounded-lg bg-orange-600 p-2 text-white hover:bg-orange-700"
                            title="Nova condition"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </Link>
                    </div>

                    <div className="mt-3 grid gap-3">
                        {conditions.map((condition) => {
                            const properties = getConditionProperties(condition.id);
                            return (
                                <div
                                    key={condition.id}
                                    className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <Link href={`/workflow/conditions/${condition.id}`} className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-mono font-semibold text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                                                    Condition #{condition.id}
                                                </span>
                                            </div>
                                            <div className="mt-2 flex items-center gap-2 text-sm">
                                                <code className="rounded bg-slate-100 px-2 py-1 text-xs font-mono text-slate-900 dark:bg-slate-700 dark:text-slate-100">
                                                    {condition.operator}
                                                </code>
                                                <span className="text-slate-500">→</span>
                                                <span className="text-slate-700 dark:text-slate-300">
                                                    {condition.compare_value}
                                                </span>
                                            </div>

                                            {/* Properties for this condition */}
                                            {properties.length > 0 && (
                                                <div className="mt-3 space-y-2">
                                                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                                        Properties ({properties.length}):
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {properties.map((property) => (
                                                            <div
                                                                key={property.id}
                                                                className="rounded-lg border border-purple-200 bg-purple-50 px-2 py-1 dark:border-purple-800 dark:bg-purple-950"
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs font-mono font-semibold text-purple-700 dark:text-purple-300">
                                                                        {property.name}
                                                                    </span>
                                                                    <span className="text-xs text-purple-600 dark:text-purple-400">
                                                                        ({property.type})
                                                                    </span>
                                                                </div>
                                                                {property.key && (
                                                                    <div className="text-xs text-purple-500 dark:text-purple-400">
                                                                        {property.key}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </Link>
                                        <DeleteConditionButton
                                            conditionId={condition.id}
                                            edgeId={edge.id}
                                            sourceNodeId={edge.source_node_id}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                        {conditions.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center dark:border-slate-700 dark:bg-slate-900">
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Nenhuma condition configurada para esta edge.
                                </p>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </main>
    );
}
