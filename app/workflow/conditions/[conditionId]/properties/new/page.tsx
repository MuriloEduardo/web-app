import Link from "next/link";
import { headers } from "next/headers";

import { bffGet } from "@/app/lib/bff/fetcher";
import { type ConditionDto, type PropertyDto, type EdgeDto } from "@/app/workflow/WorkflowTypes";
import CreatePropertyForm from "./CreatePropertyForm";

type Params = Promise<{ conditionId: string }>;

export default async function NewConditionPropertyPage({ params }: { params: Params }) {
    const { conditionId } = await params;
    const idNum = Number(conditionId);

    const h = await headers();
    const cookie = h.get("cookie");
    const opts = cookie ? { headers: { cookie } } : undefined;

    const conditionPayload = await bffGet<ConditionDto>(`/api/conditions/${idNum}`, opts);
    const condition = conditionPayload.data;

    let edge: EdgeDto | null = null;
    let allProperties: PropertyDto[] = [];

    if (condition) {
        const edgePayload = await bffGet<EdgeDto>(`/api/edges/${condition.edge_id}`, opts);
        edge = edgePayload.data;

        const propertiesPayload = await bffGet<PropertyDto[]>(`/api/properties`, opts);
        allProperties = Array.isArray(propertiesPayload.data) ? propertiesPayload.data : [];
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
                <div className="flex items-center gap-3">
                    <Link 
                        href={`/workflow/conditions/${condition.id}`}
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
                        <Link href={`/workflow/conditions/${condition.id}`} className="hover:text-blue-600">Condition #{condition.id}</Link>
                        <span>→</span>
                        <span>Nova Property</span>
                    </div>
                </div>

                <div className="mt-4">
                    <h1 className="text-xl font-bold sm:text-2xl">Adicionar Property à Condition #{condition.id}</h1>
                </div>

                <CreatePropertyForm 
                    conditionId={condition.id}
                    edgeId={condition.edge_id}
                    sourceNodeId={edge.source_node_id}
                    existingProperties={allProperties}
                />
            </div>
        </main>
    );
}
