"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { MessageItem } from "@/app/components/MessageItem";
import { SendMessage } from "@/app/components/SendMessage";
import { formatTimeBrazil } from "@/app/components/MessageTime";

type Message = {
    id: string;
    direction: string;
    text: string;
    createdAt?: string;
    status?: string | null;
};

type Props = {
    initialMessages: Message[];
    toWaId?: string;
    contactName?: string;
    displayPhoneNumber?: string;
    phoneNumberId?: string;
};

export function ConversationThreadClient({
    initialMessages,
    toWaId,
    contactName,
    displayPhoneNumber,
    phoneNumberId,
}: Props) {
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const bottomRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const id = requestAnimationFrame(() => {
            bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
        });

        return () => cancelAnimationFrame(id);
    }, []);

    const handleOptimisticSend = useCallback((text: string) => {
        const now = new Date();
        const createdAt = formatTimeBrazil(now.toISOString()) ?? "";

        const optimistic: Message = {
            id: `optimistic:${now.getTime()}:${Math.random().toString(16).slice(2)}`,
            direction: "outbound",
            text,
            createdAt,
            status: "sent",
        };

        setMessages((prev) => [...prev, optimistic]);
    }, []);

    return (
        <>
            <div className="grow flex flex-col gap-3 overflow-y-auto px-4 pt-14 pb-24">
                {messages.map((m) => (
                    <MessageItem
                        key={m.id}
                        id={m.id}
                        direction={m.direction}
                        text={m.text}
                        createdAt={m.createdAt}
                        status={m.status}
                    />
                ))}

                <div ref={bottomRef} />

                {messages.length === 0 && (
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">
                        Nenhuma mensagem para esta conversa.
                    </div>
                )}
            </div>

            <div className="fixed bottom-2 left-4 right-4">
                <SendMessage
                    toWaId={toWaId}
                    contactName={contactName}
                    displayPhoneNumber={displayPhoneNumber}
                    phoneNumberId={phoneNumberId}
                    onOptimisticSend={handleOptimisticSend}
                />
            </div>
        </>
    );
}
