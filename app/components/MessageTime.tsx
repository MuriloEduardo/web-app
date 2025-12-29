type Props = {
    /** ISO string stored in UTC (backend external). Can include microseconds, and may omit timezone. */
    utcIso?: string;
    className?: string;
};

function normalizeUtcIso(value: string): string {
    let s = value.trim();

    // Truncate microseconds to milliseconds: .569276 -> .569
    s = s.replace(/(\.\d{3})\d+/, "$1");

    // If no timezone info, assume UTC.
    const hasTimezone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(s);
    if (!hasTimezone) s = s + "Z";

    return s;
}

function parseUtcDate(value: string | undefined): Date | null {
    if (!value) return null;
    const normalized = normalizeUtcIso(value);
    const ms = Date.parse(normalized);
    if (!Number.isFinite(ms)) return null;
    return new Date(ms);
}

export function formatTimeBrazil(utcIso?: string): string | null {
    const date = parseUtcDate(utcIso);
    if (!date) return null;

    return new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(date);
}

export function MessageTime({ utcIso, className }: Props) {
    const formatted = formatTimeBrazil(utcIso);
    if (!formatted) return null;

    return <span className={className}>{formatted}</span>;
}
