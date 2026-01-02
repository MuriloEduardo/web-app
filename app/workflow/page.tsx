import { headers } from "next/headers";

import { bffGet } from "@/app/lib/bff/fetcher";
import { WorkflowGraphClient } from "@/app/workflow/WorkflowGraphClient";
import { WorkflowMobileClient } from "@/app/workflow/WorkflowMobileClient";

import { type NodeDto } from "@/app/workflow/WorkflowTypes";

type Props = {
    searchParams?: { view?: string };
};

export default async function WorkflowPage({ searchParams }: Props) {
    const mode = searchParams?.view === "graph" ? "graph" : "mobile";
    const h = await headers();
    const cookie = h.get("cookie");
    const payload = await bffGet<NodeDto[]>(
        "/api/nodes",
        cookie ? { headers: { cookie } } : undefined
    );
    const initialNodes = Array.isArray(payload.data) ? payload.data : [];
    const initialErrorCode = payload.error?.code ?? null;

    if (mode === "graph") {
        return (
            <main className="mx-auto w-full max-w-6xl px-4 py-6">
                <WorkflowGraphClient
                    initialNodes={initialNodes}
                    initialErrorCode={initialErrorCode}
                />
            </main>
        );
    }

    return (
        <main className="mx-auto w-full max-w-6xl px-4 py-6">
            <WorkflowMobileClient
                initialNodes={initialNodes}
                initialErrorCode={initialErrorCode}
            />

            <div className="mt-8 hidden lg:block">
                <div className="rounded-3xl border bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-black">Editor avançado (desktop)</div>
                        <a
                            className="text-xs font-medium text-blue-600"
                            href="/workflow?view=graph"
                        >
                            Abrir em modo grafo
                        </a>
                    </div>
                    <div className="mt-4">
                        <WorkflowGraphClient
                            initialNodes={initialNodes}
                            initialErrorCode={initialErrorCode}
                        />
                    </div>
                </div>
            </div>
        </main>
    );
}
