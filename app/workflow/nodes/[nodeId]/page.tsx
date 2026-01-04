import { headers } from "next/headers";

import { bffGet } from "@/app/lib/bff/fetcher";
import { NodeDetailsClient } from "@/app/workflow/nodes/[nodeId]/NodeDetailsClient";
import { type NodeDto, type PropertyDto, type NodePropertyDto, type EdgeDto } from "@/app/workflow/nodes/[nodeId]/NodeDetailsClient";

type Params = Promise<{ nodeId: string }>;

type Props = {
    params: Params;
};

export default async function NodeDetailsPage({ params }: Props) {
    const { nodeId } = await params;
    const idNum = Number(nodeId);

    const h = await headers();
    const cookie = h.get("cookie");
    const opts = cookie ? { headers: { cookie } } : undefined;

    const nodePayload = Number.isFinite(idNum)
        ? await bffGet<NodeDto>(`/api/nodes/${idNum}`, opts)
        : { data: null, error: { code: "INVALID_NODE_ID" } };

    const propertiesPayload = await bffGet<PropertyDto[]>("/api/properties", opts);

    const nodePropsPayload = Number.isFinite(idNum)
        ? await bffGet<NodePropertyDto[]>(`/api/node-properties?node_id=${idNum}`, opts)
        : { data: [], error: { code: "INVALID_NODE_ID" } };

    const edgesPayload = Number.isFinite(idNum)
        ? await bffGet<EdgeDto[]>(`/api/edges?source_node_id=${idNum}`, opts)
        : { data: [], error: { code: "INVALID_NODE_ID" } };

    return (
        <main className="mx-auto w-full max-w-6xl px-4 py-6 min-h-screen bg-white text-slate-900">
            <NodeDetailsClient
                node={nodePayload.data ?? null}
                nodeErrorCode={nodePayload.error?.code ?? null}
                properties={Array.isArray(propertiesPayload.data) ? propertiesPayload.data : []}
                propertiesErrorCode={propertiesPayload.error?.code ?? null}
                nodeProperties={Array.isArray(nodePropsPayload.data) ? nodePropsPayload.data : []}
                nodePropertiesErrorCode={nodePropsPayload.error?.code ?? null}
                edges={Array.isArray(edgesPayload.data) ? edgesPayload.data : []}
                edgesErrorCode={edgesPayload.error?.code ?? null}
            />
        </main>
    );
}
