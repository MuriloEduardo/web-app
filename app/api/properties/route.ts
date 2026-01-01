import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/lib/auth";
import {
    extractItems,
    getCompanyIdForEmail,
    parseCompanyIdFromRequestUrl,
    readJsonOrText,
    resolveServiceUrlFromEnv,
} from "@/app/api/nodes/_shared";

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.trim().toLowerCase();
    if (!email) {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED" } },
            { status: 401 }
        );
    }

    const propertiesUrl = resolveServiceUrlFromEnv("/properties");
    if (!propertiesUrl) {
        return NextResponse.json(
            { error: { code: "FLOW_MANAGER_SERVICE_URL_NOT_CONFIGURED" } },
            { status: 500 }
        );
    }

    const queryCompanyId = parseCompanyIdFromRequestUrl(req);
    if (!queryCompanyId.ok) {
        return NextResponse.json(
            { error: { code: queryCompanyId.code } },
            { status: queryCompanyId.status }
        );
    }

    const companyIdResult = await getCompanyIdForEmail(email);
    if (!companyIdResult.ok) {
        return NextResponse.json(
            { error: { code: companyIdResult.code, details: companyIdResult.details } },
            { status: companyIdResult.status }
        );
    }

    const company_id = companyIdResult.company_id;
    if (queryCompanyId.companyId !== null && queryCompanyId.companyId !== company_id) {
        return NextResponse.json(
            { error: { code: "FORBIDDEN_COMPANY_ID" } },
            { status: 403 }
        );
    }

    const upstreamUrl = new URL(propertiesUrl);
    const requestUrl = new URL(req.url);
    requestUrl.searchParams.forEach((value, key) => {
        upstreamUrl.searchParams.set(key, value);
    });
    upstreamUrl.searchParams.set("company_id", String(company_id));

    const res = await fetch(upstreamUrl, {
        headers: { accept: "application/json" },
    });

    const body = await readJsonOrText(res);
    if (!res.ok) {
        return NextResponse.json(
            { error: { code: "PROPERTIES_FETCH_FAILED", details: body } },
            { status: res.status }
        );
    }

    const items = extractItems(body);

    return NextResponse.json({ data: items });
}
