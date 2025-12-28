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
    const res = await fetch(resolveUrl(path), {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    const payload = (await res.json().catch(() => null)) as unknown;

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
