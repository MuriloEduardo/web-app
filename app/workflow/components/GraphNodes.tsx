import { headers } from "next/headers";
import { bffGet } from "@/app/lib/bff/fetcher";

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

export async function GraphNodes() {
    const nodes = await fetchNodes();

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-semibold">Nodes ({nodes.length})</h2>
            <div className="grid gap-3">
                {nodes.map((node) => (
                    <div
                        key={node.id}
                        id={`node-${node.id}`}
                        className="rounded border border-blue-300 bg-blue-50 p-4"
                    >
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
                ))}
            </div>
        </div>
    );
}

export { fetchNodes };
export type { Node };
