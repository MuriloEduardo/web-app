"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { type NotificationDto, type NotificationRecipientDto } from "@/app/workflow/WorkflowTypes";
import NotificationRecipients from "./NotificationRecipients";

type NodeNotificationsProps = {
    nodeId: number;
    notifications: NotificationDto[];
    recipientsMap: Map<number, NotificationRecipientDto[]>;
};

export default function NodeNotifications({ nodeId, notifications: initialNotifications, recipientsMap }: NodeNotificationsProps) {
    const router = useRouter();
    const [isCreating, setIsCreating] = useState(false);
    const [subject, setSubject] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();

        if (!subject.trim()) {
            alert("Digite um assunto para a notificação");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/notifications`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    trigger_node_id: nodeId,
                    subject: subject.trim(),
                    active: true,
                }),
            });

            if (res.ok) {
                setSubject("");
                setIsCreating(false);
                router.refresh();
            } else {
                const errorData = await res.json().catch(() => ({}));
                alert(`Erro ao criar notificação: ${errorData.error?.code || "Erro desconhecido"}`);
            }
        } catch (error) {
            console.error("Error creating notification:", error);
            alert("Erro ao criar notificação");
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleDelete(notificationId: number) {
        if (!confirm("Tem certeza que deseja deletar esta notificação?")) return;

        try {
            const res = await fetch(`/api/notifications/${notificationId}`, {
                method: "DELETE",
            });

            if (res.ok) {
                router.refresh();
            } else {
                alert("Erro ao deletar notificação");
            }
        } catch (error) {
            console.error("Error deleting notification:", error);
            alert("Erro ao deletar notificação");
        }
    }

    return (
        <div className="mt-6">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Notificações ({initialNotifications.length})</h2>
                {!isCreating && (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="rounded-lg bg-yellow-600 p-2 text-white hover:bg-yellow-700"
                        title="Nova notificação"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                )}
            </div>

            {isCreating && (
                <div className="mt-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-900/20">
                    <form onSubmit={handleCreate} className="space-y-3">
                        <div>
                            <label htmlFor="subject" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Assunto da Notificação
                            </label>
                            <textarea
                                id="subject"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                                rows={3}
                                placeholder="Digite o assunto da notificação que será enviada quando este node for executado"
                                required
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 disabled:opacity-50"
                            >
                                {isSubmitting ? "Criando..." : "Criar Notificação"}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsCreating(false);
                                    setSubject("");
                                }}
                                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700"
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="mt-3 grid gap-3">
                {initialNotifications.map((notification) => (
                    <div
                        key={notification.id}
                        className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs font-mono font-semibold text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                                        Notification #{notification.id}
                                    </span>
                                    {notification.active && (
                                        <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">
                                            Ativa
                                        </span>
                                    )}
                                </div>
                                <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                                    {notification.subject}
                                </p>
                                {notification.created_at && (
                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                        Criada em {new Date(notification.created_at).toLocaleString("pt-BR")}
                                    </p>
                                )}
                                
                                {/* Recipients */}
                                <NotificationRecipients 
                                    notificationId={notification.id} 
                                    recipients={recipientsMap.get(notification.id) || []} 
                                />
                            </div>
                            <button
                                onClick={() => handleDelete(notification.id)}
                                className="rounded-lg border border-red-300 bg-red-50 p-2 text-red-600 hover:bg-red-100"
                                title="Deletar notificação"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                ))}
                {initialNotifications.length === 0 && !isCreating ? (
                    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center dark:border-slate-700 dark:bg-slate-900">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Nenhuma notificação configurada para este node.
                        </p>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
