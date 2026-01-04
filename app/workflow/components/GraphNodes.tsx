import { headers } from "next/headers";
import { bffGet } from "@/app/lib/bff/fetcher";
import type { Edge } from "./GraphEdges";

type Node = {
    id: number;
    prompt: string;
    company_id: number;
    created_at: string;
    updated_at: string;
};

async function fetchNodes(): Promise<Node[]> {
    const h = await headers();
    const cookie = h.get("cookie");
    const { data } = await bffGet("/api/nodes", cookie ? { headers: { cookie } } : undefined);
    return data || [];
}

type Props = {
    edges?: Edge[];
};

export async function GraphNodes({ edges = [] }: Props) {
    const nodes = await fetchNodes();

    return (
        <div>
            <div className="space-y-4">
                {nodes.map((node) => {
                    const nodeEdges = edges.filter((e) => e.source_node_id === node.id);

                    return (
                        <div key={node.id} className="rounded border border-slate-200 bg-white">
                            <div className="border-b border-slate-200 bg-blue-50 p-4">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="font-mono text-sm font-bold text-blue-700">
                                        Node #{node.id}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {new Date(node.updated_at).toLocaleString("pt-BR")}
                                    </div>
                                </div>
                                <div className="mt-2 text-sm text-gray-700">{node.prompt}</div>
                            </div>

                            {nodeEdges.length > 0 && (
                                <div className="p-4">
                                    <div className="mb-2 text-xs font-semibold uppercase text-gray-500">
                                        Conexões ({nodeEdges.length})
                                    </div>
                                    <div className="space-y-2">
                                        {nodeEdges.map((edge) => (
                                            <div
                                                key={edge.id}
                                                className="rounded border border-green-200 bg-green-50 p-3"
                                            >
                                                <div className="flex items-center gap-2 text-xs">
                                                    <div className="font-mono font-bold text-green-700">
                                                        Edge #{edge.id}
                                                    </div>
                                                    <div className="text-gray-400">→</div>
                                                    <div className="rounded bg-blue-100 px-2 py-1 font-medium text-blue-700">
                                                        Node #{edge.destination_node_id}
                                                    </div>
                                                    <div className="ml-auto rounded bg-green-200 px-2 py-1 font-medium text-green-800">
                                                        P{edge.priority}
                                                    </div>
                                                </div>
                                                <div className="mt-2 text-sm text-gray-700">
                                                    <strong>Condição:</strong> {edge.label}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {nodeEdges.length === 0 && edges.length > 0 && (
                                <div className="p-4 text-center text-xs text-gray-400">
                                    Nenhuma conexão de saída
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export { fetchNodes };
export type { Node };
