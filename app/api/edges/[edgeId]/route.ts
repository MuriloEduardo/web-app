import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/lib/auth";
import {
    extractItems,
    getCompanyIdForEmail,
    readJsonOrText,
    resolveServiceUrlFromEnv,
} from "@/app/api/nodes/_shared";

function parseEdgeId(params: { edgeId?: string }):
    | { ok: true; edgeId: string }
    | { ok: false; status: number; code: string } {
    const raw = params.edgeId?.trim() ?? "";
    if (!raw) return { ok: false, status: 400, code: "EDGE_ID_REQUIRED" };
    return { ok: true, edgeId: raw };
}

function parseUpdateBody(body: unknown):
    | {
        ok: true;
        source_node_id?: number;
        destination_node_id?: number;
        label?: string;
        priority?: number;
        updated_at?: string;
    }
    | { ok: false; status: number; code: string } {
    if (typeof body !== "object" || body === null) {
        return { ok: false, status: 400, code: "INVALID_BODY" };
    }

    const record = body as Record<string, unknown>;

    const out: {
        source_node_id?: number;
        destination_node_id?: number;
        label?: string;
        priority?: number;
        updated_at?: string;
    } = {};

    if (record.source_node_id !== undefined) {
        const source_node_id = Number(record.source_node_id);
        if (!Number.isFinite(source_node_id) || !Number.isInteger(source_node_id) || source_node_id <= 0) {
            return { ok: false, status: 400, code: "INVALID_SOURCE_NODE_ID" };
        }
        out.source_node_id = source_node_id;
    }

    if (record.destination_node_id !== undefined) {
        const destination_node_id = Number(record.destination_node_id);
        if (!Number.isFinite(destination_node_id) || !Number.isInteger(destination_node_id) || destination_node_id <= 0) {
            return { ok: false, status: 400, code: "INVALID_DESTINATION_NODE_ID" };
        }
        out.destination_node_id = destination_node_id;
    }

    if (record.label !== undefined) {
        const label = typeof record.label === "string" ? record.label.trim() : "";
        if (!label) return { ok: false, status: 400, code: "LABEL_REQUIRED" };
        out.label = label;
    }

    if (record.priority !== undefined) {
        const priorityRaw = record.priority;
        const priority = typeof priorityRaw === "number" ? priorityRaw : Number(priorityRaw);
        if (!Number.isFinite(priority) || !Number.isInteger(priority)) {
            return { ok: false, status: 400, code: "INVALID_PRIORITY" };
        }
        out.priority = priority;
    }

    if (record.updated_at !== undefined) {
        const updated_at = typeof record.updated_at === "string" ? record.updated_at.trim() : "";
        if (!updated_at) return { ok: false, status: 400, code: "INVALID_UPDATED_AT" };
        out.updated_at = updated_at;
    }

    if (Object.keys(out).length === 0) {
        return { ok: false, status: 400, code: "NO_UPDATABLE_FIELDS" };
    }

    return { ok: true, ...out };
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
        res = await fetch(listUrl, { headers: { accept: "application/json" } });
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
        return {
            ok: false,
            status: res.status,
            code: "NODES_FETCH_FAILED",
            details: body,
        };
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

export async function PUT(req: Request, ctx: { params: Promise<{ edgeId: string }> }) {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.trim().toLowerCase();
    if (!email) {
        return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const params = await ctx.params;
    const parsedId = parseEdgeId(params);
    if (!parsedId.ok) {
        return NextResponse.json({ error: { code: parsedId.code } }, { status: parsedId.status });
    }

    const nodesBaseUrl = resolveServiceUrlFromEnv("/nodes");
    if (!nodesBaseUrl) {
        return NextResponse.json(
            { error: { code: "FLOW_MANAGER_SERVICE_URL_NOT_CONFIGURED" } },
            { status: 500 }
        );
    }

    const edgesBaseUrl = resolveServiceUrlFromEnv("/edges");
    if (!edgesBaseUrl) {
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
    const parsed = parseUpdateBody(body);
    if (!parsed.ok) {
        return NextResponse.json({ error: { code: parsed.code } }, { status: parsed.status });
    }

    const company_id = companyIdResult.company_id;

    if (parsed.source_node_id !== undefined) {
        const own = await assertNodeBelongsToCompany(nodesBaseUrl, company_id, parsed.source_node_id);
        if (!own.ok) {
            return NextResponse.json(
                { error: { code: own.code, details: own.details } },
                { status: own.status }
            );
        }
    }

    if (parsed.destination_node_id !== undefined) {
        const own = await assertNodeBelongsToCompany(nodesBaseUrl, company_id, parsed.destination_node_id);
        if (!own.ok) {
            return NextResponse.json(
                { error: { code: own.code, details: own.details } },
                { status: own.status }
            );
        }
    }

    const now = new Date().toISOString();
    const upstreamBody = {
        ...parsed,
        updated_at: parsed.updated_at ?? now,
    };

    const upstreamUrl = `${edgesBaseUrl}/${encodeURIComponent(parsedId.edgeId)}`;

    let res: Response;
    try {
        res = await fetch(upstreamUrl, {
            method: "PUT",
            headers: {
                accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(upstreamBody),
        });
    } catch (error) {
        return NextResponse.json(
            { error: { code: "EDGES_UPDATE_FAILED", details: error instanceof Error ? error.message : error } },
            { status: 502 }
        );
    }

    const responseBody = await readJsonOrText(res);
    if (!res.ok) {
        return NextResponse.json(
            { error: { code: "EDGES_UPDATE_FAILED", details: responseBody } },
            { status: res.status }
        );
    }

    return NextResponse.json({ data: responseBody });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ edgeId: string }> }) {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.trim().toLowerCase();
    if (!email) {
        return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const url = new URL(_req.url);
    const rawSourceNodeId = url.searchParams.get("source_node_id")?.trim() ?? "";
    if (!rawSourceNodeId) {
        return NextResponse.json(
            { error: { code: "SOURCE_NODE_ID_REQUIRED" } },
            { status: 400 }
        );
    }

    const source_node_id = Number(rawSourceNodeId);
    if (!Number.isFinite(source_node_id) || !Number.isInteger(source_node_id) || source_node_id <= 0) {
        return NextResponse.json(
            { error: { code: "INVALID_SOURCE_NODE_ID" } },
            { status: 400 }
        );
    }

    const params = await ctx.params;
    const parsedId = parseEdgeId(params);
    if (!parsedId.ok) {
        return NextResponse.json({ error: { code: parsedId.code } }, { status: parsedId.status });
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
        source_node_id
    );
    if (!ownership.ok) {
        return NextResponse.json(
            { error: { code: ownership.code, details: ownership.details } },
            { status: ownership.status }
        );
    }

    const edgesBaseUrl = resolveServiceUrlFromEnv("/edges");
    if (!edgesBaseUrl) {
        return NextResponse.json(
            { error: { code: "FLOW_MANAGER_SERVICE_URL_NOT_CONFIGURED" } },
            { status: 500 }
        );
    }

    const upstreamUrl = `${edgesBaseUrl}/${encodeURIComponent(parsedId.edgeId)}`;

    let res: Response;
    try {
        res = await fetch(upstreamUrl, {
            method: "DELETE",
            headers: { accept: "application/json" },
        });
    } catch (error) {
        return NextResponse.json(
            { error: { code: "EDGES_DELETE_FAILED", details: error instanceof Error ? error.message : error } },
            { status: 502 }
        );
    }

    const responseBody = await readJsonOrText(res);
    if (!res.ok) {
        return NextResponse.json(
            { error: { code: "EDGES_DELETE_FAILED", details: responseBody } },
            { status: res.status }
        );
    }

    return NextResponse.json({ data: responseBody });
}
