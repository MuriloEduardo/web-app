import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/lib/auth";
import {
    extractItems,
    getCacheSeconds,
    getCompanyIdForEmail,
    parseCompanyIdFromRequestUrl,
    readJsonOrText,
    resolveServiceUrlFromEnv,
} from "@/app/api/nodes/_shared";

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.trim().toLowerCase();
    if (!email) {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED" } },
            { status: 401 }
        );
    }

    const nodesUrl = resolveServiceUrlFromEnv("/nodes");
    if (!nodesUrl) {
        return NextResponse.json(
            { error: { code: "FLOW_MANAGER_SERVICE_URL_NOT_CONFIGURED" } },
            { status: 500 }
        );
    }

    const queryCompanyId = parseCompanyIdFromRequestUrl(req);
    if (!queryCompanyId.ok) {
        return NextResponse.json(
            { error: { code: queryCompanyId.code } },
            { status: queryCompanyId.status }
        );
    }

    const companyIdResult = await getCompanyIdForEmail(email);
    if (!companyIdResult.ok) {
        return NextResponse.json(
            { error: { code: companyIdResult.code, details: companyIdResult.details } },
            { status: companyIdResult.status }
        );
    }

    const company_id = companyIdResult.company_id;
    if (queryCompanyId.companyId !== null && queryCompanyId.companyId !== company_id) {
        return NextResponse.json(
            { error: { code: "FORBIDDEN_COMPANY_ID" } },
            { status: 403 }
        );
    }

    const nodesFetchUrl = new URL(nodesUrl);
    nodesFetchUrl.searchParams.set("company_id", String(company_id));

    const res = await fetch(nodesFetchUrl, {
        next: { revalidate: getCacheSeconds() },
        headers: {
            accept: "application/json",
        },
    });

    const responseBody = await readJsonOrText(res);

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

    const items = extractItems(responseBody);

    const response = NextResponse.json({ data: items });
    response.headers.set(
        "Cache-Control",
        `private, max-age=${getCacheSeconds()}, stale-while-revalidate=${getCacheSeconds() * 2}`
    );
    response.headers.set("Vary", "Cookie");
    return response;
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.trim().toLowerCase();
    if (!email) {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED" } },
            { status: 401 }
        );
    }

    const nodesUrl = resolveServiceUrlFromEnv("/nodes");
    if (!nodesUrl) {
        return NextResponse.json(
            { error: { code: "FLOW_MANAGER_SERVICE_URL_NOT_CONFIGURED" } },
            { status: 500 }
        );
    }

    const companyIdResult = await getCompanyIdForEmail(email);
    if (!companyIdResult.ok) {
        return NextResponse.json(
            { error: { code: companyIdResult.code, details: companyIdResult.details } },
            { status: companyIdResult.status }
        );
    }

    const body = (await req.json().catch(() => null)) as unknown;
    const payload = (typeof body === "object" && body !== null ? body : {}) as Record<
        string,
        unknown
    >;

    const prompt = typeof payload.prompt === "string" ? payload.prompt.trim() : "";
    if (!prompt) {
        return NextResponse.json(
            { error: { code: "PROMPT_REQUIRED" } },
            { status: 400 }
        );
    }

    const now = new Date().toISOString();
    const upstreamBody = {
        company_id: companyIdResult.company_id,
        prompt,
        created_at:
            typeof payload.created_at === "string" && payload.created_at.trim()
                ? payload.created_at
                : now,
        updated_at:
            typeof payload.updated_at === "string" && payload.updated_at.trim()
                ? payload.updated_at
                : now,
    };

    const res = await fetch(nodesUrl, {
        method: "POST",
        headers: {
            accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify(upstreamBody),
    });

    const responseBody = await readJsonOrText(res);

    if (!res.ok) {
        return NextResponse.json(
            {
                error: {
                    code: "NODES_CREATE_FAILED",
                    details: responseBody,
                },
            },
            { status: res.status }
        );
    }

    return NextResponse.json({ data: responseBody }, { status: 201 });
}
