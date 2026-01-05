import Link from "next/link";
import { headers } from "next/headers";

import { bffGet } from "@/app/lib/bff/fetcher";
import { type PropertyDto } from "@/app/workflow/WorkflowTypes";
import PropertyActions from "./PropertyActions";

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
                <div className="flex items-center gap-3">
                    <Link
                        href="/workflow"
                        className="rounded-lg border border-slate-300 p-2 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700"
                        title="Voltar"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-gray-300">
                        <Link href="/workflow" className="hover:text-blue-600">Workflow</Link>
                        <span>→</span>
                        <span>Properties</span>
                    </div>
                </div>

                <div className="mt-4">
                    <h1 className="text-xl font-bold sm:text-2xl">Properties</h1>
                </div>

                {errorCode ? (
                    <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                        Erro ao carregar properties: {errorCode}
                    </div>
                ) : null}

                <div className="mt-6 grid gap-3 sm:gap-4">
                    {properties.map((property) => (
                        <PropertyActions
                            key={property.id}
                            propertyId={property.id}
                            name={property.name}
                            type={property.type}
                            propertyKey={property.key}
                            description={property.description}
                        />
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
