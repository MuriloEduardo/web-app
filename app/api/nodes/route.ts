import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

const CACHE_SECONDS = 30;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function resolveServiceUrlFromEnv(resourcePath: string): string | null {
    const raw = process.env.FLOW_MANAGER_SERVICE_URL?.trim();
    if (!raw) return null;

    try {
        const url = new URL(raw);

        // Allow either a full endpoint (ending with /nodes or /companies) or just a base URL.
        // If a resource is already present, swap it instead of appending.
        const cleanResource = resourcePath.replace(/\/+$/, "");
        const path = url.pathname.replace(/\/+$/, "");

        const basePath = path.replace(/\/(nodes|companies)$/i, "");

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

function extractCompanyIdFromCompaniesResponse(body: unknown): number | null {
    const items = Array.isArray(body)
        ? body
        : isRecord(body) && Array.isArray(body.items)
            ? body.items
            : [];

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

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.trim().toLowerCase();
    if (!email) {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED" } },
            { status: 401 }
        );
    }

    const nodesUrl = resolveServiceUrlFromEnv("/nodes");
    if (!nodesUrl) {
        return NextResponse.json(
            { error: { code: "FLOW_MANAGER_SERVICE_URL_NOT_CONFIGURED" } },
            { status: 500 }
        );
    }

    const companiesUrl = resolveServiceUrlFromEnv("/companies");
    if (!companiesUrl) {
        return NextResponse.json(
            { error: { code: "FLOW_MANAGER_SERVICE_URL_NOT_CONFIGURED" } },
            { status: 500 }
        );
    }

    const url = new URL(req.url);
    const companyIdFromQueryRaw = url.searchParams.get("company_id")?.trim() || null;
    const companyIdFromQuery = companyIdFromQueryRaw ? Number(companyIdFromQueryRaw) : null;
    if (companyIdFromQueryRaw && !Number.isFinite(companyIdFromQuery)) {
        return NextResponse.json(
            { error: { code: "INVALID_COMPANY_ID" } },
            { status: 400 }
        );
    }

    const user = await prisma.user.findUnique({
        where: { email },
        select: { phone_number: true },
    });

    const uniqueIdentifier = user?.phone_number?.trim() || null;
    if (!uniqueIdentifier) {
        return NextResponse.json(
            { error: { code: "COMPANY_NUMBER_REQUIRED" } },
            { status: 400 }
        );
    }

    const companiesFetchUrl = new URL(companiesUrl);
    companiesFetchUrl.searchParams.set("unique_identifier", uniqueIdentifier);

    const companiesRes = await fetch(companiesFetchUrl, {
        next: { revalidate: CACHE_SECONDS },
        headers: {
            accept: "application/json",
        },
    });

    const companiesContentType = companiesRes.headers.get("content-type") ?? "";
    const companiesBody = companiesContentType.includes("application/json")
        ? await companiesRes.json().catch(() => null)
        : await companiesRes.text().catch(() => null);

    if (!companiesRes.ok) {
        return NextResponse.json(
            {
                error: {
                    code: "COMPANIES_FETCH_FAILED",
                    details: companiesBody,
                },
            },
            { status: companiesRes.status }
        );
    }

    const company_id = extractCompanyIdFromCompaniesResponse(companiesBody);
    if (!company_id) {
        return NextResponse.json(
            {
                error: {
                    code: "COMPANY_ID_NOT_FOUND",
                    details: companiesBody,
                },
            },
            { status: 404 }
        );
    }

    if (companyIdFromQuery !== null && companyIdFromQuery !== company_id) {
        return NextResponse.json(
            { error: { code: "FORBIDDEN_COMPANY_ID" } },
            { status: 403 }
        );
    }

    const nodesFetchUrl = new URL(nodesUrl);
    nodesFetchUrl.searchParams.set("company_id", String(company_id));

    const res = await fetch(nodesFetchUrl, {
        next: { revalidate: CACHE_SECONDS },
        headers: {
            accept: "application/json",
        },
    });

    const contentType = res.headers.get("content-type") ?? "";
    const responseBody = contentType.includes("application/json")
        ? await res.json().catch(() => null)
        : await res.text().catch(() => null);

    if (!res.ok) {
        return NextResponse.json(
            {
                error: {
                    code: "NODES_FETCH_FAILED",
                    details: responseBody,
                },
            },
            { status: res.status }
        );
    }

    const items = Array.isArray(responseBody)
        ? responseBody
        : isRecord(responseBody) && Array.isArray(responseBody.items)
            ? responseBody.items
            : [];

    const response = NextResponse.json({ data: items });
    response.headers.set(
        "Cache-Control",
        `private, max-age=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS * 2}`
    );
    response.headers.set("Vary", "Cookie");
    return response;
}
