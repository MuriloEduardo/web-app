import Link from "next/link";
import { headers } from "next/headers";

import { bffGet } from "@/app/lib/bff/fetcher";
import { type ConditionDto, type EdgeDto } from "@/app/workflow/WorkflowTypes";

type Props = {
    searchParams: Promise<{ edge_id?: string; source_node_id?: string }>;
};

export default async function ConditionsPage({ searchParams }: Props) {
    const h = await headers();
    const cookie = h.get("cookie");
    const opts = cookie ? { headers: { cookie } } : undefined;
    const awaitedSearch = await searchParams;

    const edgeId = awaitedSearch?.edge_id;
    const sourceNodeId = awaitedSearch?.source_node_id;

    let conditions: ConditionDto[] = [];
    let errorCode: string | null = null;

    if (edgeId && sourceNodeId) {
        const payload = await bffGet<ConditionDto[]>(
            `/api/conditions?edge_id=${edgeId}&source_node_id=${sourceNodeId}`,
            opts
        );
        conditions = Array.isArray(payload.data) ? payload.data : [];
        errorCode = payload.error?.code ?? null;
    }

    return (
        <main className="mx-auto w-full max-w-6xl px-4 py-6 min-h-screen text-slate-900 dark:text-white">
            <div className="text-xs text-slate-500 dark:text-gray-300">Workflow / Conditions</div>
            <div className="mt-1 flex items-center justify-between gap-3">
                <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Conditions</h1>
            </div>

            {!edgeId || !sourceNodeId ? (
                <div className="mt-4 rounded border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                    Selecione uma edge para visualizar suas conditions.
                    <div className="mt-2">
                        <Link href="/workflow/edges" className="underline">
                            Ir para Edges
                        </Link>
                    </div>
                </div>
            ) : (
                <>
                    <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                        <span>Edge ID: <strong>{edgeId}</strong></span>
                        <span>•</span>
                        <span>Source Node ID: <strong>{sourceNodeId}</strong></span>
                    </div>

                    {errorCode ? (
                        <div className="mt-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                            Erro ao carregar conditions: {errorCode}
                        </div>
                    ) : null}

                    <div className="mt-4 overflow-hidden rounded border">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-100 text-left text-xs uppercase text-slate-500 dark:text-gray-300">
                                <tr>
                                    <th className="px-3 py-2">ID</th>
                                    <th className="px-3 py-2">Edge ID</th>
                                    <th className="px-3 py-2">Operator</th>
                                    <th className="px-3 py-2">Compare Value</th>
                                    <th className="px-3 py-2">Criado</th>
                                    <th className="px-3 py-2">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {conditions.map((c) => (
                                    <tr key={c.id} className="border-t">
                                        <td className="px-3 py-2 align-top text-slate-900 dark:text-white">{c.id}</td>
                                        <td className="px-3 py-2 align-top text-slate-900 dark:text-white">{c.edge_id}</td>
                                        <td className="px-3 py-2 align-top">
                                            <code className="rounded bg-gray-100 px-2 py-1 text-xs text-slate-900">
                                                {c.operator}
                                            </code>
                                        </td>
                                        <td className="px-3 py-2 align-top text-slate-900 dark:text-white">{c.compare_value}</td>
                                        <td className="px-3 py-2 align-top text-slate-500 dark:text-gray-300 text-xs">
                                            {c.created_at ? new Date(c.created_at).toLocaleString("pt-BR") : "-"}
                                        </td>
                                        <td className="px-3 py-2 align-top">
                                            <div className="flex flex-wrap gap-2 text-xs">
                                                <Link
                                                    href={`/workflow/conditions/${c.id}`}
                                                    className="rounded border px-2 py-1 text-slate-900 dark:text-white"
                                                >
                                                    Detalhes
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {conditions.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-500 dark:text-gray-300">
                                            Nenhuma condition encontrada para esta edge.
                                        </td>
                                    </tr>
                                ) : null}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </main>
    );
}
