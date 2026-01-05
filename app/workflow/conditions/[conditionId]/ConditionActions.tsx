"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ConditionActionsProps = {
    conditionId: number;
    edgeId: number;
    operator: string;
    compareValue: string;
    createdAt?: string;
    updatedAt?: string;
};

export default function ConditionActions({ conditionId, edgeId, operator, compareValue, createdAt, updatedAt }: ConditionActionsProps) {
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [editOperator, setEditOperator] = useState(operator);
    const [editCompareValue, setEditCompareValue] = useState(compareValue);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    async function handleSave() {
        setIsSaving(true);
        try {
            const res = await fetch(`/api/conditions/${conditionId}?edge_id=${edgeId}&source_node_id=0`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    operator: editOperator, 
                    compare_value: editCompareValue 
                }),
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
        if (!confirm("Tem certeza que deseja deletar esta condition?")) return;
        
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/conditions/${conditionId}?edge_id=${edgeId}&source_node_id=0`, {
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
                    <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Editar Condition</h2>
                    <button
                        onClick={() => {
                            setIsEditing(false);
                            setEditOperator(operator);
                            setEditCompareValue(compareValue);
                        }}
                        className="text-xs text-slate-500 hover:text-slate-700"
                    >
                        Cancelar
                    </button>
                </div>
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Operador
                        </label>
                        <input
                            type="text"
                            value={editOperator}
                            onChange={(e) => setEditOperator(e.target.value)}
                            className="w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                            placeholder="ex: ==, !=, >, <"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Valor de Comparação
                        </label>
                        <input
                            type="text"
                            value={editCompareValue}
                            onChange={(e) => setEditCompareValue(e.target.value)}
                            className="w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                        />
                    </div>
                </div>
                <div className="mt-3 flex gap-2">
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !editOperator.trim() || !editCompareValue.trim()}
                        className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
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
                    <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Detalhes da Condição</h2>
                    <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-600 dark:text-slate-400">Operador:</span>
                            <code className="rounded bg-slate-100 px-2 py-1 text-sm font-mono text-slate-900 dark:bg-slate-700 dark:text-slate-100">
                                {operator}
                            </code>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-600 dark:text-slate-400">Valor de Comparação:</span>
                            <span className="text-sm font-medium text-slate-900 dark:text-white">
                                {compareValue}
                            </span>
                        </div>
                        {createdAt && (
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-600 dark:text-slate-400">Criado em:</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                    {new Date(createdAt).toLocaleString('pt-BR')}
                                </span>
                            </div>
                        )}
                        {updatedAt && (
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-600 dark:text-slate-400">Atualizado em:</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                    {new Date(updatedAt).toLocaleString('pt-BR')}
                                </span>
                            </div>
                        )}
                    </div>
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
