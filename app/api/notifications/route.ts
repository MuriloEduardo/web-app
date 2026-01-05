import { NextResponse } from "next/server";

import { getCompanyIdForEmail, resolveServiceUrlFromEnv, readJsonOrText } from "@/app/api/nodes/_shared";
import { requireAuth } from "@/app/api/auth-helper";

async function getCompanyId(email: string) {
    const result = await getCompanyIdForEmail(email);
    if (!result.ok) {
        throw new Error(result.code);
    }
    return result.company_id;
}

export async function GET(req: Request) {
    const emailOrResponse = await requireAuth();
    if (emailOrResponse instanceof NextResponse) return emailOrResponse;
    const email = emailOrResponse;

    const company_id = await getCompanyId(email);
    const notificationsBaseUrl = resolveServiceUrlFromEnv("/notifications");
    if (!notificationsBaseUrl) {
        return NextResponse.json(
            { error: { code: "NOTIFICATIONS_SERVICE_URL_NOT_CONFIGURED" } },
            { status: 500 }
        );
    }
    const notificationsUrl = notificationsBaseUrl.endsWith('/') ? notificationsBaseUrl : `${notificationsBaseUrl}/`;

    const url = new URL(req.url);
    const upstreamUrl = new URL(notificationsUrl);
    url.searchParams.forEach((value, key) => {
        upstreamUrl.searchParams.append(key, value);
    });
    upstreamUrl.searchParams.set("company_id", String(company_id));

    const res = await fetch(upstreamUrl);
    const data = await readJsonOrText(res);

    if (!res.ok) {
        return NextResponse.json(
            { error: { code: "NOTIFICATIONS_FETCH_FAILED", details: data } },
            { status: res.status }
        );
    }

    return NextResponse.json({ data });
}

export async function POST(req: Request) {
    const emailOrResponse = await requireAuth();
    if (emailOrResponse instanceof NextResponse) return emailOrResponse;
    const email = emailOrResponse;

    const company_id = await getCompanyId(email);
    const notificationsBaseUrl = resolveServiceUrlFromEnv("/notifications");
    if (!notificationsBaseUrl) {
        return NextResponse.json(
            { error: { code: "NOTIFICATIONS_SERVICE_URL_NOT_CONFIGURED" } },
            { status: 500 }
        );
    }
    const notificationsUrl = notificationsBaseUrl.endsWith('/') ? notificationsBaseUrl : `${notificationsBaseUrl}/`;

    const body = await req.json();
    const upstreamBody = {
        trigger_node_id: body.trigger_node_id,
        company_id: company_id,
        subject: body.subject || "",
        active: body.active !== undefined ? body.active : true,
    };

    const res = await fetch(notificationsUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(upstreamBody),
    });

    const data = await readJsonOrText(res);

    if (!res.ok) {
        return NextResponse.json(
            { error: { code: "NOTIFICATION_CREATE_FAILED", details: data } },
            { status: res.status }
        );
    }

    return NextResponse.json({ data }, { status: res.status });
}
