import Link from "next/link";
import { headers } from "next/headers";

import { bffGet } from "@/app/lib/bff/fetcher";
import { type PropertyDto } from "@/app/workflow/WorkflowTypes";

export default async function PropertiesPage() {
    const h = await headers();
    const cookie = h.get("cookie");
    const opts = cookie ? { headers: { cookie } } : undefined;

    const payload = await bffGet<PropertyDto[]>("/api/properties", opts);
    const properties = Array.isArray(payload.data) ? payload.data : [];
    const errorCode = payload.error?.code ?? null;

    return (
        <main className="min-h-screen px-3 py-4 text-slate-900 dark:text-white sm:px-4 sm:py-6">
            <div className="mx-auto w-full max-w-5xl">
                <div className="text-xs text-slate-500 dark:text-gray-300">Workflow / Properties</div>
                <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <h1 className="text-lg font-semibold text-slate-900 dark:text-white sm:text-xl">Properties</h1>
                    <Link
                        href="/workflow"
                        className="rounded-lg border border-slate-300 px-4 py-2 text-center text-sm hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
                    >
                        ← Voltar
                    </Link>
                </div>

                {errorCode ? (
                    <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                        Erro ao carregar properties: {errorCode}
                    </div>
                ) : null}

                <div className="mt-4 grid gap-3 sm:gap-4">
                    {properties.map((property) => (
                        <div
                            key={property.id}
                            className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-mono font-semibold text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                                            #{property.id}
                                        </span>
                                        <span className="font-semibold text-slate-900 dark:text-white">
                                            {property.name}
                                        </span>
                                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                                            {property.type}
                                        </span>
                                    </div>
                                    {property.key && (
                                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                            Key: {property.key}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {properties.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900">
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Nenhuma property encontrada.
                            </p>
                        </div>
                    ) : null}
                </div>
            </div>
        </main>
    );
}
