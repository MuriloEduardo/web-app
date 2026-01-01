import { NextResponse } from "next/server";

const CACHE_SECONDS = 30;

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ humanId: string }> }
) {
    const { humanId } = await params;
    const numericHumanId = Number(humanId);

    if (!Number.isFinite(numericHumanId)) {
        return NextResponse.json(
            { error: { code: "INVALID_HUMAN_ID" } },
            { status: 400 }
        );
    }

    const response = NextResponse.json(
        {
            error: {
                code: "HUMANS_ENDPOINT_REMOVED",
                details: {
                    humanId: numericHumanId,
                    reason: "Flow Manager integration was removed; use Communications conversations/messages APIs instead.",
                },
            },
        },
        { status: 410 }
    );

    response.headers.set(
        "Cache-Control",
        `public, max-age=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS * 2}`
    );
    return response;
}
