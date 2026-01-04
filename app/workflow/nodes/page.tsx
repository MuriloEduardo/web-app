import Link from "next/link";
import { headers } from "next/headers";

import { bffGet } from "@/app/lib/bff/fetcher";
import { type NodeDto } from "@/app/workflow/WorkflowTypes";

type Props = {
    searchParams: Promise<{ q?: string }>;
};

function normalize(text: string) {
    return text.normalize("NFKD").toLowerCase();
}

export default async function NodesPage({ searchParams }: Props) {
    const h = await headers();
    const cookie = h.get("cookie");
    const awaitedSearch = await searchParams;
    const query = awaitedSearch?.q?.trim() ?? "";

    const payload = await bffGet<NodeDto[]>(
        "/api/nodes",
        cookie ? { headers: { cookie } } : undefined
    );

    const nodes = Array.isArray(payload.data) ? payload.data : [];
    const errorCode = payload.error?.code ?? null;

    const filtered = query
        ? nodes.filter((n) => {
            const idMatch = String(n.id) === query;
            const promptMatch = normalize(n.prompt ?? "").includes(normalize(query));
            return idMatch || promptMatch;
        })
        : nodes;

    return (
        <main className="mx-auto w-full max-w-6xl px-4 py-6 min-h-screen text-slate-900 dark:text-white">
            <div className="text-xs text-slate-500 dark:text-gray-300">Workflow / Nodes</div>
            <div className="mt-1 flex items-center justify-between gap-3">
                <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Nodes</h1>
                <Link
                    href="/workflow/nodes/new"
                    className="rounded border px-3 py-1 text-sm text-slate-900 dark:text-white"
                >
                    Novo node
                </Link>
            </div>

            <form className="mt-4 flex flex-wrap items-center gap-2" method="get">
                <input
                    name="q"
                    defaultValue={query}
                    placeholder="Buscar por id ou trecho do prompt"
                    className="w-full max-w-md rounded border px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
                <button type="submit" className="rounded border px-3 py-2 text-sm text-slate-900 dark:text-white">
                    Filtrar
                </button>
                <Link href="/workflow/nodes" className="rounded border px-3 py-2 text-sm text-slate-900 dark:text-white">
                    Limpar
                </Link>
            </form>

            {errorCode ? (
                <div className="mt-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                    Erro ao carregar nodes: {errorCode}
                </div>
            ) : null}

            <div className="mt-4 overflow-hidden rounded border">
                <table className="w-full text-sm">
                    <thead className="bg-slate-100 text-left text-xs uppercase text-slate-500 dark:text-gray-300">
                        <tr>
                            <th className="px-3 py-2">ID</th>
                            <th className="px-3 py-2">Prompt</th>
                            <th className="px-3 py-2">Atualizado</th>
                            <th className="px-3 py-2">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((n) => (
                            <tr key={n.id} className="border-t">
                                <td className="px-3 py-2 align-top text-slate-900 dark:text-white">{n.id}</td>
                                <td className="px-3 py-2 align-top text-slate-900 dark:text-white">{n.prompt}</td>
                                <td className="px-3 py-2 align-top text-slate-500 dark:text-gray-300">{n.updated_at ?? n.created_at ?? ""}</td>
                                <td className="px-3 py-2 align-top">
                                    <div className="flex flex-wrap gap-2 text-xs">
                                        <Link href={`/workflow/nodes/${n.id}`} className="rounded border px-2 py-1 text-slate-900 dark:text-white">
                                            Detalhes
                                        </Link>
                                        <Link
                                            href={`/workflow/edges?source_node_id=${n.id}`}
                                            className="rounded border px-2 py-1 text-slate-900 dark:text-white"
                                        >
                                            Edges
                                        </Link>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-3 py-6 text-center text-sm text-slate-500 dark:text-gray-300">
                                    Nenhum node encontrado.
                                </td>
                            </tr>
                        ) : null}
                    </tbody>
                </table>
            </div>
        </main>
    );
}
