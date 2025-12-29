"use client";

import { useMemo, useState } from "react";
import { sendMetaOutbound } from "@/app/actions/sendMetaOutbound";
import {
    ArrowPathIcon,
    PaperAirplaneIcon,
    ExclamationTriangleIcon,
} from "@heroicons/react/24/solid";

type Props = {
    displayPhoneNumber?: string;
    phoneNumberId?: string;
    contactName?: string;
    toWaId?: string;
};

export function SendMessage({ displayPhoneNumber, phoneNumberId, contactName, toWaId }: Props) {
    const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
    const [messageBody, setMessageBody] = useState("");

    const canSend = useMemo(() => {
        return Boolean(
            messageBody.trim().length > 0 &&
            displayPhoneNumber &&
            phoneNumberId &&
            toWaId
        );
    }, [messageBody, displayPhoneNumber, phoneNumberId, toWaId]);

    async function handleSend() {
        if (!canSend) return;
        setStatus("sending");

        const payload = {
            entry: [
                {
                    changes: [
                        {
                            value: {
                                metadata: {
                                    display_phone_number: displayPhoneNumber,
                                    phone_number_id: phoneNumberId,
                                },
                                contacts: [
                                    {
                                        profile: {
                                            name: contactName ?? "Contato",
                                        },
                                        wa_id: toWaId,
                                    },
                                ],
                                messages: [
                                    {
                                        to: toWaId,
                                        type: "text",
                                        text: {
                                            body: messageBody,
                                        },
                                    },
                                ],
                            },
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
        setMessageBody("");
    }

    return (
        <div className="flex align-middle rounded-full border border-white dark:bg-gray-600/75">
            {(!displayPhoneNumber || !phoneNumberId || !toWaId) && (
                <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                    Não foi possível inferir os dados da conversa atual (metadata/contato). Abra uma conversa com mensagens do WhatsApp para enviar.
                </div>
            )}
            <textarea
                required
                id="messageBody"
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                className="w-full p-3 text-sm dark:text-white dark:bg-transparent focus:outline-none resize-none"
            />

            <button
                className="p-3 m-3 rounded-full border dark:bg-white whitespace-nowrap text-sm disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleSend}
                disabled={status === "sending" || !canSend}
            >
                {status === "sending" && (
                    <ArrowPathIcon className="h-4 w-4 animate-spin" aria-hidden="true" />
                )}
                {(status === "idle" || status === "sent") && (
                    <PaperAirplaneIcon className="h-4 w-4" aria-hidden="true" />
                )}
                {status === "error" && (
                    <ExclamationTriangleIcon className="h-4 w-4" aria-hidden="true" />
                )}
            </button>
        </div>
    );
}
