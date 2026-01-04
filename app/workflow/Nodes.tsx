import { headers } from "next/headers";
import { bffGet } from "@/app/lib/bff/fetcher";

async function makeRequest(url: string) {
    const h = await headers();
    const cookie = h.get("cookie");
    const { data } = await bffGet(url, cookie ? { headers: { cookie } } : undefined);
    return data;
}

async function RequestNodes(): Promise<any> {
    const data = await makeRequest("/api/nodes");
    return data;
}

async function RequestEdges(nodes_ids: string): Promise<any> {
    const data = await makeRequest(`/api/edges?${nodes_ids}`);
    return data;
}

export default async function NodesPage() {
    const nodes = await RequestNodes();

    const nodes_ids = nodes.map((n: any) => `source_node_id=${n.id}`).join("&");

    console.log("NODES IDS:", nodes_ids);
    const edges = await RequestEdges(nodes_ids);

    return <main>
        <div>
            <div>
                <strong>NODES:</strong>
                <pre>{JSON.stringify(nodes, null, 2)}</pre>
            </div>
            <div>
                <strong>EDGES:</strong>
                <pre>{JSON.stringify(edges, null, 2)}</pre>
            </div>
        </div>
    </main>;
}
