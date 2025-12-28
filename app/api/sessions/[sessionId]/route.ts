import { NextResponse } from "next/server";

type Execution = {
    session_id?: number;
};

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    const baseUrl = process.env.FLOW_MANAGER_URL?.replace(/\/$/, "");

    if (!baseUrl) {
        return NextResponse.json(
            { error: { code: "FLOW_MANAGER_URL_NOT_CONFIGURED" } },
            { status: 500 }
        );
    }

    const { sessionId } = await params;
    const numericSessionId = Number(sessionId);

    if (!Number.isFinite(numericSessionId)) {
        return NextResponse.json(
            { error: { code: "INVALID_SESSION_ID" } },
            { status: 400 }
        );
    }

    const res = await fetch(`${baseUrl}/executions/`, {
        cache: "no-store",
        headers: { accept: "application/json" },
    });

    const contentType = res.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json")
        ? await res.json()
        : await res.text();

    if (!res.ok) {
        return NextResponse.json(
            { error: { code: "EXECUTIONS_FETCH_FAILED", details: body } },
            { status: res.status }
        );
    }

    const executions = (body as unknown) as Execution[];
    const filtered = Array.isArray(executions)
        ? executions.filter((e) => e?.session_id === numericSessionId)
        : [];

    return NextResponse.json({ data: filtered });
}
