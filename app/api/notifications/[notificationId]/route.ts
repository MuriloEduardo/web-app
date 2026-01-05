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

    const serviceUrl = resolveServiceUrlFromEnv("/notifications");
    const baseUrl = serviceUrl?.endsWith('/') ? serviceUrl.slice(0, -1) : serviceUrl;
    const url = `${baseUrl}/${id}`;

    const res = await fetch(url, { method: "DELETE" });

    if (res.status === 204 || res.status === 200) {
        return new NextResponse(null, { status: 204 });
    }

    return NextResponse.json(
        { error: { code: "BACKEND_ERROR" } },
        { status: res.status }
    );
}
