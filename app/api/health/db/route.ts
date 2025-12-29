import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";

function maskUrl(raw: string | undefined) {
    if (!raw) return null;

    try {
        // prisma+postgres://accelerate.prisma-data.net/?api_key=...
        // postgres://user:pass@host:5432/db?sslmode=require
        const url = new URL(raw);

        const isAccelerate = url.protocol.startsWith("prisma+");
        const host = url.host || null;
        const pathname = url.pathname && url.pathname !== "/" ? url.pathname : null;

        return {
            protocol: url.protocol.replace(":", ""),
            host,
            pathname,
            isAccelerate,
        };
    } catch {
        return { protocol: "unknown", host: null, pathname: null, isAccelerate: null };
    }
}

function safeErrorMessage(error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";

    // Best-effort redaction of obvious URL-like secrets.
    return message
        .replace(/postgres:\/\/[^\s]+/gi, "postgres://***")
        .replace(/prisma\+postgres:\/\/[^\s]+/gi, "prisma+postgres://***");
}

export async function GET() {
    const startedAt = Date.now();
    const nowIso = new Date().toISOString();

    try {
        const pingStartedAt = Date.now();
        const dbPing = await prisma.$queryRaw<
            Array<{ ok: number; dbTime: Date }>
        >(Prisma.sql`SELECT 1 as ok, NOW() as "dbTime"`);

        const pingLatencyMs = Date.now() - pingStartedAt;

        // Optional: richer Postgres stats (may fail depending on permissions).
        let connectionStats:
            | {
                connectionsTotal: number;
                connectionsActive: number;
                connectionsIdle: number;
                maxConnections: number | null;
                database: string | null;
                serverVersion: string | null;
            }
            | null = null;

        try {
            const rows = await prisma.$queryRaw<
                Array<{
                    connectionsTotal: bigint;
                    connectionsActive: bigint;
                    connectionsIdle: bigint;
                    maxConnections: string | null;
                    database: string | null;
                    serverVersion: string | null;
                }>
            >(Prisma.sql`
                SELECT
                  (SELECT COUNT(*)::bigint FROM pg_stat_activity)                           AS "connectionsTotal",
                  (SELECT COUNT(*)::bigint FROM pg_stat_activity WHERE state = 'active')   AS "connectionsActive",
                  (SELECT COUNT(*)::bigint FROM pg_stat_activity WHERE state = 'idle')     AS "connectionsIdle",
                  current_setting('max_connections', true)                                 AS "maxConnections",
                  current_database()                                                       AS "database",
                  current_setting('server_version', true)                                  AS "serverVersion"
            `);

            const first = rows[0];
            if (first) {
                connectionStats = {
                    connectionsTotal: Number(first.connectionsTotal),
                    connectionsActive: Number(first.connectionsActive),
                    connectionsIdle: Number(first.connectionsIdle),
                    maxConnections: first.maxConnections ? Number(first.maxConnections) : null,
                    database: first.database,
                    serverVersion: first.serverVersion,
                };
            }
        } catch {
            connectionStats = null;
        }

        const totalLatencyMs = Date.now() - startedAt;

        const accelerateUrlInfo = maskUrl(process.env.DATABASE_PRISMA_DATABASE_URL);
        const directUrlInfo = maskUrl(process.env.DATABASE_POSTGRES_URL);

        return NextResponse.json({
            ok: true,
            at: nowIso,
            runtime,
            latencyMs: {
                total: totalLatencyMs,
                dbPing: pingLatencyMs,
            },
            app: {
                node: process.version,
                uptimeSec: Math.round(process.uptime()),
                vercel: Boolean(process.env.VERCEL),
                vercelEnv: process.env.VERCEL_ENV ?? null,
                vercelRegion: process.env.VERCEL_REGION ?? null,
                nodeEnv: process.env.NODE_ENV ?? null,
            },
            db: {
                mode: accelerateUrlInfo?.isAccelerate ? "accelerate" : "direct",
                serverTime: dbPing[0]?.dbTime?.toISOString?.() ?? null,
                accelerateUrl: accelerateUrlInfo,
                directUrl: directUrlInfo,
                connections: connectionStats,
            },
        });
    } catch (error) {
        const totalLatencyMs = Date.now() - startedAt;
        const message = safeErrorMessage(error);

        return NextResponse.json(
            {
                ok: false,
                at: nowIso,
                runtime,
                latencyMs: { total: totalLatencyMs },
                error: message,
            },
            { status: 500 },
        );
    }
}
