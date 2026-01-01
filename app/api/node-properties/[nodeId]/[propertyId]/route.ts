import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/lib/auth";
import {
    extractItems,
    getCompanyIdForEmail,
    readJsonOrText,
    resolveServiceUrlFromEnv,
} from "@/app/api/nodes/_shared";

function parseIds(params: { nodeId?: string; propertyId?: string }):
    | { ok: true; nodeId: number; propertyId: number }
    | { ok: false; status: number; code: string } {
    const nodeRaw = params.nodeId?.trim() ?? "";
    const propRaw = params.propertyId?.trim() ?? "";

    const nodeId = Number(nodeRaw);
    const propertyId = Number(propRaw);

    if (!nodeRaw) return { ok: false, status: 400, code: "NODE_ID_REQUIRED" };
    if (!propRaw) return { ok: false, status: 400, code: "PROPERTY_ID_REQUIRED" };

    if (!Number.isFinite(nodeId) || !Number.isInteger(nodeId) || nodeId <= 0) {
        return { ok: false, status: 400, code: "INVALID_NODE_ID" };
    }

    if (!Number.isFinite(propertyId) || !Number.isInteger(propertyId) || propertyId <= 0) {
        return { ok: false, status: 400, code: "INVALID_PROPERTY_ID" };
    }

    return { ok: true, nodeId, propertyId };
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
        return Number(id) === nodeId;
    });

    if (!found) {
        return { ok: false, status: 404, code: "NODE_NOT_FOUND" };
    }

    return { ok: true };
}

export async function DELETE(
    _req: Request,
    context: { params: Promise<{ nodeId: string; propertyId: string }> }
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
    const parsed = parseIds(params);
    if (!parsed.ok) {
        return NextResponse.json(
            { error: { code: parsed.code } },
            { status: parsed.status }
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
        parsed.nodeId
    );
    if (!ownership.ok) {
        return NextResponse.json(
            { error: { code: ownership.code, details: ownership.details } },
            { status: ownership.status }
        );
    }

    const upstreamUrl = new URL(nodePropertiesUrl);
    upstreamUrl.pathname = upstreamUrl.pathname.replace(/\/+$/, "");
    upstreamUrl.pathname = `${upstreamUrl.pathname}/${parsed.nodeId}/${parsed.propertyId}`;

    const res = await fetch(upstreamUrl, {
        method: "DELETE",
        headers: { accept: "*/*" },
    });

    const responseBody = await readJsonOrText(res);

    if (!res.ok) {
        return NextResponse.json(
            { error: { code: "NODE_PROPERTIES_DELETE_FAILED", details: responseBody } },
            { status: res.status }
        );
    }

    return NextResponse.json({ data: responseBody });
}
