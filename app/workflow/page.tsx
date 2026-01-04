import { headers } from "next/headers";

import { bffGet } from "@/app/lib/bff/fetcher";
import { WorkflowGraphClient } from "@/app/workflow/WorkflowGraphClient";

import { type NodeDto } from "@/app/workflow/WorkflowTypes";

type Props = {
    searchParams?: { view?: string };
};

export default async function WorkflowPage({ searchParams }: Props) {
    const h = await headers();
    const cookie = h.get("cookie");
    const payload = await bffGet<NodeDto[]>(
        "/api/nodes",
        cookie ? { headers: { cookie } } : undefined
    );
    const initialNodes = Array.isArray(payload.data) ? payload.data : [];
    const initialErrorCode = payload.error?.code ?? null;

    return (
        <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
            <WorkflowGraphClient
                initialNodes={initialNodes}
                initialErrorCode={initialErrorCode}
            />
        </main>
    );
}
