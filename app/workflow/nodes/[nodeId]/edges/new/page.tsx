import Link from "next/link";
import { headers } from "next/headers";

import { bffGet } from "@/app/lib/bff/fetcher";
import { type NodeDto } from "@/app/workflow/WorkflowTypes";
import NewEdgeForm from "./NewEdgeForm";

type Params = Promise<{ nodeId: string }>;

export default async function NewEdgePage({ params }: { params: Params }) {
    const { nodeId } = await params;
    const sourceNodeId = Number(nodeId);

    const h = await headers();
    const cookie = h.get("cookie");
    const opts = cookie ? { headers: { cookie } } : undefined;

    // Get all nodes to select destination
    const nodesPayload = await bffGet<NodeDto[]>("/api/nodes", opts);
    const nodes = Array.isArray(nodesPayload.data) ? nodesPayload.data : [];

    // Get source node details
    const sourceNodePayload = await bffGet<NodeDto>(`/api/nodes/${sourceNodeId}`, opts);
    const sourceNode = sourceNodePayload.data;

    if (!sourceNode) {
        return (
            <main className="min-h-screen px-3 py-4 sm:px-4 sm:py-6">
                <div className="mx-auto max-w-4xl">
                    <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
                        Node não encontrado
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
            <div className="mx-auto w-full max-w-2xl">
                {/* Breadcrumb */}
                <div className="flex items-center gap-3">
                    <Link
                        href={`/workflow/nodes/${sourceNodeId}`}
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
                        <Link href={`/workflow/nodes/${sourceNodeId}`} className="hover:text-blue-600">
                            Node #{sourceNodeId}
                        </Link>
                        <span>→</span>
                        <span>Nova Edge</span>
                    </div>
                </div>

                {/* Header */}
                <div className="mt-4">
                    <h1 className="text-xl font-bold sm:text-2xl">Nova Edge</h1>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                        Criar uma nova conexão a partir do Node #{sourceNodeId}
                    </p>
                </div>

                {/* Form */}
                <NewEdgeForm sourceNodeId={sourceNodeId} nodes={nodes} />
            </div>
        </main>
    );
}
