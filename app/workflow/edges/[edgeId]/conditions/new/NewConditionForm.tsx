"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type NewConditionFormProps = {
    edgeId: number;
    sourceNodeId: number;
};

export default function NewConditionForm({ edgeId, sourceNodeId }: NewConditionFormProps) {
    const router = useRouter();
    const [operator, setOperator] = useState("");
    const [compareValue, setCompareValue] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/conditions?edge_id=${edgeId}&source_node_id=${sourceNodeId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    edge_id: edgeId,
                    operator: operator.trim() || "",
                    compare_value: compareValue.trim() || "",
                }),
            });

            if (res.ok) {
                router.push(`/workflow/edges/${edgeId}`);
                router.refresh();
            } else {
                const errorData = await res.json().catch(() => ({}));
                alert(`Erro ao criar condition: ${errorData.error?.code || "Erro desconhecido"}`);
            }
        } catch (error) {
            console.error("Error creating condition:", error);
            alert("Erro ao criar condition");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="edge" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Edge
                    </label>
                    <div className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm dark:border-slate-600 dark:bg-slate-900">
                        Edge #{edgeId}
                    </div>
                </div>

                <div>
                    <label htmlFor="operator" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Operador
                    </label>
                    <input
                        id="operator"
                        type="text"
                        value={operator}
                        onChange={(e) => setOperator(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                        placeholder="ex: ==, !=, >, <, >=, <="
                    />
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Operador de comparação (opcional)
                    </p>
                </div>

                <div>
                    <label htmlFor="compareValue" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Valor de Comparação
                    </label>
                    <input
                        id="compareValue"
                        type="text"
                        value={compareValue}
                        onChange={(e) => setCompareValue(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                        placeholder="Valor para comparar"
                    />
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Valor usado na comparação (opcional)
                    </p>
                </div>

                <div className="flex gap-3 pt-2">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="rounded-lg bg-orange-600 px-6 py-3 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
                    >
                        {isSubmitting ? "Criando..." : "Criar Condition"}
                    </button>
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="rounded-lg border border-slate-300 px-6 py-3 text-sm font-medium hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700"
                    >
                        Cancelar
                    </button>
                </div>
            </form>
        </div>
    );
}
