import { headers } from "next/headers";

import { bffGet } from "@/app/lib/bff/fetcher";
import { PropertiesPageClient } from "@/app/workflow/properties/PropertiesPageClient";
import { type PropertyDto } from "@/app/workflow/WorkflowTypes";

type Props = {
    searchParams?: { q?: string };
};

export default async function PropertiesPage({ searchParams }: Props) {
    const h = await headers();
    const cookie = h.get("cookie");
    const opts = cookie ? { headers: { cookie } } : undefined;

    const payload = await bffGet<PropertyDto[]>("/api/properties", opts);
    const properties = Array.isArray(payload.data) ? payload.data : [];

    return (
        <main className="mx-auto w-full max-w-5xl px-4 py-6">
            <PropertiesPageClient
                initialProperties={properties}
                initialErrorCode={payload.error?.code ?? null}
                initialQuery={searchParams?.q?.trim() ?? ""}
            />
        </main>
    );
}
