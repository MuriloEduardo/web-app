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
    const listRef = useRef<HTMLDivElement | null>(null);
    const bottomRef = useRef<HTMLDivElement | null>(null);
    const composerRef = useRef<HTMLDivElement | null>(null);
    const [composerHeight, setComposerHeight] = useState(0);

    const scrollToBottom = useCallback(() => {
        const el = listRef.current;
        if (!el) return;
        el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
        bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
    }, []);

    useEffect(() => {
        const el = composerRef.current;
        if (!el) return;

        const update = () => {
            const next = Math.ceil(el.getBoundingClientRect().height);
            setComposerHeight(next);
        };

        update();

        if (typeof ResizeObserver === "undefined") {
            window.addEventListener("resize", update);
            return () => window.removeEventListener("resize", update);
        }

        const ro = new ResizeObserver(() => update());
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        let raf1 = 0;
        let raf2 = 0;

        raf1 = requestAnimationFrame(() => {
            scrollToBottom();
            raf2 = requestAnimationFrame(scrollToBottom);
        });

        return () => {
            if (raf1) cancelAnimationFrame(raf1);
            if (raf2) cancelAnimationFrame(raf2);
        };
    }, [composerHeight, scrollToBottom]);

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

        requestAnimationFrame(() => {
            scrollToBottom();
            requestAnimationFrame(scrollToBottom);
        });
    }, [scrollToBottom]);

    return (
        <>
            <div
                ref={listRef}
                className="grow flex flex-col gap-3 overflow-y-auto px-4 pt-14"
            >
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

                <div ref={bottomRef} style={{ height: composerHeight + 16 }} />

                {messages.length === 0 && (
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">
                        Nenhuma mensagem para esta conversa.
                    </div>
                )}
            </div>

            <div ref={composerRef} className="fixed bottom-2 left-4 right-4">
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
