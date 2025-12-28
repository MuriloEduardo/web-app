"use client";

import { useState } from "react";

type Message = {
    id: string;
    text: string;
};

type Props = {
    initialMessages: unknown[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function extractWhatsAppText(payload: unknown): string | null {
    if (!isRecord(payload)) return null;

    const entry = payload.entry;
    if (!Array.isArray(entry) || !isRecord(entry[0])) return null;

    const changes = entry[0].changes;
    if (!Array.isArray(changes) || !isRecord(changes[0])) return null;

    const value = changes[0].value;
    if (!isRecord(value)) return null;

    const messages = value.messages;
    if (!Array.isArray(messages) || !isRecord(messages[0])) return null;

    const text = messages[0].text;
    if (!isRecord(text)) return null;

    const body = text.body;
    return typeof body === "string" ? body : null;
}

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

        // Shape B (communications): { id: number, direction: string, conversation_id: number, payload: {...} }
        const id =
            typeof obj.id === "number" || typeof obj.id === "string"
                ? String(obj.id)
                : `msg:${out.length}`;

        const direction = typeof obj.direction === "string" ? obj.direction : "unknown";
        const text = extractWhatsAppText(obj.payload) ?? null;
        if (!text) continue;

        out.push({ id, text: `[${direction}] ${text}` });
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
