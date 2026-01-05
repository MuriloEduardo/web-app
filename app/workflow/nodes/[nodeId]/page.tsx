import Link from "next/link";
import { headers } from "next/headers";

import { bffGet } from "@/app/lib/bff/fetcher";
import { type NodeDto, type EdgeDto, type PropertyDto } from "@/app/workflow/WorkflowTypes";
import NodeActions from "./NodeActions";
import DeleteEdgeButton from "./DeleteEdgeButton";
import DeletePropertyButton from "./DeletePropertyButton";
import EditPropertyButton from "@/app/workflow/components/EditPropertyButton";

type Params = Promise<{ nodeId: string }>;

export default async function NodeDetailsPage({ params }: { params: Params }) {
    const { nodeId } = await params;
    const idNum = Number(nodeId);

    const h = await headers();
    const cookie = h.get("cookie");
    const opts = cookie ? { headers: { cookie } } : undefined;

    const nodePayload = await bffGet<NodeDto>(`/api/nodes/${idNum}`, opts);
    const edgesPayload = await bffGet<EdgeDto[]>(`/api/edges?source_node_id=${idNum}`, opts);
    const nodePropertiesPayload = await bffGet<Array<{ node_id: number; property_id: number }>>(`/api/node-properties?node_id=${idNum}`, opts);
    const allPropertiesPayload = await bffGet<PropertyDto[]>(`/api/properties`, opts);

    const node = nodePayload.data;
    const edges = Array.isArray(edgesPayload.data) ? edgesPayload.data : [];
    const nodePropertyIds = Array.isArray(nodePropertiesPayload.data) ? nodePropertiesPayload.data : [];
    const allProperties = Array.isArray(allPropertiesPayload.data) ? allPropertiesPayload.data : [];

    // Match properties by ID
    const propertyIds = new Set(nodePropertyIds.map(np => np.property_id));
    const properties = allProperties.filter(p => propertyIds.has(p.id));

    if (!node) {
        return (
            <main className="min-h-screen px-3 py-4 sm:px-4 sm:py-6">
                <div className="mx-auto max-w-4xl">
                    <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
                        Node não encontrado
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
                        <span>Node #{node.id}</span>
                    </div>
                </div>

                {/* Header */}
                <div className="mt-4">
                    <h1 className="text-xl font-bold sm:text-2xl">Node #{node.id}</h1>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                        Atualizado em {node.updated_at ? new Date(node.updated_at).toLocaleString("pt-BR") : "-"}
                    </p>
                </div>

                {/* Prompt Card with Actions */}
                <NodeActions nodeId={node.id} prompt={node.prompt} />

                {/* Edges Section */}
                <div className="mt-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">Edges ({edges.length})</h2>
                        <Link
                            href={`/workflow/nodes/${node.id}/edges/new`}
                            className="rounded-lg bg-green-600 p-2 text-white hover:bg-green-700"
                            title="Nova edge"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </Link>
                    </div>

                    <div className="mt-3 grid gap-3">
                        {edges.map((edge) => (
                            <div
                                key={edge.id}
                                className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <Link href={`/workflow/edges/${edge.id}`} className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-mono font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">
                                                Edge #{edge.id}
                                            </span>
                                            <span className="text-xs text-slate-500">→</span>
                                            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                                Node #{edge.destination_node_id}
                                            </span>
                                        </div>
                                        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                                            {edge.label}
                                        </p>
                                    </Link>
                                    <DeleteEdgeButton edgeId={edge.id} sourceNodeId={node.id} />
                                </div>
                            </div>
                        ))}
                        {edges.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center dark:border-slate-700 dark:bg-slate-900">
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Nenhuma edge configurada para este node.
                                </p>
                            </div>
                        ) : null}
                    </div>
                </div>

                {/* Properties Section */}
                <div className="mt-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">Properties ({properties.length})</h2>
                        <Link
                            href={`/workflow/nodes/${node.id}/properties/new`}
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
                                            description={property.description}
                                        />
                                        <DeletePropertyButton nodeId={node.id} propertyId={property.id} />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {properties.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center dark:border-slate-700 dark:bg-slate-900">
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Nenhuma property configurada para este node.
                                </p>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </main>
    );
}
