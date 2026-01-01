import { NextResponse } from "next/server";

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

    return NextResponse.json(
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
}
