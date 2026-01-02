import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/lib/auth";
import {
    extractItems,
    getCompanyIdForEmail,
    parseCompanyIdFromRequestUrl,
    readJsonOrText,
    resolveServiceUrlFromEnv,
} from "@/app/api/nodes/_shared";

function parseCreateBody(body: unknown):
    | { ok: true; name: string; type: string; description: string | null; created_at?: string; updated_at?: string }
    | { ok: false; status: number; code: string } {
    if (typeof body !== "object" || body === null) {
        return { ok: false, status: 400, code: "INVALID_BODY" };
    }

    const record = body as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name.trim() : "";
    const type = typeof record.type === "string" ? record.type.trim() : "";
    const description =
        typeof record.description === "string" && record.description.trim()
            ? record.description.trim()
            : null;

    if (!name) return { ok: false, status: 400, code: "NAME_REQUIRED" };
    if (!type) return { ok: false, status: 400, code: "TYPE_REQUIRED" };

    const created_at = typeof record.created_at === "string" ? record.created_at.trim() : "";
    const updated_at = typeof record.updated_at === "string" ? record.updated_at.trim() : "";

    return {
        ok: true,
        name,
        type,
        description,
        ...(created_at ? { created_at } : {}),
        ...(updated_at ? { updated_at } : {}),
    };
}

export async function GET(req: Request) {
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

    const upstreamUrl = new URL(propertiesUrl);
    const requestUrl = new URL(req.url);
    requestUrl.searchParams.forEach((value, key) => {
        upstreamUrl.searchParams.set(key, value);
    });
    upstreamUrl.searchParams.set("company_id", String(company_id));

    let res: Response;
    try {
        res = await fetch(upstreamUrl, {
            headers: { accept: "application/json" },
        });
    } catch (error) {
        return NextResponse.json(
            {
                error: {
                    code: "PROPERTIES_FETCH_FAILED",
                    details: error instanceof Error ? error.message : error,
                },
            },
            { status: 502 }
        );
    }

    const body = await readJsonOrText(res);
    if (!res.ok) {
        return NextResponse.json(
            { error: { code: "PROPERTIES_FETCH_FAILED", details: body } },
            { status: res.status }
        );
    }

    const items = extractItems(body);

    return NextResponse.json({ data: items });
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

    const propertiesUrl = resolveServiceUrlFromEnv("/properties");
    if (!propertiesUrl) {
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
    const parsed = parseCreateBody(body);
    if (!parsed.ok) {
        return NextResponse.json(
            { error: { code: parsed.code } },
            { status: parsed.status }
        );
    }

    const now = new Date().toISOString();
    const upstreamBody = {
        company_id: companyIdResult.company_id,
        name: parsed.name,
        type: parsed.type,
        description: parsed.description,
        created_at: parsed.created_at ?? now,
        updated_at: parsed.updated_at ?? now,
    };

    let res: Response;
    try {
        res = await fetch(propertiesUrl, {
            method: "POST",
            headers: {
                accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(upstreamBody),
        });
    } catch (error) {
        return NextResponse.json(
            {
                error: {
                    code: "PROPERTIES_CREATE_FAILED",
                    details: error instanceof Error ? error.message : error,
                },
            },
            { status: 502 }
        );
    }

    const responseBody = await readJsonOrText(res);
    if (!res.ok) {
        return NextResponse.json(
            { error: { code: "PROPERTIES_CREATE_FAILED", details: responseBody } },
            { status: res.status }
        );
    }

    return NextResponse.json({ data: responseBody }, { status: 201 });
}
