import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/lib/auth";
import { getCompanyIdForEmail, resolveServiceUrlFromEnv } from "@/app/api/nodes/_shared";

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
    const edgesUrl = resolveServiceUrlFromEnv("/edges");

    const url = new URL(req.url);
    const upstreamUrl = new URL(edgesUrl!);
    url.searchParams.forEach((value, key) => {
        upstreamUrl.searchParams.set(key, value);
    });
    upstreamUrl.searchParams.set("company_id", String(company_id));

    const res = await fetch(upstreamUrl);
    const data = await res.json();

    return NextResponse.json({ data });
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.trim().toLowerCase();
    if (!email) {
        return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const company_id = await getCompanyId(email);
    const edgesUrl = resolveServiceUrlFromEnv("/edges");

    const body = await req.json();
    const upstreamBody = { ...body, company_id };

    const res = await fetch(edgesUrl!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(upstreamBody),
    });

    const data = await res.json();
    return NextResponse.json({ data }, { status: res.status });
}
