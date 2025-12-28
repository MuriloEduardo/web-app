import { NextResponse } from "next/server";

type Execution = {
    session_id?: number;
};

export async function GET() {
    const baseUrl = process.env.FLOW_MANAGER_URL?.replace(/\/$/, "");

    if (!baseUrl) {
        return NextResponse.json(
            { error: { code: "FLOW_MANAGER_URL_NOT_CONFIGURED" } },
            { status: 500 }
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
            { error: { code: "SESSIONS_FETCH_FAILED", details: body } },
            { status: res.status }
        );
    }

    const executions = (body as unknown) as Execution[];
    const sessions = Array.isArray(executions)
        ? Array.from(
            new Set(
                executions
                    .map((e) => e?.session_id)
                    .filter((v): v is number => typeof v === "number")
            )
        ).sort((a, b) => b - a)
        : [];

    return NextResponse.json({ data: sessions });
}
