import { NextResponse } from "next/server";

import { resolveServiceUrlFromEnv, readJsonOrText } from "@/app/api/nodes/_shared";
import { requireAuth } from "@/app/api/auth-helper";

export async function GET(req: Request) {
    const emailOrResponse = await requireAuth(req);
    if (emailOrResponse instanceof NextResponse) return emailOrResponse;

    const recipientsBaseUrl = resolveServiceUrlFromEnv("/notification-recipients");
    if (!recipientsBaseUrl) {
        return NextResponse.json(
            { error: { code: "NOTIFICATION_RECIPIENTS_SERVICE_URL_NOT_CONFIGURED" } },
            { status: 500 }
        );
    }
    const recipientsUrl = recipientsBaseUrl.endsWith('/') ? recipientsBaseUrl : `${recipientsBaseUrl}/`;

    const url = new URL(req.url);
    const upstreamUrl = new URL(recipientsUrl);
    url.searchParams.forEach((value, key) => {
        upstreamUrl.searchParams.append(key, value);
    });

    const res = await fetch(upstreamUrl);
    const data = await readJsonOrText(res);

    if (!res.ok) {
        return NextResponse.json(
            { error: { code: "NOTIFICATION_RECIPIENTS_FETCH_FAILED", details: data } },
            { status: res.status }
        );
    }

    return NextResponse.json({ data });
}

export async function POST(req: Request) {
    const emailOrResponse = await requireAuth(req);
    if (emailOrResponse instanceof NextResponse) return emailOrResponse;

    const recipientsBaseUrl = resolveServiceUrlFromEnv("/notification-recipients");
    if (!recipientsBaseUrl) {
        return NextResponse.json(
            { error: { code: "NOTIFICATION_RECIPIENTS_SERVICE_URL_NOT_CONFIGURED" } },
            { status: 500 }
        );
    }
    const recipientsUrl = recipientsBaseUrl.endsWith('/') ? recipientsBaseUrl : `${recipientsBaseUrl}/`;

    const body = await req.json();
    const upstreamBody = {
        notification_id: body.notification_id,
        recipient_type: body.recipient_type || "",
        recipient_value: body.recipient_value || "",
    };

    const res = await fetch(recipientsUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(upstreamBody),
    });

    const data = await readJsonOrText(res);

    if (!res.ok) {
        return NextResponse.json(
            { error: { code: "NOTIFICATION_RECIPIENT_CREATE_FAILED", details: data } },
            { status: res.status }
        );
    }

    return NextResponse.json({ data }, { status: res.status });
}
