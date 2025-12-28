import "server-only";

type BffResponse<T> = {
    data?: T;
    error?: {
        code: string;
        details?: unknown;
    };
};

function getBaseUrl() {
    // server-side
    if (typeof window === "undefined") {
        return process.env.APP_URL || "http://localhost:3000";
    }

    // client-side
    return "";
}

export async function bffPost<T>(
    path: string,
    body: unknown
): Promise<BffResponse<T>> {
    const res = await fetch(`${getBaseUrl()}${path}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    const payload = await res.json().catch(() => null);

    if (!res.ok) {
        return {
            error: payload?.error ?? {
                code: "UNKNOWN_ERROR",
                details: payload,
            },
        };
    }

    return payload as BffResponse<T>;
}
