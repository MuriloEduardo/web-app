import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/lib/auth";
import { getCompanyIdForEmail, resolveServiceUrlFromEnv, readJsonOrText } from "@/app/api/nodes/_shared";

async function getCompanyId(email: string) {
    const result = await getCompanyIdForEmail(email);
    if (!result.ok) {
        throw new Error(result.code);
    }
    return result.company_id;
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.trim().toLowerCase();
    if (!email) {
        return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const company_id = await getCompanyId(email);
    const edgesBaseUrl = resolveServiceUrlFromEnv("/edges");
    const edgesUrl = edgesBaseUrl!.endsWith('/') ? edgesBaseUrl : `${edgesBaseUrl}/`;

    const url = new URL(req.url);
    const upstreamUrl = new URL(edgesUrl);
    url.searchParams.forEach((value, key) => {
        upstreamUrl.searchParams.append(key, value);
    });
    upstreamUrl.searchParams.set("company_id", String(company_id));

    const res = await fetch(upstreamUrl);
    const data = await readJsonOrText(res);

    if (!res.ok) {
        return NextResponse.json(
            { error: { code: "EDGES_FETCH_FAILED", details: data } },
            { status: res.status }
        );
    }

    return NextResponse.json({ data });
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.trim().toLowerCase();
    if (!email) {
        return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const edgesUrl = resolveServiceUrlFromEnv("/edges");

    const body = await req.json();

    const upstreamBody = {
        source_node_id: body.source_node_id,
        destination_node_id: body.destination_node_id,
        label: body.label || "",
        priority: body.priority ?? 0,
    };

    const res = await fetch(edgesUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(upstreamBody),
    });

    const data = await readJsonOrText(res);
    console.log('[POST /api/edges] Response status:', res.status, 'data:', data);

    if (!res.ok) {
        return NextResponse.json(
            { error: { code: "EDGE_CREATE_FAILED", details: data } },
            { status: res.status }
        );
    }

    return NextResponse.json({ data }, { status: res.status });
}
