import { requireAuth } from "@/app/api/auth-helper";
import { NextRequest, NextResponse } from "next/server";

const serviceUrl = process.env.SERVICE_URL;

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

    if (!serviceUrl) {
        return NextResponse.json(
            { error: { code: "SERVICE_URL_NOT_CONFIGURED" } },
            { status: 500 }
        );
    }

    try {
        const url = `${serviceUrl}/notification-recipients/${id}/`;
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
