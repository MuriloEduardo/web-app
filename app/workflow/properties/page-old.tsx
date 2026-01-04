import { headers } from "next/headers";

import { bffGet } from "@/app/lib/bff/fetcher";
import { PropertiesPageClient } from "@/app/workflow/properties/PropertiesPageClient";
import { type PropertyDto } from "@/app/workflow/WorkflowTypes";

type Props = {
    searchParams: Promise<{ q?: string } | undefined>;
};

export default async function PropertiesPage({ searchParams }: Props) {
    const awaitedSearch = await searchParams;
    const h = await headers();
    const cookie = h.get("cookie");
    const opts = cookie ? { headers: { cookie } } : undefined;

    const payload = await bffGet<PropertyDto[]>("/api/properties", opts);
    const properties = Array.isArray(payload.data) ? payload.data : [];

    return (
        <main className="min-h-screen px-3 py-4 text-slate-900 dark:text-white sm:px-4 sm:py-6">
            <div className="mx-auto w-full max-w-5xl">
                <PropertiesPageClient
                initialProperties={properties}
                initialErrorCode={payload.error?.code ?? null}
                initialQuery={awaitedSearch?.q?.trim() ?? ""}
            />
        </main>
    );
}
