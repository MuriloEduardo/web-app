import Link from "next/link";
import { headers } from "next/headers";

import { bffGet } from "@/app/lib/bff/fetcher";
import { type ConditionDto } from "@/app/workflow/WorkflowTypes";

export default async function ConditionsPage() {
    const h = await headers();
    const cookie = h.get("cookie");
    const opts = cookie ? { headers: { cookie } } : undefined;

    const payload = await bffGet<ConditionDto[]>("/api/conditions", opts);
    const conditions = Array.isArray(payload.data) ? payload.data : [];
    const errorCode = payload.error?.code ?? null;

    return (
        <main className="min-h-screen px-3 py-4 text-slate-900 dark:text-white sm:px-4 sm:py-6">
            <div className="mx-auto w-full max-w-5xl">
                <div className="text-xs text-slate-500 dark:text-gray-300">Workflow / Conditions</div>
                <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <h1 className="text-lg font-semibold text-slate-900 dark:text-white sm:text-xl">Conditions</h1>
                    <Link
                        href="/workflow"
                        className="rounded-lg border border-slate-300 px-4 py-2 text-center text-sm hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
                    >
                        ← Voltar
                    </Link>
                </div>

                {errorCode ? (
                    <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                        Erro ao carregar conditions: {errorCode}
                    </div>
                ) : null}

                <div className="mt-4 grid gap-3 sm:gap-4">
                    {conditions.map((condition) => (
                        <div
                            key={condition.id}
                            className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-mono font-semibold text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                                            #{condition.id}
                                        </span>
                                        <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                            {condition.operator}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                                        Valor: <span className="font-medium">{condition.compare_value}</span>
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                        Edge ID: {condition.edge_id}
                                    </p>
                                    {condition.created_at && (
                                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                            Criado: {new Date(condition.created_at).toLocaleString('pt-BR')}
                                        </p>
                                    )}
                                    {condition.updated_at && (
                                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                            Atualizado: {new Date(condition.updated_at).toLocaleString('pt-BR')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {conditions.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900">
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Nenhuma condition encontrada.
                            </p>
                        </div>
                    ) : null}
                </div>
            </div>
        </main>
    );
}
