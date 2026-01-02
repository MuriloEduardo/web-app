import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/lib/auth";
import {
    extractItems,
    getCompanyIdForEmail,
    readJsonOrText,
    resolveServiceUrlFromEnv,
} from "@/app/api/nodes/_shared";

function parseEdgeAndSource(req: Request):
    | { ok: true; edge_id: number; source_node_id: number }
    | { ok: false; status: number; code: string } {
    const url = new URL(req.url);
    const edgeRaw = url.searchParams.get("edge_id")?.trim() ?? "";
    const sourceRaw = url.searchParams.get("source_node_id")?.trim() ?? "";

    if (!edgeRaw) return { ok: false, status: 400, code: "EDGE_ID_REQUIRED" };
    if (!sourceRaw) return { ok: false, status: 400, code: "SOURCE_NODE_ID_REQUIRED" };

    const edge_id = Number(edgeRaw);
    const source_node_id = Number(sourceRaw);

    if (!Number.isInteger(edge_id) || edge_id <= 0)
        return { ok: false, status: 400, code: "INVALID_EDGE_ID" };
    if (!Number.isInteger(source_node_id) || source_node_id <= 0)
        return { ok: false, status: 400, code: "INVALID_SOURCE_NODE_ID" };

    return { ok: true, edge_id, source_node_id };
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

async function assertEdgeBelongsToCompany(
    edgesBaseUrl: string,
    nodesBaseUrl: string,
    company_id: number,
    edge_id: number,
    source_node_id: number
): Promise<
    | { ok: true }
    | { ok: false; status: number; code: string; details?: unknown }
> {
    const nodeOwn = await assertNodeBelongsToCompany(nodesBaseUrl, company_id, source_node_id);
    if (!nodeOwn.ok) return nodeOwn;

    const edgesUrl = new URL(edgesBaseUrl);
    edgesUrl.searchParams.set("source_node_id", String(source_node_id));

    let res: Response;
    try {
        res = await fetch(edgesUrl, { headers: { accept: "application/json" } });
    } catch (error) {
        return {
            ok: false,
            status: 502,
            code: "EDGES_FETCH_FAILED",
            details: error instanceof Error ? error.message : error,
        };
    }

    const body = await readJsonOrText(res);
    if (!res.ok) {
        return {
            ok: false,
            status: res.status,
            code: "EDGES_FETCH_FAILED",
            details: body,
        };
    }

    const items = extractItems(body);
    const found = items.some((it) => {
        if (typeof it !== "object" || it === null) return false;
        const id = (it as Record<string, unknown>).id;
        return Number(id) === edge_id;
    });

    if (!found) {
        return { ok: false, status: 404, code: "EDGE_NOT_FOUND" };
    }

    return { ok: true };
}

function parseCreateBody(body: unknown, expectedEdgeId: number):
    | {
        ok: true;
        operator: string;
        compare_value: string;
        edge_id: number;
        created_at?: string;
        updated_at?: string;
    }
    | { ok: false; status: number; code: string } {
    if (typeof body !== "object" || body === null) {
        return { ok: false, status: 400, code: "INVALID_BODY" };
    }

    const record = body as Record<string, unknown>;
    const operator = typeof record.operator === "string" ? record.operator.trim() : "";
    if (!operator) return { ok: false, status: 400, code: "OPERATOR_REQUIRED" };

    const compare_value = typeof record.compare_value === "string" ? record.compare_value : "";
    const edge_id_raw = record.edge_id;
    const edge_id = edge_id_raw === undefined ? expectedEdgeId : Number(edge_id_raw);
    if (!Number.isInteger(edge_id) || edge_id <= 0) {
        return { ok: false, status: 400, code: "INVALID_EDGE_ID" };
    }
    if (edge_id !== expectedEdgeId) {
        return { ok: false, status: 400, code: "EDGE_ID_MISMATCH" };
    }

    const created_at = typeof record.created_at === "string" ? record.created_at.trim() : "";
    const updated_at = typeof record.updated_at === "string" ? record.updated_at.trim() : "";

    return {
        ok: true,
        operator,
        compare_value,
        edge_id,
        ...(created_at ? { created_at } : {}),
        ...(updated_at ? { updated_at } : {}),
    };
}

function parseUpdateBody(body: unknown):
    | { ok: true; operator?: string; compare_value?: string; updated_at?: string }
    | { ok: false; status: number; code: string } {
    if (typeof body !== "object" || body === null) {
        return { ok: false, status: 400, code: "INVALID_BODY" };
    }

    const record = body as Record<string, unknown>;
    const out: { operator?: string; compare_value?: string; updated_at?: string } = {};

    if (record.operator !== undefined) {
        const operator = typeof record.operator === "string" ? record.operator.trim() : "";
        if (!operator) return { ok: false, status: 400, code: "OPERATOR_REQUIRED" };
        out.operator = operator;
    }

    if (record.compare_value !== undefined) {
        out.compare_value = typeof record.compare_value === "string" ? record.compare_value : "";
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

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.trim().toLowerCase();
    if (!email) {
        return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const parsedQuery = parseEdgeAndSource(req);
    if (!parsedQuery.ok) {
        return NextResponse.json({ error: { code: parsedQuery.code } }, { status: parsedQuery.status });
    }

    const nodesBaseUrl = resolveServiceUrlFromEnv("/nodes");
    const edgesBaseUrl = resolveServiceUrlFromEnv("/edges");
    const conditionsBaseUrl = resolveServiceUrlFromEnv("/conditions");
    if (!nodesBaseUrl || !edgesBaseUrl || !conditionsBaseUrl) {
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

    const edgeOwn = await assertEdgeBelongsToCompany(
        edgesBaseUrl,
        nodesBaseUrl,
        companyIdResult.company_id,
        parsedQuery.edge_id,
        parsedQuery.source_node_id
    );
    if (!edgeOwn.ok) {
        return NextResponse.json(
            { error: { code: edgeOwn.code, details: edgeOwn.details } },
            { status: edgeOwn.status }
        );
    }

    const url = new URL(conditionsBaseUrl);
    url.searchParams.set("edge_id", String(parsedQuery.edge_id));

    let res: Response;
    try {
        res = await fetch(url, { headers: { accept: "application/json" } });
    } catch (error) {
        return NextResponse.json(
            { error: { code: "CONDITIONS_FETCH_FAILED", details: error instanceof Error ? error.message : error } },
            { status: 502 }
        );
    }

    const body = await readJsonOrText(res);
    if (!res.ok) {
        return NextResponse.json(
            { error: { code: "CONDITIONS_FETCH_FAILED", details: body } },
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
        return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const parsedQuery = parseEdgeAndSource(req);
    if (!parsedQuery.ok) {
        return NextResponse.json({ error: { code: parsedQuery.code } }, { status: parsedQuery.status });
    }

    const nodesBaseUrl = resolveServiceUrlFromEnv("/nodes");
    const edgesBaseUrl = resolveServiceUrlFromEnv("/edges");
    const conditionsBaseUrl = resolveServiceUrlFromEnv("/conditions");
    if (!nodesBaseUrl || !edgesBaseUrl || !conditionsBaseUrl) {
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

    const edgeOwn = await assertEdgeBelongsToCompany(
        edgesBaseUrl,
        nodesBaseUrl,
        companyIdResult.company_id,
        parsedQuery.edge_id,
        parsedQuery.source_node_id
    );
    if (!edgeOwn.ok) {
        return NextResponse.json(
            { error: { code: edgeOwn.code, details: edgeOwn.details } },
            { status: edgeOwn.status }
        );
    }

    const body = (await req.json().catch(() => null)) as unknown;
    const parsed = parseCreateBody(body, parsedQuery.edge_id);
    if (!parsed.ok) {
        return NextResponse.json({ error: { code: parsed.code } }, { status: parsed.status });
    }

    const now = new Date().toISOString();
    const upstreamBody = {
        edge_id: parsed.edge_id,
        operator: parsed.operator,
        compare_value: parsed.compare_value,
        created_at: parsed.created_at ?? now,
        updated_at: parsed.updated_at ?? now,
    };

    let res: Response;
    try {
        res = await fetch(conditionsBaseUrl, {
            method: "POST",
            headers: {
                accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(upstreamBody),
        });
    } catch (error) {
        return NextResponse.json(
            { error: { code: "CONDITIONS_CREATE_FAILED", details: error instanceof Error ? error.message : error } },
            { status: 502 }
        );
    }

    const responseBody = await readJsonOrText(res);
    if (!res.ok) {
        return NextResponse.json(
            { error: { code: "CONDITIONS_CREATE_FAILED", details: responseBody } },
            { status: res.status }
        );
    }

    return NextResponse.json({ data: responseBody }, { status: 201 });
}
