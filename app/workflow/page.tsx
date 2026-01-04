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
            <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
                <div className="mx-auto w-full max-w-6xl">
                    <WorkflowGraphClient
                        initialNodes={initialNodes}
                        initialErrorCode={initialErrorCode}
                    />
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
            <div className="mx-auto w-full max-w-6xl space-y-8">
                <WorkflowMobileClient
                    initialNodes={initialNodes}
                    initialErrorCode={initialErrorCode}
                />

                <div className="hidden lg:block">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                        <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-semibold">Editor avançado (desktop)</div>
                            <a className="text-xs font-medium text-blue-600 dark:text-blue-300" href="/workflow?view=graph">
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
            </div>
        </main>
    );
}
