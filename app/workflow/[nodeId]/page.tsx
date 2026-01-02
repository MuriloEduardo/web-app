import Link from "next/link";
import { headers } from "next/headers";

import { bffGet } from "@/app/lib/bff/fetcher";
import { NodePropertiesClient } from "@/app/workflow/[nodeId]/NodePropertiesClient";

type NodeDto = {
    id: number;
    company_id: number;
    prompt: string;
    created_at?: string;
    updated_at?: string;
};

type PropertyDto = {
    id: number;
    name: string;
    type: string;
    description?: string;
    created_at?: string;
    updated_at?: string;
};

type NodePropertyDto = {
    node_id: number;
    property_id: number;
};

export default async function WorkflowNodePage({
    params,
}: {
    params: Promise<{ nodeId: string }>;
}) {
    const { nodeId } = await params;

    const idNum = Number(nodeId);
    const h = await headers();
    const cookie = h.get("cookie");
    const opts = cookie ? { headers: { cookie } } : undefined;

    const nodePayload = Number.isFinite(idNum)
        ? await bffGet<NodeDto>(`/api/nodes/${idNum}`, opts)
        : { data: null, error: { code: "INVALID_NODE_ID" } };

    const propsPayload = await bffGet<PropertyDto[]>("/api/properties", opts);

    const nodePropsPayload = Number.isFinite(idNum)
        ? await bffGet<NodePropertyDto[]>(`/api/node-properties?node_id=${idNum}`, opts)
        : { data: [], error: { code: "INVALID_NODE_ID" } };

    const node = nodePayload.data && typeof nodePayload.data === "object" ? (nodePayload.data as NodeDto) : null;

    return (
        <main className="mx-auto w-full max-w-6xl px-4 py-6">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold text-black dark:text-white">
                        Node {Number.isFinite(idNum) ? `#${idNum}` : ""}
                    </h1>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                        Gerenciamento de propriedades do node
                    </p>
                </div>
                <Link
                    href="/workflow"
                    className="rounded border px-3 py-1 text-sm text-black dark:text-white"
                >
                    Voltar ao grafo
                </Link>
            </div>

            <div className="mt-6">
                <NodePropertiesClient
                    node={node}
                    nodeErrorCode={nodePayload.error?.code ?? null}
                    initialProperties={Array.isArray(propsPayload.data) ? propsPayload.data : []}
                    propertiesErrorCode={propsPayload.error?.code ?? null}
                    initialNodeProperties={Array.isArray(nodePropsPayload.data) ? nodePropsPayload.data : []}
                    nodePropertiesErrorCode={nodePropsPayload.error?.code ?? null}
                />
            </div>
        </main>
    );
}
