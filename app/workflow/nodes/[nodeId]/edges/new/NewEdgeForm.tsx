"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { type NodeDto } from "@/app/workflow/WorkflowTypes";

type NewEdgeFormProps = {
    sourceNodeId: number;
    nodes: NodeDto[];
};

export default function NewEdgeForm({ sourceNodeId, nodes }: NewEdgeFormProps) {
    const router = useRouter();
    const [destinationNodeId, setDestinationNodeId] = useState("");
    const [label, setLabel] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filter out the source node from destination options
    const availableNodes = nodes.filter(node => node.id !== sourceNodeId);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!destinationNodeId) {
            alert("Selecione um node de destino");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/edges?source_node_id=${sourceNodeId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    source_node_id: sourceNodeId,
                    destination_node_id: Number(destinationNodeId),
                    label: label.trim() || undefined,
                }),
            });

            if (res.ok) {
                router.push(`/workflow/nodes/${sourceNodeId}`);
                router.refresh();
            } else {
                const errorData = await res.json().catch(() => ({}));
                alert(`Erro ao criar edge: ${errorData.error?.code || "Erro desconhecido"}`);
            }
        } catch (error) {
            console.error("Error creating edge:", error);
            alert("Erro ao criar edge");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="source" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Node de Origem
                    </label>
                    <div className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm dark:border-slate-600 dark:bg-slate-900">
                        Node #{sourceNodeId}
                    </div>
                </div>

                <div>
                    <label htmlFor="destination" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Node de Destino *
                    </label>
                    <select
                        id="destination"
                        value={destinationNodeId}
                        onChange={(e) => setDestinationNodeId(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                        required
                    >
                        <option value="">Selecione um node</option>
                        {availableNodes.map((node) => (
                            <option key={node.id} value={node.id}>
                                Node #{node.id} - {node.prompt.substring(0, 50)}{node.prompt.length > 50 ? "..." : ""}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label htmlFor="label" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Label (opcional)
                    </label>
                    <input
                        id="label"
                        type="text"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                        placeholder="ex: true, false, timeout..."
                    />
                </div>

                <div className="flex gap-3 pt-2">
                    <button
                        type="submit"
                        disabled={isSubmitting || !destinationNodeId}
                        className="rounded-lg bg-green-600 px-6 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                        {isSubmitting ? "Criando..." : "Criar Edge"}
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
