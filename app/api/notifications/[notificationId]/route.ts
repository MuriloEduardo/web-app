import { requireAuth } from "@/app/api/auth-helper";
import { resolveServiceUrlFromEnv } from "@/app/api/nodes/_shared";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ notificationId: string }> }
) {
    const authResponse = await requireAuth(request);
    if (authResponse instanceof NextResponse) {
        return authResponse;
    }

    const { notificationId } = await context.params;
    const id = parseInt(notificationId, 10);
    if (isNaN(id)) {
        return NextResponse.json(
            { error: { code: "INVALID_NOTIFICATION_ID" } },
            { status: 400 }
        );
    }

    const serviceUrl = resolveServiceUrlFromEnv("/notifications");
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
        console.log(`[DELETE Notification] Calling: ${url}`);

        const res = await fetch(url, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error(`Backend DELETE /notifications/${id}/ failed:`, res.status, errorText);
            console.error(`Full URL was: ${url}`);
            return NextResponse.json(
                { error: { code: "BACKEND_ERROR", message: errorText } },
                { status: res.status }
            );
        }

        console.log(`[DELETE Notification] Success: ${id}`);
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error("Error deleting notification:", error);
        return NextResponse.json(
            { error: { code: "INTERNAL_SERVER_ERROR" } },
            { status: 500 }
        );
    }
}
