import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const payload = await req.json();

    const baseUrl = process.env.COMMUNICATIONS_WEB_URL?.replace(/\/$/, "");

    if (!baseUrl) {
        return NextResponse.json(
            {
                error: {
                    code: "COMMUNICATIONS_WEB_URL_NOT_CONFIGURED",
                },
            },
            { status: 500 }
        );
    }

    const res = await fetch(
        `${baseUrl}/meta/outbound`,
        {
            method: "POST",
            headers: {
                "accept": "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        }
    );

    const responseBody = await res.json();

    if (!res.ok) {
        return NextResponse.json(
            {
                error: {
                    code: "META_OUTBOUND_FAILED",
                    details: responseBody,
                },
            },
            { status: res.status }
        );
    }

    return NextResponse.json(
        {
            data: responseBody,
            meta: {
                forwardedAt: new Date().toISOString(),
            },
        },
        { status: 202 } // importante: comando assíncrono
    );
}
