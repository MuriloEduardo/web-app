import Link from "next/link";
import { headers } from "next/headers";

import { bffGet } from "@/app/lib/bff/fetcher";
import { type EdgeDto } from "@/app/workflow/WorkflowTypes";
import NewConditionForm from "./NewConditionForm";

type Params = Promise<{ edgeId: string }>;
type SearchParams = Promise<{ source_node_id?: string }>;

export default async function NewConditionPage({
    params,
    searchParams
}: {
    params: Params;
    searchParams: SearchParams;
}) {
    const { edgeId } = await params;
    const { source_node_id } = await searchParams;

    const edgeIdNum = Number(edgeId);
    const sourceNodeId = source_node_id ? Number(source_node_id) : undefined;

    const h = await headers();
    const cookie = h.get("cookie");
    const opts = cookie ? { headers: { cookie } } : undefined;

    // Get edge details
    const edgePayload = await bffGet<EdgeDto>(`/api/edges/${edgeIdNum}`, opts);
    const edge = edgePayload.data;

    if (!edge) {
        return (
            <main className="min-h-screen px-3 py-4 sm:px-4 sm:py-6">
                <div className="mx-auto max-w-4xl">
                    <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
                        Edge não encontrada
                    </div>
                    <Link href="/workflow" className="mt-4 inline-block text-blue-600 hover:underline">
                        ← Voltar
                    </Link>
                </div>
            </main>
        );
    }

    const actualSourceNodeId = sourceNodeId ?? edge.source_node_id;

    return (
        <main className="min-h-screen px-3 py-4 text-slate-900 dark:text-white sm:px-4 sm:py-6">
            <div className="mx-auto w-full max-w-2xl">
                {/* Breadcrumb */}
                <div className="flex items-center gap-3">
                    <Link
                        href={`/workflow/edges/${edgeIdNum}`}
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
                        <Link href={`/workflow/nodes/${edge.source_node_id}`} className="hover:text-blue-600">
                            Node #{edge.source_node_id}
                        </Link>
                        <span>→</span>
                        <Link href={`/workflow/edges/${edgeIdNum}`} className="hover:text-blue-600">
                            Edge #{edgeIdNum}
                        </Link>
                        <span>→</span>
                        <span>Nova Condition</span>
                    </div>
                </div>

                {/* Header */}
                <div className="mt-4">
                    <h1 className="text-xl font-bold sm:text-2xl">Nova Condition</h1>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                        Criar uma nova condição para a Edge #{edgeIdNum}
                    </p>
                </div>

                {/* Form */}
                <NewConditionForm
                    edgeId={edgeIdNum}
                    sourceNodeId={actualSourceNodeId}
                />
            </div>
        </main>
    );
}
