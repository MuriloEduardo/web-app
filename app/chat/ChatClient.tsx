"use client";

import { useEffect, useRef, useState } from "react";

type Message = {
    id: string;
    text: string;
};

type Props = {
    initialMessages: unknown[];
};

function coerceMessages(input: unknown[]): Message[] {
    return input
        .map((m) => {
            if (!m || typeof m !== "object") return null;
            const obj = m as Record<string, unknown>;
            const id = typeof obj.id === "string" ? obj.id : null;
            const text = typeof obj.text === "string" ? obj.text : null;
            if (!id || !text) return null;
            return { id, text };
        })
        .filter((m): m is Message => m !== null);
}

export function ChatClient({ initialMessages }: Props) {
    const [messages, setMessages] = useState<Message[]>(
        coerceMessages(initialMessages)
    );

    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const fetchingRef = useRef(false);
    const stoppedRef = useRef(false);
    const delayRef = useRef(3000);

    useEffect(() => {
        stoppedRef.current = false;

        async function pollOnce() {
            if (stoppedRef.current) return;
            if (fetchingRef.current) return;

            fetchingRef.current = true;
            abortRef.current?.abort();
            abortRef.current = new AbortController();

            try {
                const res = await fetch("/api/messages", {
                    cache: "no-store",
                    signal: abortRef.current.signal,
                });

                if (!res.ok) throw new Error(`HTTP_${res.status}`);

                const json = (await res.json()) as { data?: unknown };
                const next = Array.isArray(json.data) ? coerceMessages(json.data) : [];
                setMessages(next);

                delayRef.current = 3000;
            } catch (err) {
                // Ignore aborts; treat other errors with backoff.
                if (!(err instanceof DOMException && err.name === "AbortError")) {
                    delayRef.current = Math.min(delayRef.current * 2, 30000);
                }
            } finally {
                fetchingRef.current = false;

                if (!stoppedRef.current) {
                    timeoutRef.current = setTimeout(pollOnce, delayRef.current);
                }
            }
        }

        // start immediately
        timeoutRef.current = setTimeout(pollOnce, 0);

        return () => {
            stoppedRef.current = true;
            abortRef.current?.abort();
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    return (
        <div>
            {messages.map((m) => (
                <div key={m.id}>{m.text}</div>
            ))}
        </div>
    );
}
