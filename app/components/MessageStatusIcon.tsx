import { CheckIcon } from "@heroicons/react/24/solid";

import { normalizeMessageStatus } from "@/app/lib/messageStatuses";

type Props = {
    direction: string;
    status?: string | null;
    className?: string;
};

export function MessageStatusIcon({ direction, status, className }: Props) {
    const isOutbound = direction === "outbound";
    const normalized = isOutbound ? normalizeMessageStatus(status) : undefined;
    if (!normalized) return null;

    const colorClass =
        normalized === "read" ? "text-blue-500" : "text-zinc-500 dark:text-zinc-400";

    const containerClass = className ? `inline-flex ${className}` : "inline-flex";
    const iconClass = `h-4 w-4 ${colorClass}`;

    if (normalized === "sent") {
        return <CheckIcon className={iconClass} aria-label="Enviado" />;
    }

    return (
        <span
            className={containerClass}
            aria-label={normalized === "read" ? "Lido" : "Entregue"}
        >
            <CheckIcon className={iconClass} aria-hidden="true" />
            <CheckIcon className={iconClass + " -ml-3"} aria-hidden="true" />
        </span>
    );
}
