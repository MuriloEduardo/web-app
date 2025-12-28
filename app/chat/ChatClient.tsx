"use client";

import { useState } from "react";

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
    const [messages] = useState<Message[]>(coerceMessages(initialMessages));

    return (
        <div>
            {messages.map((m) => (
                <div key={m.id}>{m.text}</div>
            ))}
        </div>
    );
}
