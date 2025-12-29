import Link from "next/link";

type Conversation = {
    id: number;
    participant?: string;
    wa_id?: string;
};

type Props = {
    conversations: Conversation[];
    selectedConversationId?: number;
};

export function ConversasList({ conversations, selectedConversationId }: Props) {
    return (
        <div className="flex flex-col gap-1">
            <div className="flex flex-col gap-1 p-3">
                {conversations.map((c) => {
                    const id = c.id;
                    const selected = id === selectedConversationId;
                    return (
                        <Link
                            key={id}
                            href={`/conversas/${id}`}
                            className={
                                selected
                                    ? ""
                                    : "active:bg-gray-600 text-white"
                            }
                        >
                            <div className="flex items-stretch gap-4">
                                <div className="border border-white rounded-full py-2 px-3">
                                    {c.participant?.charAt(0).toUpperCase() ?? "C"}
                                </div>
                                <div className="grow border-b border-t border-gray-800 flex items-center">{c.participant ?? c.wa_id ?? `Conversa ${id}`}</div>
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
        </div>
    );
}
