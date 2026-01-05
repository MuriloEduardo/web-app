import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/lib/auth";
import {
    extractItems,
    getCompanyIdForEmail,
    readJsonOrText,
    resolveServiceUrlFromEnv,
} from "@/app/api/nodes/_shared";

function parseId(params: { conditionPropertyId?: string }):
    | { ok: true; id: number }
    | { ok: false; status: number; code: string } {
    const raw = params.conditionPropertyId?.trim() ?? "";
    if (!raw) return { ok: false, status: 400, code: "CONDITION_PROPERTY_ID_REQUIRED" };
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        return { ok: false, status: 400, code: "INVALID_CONDITION_PROPERTY_ID" };
    }
    return { ok: true, id: parsed };
}

function parseQuery(req: Request):
    | { ok: true; condition_id: number; edge_id: number; source_node_id: number }
    | { ok: false; status: number; code: string } {
    const url = new URL(req.url);
    const cRaw = url.searchParams.get("condition_id")?.trim() ?? "";
    const eRaw = url.searchParams.get("edge_id")?.trim() ?? "";
    const sRaw = url.searchParams.get("source_node_id")?.trim() ?? "";

    if (!cRaw) return { ok: false, status: 400, code: "CONDITION_ID_REQUIRED" };
    if (!eRaw) return { ok: false, status: 400, code: "EDGE_ID_REQUIRED" };
    if (!sRaw) return { ok: false, status: 400, code: "SOURCE_NODE_ID_REQUIRED" };

    const condition_id = Number(cRaw);
    const edge_id = Number(eRaw);
    const source_node_id = Number(sRaw);

    if (!Number.isInteger(condition_id) || condition_id <= 0)
        return { ok: false, status: 400, code: "INVALID_CONDITION_ID" };
    if (!Number.isInteger(edge_id) || edge_id <= 0)
        return { ok: false, status: 400, code: "INVALID_EDGE_ID" };
    if (!Number.isInteger(source_node_id) || source_node_id <= 0)
        return { ok: false, status: 400, code: "INVALID_SOURCE_NODE_ID" };

    return { ok: true, condition_id, edge_id, source_node_id };
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

async function assertConditionBelongsToEdge(
    conditionsBaseUrl: string,
    edge_id: number,
    condition_id: number
): Promise<
    | { ok: true }
    | { ok: false; status: number; code: string; details?: unknown }
> {
    const url = new URL(conditionsBaseUrl);
    url.searchParams.set("edge_id", String(edge_id));

    let res: Response;
    try {
        res = await fetch(url, { headers: { accept: "application/json" } });
    } catch (error) {
        return {
            ok: false,
            status: 502,
            code: "CONDITIONS_FETCH_FAILED",
            details: error instanceof Error ? error.message : error,
        };
    }

    const body = await readJsonOrText(res);
    if (!res.ok) {
        return { ok: false, status: res.status, code: "CONDITIONS_FETCH_FAILED", details: body };
    }

    const items = extractItems(body);
    const found = items.some((it) => {
        if (typeof it !== "object" || it === null) return false;
        const id = (it as Record<string, unknown>).id;
        return Number(id) === condition_id;
    });

    if (!found) {
        return { ok: false, status: 404, code: "CONDITION_NOT_FOUND" };
    }

    return { ok: true };
}

async function assertPropertyBelongsToCompany(
    propertiesBaseUrl: string,
    company_id: number,
    property_id: number
): Promise<
    | { ok: true }
    | { ok: false; status: number; code: string; details?: unknown }
> {
    const listUrl = new URL(propertiesBaseUrl);
    listUrl.searchParams.set("company_id", String(company_id));

    let res: Response;
    try {
        res = await fetch(listUrl, { headers: { accept: "application/json" } });
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
        return { ok: false, status: res.status, code: "PROPERTIES_FETCH_FAILED", details: body };
    }

    const items = extractItems(body);
    const found = items.some((it) => {
        if (typeof it !== "object" || it === null) return false;
        const id = (it as Record<string, unknown>).id;
        return Number(id) === property_id;
    });

    if (!found) {
        return { ok: false, status: 404, code: "PROPERTY_NOT_FOUND" };
    }

    return { ok: true };
}

function parseUpdateBody(body: unknown, expectedConditionId: number):
    | { ok: true; condition_id: number; property_id: number; updated_at?: string }
    | { ok: false; status: number; code: string } {
    if (typeof body !== "object" || body === null) {
        return { ok: false, status: 400, code: "INVALID_BODY" };
    }

    const record = body as Record<string, unknown>;
    const condition_id_raw = record.condition_id;
    const property_id_raw = record.property_id;

    const condition_id = condition_id_raw === undefined ? expectedConditionId : Number(condition_id_raw);
    if (!Number.isInteger(condition_id) || condition_id <= 0) {
        return { ok: false, status: 400, code: "INVALID_CONDITION_ID" };
    }
    if (condition_id !== expectedConditionId) {
        return { ok: false, status: 400, code: "CONDITION_ID_MISMATCH" };
    }

    const property_id = Number(property_id_raw);
    if (!Number.isInteger(property_id) || property_id <= 0) {
        return { ok: false, status: 400, code: "INVALID_PROPERTY_ID" };
    }

    const updated_at = typeof record.updated_at === "string" ? record.updated_at.trim() : "";

    return {
        ok: true,
        condition_id,
        property_id,
        ...(updated_at ? { updated_at } : {}),
    };
}

export async function GET(
    req: Request,
    ctx: { params: Promise<{ conditionPropertyId: string }> }
) {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.trim().toLowerCase();
    if (!email) {
        return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const parsedQuery = parseQuery(req);
    if (!parsedQuery.ok) {
        return NextResponse.json({ error: { code: parsedQuery.code } }, { status: parsedQuery.status });
    }

    const params = await ctx.params;
    const parsedId = parseId(params);
    if (!parsedId.ok) {
        return NextResponse.json({ error: { code: parsedId.code } }, { status: parsedId.status });
    }

    const nodesBaseUrl = resolveServiceUrlFromEnv("/nodes");
    const edgesBaseUrl = resolveServiceUrlFromEnv("/edges");
    const conditionsBaseUrl = resolveServiceUrlFromEnv("/conditions");
    const conditionPropsBaseUrl = resolveServiceUrlFromEnv("/condition-properties");
    if (!nodesBaseUrl || !edgesBaseUrl || !conditionsBaseUrl || !conditionPropsBaseUrl) {
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

    const conditionOwn = await assertConditionBelongsToEdge(
        conditionsBaseUrl,
        parsedQuery.edge_id,
        parsedQuery.condition_id
    );
    if (!conditionOwn.ok) {
        return NextResponse.json(
            { error: { code: conditionOwn.code, details: conditionOwn.details } },
            { status: conditionOwn.status }
        );
    }

    const upstreamUrl = `${conditionPropsBaseUrl.replace(/\/+$/, "")}/${encodeURIComponent(String(parsedId.id))}`;

    let res: Response;
    try {
        res = await fetch(upstreamUrl, { headers: { accept: "application/json" } });
    } catch (error) {
        return NextResponse.json(
            { error: { code: "CONDITION_PROPERTIES_FETCH_FAILED", details: error instanceof Error ? error.message : error } },
            { status: 502 }
        );
    }

    const body = await readJsonOrText(res);
    if (!res.ok) {
        return NextResponse.json(
            { error: { code: "CONDITION_PROPERTIES_FETCH_FAILED", details: body } },
            { status: res.status }
        );
    }

    if (typeof body === "object" && body !== null) {
        const conditionId = (body as Record<string, unknown>).condition_id;
        if (conditionId !== undefined && Number(conditionId) !== parsedQuery.condition_id) {
            return NextResponse.json(
                { error: { code: "CONDITION_PROPERTY_MISMATCH" } },
                { status: 404 }
            );
        }
    }

    return NextResponse.json({ data: body });
}

export async function DELETE(
    _req: Request,
    ctx: { params: Promise<{ conditionPropertyId: string }> }
) {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.trim().toLowerCase();
    if (!email) {
        return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const parsedQuery = parseQuery(_req);
    if (!parsedQuery.ok) {
        return NextResponse.json({ error: { code: parsedQuery.code } }, { status: parsedQuery.status });
    }

    const params = await ctx.params;
    const parsedId = parseId(params);
    if (!parsedId.ok) {
        return NextResponse.json({ error: { code: parsedId.code } }, { status: parsedId.status });
    }

    const nodesBaseUrl = resolveServiceUrlFromEnv("/nodes");
    const edgesBaseUrl = resolveServiceUrlFromEnv("/edges");
    const conditionsBaseUrl = resolveServiceUrlFromEnv("/conditions");
    const conditionPropsBaseUrl = resolveServiceUrlFromEnv("/condition-properties");
    if (!nodesBaseUrl || !edgesBaseUrl || !conditionsBaseUrl || !conditionPropsBaseUrl) {
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

    const conditionOwn = await assertConditionBelongsToEdge(
        conditionsBaseUrl,
        parsedQuery.edge_id,
        parsedQuery.condition_id
    );
    if (!conditionOwn.ok) {
        return NextResponse.json(
            { error: { code: conditionOwn.code, details: conditionOwn.details } },
            { status: conditionOwn.status }
        );
    }

    const upstreamUrl = `${conditionPropsBaseUrl.replace(/\/+$/, "")}/${encodeURIComponent(String(parsedQuery.condition_id))}/${encodeURIComponent(String(parsedId.id))}`;

    let res: Response;
    try {
        res = await fetch(upstreamUrl, {
            method: "DELETE",
            headers: { accept: "application/json" },
        });
    } catch (error) {
        return NextResponse.json(
            { error: { code: "CONDITION_PROPERTIES_DELETE_FAILED", details: error instanceof Error ? error.message : error } },
            { status: 502 }
        );
    }

    const responseBody = await readJsonOrText(res);
    if (!res.ok) {
        return NextResponse.json(
            { error: { code: "CONDITION_PROPERTIES_DELETE_FAILED", details: responseBody } },
            { status: res.status }
        );
    }

    return NextResponse.json({ data: responseBody });
}

export async function PUT(
    req: Request,
    ctx: { params: Promise<{ conditionPropertyId: string }> }
) {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.trim().toLowerCase();
    if (!email) {
        return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const parsedQuery = parseQuery(req);
    if (!parsedQuery.ok) {
        return NextResponse.json({ error: { code: parsedQuery.code } }, { status: parsedQuery.status });
    }

    const params = await ctx.params;
    const parsedId = parseId(params);
    if (!parsedId.ok) {
        return NextResponse.json({ error: { code: parsedId.code } }, { status: parsedId.status });
    }

    const nodesBaseUrl = resolveServiceUrlFromEnv("/nodes");
    const edgesBaseUrl = resolveServiceUrlFromEnv("/edges");
    const conditionsBaseUrl = resolveServiceUrlFromEnv("/conditions");
    const conditionPropsBaseUrl = resolveServiceUrlFromEnv("/condition-properties");
    const propertiesBaseUrl = resolveServiceUrlFromEnv("/properties");
    if (!nodesBaseUrl || !edgesBaseUrl || !conditionsBaseUrl || !conditionPropsBaseUrl || !propertiesBaseUrl) {
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

    const conditionOwn = await assertConditionBelongsToEdge(
        conditionsBaseUrl,
        parsedQuery.edge_id,
        parsedQuery.condition_id
    );
    if (!conditionOwn.ok) {
        return NextResponse.json(
            { error: { code: conditionOwn.code, details: conditionOwn.details } },
            { status: conditionOwn.status }
        );
    }

    const body = (await req.json().catch(() => null)) as unknown;
    const parsedBody = parseUpdateBody(body, parsedQuery.condition_id);
    if (!parsedBody.ok) {
        return NextResponse.json({ error: { code: parsedBody.code } }, { status: parsedBody.status });
    }

    const propertyOwn = await assertPropertyBelongsToCompany(
        propertiesBaseUrl,
        companyIdResult.company_id,
        parsedBody.property_id
    );
    if (!propertyOwn.ok) {
        return NextResponse.json(
            { error: { code: propertyOwn.code, details: propertyOwn.details } },
            { status: propertyOwn.status }
        );
    }

    const now = new Date().toISOString();
    const upstreamBody = {
        condition_id: parsedBody.condition_id,
        property_id: parsedBody.property_id,
        updated_at: parsedBody.updated_at ?? now,
    };

    const upstreamUrl = `${conditionPropsBaseUrl.replace(/\/+$/, "")}/${encodeURIComponent(String(parsedId.id))}`;

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
            { error: { code: "CONDITION_PROPERTIES_UPDATE_FAILED", details: error instanceof Error ? error.message : error } },
            { status: 502 }
        );
    }

    const responseBody = await readJsonOrText(res);
    if (!res.ok) {
        return NextResponse.json(
            { error: { code: "CONDITION_PROPERTIES_UPDATE_FAILED", details: responseBody } },
            { status: res.status }
        );
    }

    return NextResponse.json({ data: responseBody });
}
