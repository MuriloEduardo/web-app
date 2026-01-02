import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/lib/auth";
import {
    extractItems,
    getCompanyIdForEmail,
    readJsonOrText,
    resolveServiceUrlFromEnv,
} from "@/app/api/nodes/_shared";

function parseSourceNodeIdFromUrl(req: Request):
    | { ok: true; source_node_id: number }
    | { ok: false; status: number; code: string } {
    const url = new URL(req.url);
    const raw = url.searchParams.get("source_node_id")?.trim() ?? "";
    if (!raw) return { ok: false, status: 400, code: "SOURCE_NODE_ID_REQUIRED" };

    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
        return { ok: false, status: 400, code: "INVALID_SOURCE_NODE_ID" };
    }

    return { ok: true, source_node_id: parsed };
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

function parseCreateBody(body: unknown):
    | {
        ok: true;
        source_node_id: number;
        destination_node_id: number;
        label: string;
        priority: number;
        created_at?: string;
        updated_at?: string;
    }
    | { ok: false; status: number; code: string } {
    if (typeof body !== "object" || body === null) {
        return { ok: false, status: 400, code: "INVALID_BODY" };
    }

    const record = body as Record<string, unknown>;
    const source_node_id = Number(record.source_node_id);
    const destination_node_id = Number(record.destination_node_id);

    if (!Number.isFinite(source_node_id) || !Number.isInteger(source_node_id) || source_node_id <= 0) {
        return { ok: false, status: 400, code: "INVALID_SOURCE_NODE_ID" };
    }

    if (!Number.isFinite(destination_node_id) || !Number.isInteger(destination_node_id) || destination_node_id <= 0) {
        return { ok: false, status: 400, code: "INVALID_DESTINATION_NODE_ID" };
    }

    const label = typeof record.label === "string" ? record.label.trim() : "";
    if (!label) return { ok: false, status: 400, code: "LABEL_REQUIRED" };

    const priorityRaw = record.priority;
    const priority = typeof priorityRaw === "number" ? priorityRaw : Number(priorityRaw);
    if (!Number.isFinite(priority) || !Number.isInteger(priority)) {
        return { ok: false, status: 400, code: "INVALID_PRIORITY" };
    }

    const created_at = typeof record.created_at === "string" ? record.created_at.trim() : "";
    const updated_at = typeof record.updated_at === "string" ? record.updated_at.trim() : "";

    return {
        ok: true,
        source_node_id,
        destination_node_id,
        label,
        priority,
        ...(created_at ? { created_at } : {}),
        ...(updated_at ? { updated_at } : {}),
    };
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.trim().toLowerCase();
    if (!email) {
        return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const parsedSource = parseSourceNodeIdFromUrl(req);
    if (!parsedSource.ok) {
        return NextResponse.json(
            { error: { code: parsedSource.code } },
            { status: parsedSource.status }
        );
    }

    const nodesBaseUrl = resolveServiceUrlFromEnv("/nodes");
    if (!nodesBaseUrl) {
        return NextResponse.json(
            { error: { code: "FLOW_MANAGER_SERVICE_URL_NOT_CONFIGURED" } },
            { status: 500 }
        );
    }

    const edgesUrl = resolveServiceUrlFromEnv("/edges");
    if (!edgesUrl) {
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
        parsedSource.source_node_id
    );
    if (!ownership.ok) {
        return NextResponse.json(
            { error: { code: ownership.code, details: ownership.details } },
            { status: ownership.status }
        );
    }

    const upstreamUrl = new URL(edgesUrl);
    upstreamUrl.searchParams.set("source_node_id", String(parsedSource.source_node_id));

    let res: Response;
    try {
        res = await fetch(upstreamUrl, { headers: { accept: "application/json" } });
    } catch (error) {
        return NextResponse.json(
            { error: { code: "EDGES_FETCH_FAILED", details: error instanceof Error ? error.message : error } },
            { status: 502 }
        );
    }

    const body = await readJsonOrText(res);
    if (!res.ok) {
        return NextResponse.json(
            { error: { code: "EDGES_FETCH_FAILED", details: body } },
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

    const nodesBaseUrl = resolveServiceUrlFromEnv("/nodes");
    if (!nodesBaseUrl) {
        return NextResponse.json(
            { error: { code: "FLOW_MANAGER_SERVICE_URL_NOT_CONFIGURED" } },
            { status: 500 }
        );
    }

    const edgesUrl = resolveServiceUrlFromEnv("/edges");
    if (!edgesUrl) {
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

    const company_id = companyIdResult.company_id;

    const sourceOwnership = await assertNodeBelongsToCompany(nodesBaseUrl, company_id, parsed.source_node_id);
    if (!sourceOwnership.ok) {
        return NextResponse.json(
            { error: { code: sourceOwnership.code, details: sourceOwnership.details } },
            { status: sourceOwnership.status }
        );
    }

    const destOwnership = await assertNodeBelongsToCompany(nodesBaseUrl, company_id, parsed.destination_node_id);
    if (!destOwnership.ok) {
        return NextResponse.json(
            { error: { code: destOwnership.code, details: destOwnership.details } },
            { status: destOwnership.status }
        );
    }

    const now = new Date().toISOString();
    const upstreamBody = {
        source_node_id: parsed.source_node_id,
        destination_node_id: parsed.destination_node_id,
        label: parsed.label,
        priority: parsed.priority,
        created_at: parsed.created_at ?? now,
        updated_at: parsed.updated_at ?? now,
    };

    let res: Response;
    try {
        res = await fetch(edgesUrl, {
            method: "POST",
            headers: {
                accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(upstreamBody),
        });
    } catch (error) {
        return NextResponse.json(
            { error: { code: "EDGES_CREATE_FAILED", details: error instanceof Error ? error.message : error } },
            { status: 502 }
        );
    }

    const responseBody = await readJsonOrText(res);
    if (!res.ok) {
        return NextResponse.json(
            { error: { code: "EDGES_CREATE_FAILED", details: responseBody } },
            { status: res.status }
        );
    }

    return NextResponse.json({ data: responseBody }, { status: 201 });
}
