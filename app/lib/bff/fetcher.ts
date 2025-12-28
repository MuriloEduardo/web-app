type BffResponse<T> = {
    data?: T;
    error?: {
        code: string;
        details?: unknown;
    };
    meta?: Record<string, unknown>;
};

export async function bffPost<T>(
    url: string,
    body: unknown
): Promise<BffResponse<T>> {
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    const payload = await res.json();

    if (!res.ok) {
        return {
            error: payload.error ?? { code: "UNKNOWN_ERROR" },
        };
    }

    return payload;
}
