import Link from "next/link";
import { headers } from "next/headers";

import { bffGet } from "@/app/lib/bff/fetcher";
import { type PropertyDto } from "@/app/workflow/WorkflowTypes";
import EditPropertyForm from "./EditPropertyForm";

type Params = Promise<{ propertyId: string }>;

export default async function EditPropertyPage({ params }: { params: Params }) {
    const { propertyId } = await params;
    const idNum = Number(propertyId);

    if (!Number.isInteger(idNum) || idNum <= 0) {
        return (
            <main className="min-h-screen px-3 py-4 text-slate-900 dark:text-white sm:px-4 sm:py-6">
                <div className="mx-auto w-full max-w-3xl">
                    <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                        ID de property inválido
                    </div>
                </div>
            </main>
        );
    }

    const h = await headers();
    const cookie = h.get("cookie");
    const opts = cookie ? { headers: { cookie } } : undefined;

    const payload = await bffGet<PropertyDto>(`/api/properties/${idNum}`, opts);
    const property = payload.data;
    const errorCode = payload.error?.code;

    if (errorCode || !property) {
        return (
            <main className="min-h-screen px-3 py-4 text-slate-900 dark:text-white sm:px-4 sm:py-6">
                <div className="mx-auto w-full max-w-3xl">
                    <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                        Erro ao carregar property: {errorCode || "PROPERTY_NOT_FOUND"}
                    </div>
                    <div className="mt-4">
                        <Link
                            href="/workflow/properties"
                            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                        >
                            ← Voltar para properties
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen px-3 py-4 text-slate-900 dark:text-white sm:px-4 sm:py-6">
            <div className="mx-auto w-full max-w-3xl">
                <div className="flex items-center gap-3">
                    <Link
                        href="/workflow/properties"
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
                        <Link href="/workflow/properties" className="hover:text-blue-600">Properties</Link>
                        <span>→</span>
                        <span>Editar #{property.id}</span>
                    </div>
                </div>

                <div className="mt-4">
                    <h1 className="text-xl font-bold sm:text-2xl">Editar Property</h1>
                    <div className="mt-2 flex items-center gap-2">
                        <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-mono font-semibold text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                            #{property.id}
                        </span>
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                            {property.name}
                        </span>
                    </div>
                </div>

                <EditPropertyForm property={property} />
            </div>
        </main>
    );
}
