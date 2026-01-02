import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/lib/auth";
import {
    extractItems,
    getCompanyIdForEmail,
    readJsonOrText,
    resolveServiceUrlFromEnv,
} from "@/app/api/nodes/_shared";

function parsePropertyId(params: { propertyId?: string }):
    | { ok: true; propertyId: string }
    | { ok: false; status: number; code: string } {
    const raw = params.propertyId?.trim() ?? "";
    if (!raw) return { ok: false, status: 400, code: "PROPERTY_ID_REQUIRED" };
    if (!/^\d+$/.test(raw)) return { ok: false, status: 400, code: "INVALID_PROPERTY_ID" };
    return { ok: true, propertyId: raw };
}

function buildPropertyIdUrl(propertiesBaseUrl: string, propertyId: string | number): string {
    const u = new URL(propertiesBaseUrl);
    const cleanBase = u.pathname.replace(/\/+$/, "");
    u.pathname = `${cleanBase}/${encodeURIComponent(String(propertyId))}`;
    return u.toString();
}

async function assertPropertyBelongsToCompany(
    propertiesBaseUrl: string,
    company_id: number,
    propertyId: string
): Promise<
    | { ok: true }
    | { ok: false; status: number; code: string; details?: unknown }
> {
    const listUrl = new URL(propertiesBaseUrl);
    listUrl.searchParams.set("company_id", String(company_id));

    let res: Response;
    try {
        res = await fetch(listUrl, {
            headers: { accept: "application/json" },
        });
    } catch (error) {
        return {
            ok: false,
            status: 502,
            code: "PROPERTIES_FETCH_FAILED",
            details: error instanceof Error ? error.message : error,
        };
    }

    const body = await readJsonOrText(res);
    if (!res.ok) {
        return {
            ok: false,
            status: res.status,
            code: "PROPERTIES_FETCH_FAILED",
            details: body,
        };
    }

    const items = extractItems(body);
    const found = items.some((it) => {
        if (typeof it !== "object" || it === null) return false;
        const id = (it as Record<string, unknown>).id;
        return String(id) === propertyId;
    });

    if (!found) {
        return { ok: false, status: 404, code: "PROPERTY_NOT_FOUND" };
    }

    return { ok: true };
}

function parseUpdateBody(body: unknown):
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

export async function PUT(
    req: Request,
    context: { params: Promise<{ propertyId: string }> }
) {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.trim().toLowerCase();
    if (!email) {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED" } },
            { status: 401 }
        );
    }

    const params = await context.params;
    const parsedId = parsePropertyId(params);
    if (!parsedId.ok) {
        return NextResponse.json(
            { error: { code: parsedId.code } },
            { status: parsedId.status }
        );
    }

    const propertiesBaseUrl = resolveServiceUrlFromEnv("/properties");
    if (!propertiesBaseUrl) {
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

    const ownership = await assertPropertyBelongsToCompany(
        propertiesBaseUrl,
        companyIdResult.company_id,
        parsedId.propertyId
    );
    if (!ownership.ok) {
        return NextResponse.json(
            { error: { code: ownership.code, details: ownership.details } },
            { status: ownership.status }
        );
    }

    const body = (await req.json().catch(() => null)) as unknown;
    const parsedBody = parseUpdateBody(body);
    if (!parsedBody.ok) {
        return NextResponse.json(
            { error: { code: parsedBody.code } },
            { status: parsedBody.status }
        );
    }

    const now = new Date().toISOString();
    const upstreamBody = {
        name: parsedBody.name,
        type: parsedBody.type,
        description: parsedBody.description,
        ...(parsedBody.created_at ? { created_at: parsedBody.created_at } : {}),
        updated_at: parsedBody.updated_at ?? now,
    };

    const propertyUrl = buildPropertyIdUrl(propertiesBaseUrl, parsedId.propertyId);
    let res: Response;
    try {
        res = await fetch(propertyUrl, {
            method: "PUT",
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
                    code: "PROPERTIES_UPDATE_FAILED",
                    details: error instanceof Error ? error.message : error,
                },
            },
            { status: 502 }
        );
    }

    const responseBody = await readJsonOrText(res);
    if (!res.ok) {
        return NextResponse.json(
            { error: { code: "PROPERTIES_UPDATE_FAILED", details: responseBody } },
            { status: res.status }
        );
    }

    return NextResponse.json({ data: responseBody });
}

export async function DELETE(
    _req: Request,
    context: { params: Promise<{ propertyId: string }> }
) {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.trim().toLowerCase();
    if (!email) {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED" } },
            { status: 401 }
        );
    }

    const params = await context.params;
    const parsedId = parsePropertyId(params);
    if (!parsedId.ok) {
        return NextResponse.json(
            { error: { code: parsedId.code } },
            { status: parsedId.status }
        );
    }

    const propertiesBaseUrl = resolveServiceUrlFromEnv("/properties");
    if (!propertiesBaseUrl) {
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

    const ownership = await assertPropertyBelongsToCompany(
        propertiesBaseUrl,
        companyIdResult.company_id,
        parsedId.propertyId
    );
    if (!ownership.ok) {
        return NextResponse.json(
            { error: { code: ownership.code, details: ownership.details } },
            { status: ownership.status }
        );
    }

    const propertyUrl = buildPropertyIdUrl(propertiesBaseUrl, parsedId.propertyId);
    let res: Response;
    try {
        res = await fetch(propertyUrl, {
            method: "DELETE",
            headers: {
                accept: "*/*",
            },
        });
    } catch (error) {
        return NextResponse.json(
            {
                error: {
                    code: "PROPERTIES_DELETE_FAILED",
                    details: error instanceof Error ? error.message : error,
                },
            },
            { status: 502 }
        );
    }

    const responseBody = await readJsonOrText(res);
    if (!res.ok) {
        return NextResponse.json(
            { error: { code: "PROPERTIES_DELETE_FAILED", details: responseBody } },
            { status: res.status }
        );
    }

    return NextResponse.json({ data: responseBody });
}
