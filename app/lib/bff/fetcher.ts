import "server-only";

type BffResponse<T> = {
    data?: T;
    error?: {
        code: string;
        details?: unknown;
    };
    meta?: Record<string, unknown>;
};

function getBaseUrlFromEnv(): string {
    const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl) return appUrl.replace(/\/$/, "");

    const vercelUrl = process.env.VERCEL_URL;
    if (vercelUrl) return `https://${vercelUrl}`;

    return "http://localhost:3000";
}

function resolveUrl(url: string): string {
    if (/^https?:\/\//i.test(url)) return url;

    // When running on the server (Server Actions / Route Handlers), Node's fetch
    // requires an absolute URL.
    if (typeof window === "undefined" && url.startsWith("/")) {
        return new URL(url, getBaseUrlFromEnv()).toString();
    }

    return url;
}

export async function bffPost<T>(
    path: string,
    body: unknown
): Promise<BffResponse<T>> {
    let res: Response;
    try {
        res = await fetch(resolveUrl(path), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });
    } catch (error) {
        return {
            error: {
                code: "FETCH_FAILED",
                details: error instanceof Error ? error.message : error,
            },
        };
    }

    // Response.json() is typed as unknown in newer libs; treat as any for envelope parsing.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = (await res.json().catch(() => null)) as any;

    if (!res.ok) {
        return {
            error: payload?.error ?? {
                code: "UNKNOWN_ERROR",
                details: payload,
            },
        };
    }

    return (payload ?? {}) as BffResponse<T>;
}

export async function bffGet<T>(
    path: string,
    init?: { headers?: HeadersInit }
): Promise<BffResponse<T>> {
    const headers = new Headers(init?.headers);
    if (!headers.has("accept")) headers.set("accept", "application/json");

    let res: Response;
    try {
        res = await fetch(resolveUrl(path), {
            method: "GET",
            headers,
        });
    } catch (error) {
        return {
            error: {
                code: "FETCH_FAILED",
                details: error instanceof Error ? error.message : error,
            },
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = (await res.json().catch(() => null)) as any;

    if (!res.ok) {
        return {
            error: payload?.error ?? {
                code: "UNKNOWN_ERROR",
                details: payload,
            },
        };
    }

    return (payload ?? {}) as BffResponse<T>;
}
