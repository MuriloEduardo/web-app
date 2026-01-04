import Link from "next/link";
import { headers } from "next/headers";

import { bffGet } from "@/app/lib/bff/fetcher";
import { type EdgeDto, type ConditionDto } from "@/app/workflow/WorkflowTypes";

type Params = Promise<{ edgeId: string }>;
type SearchParams = Promise<{ source_node_id?: string }>;

export default async function EdgeDetailsPage({
    params,
    searchParams,
}: {
    params: Params;
    searchParams: SearchParams;
}) {
    const { edgeId } = await params;
    const search = await searchParams;
    const sourceNodeId = search?.source_node_id;

    const idNum = Number(edgeId);
    const h = await headers();
    const cookie = h.get("cookie");
    const opts = cookie ? { headers: { cookie } } : undefined;

    const edgePayload = await bffGet<EdgeDto>(`/api/edges/${idNum}`, opts);
    const edge = edgePayload.data;

    let conditions: ConditionDto[] = [];
    if (edge && sourceNodeId) {
        const conditionsPayload = await bffGet<ConditionDto[]>(
            `/api/conditions?edge_id=${idNum}&source_node_id=${sourceNodeId}`,
            opts
        );
        conditions = Array.isArray(conditionsPayload.data) ? conditionsPayload.data : [];
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

    return (
        <main className="min-h-screen px-3 py-4 text-slate-900 dark:text-white sm:px-4 sm:py-6">
            <div className="mx-auto w-full max-w-4xl">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-gray-300">
                    <Link href="/workflow" className="hover:text-blue-600">
                        Workflow
                    </Link>
                    <span>/</span>
                    <Link href="/workflow/nodes" className="hover:text-blue-600">
                        Nodes
                    </Link>
                    <span>/</span>
                    <Link href={`/workflow/nodes/${edge.source_node_id}`} className="hover:text-blue-600">
                        #{edge.source_node_id}
                    </Link>
                    <span>/</span>
                    <span>Edge #{edge.id}</span>
                </div>

                {/* Header */}
                <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
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
                    <Link
                        href={`/workflow/nodes/${edge.source_node_id}`}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-center text-sm hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
                    >
                        ← Voltar
                    </Link>
                </div>

                {/* Label Card */}
                <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 sm:p-6">
                    <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Condição/Label</h2>
                    <p className="mt-2 text-sm text-slate-900 dark:text-white">{edge.label}</p>
                </div>

                {/* Conditions Section */}
                <div className="mt-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">Conditions ({conditions.length})</h2>
                        <Link
                            href={`/workflow/edges/${edge.id}/conditions/new?source_node_id=${sourceNodeId}`}
                            className="rounded-lg bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700"
                        >
                            + Nova condition
                        </Link>
                    </div>

                    <div className="mt-3 grid gap-3">
                        {conditions.map((condition) => (
                            <Link
                                key={condition.id}
                                href={`/workflow/conditions/${condition.id}`}
                                className="group block rounded-lg border border-slate-200 bg-white p-4 transition hover:border-orange-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
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
                                    </div>
                                    <svg
                                        className="h-5 w-5 text-slate-400 transition group-hover:text-orange-600"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </Link>
                        ))}
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
