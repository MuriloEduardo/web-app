import { bffGet } from "@/app/lib/bff/fetcher";
import { WorkflowGraphClient } from "@/app/workflow/WorkflowGraphClient";
import { headers } from "next/headers";

type NodeDto = {
    id: number;
    company_id: number;
    prompt: string;
    created_at?: string;
    updated_at?: string;
};

export default async function WorkflowPage() {
    const h = await headers();
    const cookie = h.get("cookie");
    const payload = await bffGet<NodeDto[]>(
        "/api/nodes",
        cookie ? { headers: { cookie } } : undefined
    );
    const initialNodes = Array.isArray(payload.data) ? payload.data : [];
    const initialErrorCode = payload.error?.code ?? null;

    return (
        <main className="mx-auto w-full max-w-6xl px-4 py-6">
            <h1 className="text-xl font-semibold text-black dark:text-white">
                Workflow
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                Página de Gerenciamento de Workflow
            </p>

            <div className="mt-6">
                <WorkflowGraphClient
                    initialNodes={initialNodes}
                    initialErrorCode={initialErrorCode}
                />
            </div>
        </main>
    );
}
