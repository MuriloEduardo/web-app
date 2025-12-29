import { ConversationsList } from "@/app/components/ConversationsList";

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

export function ConversasList({ conversations, selectedConversationId }: Props) {
    return (
        <ConversationsList
            conversations={conversations}
            selectedConversationId={selectedConversationId}
        />
    );
}
