import Link from "next/link";
import { MessageStatusIcon } from "@/app/components/MessageItem";

type Conversation = {
    id: number;
    participant?: string;
    wa_id?: string;
    last_message_text?: string;
    last_message_status?: string | null;
    last_message_direction?: string;
};

type Props = {
    conversations: Conversation[];
    selectedConversationId?: number;
};

export function ConversationsList({ conversations, selectedConversationId }: Props) {
    return (
        <div className="flex flex-col gap-3 p-3">
            {conversations.map((c) => {
                const id = c.id;
                const selected = id === selectedConversationId;
                const title = c.participant ?? c.wa_id ?? `Conversa ${id}`;

                return (
                    <Link
                        key={id}
                        href={`/conversas/${id}`}
                        className={selected ? "" : "active:bg-gray-600 text-white"}
                    >
                        <div className="flex items-center hover:dark:bg-gray-800">
                            <div className="border dark:bg-gray-700 dark:border-white rounded-full px-4 py-3 flex flex-col items-center justify-center text-lg font-semibold text-white shrink-0">
                                {c.participant?.charAt(0).toUpperCase() ?? "C"}
                            </div>
                            <div className="grow min-w-0 border-b border-t border-gray-800 flex flex-col justify-center p-3">
                                <div className="truncate">{title}</div>
                                {c.last_message_text && (
                                    <div className="min-w-0 flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                                        <MessageStatusIcon
                                            direction={c.last_message_direction ?? "unknown"}
                                            status={c.last_message_status}
                                            className="shrink-0"
                                        />
                                        <div className="truncate">{c.last_message_text}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Link>
                );
            })}

            {conversations.length === 0 && (
                <div className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
                    Nenhuma conversa encontrada.
                </div>
            )}
        </div>
    );
}
