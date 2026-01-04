import { headers } from "next/headers";
import { bffGet } from "@/app/lib/bff/fetcher";

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

export { fetchEdges };
export type { Edge };
