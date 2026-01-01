import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/lib/auth";
import {
    extractItems,
    getCacheSeconds,
    readJsonOrText,
    resolveServiceUrlFromEnv,
} from "@/app/api/nodes/_shared";

export async function GET() {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.trim().toLowerCase();
    if (!email) {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED" } },
            { status: 401 }
        );
    }

    const propertiesUrl = resolveServiceUrlFromEnv("/properties");
    if (!propertiesUrl) {
        return NextResponse.json(
            { error: { code: "FLOW_MANAGER_SERVICE_URL_NOT_CONFIGURED" } },
            { status: 500 }
        );
    }

    const res = await fetch(propertiesUrl, {
        next: { revalidate: getCacheSeconds() },
        headers: { accept: "application/json" },
    });

    const body = await readJsonOrText(res);
    if (!res.ok) {
        return NextResponse.json(
            { error: { code: "PROPERTIES_FETCH_FAILED", details: body } },
            { status: res.status }
        );
    }

    const items = extractItems(body);

    const response = NextResponse.json({ data: items });
    response.headers.set(
        "Cache-Control",
        `private, max-age=${getCacheSeconds()}, stale-while-revalidate=${getCacheSeconds() * 2}`
    );
    response.headers.set("Vary", "Cookie");
    return response;
}
