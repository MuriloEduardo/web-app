import Link from "next/link";
import { headers } from "next/headers";

import { bffGet } from "@/app/lib/bff/fetcher";
import { type ConditionDto, type PropertyDto, type EdgeDto } from "@/app/workflow/WorkflowTypes";
import ConditionActions from "./ConditionActions";
import DeletePropertyButton from "./DeletePropertyButton";
import EditPropertyButton from "@/app/workflow/components/EditPropertyButton";

type Params = Promise<{ conditionId: string }>;

export default async function ConditionDetailsPage({ params }: { params: Params }) {
    const { conditionId } = await params;
    const idNum = Number(conditionId);

    const h = await headers();
    const cookie = h.get("cookie");
    const opts = cookie ? { headers: { cookie } } : undefined;

    const conditionPayload = await bffGet<ConditionDto>(`/api/conditions/${idNum}`, opts);
    const condition = conditionPayload.data;

    let properties: PropertyDto[] = [];
    let edge: EdgeDto | null = null;

    if (condition) {
        // Get the edge to find source_node_id
        const edgePayload = await bffGet<EdgeDto>(`/api/edges/${condition.edge_id}`, opts);
        edge = edgePayload.data;

        if (edge) {
            const conditionPropertiesPayload = await bffGet<Array<{ condition_id: number; property_id: number }>>(
                `/api/condition-properties?condition_id=${idNum}&edge_id=${condition.edge_id}&source_node_id=${edge.source_node_id}`,
                opts
            );
            const allPropertiesPayload = await bffGet<PropertyDto[]>(`/api/properties`, opts);

            const conditionPropertyIds = Array.isArray(conditionPropertiesPayload.data) ? conditionPropertiesPayload.data : [];
            const allProperties = Array.isArray(allPropertiesPayload.data) ? allPropertiesPayload.data : [];

            const propertyIds = new Set(conditionPropertyIds.map(cp => cp.property_id));
            properties = allProperties.filter(p => propertyIds.has(p.id));
        }
    }

    if (!condition || !edge) {
        return (
            <main className="min-h-screen px-3 py-4 sm:px-4 sm:py-6">
                <div className="mx-auto max-w-4xl">
                    <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
                        Condition não encontrada
                    </div>
                    <Link href="/workflow" className="mt-4 inline-block text-blue-600 hover:underline">
                        ← Voltar
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen px-3 py-4 text-slate-900 dark:text-white sm:px-4 sm:py-6">
            <div className="mx-auto w-full max-w-4xl">
                {/* Breadcrumb with Back Button */}
                <div className="flex items-center gap-3">
                    <Link
                        href="/workflow"
                        className="rounded-lg border border-slate-300 p-2 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700"
                        title="Voltar"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-gray-300">
                        <Link href="/workflow" className="hover:text-blue-600">Workflow</Link>
                        <span>→</span>
                        <span>Condition #{condition.id}</span>
                    </div>
                </div>

                {/* Header */}
                <div className="mt-4">
                    <h1 className="text-xl font-bold sm:text-2xl">Condition #{condition.id}</h1>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                        <span className="text-slate-600 dark:text-slate-400">
                            Edge ID: {condition.edge_id}
                        </span>
                    </div>
                </div>

                {/* Condition Details Card */}
                <ConditionActions
                    conditionId={condition.id}
                    edgeId={condition.edge_id}
                    operator={condition.operator}
                    compareValue={condition.compare_value}
                />

                {/* Properties Section */}
                <div className="mt-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">Properties ({properties.length})</h2>
                        <Link
                            href={`/workflow/conditions/${condition.id}/properties/new`}
                            className="rounded-lg bg-purple-600 p-2 text-white hover:bg-purple-700"
                            title="Nova property"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </Link>
                    </div>

                    <div className="mt-3 grid gap-3">
                        {properties.map((property, index) => (
                            <div
                                key={`property-${property.id}-${index}`}
                                className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-mono font-semibold text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                                                #{property.id}
                                            </span>
                                            <span className="font-semibold text-slate-900 dark:text-white truncate">
                                                {property.name}
                                            </span>
                                            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                                                {property.type}
                                            </span>
                                        </div>
                                        {property.key && (
                                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">
                                                Key: {property.key}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0">
                                        <EditPropertyButton 
                                            propertyId={property.id}
                                            name={property.name}
                                            type={property.type}
                                            propertyKey={property.key}
                                        />
                                        <DeletePropertyButton 
                                            conditionId={condition.id} 
                                            edgeId={condition.edge_id}
                                            sourceNodeId={edge.source_node_id}
                                            propertyId={property.id} 
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {properties.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center dark:border-slate-700 dark:bg-slate-900">
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Nenhuma property configurada para esta condition.
                                </p>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </main>
    );
}
