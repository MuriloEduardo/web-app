"use client";

import { useState } from "react";
import { sendMetaOutbound } from "@/app/actions/sendMetaOutbound";

export function SendMessage() {
    const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
    const [messageBody, setMessageBody] = useState();

    async function handleSend() {
        setStatus("sending");

        const payload = {
            object: "whatsapp_business_account",
            entry: [
                {
                    id: "111377161860817",
                    changes: [
                        {
                            value: {
                                messaging_product: "whatsapp",
                                metadata: {
                                    display_phone_number: "15550280506",
                                    phone_number_id: "109628212037229",
                                },
                                contacts: [
                                    {
                                        profile: {
                                            name: "Murilo Eduardo",
                                        },
                                        wa_id: "555174019092",
                                    },
                                ],
                                messages: [
                                    {
                                        to: "555174019092",
                                        type: "text",
                                        text: {
                                            body: messageBody,
                                        },
                                    },
                                ],
                            },
                            field: "messages",
                        },
                    ],
                },
            ],
        };

        const res = await sendMetaOutbound(payload);

        if (res.error) {
            setStatus("error");
            return;
        }

        setStatus("sent");
    }

    return (
        <div className="flex flex-col gap-3">
            <textarea
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-zinc-200 bg-white p-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-black dark:text-zinc-50"
            />

            <button onClick={handleSend} disabled={status === "sending"}>
                {status === "sending" && "Enviando..."}
                {status === "idle" && "Enviar mensagem"}
                {status === "sent" && "Mensagem enviada"}
                {status === "error" && "Erro ao enviar"}
            </button>
        </div>
    );
}
