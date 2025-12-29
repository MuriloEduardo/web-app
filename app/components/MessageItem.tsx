type MessageStatus = "sent" | "delivered" | "read";

type Props = {
    id: string;
    direction: string;
    text: string;
    createdAt?: string;
    status?: string | null;
};

function normalizeStatus(status: string | null | undefined): MessageStatus | undefined {
    if (!status) return undefined;
    const s = status.trim().toLowerCase();
    if (s === "sent") return "sent";
    if (s === "delivered") return "delivered";
    if (s === "read") return "read";
    return undefined;
}

function StatusChecks({ status, className }: { status: MessageStatus; className?: string }) {
    // Minimal inline SVGs to avoid extra deps.
    const baseClass = "h-4 w-4" + (className ? ` ${className}` : "");

    if (status === "sent") {
        return (
            <svg
                viewBox="0 0 16 15"
                className={baseClass + " text-zinc-500 dark:text-zinc-400"}
                fill="none"
                aria-label="Enviado"
            >
                <path
                    d="M5.5 11.2 1.8 7.5l1-1 2.7 2.7L13.2.5l1 1L5.5 11.2Z"
                    fill="currentColor"
                />
            </svg>
        );
    }

    const colorClass =
        status === "read" ? "text-blue-500" : "text-zinc-500 dark:text-zinc-400";

    return (
        <svg
            viewBox="0 0 18 15"
            className={baseClass + " " + colorClass}
            fill="none"
            aria-label={status === "read" ? "Lido" : "Entregue"}
        >
            <path
                d="M6.1 11.2 2.4 7.5l1-1 2.7 2.7L13.8.5l1 1L6.1 11.2Z"
                fill="currentColor"
            />
            <path
                d="M10.1 11.2 6.4 7.5l1-1 2.7 2.7L17.8.5l1 1-8.7 9.7Z"
                fill="currentColor"
            />
        </svg>
    );
}

export function MessageStatusIcon({
    direction,
    status,
    className,
}: {
    direction: string;
    status?: string | null;
    className?: string;
}) {
    const isOutbound = direction === "outbound";
    const normalizedStatus = isOutbound ? normalizeStatus(status) : undefined;
    if (!normalizedStatus) return null;
    return <StatusChecks status={normalizedStatus} className={className} />;
}

export function MessageItem({ id, direction, text, createdAt, status }: Props) {
    const isOutbound = direction === "outbound";
    const normalizedStatus = isOutbound ? normalizeStatus(status) : undefined;

    return (
        <div
            key={id}
            className={isOutbound ? "flex w-full justify-end" : "flex w-full justify-start"}
        >
            <div
                className={
                    isOutbound
                        ? "wrap-anywhere rounded-2xl rounded-br-md bg-zinc-200 px-3 py-2 text-sm text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                        : "wrap-anywhere rounded-2xl rounded-bl-md bg-zinc-50 px-3 py-2 text-sm text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50"
                }
            >
                <div className="flex flex-col gap-1">
                    <span>{text}</span>
                    <div className="flex items-center justify-end gap-1 text-xs opacity-25">
                        <span>{createdAt ?? ""}</span>
                        {normalizedStatus ? <StatusChecks status={normalizedStatus} /> : null}
                    </div>
                </div>
            </div>
        </div>
    );
}
