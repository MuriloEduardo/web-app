import { NextResponse } from "next/server";

export async function GET() {
    const backendUrl = process.env.FLOW_MANAGER_URL;
    const baseUrl = backendUrl?.replace(/\/$/, "");

    if (!baseUrl) {
        return NextResponse.json(
            {
                error: {
                    code: "FLOW_MANAGER_URL_NOT_CONFIGURED",
                },
            },
            { status: 500 }
        );
    }

    const res = await fetch(`${baseUrl}/executions/`, {
        cache: "no-store",
        headers: {
            accept: "application/json",
        },
    });

    const contentType = res.headers.get("content-type") ?? "";
    const responseBody = contentType.includes("application/json")
        ? await res.json()
        : await res.text();

    if (!res.ok) {
        return NextResponse.json(
            {
                error: {
                    code: "MESSAGES_FETCH_FAILED",
                    details: responseBody,
                },
            },
            { status: res.status }
        );
    }

    return NextResponse.json({ data: responseBody });
}
