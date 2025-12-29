import { CheckIcon } from "@heroicons/react/24/solid";

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
    if (s === "delivered" || s.startsWith("delivered_")) return "delivered";
    if (s === "read" || s.startsWith("read_")) return "read";
    return undefined;
}

function StatusChecks({ status, className }: { status: MessageStatus; className?: string }) {
    const colorClass =
        status === "read" ? "text-blue-500" : "text-zinc-500 dark:text-zinc-400";

    const containerClass = className ? `inline-flex ${className}` : "inline-flex";
    const iconClass = `h-4 w-4 ${colorClass}`;

    if (status === "sent") {
        return <CheckIcon className={iconClass} aria-label="Enviado" />;
    }

    return (
        <span className={containerClass} aria-label={status === "read" ? "Lido" : "Entregue"}>
            <CheckIcon className={iconClass} aria-hidden="true" />
            <CheckIcon className={iconClass + " -ml-2"} aria-hidden="true" />
        </span>
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
