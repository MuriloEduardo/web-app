export type MessageStatus = "sent" | "delivered" | "read";

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

export function normalizeMessageStatus(
    status: string | null | undefined
): MessageStatus | undefined {
    if (!status) return undefined;
    const s = status.trim().toLowerCase();
    if (s === "sent") return "sent";
    if (s === "delivered" || s.startsWith("delivered_")) return "delivered";
    if (s === "read" || s.startsWith("read_")) return "read";
    return undefined;
}

function statusRank(status: string): number {
    const s = status.trim().toLowerCase();
    if (s === "read" || s.startsWith("read_")) return 3;
    if (s === "delivered" || s.startsWith("delivered_")) return 2;
    if (s === "sent") return 1;
    return 0;
}

function toEpochMs(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value > 1_000_000_000_000 ? value : value * 1000;
    }
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!/^\d+$/.test(trimmed)) return null;
        const n = Number(trimmed);
        if (!Number.isFinite(n)) return null;
        return n > 1_000_000_000_000 ? n : n * 1000;
    }
    return null;
}

function parseCreatedAtMs(value: unknown): number | null {
    if (typeof value !== "string") return null;
    // e.g. 2025-12-29T19:48:05.569276 -> truncate to ms
    const normalized = value.replace(/(\.\d{3})\d+/, "$1");
    const ms = Date.parse(normalized);
    return Number.isFinite(ms) ? ms : null;
}

function getSortTimeMs(s: Record<string, unknown>): number | null {
    return toEpochMs(s.timestamp) ?? parseCreatedAtMs(s.created_at);
}

/**
 * Picks the most relevant status from a `statuses[]` list.
 *
 * Handles ties (same timestamp) by using `created_at`, then by priority (read > delivered > sent),
 * and finally by array order (later wins).
 */
export function pickLatestStatusFromStatuses(statuses: unknown): string | null {
    if (!Array.isArray(statuses) || statuses.length === 0) return null;

    const items = statuses.filter((s): s is Record<string, unknown> => isRecord(s));
    if (items.length === 0) return null;

    let best:
        | {
            status: string;
            timeMs: number | null;
            createdAtMs: number | null;
            rank: number;
            index: number;
        }
        | null = null;

    for (let index = 0; index < items.length; index++) {
        const s = items[index];
        const status = typeof s.status === "string" ? s.status : null;
        if (!status) continue;

        const timeMs = getSortTimeMs(s);
        const createdAtMs = parseCreatedAtMs(s.created_at);
        const rank = statusRank(status);

        const candidate = { status, timeMs, createdAtMs, rank, index };

        if (!best) {
            best = candidate;
            continue;
        }

        const aTime = best.timeMs;
        const bTime = candidate.timeMs;
        if (typeof bTime === "number" && (typeof aTime !== "number" || bTime > aTime)) {
            best = candidate;
            continue;
        }
        if (typeof aTime === "number" && typeof bTime === "number" && bTime < aTime) continue;

        const aCreated = best.createdAtMs;
        const bCreated = candidate.createdAtMs;
        if (typeof bCreated === "number" && (typeof aCreated !== "number" || bCreated > aCreated)) {
            best = candidate;
            continue;
        }
        if (typeof aCreated === "number" && typeof bCreated === "number" && bCreated < aCreated) continue;

        if (candidate.rank > best.rank) {
            best = candidate;
            continue;
        }
        if (candidate.rank < best.rank) continue;

        if (candidate.index > best.index) {
            best = candidate;
        }
    }

    return best?.status ?? null;
}
