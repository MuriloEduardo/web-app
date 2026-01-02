import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/lib/auth";
import {
    buildNodeIdUrl,
    extractItems,
    getCompanyIdForEmail,
    readJsonOrText,
    resolveServiceUrlFromEnv,
} from "@/app/api/nodes/_shared";

function parseNodeId(params: { nodeId?: string }):
    | { ok: true; nodeId: string }
    | { ok: false; status: number; code: string } {
    const raw = params.nodeId?.trim() ?? "";
    if (!raw) return { ok: false, status: 400, code: "NODE_ID_REQUIRED" };
    if (!/^\d+$/.test(raw)) return { ok: false, status: 400, code: "INVALID_NODE_ID" };
    return { ok: true, nodeId: raw };
}

async function assertNodeBelongsToCompany(
    nodesBaseUrl: string,
    company_id: number,
    nodeId: string
): Promise<
    | { ok: true }
    | { ok: false; status: number; code: string; details?: unknown }
> {
    const listUrl = new URL(nodesBaseUrl);
    listUrl.searchParams.set("company_id", String(company_id));

    const res = await fetch(listUrl, {
        headers: { accept: "application/json" },
    });

    const body = await readJsonOrText(res);
    if (!res.ok) {
        return { ok: false, status: res.status, code: "NODES_FETCH_FAILED", details: body };
    }

    const items = extractItems(body);
    const found = items.some((it) => {
        if (typeof it !== "object" || it === null) return false;
        const id = (it as Record<string, unknown>).id;
        return String(id) === nodeId;
    });

    if (!found) {
        return { ok: false, status: 404, code: "NODE_NOT_FOUND" };
    }

    return { ok: true };
}

export async function GET(
    _req: Request,
    context: { params: Promise<{ nodeId: string }> }
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
    const parsedNodeId = parseNodeId(params);
    if (!parsedNodeId.ok) {
        return NextResponse.json(
            { error: { code: parsedNodeId.code } },
            { status: parsedNodeId.status }
        );
    }

    const nodesBaseUrl = resolveServiceUrlFromEnv("/nodes");
    if (!nodesBaseUrl) {
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
        parsedNodeId.nodeId
    );
    if (!ownership.ok) {
        return NextResponse.json(
            { error: { code: ownership.code, details: ownership.details } },
            { status: ownership.status }
        );
    }

    const nodeUrl = buildNodeIdUrl(nodesBaseUrl, parsedNodeId.nodeId);

    let res: Response;
    try {
        res = await fetch(nodeUrl, { headers: { accept: "application/json" } });
    } catch (error) {
        return NextResponse.json(
            { error: { code: "NODES_FETCH_FAILED", details: error instanceof Error ? error.message : error } },
            { status: 502 }
        );
    }

    const body = await readJsonOrText(res);
    if (!res.ok) {
        return NextResponse.json(
            { error: { code: "NODES_FETCH_FAILED", details: body } },
            { status: res.status }
        );
    }

    return NextResponse.json({ data: body });
}

export async function PUT(
    req: Request,
    context: { params: Promise<{ nodeId: string }> }
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
    const parsedNodeId = parseNodeId(params);
    if (!parsedNodeId.ok) {
        return NextResponse.json(
            { error: { code: parsedNodeId.code } },
            { status: parsedNodeId.status }
        );
    }

    const nodesBaseUrl = resolveServiceUrlFromEnv("/nodes");
    if (!nodesBaseUrl) {
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
        parsedNodeId.nodeId
    );
    if (!ownership.ok) {
        return NextResponse.json(
            { error: { code: ownership.code, details: ownership.details } },
            { status: ownership.status }
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

    const nodeUrl = buildNodeIdUrl(nodesBaseUrl, parsedNodeId.nodeId);
    const res = await fetch(nodeUrl, {
        method: "PUT",
        headers: {
            accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify(upstreamBody),
    });

    const responseBody = await readJsonOrText(res);

    if (!res.ok) {
        return NextResponse.json(
            { error: { code: "NODES_UPDATE_FAILED", details: responseBody } },
            { status: res.status }
        );
    }

    return NextResponse.json({ data: responseBody });
}

export async function DELETE(
    _req: Request,
    context: { params: Promise<{ nodeId: string }> }
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
    const parsedNodeId = parseNodeId(params);
    if (!parsedNodeId.ok) {
        return NextResponse.json(
            { error: { code: parsedNodeId.code } },
            { status: parsedNodeId.status }
        );
    }

    const nodesBaseUrl = resolveServiceUrlFromEnv("/nodes");
    if (!nodesBaseUrl) {
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
        parsedNodeId.nodeId
    );
    if (!ownership.ok) {
        return NextResponse.json(
            { error: { code: ownership.code, details: ownership.details } },
            { status: ownership.status }
        );
    }

    const nodeUrl = buildNodeIdUrl(nodesBaseUrl, parsedNodeId.nodeId);
    const res = await fetch(nodeUrl, {
        method: "DELETE",
        headers: {
            accept: "*/*",
        },
    });

    const responseBody = await readJsonOrText(res);

    if (!res.ok) {
        return NextResponse.json(
            { error: { code: "NODES_DELETE_FAILED", details: responseBody } },
            { status: res.status }
        );
    }

    return NextResponse.json({ data: responseBody });
}
