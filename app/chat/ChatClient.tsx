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
    const out: Message[] = [];

    for (const entry of input) {
        if (!entry || typeof entry !== "object") continue;
        const obj = entry as Record<string, unknown>;

        // Shape A (simple): { id: string, text: string }
        const simpleId = typeof obj.id === "string" ? obj.id : null;
        const simpleText = typeof obj.text === "string" ? obj.text : null;
        if (simpleId && simpleText) {
            out.push({ id: simpleId, text: simpleText });
            continue;
        }

        // Shape B (flow-manager executions): { id: number, workflow_data: { messages: [{ type, data: { id, content } }] } }
        const executionId =
            typeof obj.id === "number" || typeof obj.id === "string"
                ? String(obj.id)
                : "unknown";

        const workflowData = obj.workflow_data as Record<string, unknown> | undefined;
        const messages = workflowData?.messages as unknown;
        if (!Array.isArray(messages)) continue;

        for (const m of messages) {
            if (!m || typeof m !== "object") continue;
            const mo = m as Record<string, unknown>;
            const type = typeof mo.type === "string" ? mo.type : "message";
            const data = mo.data as Record<string, unknown> | undefined;
            const content = typeof data?.content === "string" ? data.content : null;
            if (!content) continue;

            const msgId = typeof data?.id === "string" ? data.id : undefined;
            out.push({
                id: msgId ? `${executionId}:${msgId}` : `${executionId}:${type}:${out.length}`,
                text: `[${type}] ${content}`,
            });
        }
    }

    return out;
}

export function ChatClient({ initialMessages }: Props) {
    const [messages, setMessages] = useState<Message[]>(
        coerceMessages(initialMessages)
    );

    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const fetchingRef = useRef(false);
    const stoppedRef = useRef(false);
    const delayRef = useRef(30000);

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

                delayRef.current = 30000;
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
