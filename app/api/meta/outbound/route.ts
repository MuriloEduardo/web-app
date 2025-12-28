import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const payload = await req.json();

    const res = await fetch(
        `${process.env.META_BACKEND_URL}/meta/outbound`,
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
