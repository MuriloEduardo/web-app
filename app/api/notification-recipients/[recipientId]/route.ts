import { requireAuth } from "@/app/api/auth-helper";
import { resolveServiceUrlFromEnv, readJsonOrText } from "@/app/api/nodes/_shared";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ recipientId: string }> }
) {
    const authResponse = await requireAuth(request);
    if (authResponse instanceof NextResponse) {
        return authResponse;
    }

    const { recipientId } = await context.params;
    const id = parseInt(recipientId, 10);
    if (isNaN(id)) {
        return NextResponse.json(
            { error: { code: "INVALID_RECIPIENT_ID" } },
            { status: 400 }
        );
    }

    const serviceUrl = resolveServiceUrlFromEnv("/notification-recipients");
    if (!serviceUrl) {
        return NextResponse.json(
            { error: { code: "SERVICE_URL_NOT_CONFIGURED" } },
            { status: 500 }
        );
    }

    try {
        const body = await request.json();
        // Remove trailing slash if present
        const baseUrl = serviceUrl.endsWith('/') ? serviceUrl.slice(0, -1) : serviceUrl;
        const url = `${baseUrl}/${id}/`;
        
        const res = await fetch(url, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        const data = await readJsonOrText(res);

        if (!res.ok) {
            console.error(`Backend PATCH /notification-recipients/${id}/ failed:`, res.status, data);
            return NextResponse.json(
                { error: { code: "BACKEND_ERROR", message: data } },
                { status: res.status }
            );
        }

        return NextResponse.json({ data });
    } catch (error) {
        console.error("Error updating notification recipient:", error);
        return NextResponse.json(
            { error: { code: "INTERNAL_SERVER_ERROR" } },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ recipientId: string }> }
) {
    const authResponse = await requireAuth(request);
    if (authResponse instanceof NextResponse) {
        return authResponse;
    }

    const { recipientId } = await context.params;
    const id = parseInt(recipientId, 10);
    if (isNaN(id)) {
        return NextResponse.json(
            { error: { code: "INVALID_RECIPIENT_ID" } },
            { status: 400 }
        );
    }

    const serviceUrl = resolveServiceUrlFromEnv("/notification-recipients");
    if (!serviceUrl) {
        return NextResponse.json(
            { error: { code: "SERVICE_URL_NOT_CONFIGURED" } },
            { status: 500 }
        );
    }

    try {
        // Remove trailing slash if present
        const baseUrl = serviceUrl.endsWith('/') ? serviceUrl.slice(0, -1) : serviceUrl;
        const url = `${baseUrl}/${id}/`;
        const res = await fetch(url, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error(`Backend DELETE /notification-recipients/${id}/ failed:`, res.status, errorText);
            return NextResponse.json(
                { error: { code: "BACKEND_ERROR", message: errorText } },
                { status: res.status }
            );
        }

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error("Error deleting notification recipient:", error);
        return NextResponse.json(
            { error: { code: "INTERNAL_SERVER_ERROR" } },
            { status: 500 }
        );
    }
}
