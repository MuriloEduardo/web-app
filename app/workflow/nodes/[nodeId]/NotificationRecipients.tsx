"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { type NotificationRecipientDto } from "@/app/workflow/WorkflowTypes";

type NotificationRecipientsProps = {
    notificationId: number;
    recipients: NotificationRecipientDto[];
};

export default function NotificationRecipients({ notificationId, recipients: initialRecipients }: NotificationRecipientsProps) {
    const router = useRouter();
    const [isAdding, setIsAdding] = useState(false);
    const [recipientType, setRecipientType] = useState("email");
    const [recipientValue, setRecipientValue] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();

        if (!recipientValue.trim()) {
            alert("Digite um valor para o recebedor");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/notification-recipients`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    notification_id: notificationId,
                    recipient_type: recipientType,
                    recipient_value: recipientValue.trim(),
                }),
            });

            if (res.ok) {
                setRecipientValue("");
                setIsAdding(false);
                router.refresh();
            } else {
                const errorData = await res.json().catch(() => ({}));
                alert(`Erro ao adicionar recebedor: ${errorData.error?.code || "Erro desconhecido"}`);
            }
        } catch (error) {
            console.error("Error adding recipient:", error);
            alert("Erro ao adicionar recebedor");
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleDelete(recipientId: number) {
        if (!confirm("Tem certeza que deseja remover este recebedor?")) return;

        try {
            const res = await fetch(`/api/notification-recipients/${recipientId}`, {
                method: "DELETE",
            });

            if (res.ok) {
                router.refresh();
            } else {
                alert("Erro ao deletar recebedor");
            }
        } catch (error) {
            console.error("Error deleting recipient:", error);
            alert("Erro ao deletar recebedor");
        }
    }

    const getRecipientIcon = (type: string | undefined) => {
        const typeStr = (type || "").toLowerCase();
        switch (typeStr) {
            case "email":
                return (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                );
            case "phone":
            case "sms":
                return (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                );
            case "whatsapp":
                return (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                );
            default:
                return (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                );
        }
    };

    return (
        <div className="mt-3">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Recebedores ({initialRecipients.length})
                </h3>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="rounded-lg bg-blue-600 p-1.5 text-white hover:bg-blue-700"
                        title="Adicionar recebedor"
                    >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                )}
            </div>

            {isAdding && (
                <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-700 dark:bg-blue-900/20">
                    <form onSubmit={handleAdd} className="space-y-2">
                        <div>
                            <label htmlFor="recipient-type" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Tipo
                            </label>
                            <select
                                id="recipient-type"
                                value={recipientType}
                                onChange={(e) => setRecipientType(e.target.value)}
                                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                            >
                                <option value="email">Email</option>
                                <option value="phone">Telefone</option>
                                <option value="sms">SMS</option>
                                <option value="whatsapp">WhatsApp</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="recipient-value" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                {recipientType === "email" ? "Endereço de Email" : "Número"}
                            </label>
                            <input
                                id="recipient-value"
                                type={recipientType === "email" ? "email" : "text"}
                                value={recipientValue}
                                onChange={(e) => setRecipientValue(e.target.value)}
                                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                                placeholder={recipientType === "email" ? "exemplo@email.com" : "+5511999999999"}
                                required
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                {isSubmitting ? "Adicionando..." : "Adicionar"}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsAdding(false);
                                    setRecipientValue("");
                                }}
                                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700"
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="space-y-1.5">
                {initialRecipients.map((recipient) => (
                    <div
                        key={recipient.id}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50"
                    >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-slate-500 dark:text-slate-400">
                                {getRecipientIcon(recipient.recipient_type)}
                            </span>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400 capitalize">
                                        {recipient.recipient_type}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-700 dark:text-slate-300 truncate">
                                    {recipient.recipient_value}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => handleDelete(recipient.id)}
                            className="ml-2 rounded-lg border border-red-300 bg-red-50 p-1.5 text-red-600 hover:bg-red-100 flex-shrink-0"
                            title="Remover recebedor"
                        >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                ))}
                {initialRecipients.length === 0 && !isAdding && (
                    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-center dark:border-slate-700 dark:bg-slate-900">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Nenhum recebedor configurado
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
