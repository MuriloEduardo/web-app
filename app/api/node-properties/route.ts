import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/lib/auth";
import {
    extractItems,
    getCompanyIdForEmail,
    readJsonOrText,
    resolveServiceUrlFromEnv,
} from "@/app/api/nodes/_shared";

function parseNodeIdFromUrl(req: Request):
    | { ok: true; nodeId: number }
    | { ok: false; status: number; code: string } {
    const url = new URL(req.url);
    const raw = url.searchParams.get("node_id")?.trim() ?? "";
    if (!raw) return { ok: false, status: 400, code: "NODE_ID_REQUIRED" };

    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
        return { ok: false, status: 400, code: "INVALID_NODE_ID" };
    }

    return { ok: true, nodeId: parsed };
}

async function assertNodeBelongsToCompany(
    nodesBaseUrl: string,
    company_id: number,
    nodeId: number
): Promise<
    | { ok: true }
    | { ok: false; status: number; code: string; details?: unknown }
> {
    const listUrl = new URL(nodesBaseUrl);
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
            code: "NODES_FETCH_FAILED",
            details: error instanceof Error ? error.message : error,
        };
    }

    const body = await readJsonOrText(res);
    if (!res.ok) {
        return { ok: false, status: res.status, code: "NODES_FETCH_FAILED", details: body };
    }

    const items = extractItems(body);
    const found = items.some((it) => {
        if (typeof it !== "object" || it === null) return false;
        const id = (it as Record<string, unknown>).id;
        return Number(id) === nodeId;
    });

    if (!found) {
        return { ok: false, status: 404, code: "NODE_NOT_FOUND" };
    }

    return { ok: true };
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

    const parsedNode = parseNodeIdFromUrl(req);
    if (!parsedNode.ok) {
        return NextResponse.json(
            { error: { code: parsedNode.code } },
            { status: parsedNode.status }
        );
    }

    const nodesBaseUrl = resolveServiceUrlFromEnv("/nodes");
    if (!nodesBaseUrl) {
        return NextResponse.json(
            { error: { code: "FLOW_MANAGER_SERVICE_URL_NOT_CONFIGURED" } },
            { status: 500 }
        );
    }

    const nodePropertiesUrl = resolveServiceUrlFromEnv("/node-properties");
    if (!nodePropertiesUrl) {
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

    const ownership = await assertNodeBelongsToCompany(
        nodesBaseUrl,
        companyIdResult.company_id,
        parsedNode.nodeId
    );
    if (!ownership.ok) {
        return NextResponse.json(
            { error: { code: ownership.code, details: ownership.details } },
            { status: ownership.status }
        );
    }

    const upstreamUrl = new URL(nodePropertiesUrl);
    upstreamUrl.searchParams.set("node_id", String(parsedNode.nodeId));

    let res: Response;
    try {
        res = await fetch(upstreamUrl, {
            headers: { accept: "application/json" },
        });
    } catch (error) {
        return NextResponse.json(
            {
                error: {
                    code: "NODE_PROPERTIES_FETCH_FAILED",
                    details: error instanceof Error ? error.message : error,
                },
            },
            { status: 502 }
        );
    }

    const body = await readJsonOrText(res);
    if (!res.ok) {
        return NextResponse.json(
            { error: { code: "NODE_PROPERTIES_FETCH_FAILED", details: body } },
            { status: res.status }
        );
    }

    const items = extractItems(body);

    return NextResponse.json({ data: items });
}

function parseCreateBody(body: unknown):
    | { ok: true; node_id: number; property_id: number }
    | { ok: false; status: number; code: string } {
    if (typeof body !== "object" || body === null) {
        return { ok: false, status: 400, code: "INVALID_BODY" };
    }

    const record = body as Record<string, unknown>;
    const node_id = Number(record.node_id);
    const property_id = Number(record.property_id);

    if (!Number.isFinite(node_id) || !Number.isInteger(node_id) || node_id <= 0) {
        return { ok: false, status: 400, code: "INVALID_NODE_ID" };
    }

    if (!Number.isFinite(property_id) || !Number.isInteger(property_id) || property_id <= 0) {
        return { ok: false, status: 400, code: "INVALID_PROPERTY_ID" };
    }

    return { ok: true, node_id, property_id };
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

    const nodesBaseUrl = resolveServiceUrlFromEnv("/nodes");
    if (!nodesBaseUrl) {
        return NextResponse.json(
            { error: { code: "FLOW_MANAGER_SERVICE_URL_NOT_CONFIGURED" } },
            { status: 500 }
        );
    }

    const nodePropertiesUrl = resolveServiceUrlFromEnv("/node-properties");
    if (!nodePropertiesUrl) {
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

    const body = await req.json().catch(() => null);
    const parsedBody = parseCreateBody(body);
    if (!parsedBody.ok) {
        return NextResponse.json(
            { error: { code: parsedBody.code } },
            { status: parsedBody.status }
        );
    }

    const ownership = await assertNodeBelongsToCompany(
        nodesBaseUrl,
        companyIdResult.company_id,
        parsedBody.node_id
    );
    if (!ownership.ok) {
        return NextResponse.json(
            { error: { code: ownership.code, details: ownership.details } },
            { status: ownership.status }
        );
    }

    let res: Response;
    try {
        res = await fetch(nodePropertiesUrl, {
            method: "POST",
            headers: {
                accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                node_id: parsedBody.node_id,
                property_id: parsedBody.property_id,
            }),
        });
    } catch (error) {
        return NextResponse.json(
            {
                error: {
                    code: "NODE_PROPERTIES_CREATE_FAILED",
                    details: error instanceof Error ? error.message : error,
                },
            },
            { status: 502 }
        );
    }

    const responseBody = await readJsonOrText(res);
    if (!res.ok) {
        return NextResponse.json(
            { error: { code: "NODE_PROPERTIES_CREATE_FAILED", details: responseBody } },
            { status: res.status }
        );
    }

    return NextResponse.json({ data: responseBody }, { status: 201 });
}
