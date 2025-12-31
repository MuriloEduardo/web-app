import Link from "next/link";
import { MessageStatusIcon } from "@/app/components/MessageStatusIcon";
import { MessageTime } from "@/app/components/MessageTime";

type Conversation = {
    id: number;
    participant?: string;
    wa_id?: string;
    last_message_text?: string;
    last_message_status?: string | null;
    last_message_direction?: string;
    last_message_created_at?: string;
};

type Props = {
    conversations: Conversation[];
    selectedConversationId?: number;
};

export function ConversationsList({ conversations, selectedConversationId }: Props) {
    return (
        <div className="flex flex-col py-4">
            {conversations.map((c) => {
                const id = c.id;
                const selected = id === selectedConversationId;
                const title = c.participant ?? c.wa_id ?? `Conversa ${id}`;

                return (
                    <Link
                        key={id}
                        href={`/conversas/${id}`}
                        className={selected ? "" : "active:bg-gray-100 active:dark:bg-gray-600 text-white"}
                    >
                        <div className="flex items-center hover:dark:bg-gray-800 px-5">
                            <div className="border w-12 h-12 dark:bg-gray-700 border-black text-black dark:border-white dark:text-white rounded-full px-4 py-3 flex flex-col items-center justify-center text-lg font-semibold shrink-0">
                                {c.participant?.charAt(0).toUpperCase() ?? "C"}
                            </div>
                            <div className="border-b border-t border-gray-800 flex flex-col justify-center p-5 grow min-w-0">
                                <div className="text-black dark:text-white flex items-center justify-between gap-2">
                                    <div>{title}</div>
                                    <MessageTime
                                        utcIso={c.last_message_created_at}
                                        className="shrink-0 text-xs"
                                    />
                                </div>
                                {c.last_message_text && (
                                    <div className="flex items-center gap-1 text-xs text-black dark:text-white min-w-0">
                                        <MessageStatusIcon
                                            direction={c.last_message_direction ?? "unknown"}
                                            status={c.last_message_status}
                                            className="shrink-0"
                                        />
                                        <div className="truncate min-w-0 flex-1">{c.last_message_text}</div>
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
