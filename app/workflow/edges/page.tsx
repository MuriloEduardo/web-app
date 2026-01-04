import { headers } from "next/headers";

import { bffGet } from "@/app/lib/bff/fetcher";
import { EdgesPageClient } from "@/app/workflow/edges/EdgesPageClient";
import { type EdgeDto, type NodeDto } from "@/app/workflow/WorkflowTypes";

type Props = {
    searchParams?: { source_node_id?: string };
};

export default async function EdgesPage({ searchParams }: Props) {
    const h = await headers();
    const cookie = h.get("cookie");
    const opts = cookie ? { headers: { cookie } } : undefined;

    const rawSource = Array.isArray(searchParams?.source_node_id)
        ? searchParams?.source_node_id[0]
        : searchParams?.source_node_id;
    const sourceId = Number(rawSource);
    const selectedSourceId = Number.isInteger(sourceId) && sourceId > 0 ? sourceId : null;

    const nodesPayload = await bffGet<NodeDto[]>("/api/nodes", opts);
    const nodes = Array.isArray(nodesPayload.data) ? nodesPayload.data : [];

    const edgesPayload = selectedSourceId
        ? await bffGet<EdgeDto[]>(`/api/edges?source_node_id=${selectedSourceId}`, opts)
        : { data: [], error: null };

    return (
        <main className="mx-auto w-full max-w-6xl px-4 py-6">
            <EdgesPageClient
                nodes={nodes}
                nodesErrorCode={nodesPayload.error?.code ?? null}
                selectedSourceId={selectedSourceId}
                initialEdges={Array.isArray(edgesPayload.data) ? edgesPayload.data : []}
                edgesErrorCode={edgesPayload.error?.code ?? null}
            />
        </main>
    );
}
