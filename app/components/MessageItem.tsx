import { MessageStatusIcon } from "@/app/components/MessageStatusIcon";

export { MessageStatusIcon } from "@/app/components/MessageStatusIcon";

type Props = {
    id: string;
    direction: string;
    text: string;
    createdAt?: string;
    status?: string | null;
};

export function MessageItem({ id, direction, text, createdAt, status }: Props) {
    const isOutbound = direction === "outbound";

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
                        <MessageStatusIcon direction={direction} status={status} />
                    </div>
                </div>
            </div>
        </div>
    );
}
