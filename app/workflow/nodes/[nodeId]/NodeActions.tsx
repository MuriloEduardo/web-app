"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type NodeActionsProps = {
    nodeId: number;
    prompt: string;
};

export default function NodeActions({ nodeId, prompt }: NodeActionsProps) {
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [editPrompt, setEditPrompt] = useState(prompt);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    async function handleSave() {
        setIsSaving(true);
        try {
            const res = await fetch(`/api/nodes/${nodeId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: editPrompt }),
            });

            if (res.ok) {
                setIsEditing(false);
                router.refresh();
            } else {
                alert("Erro ao salvar");
            }
        } catch (error) {
            alert("Erro ao salvar");
        } finally {
            setIsSaving(false);
        }
    }

    async function handleDelete() {
        if (!confirm("Tem certeza que deseja deletar este node?")) return;

        setIsDeleting(true);
        try {
            const res = await fetch(`/api/nodes/${nodeId}`, {
                method: "DELETE",
            });

            if (res.ok) {
                router.push("/workflow");
                router.refresh();
            } else {
                alert("Erro ao deletar");
            }
        } catch (error) {
            alert("Erro ao deletar");
        } finally {
            setIsDeleting(false);
        }
    }

    if (isEditing) {
        return (
            <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 sm:p-6">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Editar Prompt</h2>
                    <button
                        onClick={() => {
                            setIsEditing(false);
                            setEditPrompt(prompt);
                        }}
                        className="text-xs text-slate-500 hover:text-slate-700"
                    >
                        Cancelar
                    </button>
                </div>
                <textarea
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                    rows={6}
                />
                <div className="mt-3 flex gap-2">
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !editPrompt.trim()}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isSaving ? "Salvando..." : "Salvar"}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 sm:p-6">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Prompt</h2>
                    <p className="mt-2 text-sm text-slate-900 dark:text-white whitespace-pre-wrap">
                        {prompt}
                    </p>
                </div>
                <div className="ml-3 flex gap-2">
                    <button
                        onClick={() => setIsEditing(true)}
                        className="rounded-lg border border-slate-300 p-2 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700"
                        title="Editar"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="rounded-lg border border-red-300 bg-red-50 p-2 text-red-600 hover:bg-red-100 disabled:opacity-50"
                        title="Deletar"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
