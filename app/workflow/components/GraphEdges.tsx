import { headers } from "next/headers";
import { bffGet } from "@/app/lib/bff/fetcher";
import type { Node } from "./GraphNodes";

type Edge = {
    id: number;
    source_node_id: number;
    destination_node_id: number;
    label: string;
    priority: number;
    created_at: string;
    updated_at: string;
};

async function fetchEdges(nodeIds: number[]): Promise<Edge[]> {
    if (nodeIds.length === 0) return [];

    const h = await headers();
    const cookie = h.get("cookie");
    const params = nodeIds.map((id) => `source_node_id=${id}`).join("&");
    const { data } = await bffGet(
        `/api/edges?${params}`,
        cookie ? { headers: { cookie } } : undefined
    );
    return data || [];
}

type Props = {
    nodes: Node[];
};

export async function GraphEdges({ nodes }: Props) {
    const nodeIds = nodes.map((n) => n.id);
    const edges = await fetchEdges(nodeIds);

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-semibold">Edges ({edges.length})</h2>
            <div className="grid gap-3">
                {edges.map((edge) => {
                    const sourceNode = nodes.find((n) => n.id === edge.source_node_id);
                    const destNode = nodes.find((n) => n.id === edge.destination_node_id);

                    return (
                        <div
                            key={edge.id}
                            className="rounded border border-green-300 bg-green-50 p-4"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="font-mono text-sm font-bold text-green-700">
                                    Edge #{edge.id}
                                </div>
                                <div className="rounded bg-green-200 px-2 py-1 text-xs font-medium text-green-800">
                                    Priority: {edge.priority}
                                </div>
                            </div>

                            <div className="mt-3 space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                                        FROM: Node #{edge.source_node_id}
                                    </div>
                                    <div className="text-gray-400">→</div>
                                    <div className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                                        TO: Node #{edge.destination_node_id}
                                    </div>
                                </div>

                                <div className="rounded bg-white p-2 text-sm font-medium text-gray-700">
                                    Condition: {edge.label}
                                </div>

                                {sourceNode && (
                                    <div className="text-xs text-gray-600">
                                        <strong>Source:</strong> {sourceNode.prompt.substring(0, 60)}...
                                    </div>
                                )}

                                {destNode && (
                                    <div className="text-xs text-gray-600">
                                        <strong>Destination:</strong> {destNode.prompt.substring(0, 60)}...
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export { fetchEdges };
export type { Edge };
