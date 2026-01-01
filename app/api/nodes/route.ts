import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/lib/auth";

const CACHE_SECONDS = 30;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function resolveNodesUrlFromEnv(): string | null {
    const raw = process.env.FLOW_MANAGER_SERVICE_URL?.trim();
    if (!raw) return null;

    try {
        const url = new URL(raw);

        // Allow either a full endpoint (ending with /nodes) or just a base URL.
        const path = url.pathname.replace(/\/+$/, "");
        if (path === "" || path === "/") {
            url.pathname = "/nodes/";
        } else if (!path.endsWith("/nodes")) {
            url.pathname = path + "/nodes/";
        } else {
            url.pathname = path + "/";
        }

        return url.toString();
    } catch {
        return null;
    }
}

export async function GET() {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.trim().toLowerCase();
    if (!email) {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED" } },
            { status: 401 }
        );
    }

    const nodesUrl = resolveNodesUrlFromEnv();
    if (!nodesUrl) {
        return NextResponse.json(
            { error: { code: "FLOW_MANAGER_SERVICE_URL_NOT_CONFIGURED" } },
            { status: 500 }
        );
    }

    const res = await fetch(nodesUrl, {
        next: { revalidate: CACHE_SECONDS },
        headers: {
            accept: "application/json",
        },
    });

    const contentType = res.headers.get("content-type") ?? "";
    const responseBody = contentType.includes("application/json")
        ? await res.json().catch(() => null)
        : await res.text().catch(() => null);

    if (!res.ok) {
        return NextResponse.json(
            {
                error: {
                    code: "NODES_FETCH_FAILED",
                    details: responseBody,
                },
            },
            { status: res.status }
        );
    }

    const items = Array.isArray(responseBody)
        ? responseBody
        : isRecord(responseBody) && Array.isArray(responseBody.items)
            ? responseBody.items
            : [];

    const response = NextResponse.json({ data: items });
    response.headers.set(
        "Cache-Control",
        `private, max-age=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS * 2}`
    );
    response.headers.set("Vary", "Cookie");
    return response;
}
