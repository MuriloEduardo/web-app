"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { type NotificationRecipientDto } from "@/app/workflow/WorkflowTypes";

type RecipientsListProps = {
    recipients: NotificationRecipientDto[];
};

export default function RecipientsList({ recipients: initialRecipients }: RecipientsListProps) {
    const router = useRouter();
    const [isCreating, setIsCreating] = useState(false);
    const [recipientIdentifier, setRecipientIdentifier] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();

        if (!recipientIdentifier.trim()) {
            alert("Digite um identificador para o recebedor");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/notification-recipients`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    recipient_identifier: recipientIdentifier.trim(),
                    active: true,
                }),
            });

            if (res.ok) {
                setRecipientIdentifier("");
                setIsCreating(false);
                router.refresh();
            } else {
                const errorData = await res.json().catch(() => ({}));
                alert(`Erro ao criar recebedor: ${errorData.error?.code || "Erro desconhecido"}`);
            }
        } catch (error) {
            console.error("Error creating recipient:", error);
            alert("Erro ao criar recebedor");
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleDelete(recipientId: number) {
        if (!confirm("Tem certeza que deseja deletar este recebedor? Ele será removido de todas as notificações.")) return;

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

    async function toggleActive(recipientId: number, currentActive: boolean) {
        try {
            const res = await fetch(`/api/notification-recipients/${recipientId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    active: !currentActive,
                }),
            });

            if (res.ok) {
                router.refresh();
            } else {
                alert("Erro ao atualizar status do recebedor");
            }
        } catch (error) {
            console.error("Error updating recipient:", error);
            alert("Erro ao atualizar recebedor");
        }
    }

    const getRecipientIcon = (identifier: string | undefined) => {
        const id = (identifier || "").toLowerCase();
        
        if (id.includes("@")) {
            return (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
            );
        } else if (id.includes("+") || /^\d+$/.test(id)) {
            return (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
            );
        }
        
        return (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
        );
    };

    // Agrupar por notification_id
    const recipientsByNotification = initialRecipients.reduce((acc, recipient) => {
        const key = recipient.notification_id || 0;
        if (!acc[key]) acc[key] = [];
        acc[key].push(recipient);
        return acc;
    }, {} as Record<number, NotificationRecipientDto[]>);

    const globalRecipients = recipientsByNotification[0] || [];
    const linkedRecipients = Object.entries(recipientsByNotification)
        .filter(([key]) => key !== "0")
        .flatMap(([, recipients]) => recipients);

    return (
        <div>
            <div className="mb-6 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Recebedores Globais</h2>
                    {!isCreating && (
                        <button
                            onClick={() => setIsCreating(true)}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                            + Novo Recebedor
                        </button>
                    )}
                </div>

                {isCreating && (
                    <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-700 dark:bg-blue-900/20">
                        <form onSubmit={handleCreate} className="space-y-3">
                            <div>
                                <label htmlFor="recipient-identifier" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Identificador do Recebedor
                                </label>
                                <input
                                    id="recipient-identifier"
                                    type="text"
                                    value={recipientIdentifier}
                                    onChange={(e) => setRecipientIdentifier(e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                                    placeholder="email@exemplo.com ou +5511999999999"
                                    required
                                />
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    Este recebedor poderá ser usado em qualquer notificação
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {isSubmitting ? "Criando..." : "Criar Recebedor"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCreating(false);
                                        setRecipientIdentifier("");
                                    }}
                                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="space-y-2">
                    {globalRecipients.map((recipient) => (
                        <div
                            key={recipient.id}
                            className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900"
                        >
                            <div className="flex items-center gap-3 flex-1">
                                <span className="text-slate-500 dark:text-slate-400">
                                    {getRecipientIcon(recipient.recipient_identifier)}
                                </span>
                                <div className="flex-1">
                                    <p className="font-medium text-slate-700 dark:text-slate-300">
                                        {recipient.recipient_identifier}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        ID: {recipient.id}
                                    </p>
                                </div>
                                {recipient.active ? (
                                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">
                                        Ativo
                                    </span>
                                ) : (
                                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-900 dark:text-gray-300">
                                        Inativo
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-2 ml-3">
                                <button
                                    onClick={() => toggleActive(recipient.id, recipient.active)}
                                    className="rounded-lg border border-slate-300 bg-white p-2 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700"
                                    title={recipient.active ? "Desativar" : "Ativar"}
                                >
                                    {recipient.active ? (
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                        </svg>
                                    ) : (
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </button>
                                <button
                                    onClick={() => handleDelete(recipient.id)}
                                    className="rounded-lg border border-red-300 bg-red-50 p-2 text-red-600 hover:bg-red-100"
                                    title="Deletar recebedor"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}
                    {globalRecipients.length === 0 && !isCreating && (
                        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center dark:border-slate-700 dark:bg-slate-900">
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Nenhum recebedor global cadastrado. Crie um para reutilizar em várias notificações.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {linkedRecipients.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
                    <h2 className="mb-4 text-lg font-semibold">Recebedores Vinculados a Notificações</h2>
                    <div className="space-y-2">
                        {linkedRecipients.map((recipient) => (
                            <div
                                key={recipient.id}
                                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-slate-500 dark:text-slate-400">
                                        {getRecipientIcon(recipient.recipient_identifier)}
                                    </span>
                                    <div>
                                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                            {recipient.recipient_identifier}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            Notificação #{recipient.notification_id}
                                        </p>
                                    </div>
                                </div>
                                {recipient.active && (
                                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">
                                        Ativo
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
