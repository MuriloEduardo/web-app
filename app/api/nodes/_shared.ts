import "server-only";

import { prisma } from "@/app/lib/prisma";

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

export function resolveServiceUrlFromEnv(resourcePath: string): string | null {
    const raw = process.env.FLOW_MANAGER_SERVICE_URL?.trim();
    if (!raw) return null;

    try {
        const url = new URL(raw);

        // Allow either a full endpoint (ending with a resource) or just a base URL.
        // If a known resource is already present, swap it instead of appending.
        const cleanResource = resourcePath.replace(/\/+$/, "");
        const path = url.pathname.replace(/\/+$/, "");

        const basePath = path.replace(
            /(nodes|companies|properties|node-properties|edges|conditions|condition-properties)$/i,
            ""
        );

        if (basePath === "" || basePath === "/") {
            url.pathname = `${cleanResource}/`;
        } else {
            url.pathname = `${basePath}${cleanResource}/`;
        }

        return url.toString();
    } catch {
        return null;
    }
}

export async function readJsonOrText(res: Response): Promise<unknown> {
    const contentType = res.headers.get("content-type") ?? "";
    return contentType.includes("application/json")
        ? await res.json().catch(() => null)
        : await res.text().catch(() => null);
}

export function extractItems(body: unknown): unknown[] {
    if (Array.isArray(body)) return body;
    if (isRecord(body) && Array.isArray(body.items)) return body.items;
    return [];
}

export function extractCompanyIdFromCompaniesResponse(body: unknown): number | null {
    const items = extractItems(body);

    const first = items[0];
    if (!isRecord(first)) return null;

    const candidate = first.id ?? first.company_id;
    if (typeof candidate === "number" && Number.isFinite(candidate)) return candidate;

    if (typeof candidate === "string") {
        const parsed = Number(candidate);
        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
}

export type CompanyIdResult =
    | { ok: true; company_id: number }
    | { ok: false; status: number; code: string; details?: unknown };

export async function getCompanyIdForEmail(email: string): Promise<CompanyIdResult> {
    const companiesUrl = resolveServiceUrlFromEnv("/companies");
    if (!companiesUrl) {
        return {
            ok: false,
            status: 500,
            code: "FLOW_MANAGER_SERVICE_URL_NOT_CONFIGURED",
        };
    }

    const user = await prisma.user.findUnique({
        where: { email },
        select: { phone_number: true },
    });

    const uniqueIdentifier = user?.phone_number?.trim() || null;
    if (!uniqueIdentifier) {
        return { ok: false, status: 400, code: "COMPANY_NUMBER_REQUIRED" };
    }

    const companiesFetchUrl = new URL(companiesUrl);
    companiesFetchUrl.searchParams.set("unique_identifier", uniqueIdentifier);

    let companiesRes: Response;
    try {
        companiesRes = await fetch(companiesFetchUrl, {
            headers: { accept: "application/json" },
        });
    } catch (error) {
        return {
            ok: false,
            status: 502,
            code: "COMPANIES_FETCH_FAILED",
            details: error instanceof Error ? error.message : error,
        };
    }

    const companiesBody = await readJsonOrText(companiesRes);

    if (!companiesRes.ok) {
        return {
            ok: false,
            status: companiesRes.status,
            code: "COMPANIES_FETCH_FAILED",
            details: companiesBody,
        };
    }

    const company_id = extractCompanyIdFromCompaniesResponse(companiesBody);
    if (!company_id) {
        return {
            ok: false,
            status: 404,
            code: "COMPANY_ID_NOT_FOUND",
            details: companiesBody,
        };
    }

    return { ok: true, company_id };
}

export function parseCompanyIdFromRequestUrl(req: Request):
    | { ok: true; companyId: number | null }
    | { ok: false; status: number; code: string } {
    const url = new URL(req.url);
    const raw = url.searchParams.get("company_id")?.trim() || null;
    if (!raw) return { ok: true, companyId: null };

    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return { ok: false, status: 400, code: "INVALID_COMPANY_ID" };

    return { ok: true, companyId: parsed };
}

export function buildNodeIdUrl(nodesBaseUrl: string, nodeId: string | number): string {
    const u = new URL(nodesBaseUrl);
    const cleanBase = u.pathname.replace(/\/+$/, "");
    u.pathname = `${cleanBase}/${encodeURIComponent(String(nodeId))}`;
    return u.toString();
}
