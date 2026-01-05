"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { type PropertyDto } from "@/app/workflow/WorkflowTypes";

type CreatePropertyFormProps = {
    nodeId: number;
    existingProperties: PropertyDto[];
};

export default function CreatePropertyForm({ nodeId, existingProperties }: CreatePropertyFormProps) {
    const router = useRouter();
    const [mode, setMode] = useState<"existing" | "new">("existing");
    
    // For existing property
    const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
    
    // For new property
    const [name, setName] = useState("");
    const [type, setType] = useState("");
    const [key, setKey] = useState("");
    const [description, setDescription] = useState("");
    
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            let propertyId = selectedPropertyId;

            // If creating new property, create it first
            if (mode === "new") {
                const createRes = await fetch("/api/properties", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                        name, 
                        type, 
                        key: key || null,
                        description: description || null
                    }),
                });

                if (!createRes.ok) {
                    alert("Erro ao criar property");
                    return;
                }

                const createData = await createRes.json();
                propertyId = createData.data.id;
            }

            if (!propertyId) {
                alert("Selecione uma property");
                return;
            }

            // Link property to node
            const linkRes = await fetch("/api/node-properties", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ node_id: nodeId, property_id: propertyId }),
            });

            if (linkRes.ok) {
                router.push(`/workflow/nodes/${nodeId}`);
                router.refresh();
            } else {
                alert("Erro ao vincular property ao node");
            }
        } catch (error) {
            alert("Erro ao processar");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="mt-6 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 sm:p-6">
            <div className="mb-4 flex gap-4">
                <button
                    type="button"
                    onClick={() => setMode("existing")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                        mode === "existing"
                            ? "bg-purple-600 text-white"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                    }`}
                >
                    Usar Existente
                </button>
                <button
                    type="button"
                    onClick={() => setMode("new")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                        mode === "new"
                            ? "bg-purple-600 text-white"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                    }`}
                >
                    Criar Nova
                </button>
            </div>

            {mode === "existing" ? (
                <div className="space-y-3">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Selecione uma Property
                    </label>
                    <select
                        value={selectedPropertyId || ""}
                        onChange={(e) => setSelectedPropertyId(Number(e.target.value))}
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                        required
                    >
                        <option value="">-- Selecione --</option>
                        {existingProperties.map((prop) => (
                            <option key={prop.id} value={prop.id}>
                                {prop.name} ({prop.type})
                            </option>
                        ))}
                    </select>
                </div>
            ) : (
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Nome *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Type *
                        </label>
                        <input
                            type="text"
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                            placeholder="ex: string, number, boolean"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Key (opcional)
                        </label>
                        <input
                            type="text"
                            value={key}
                            onChange={(e) => setKey(e.target.value)}
                            className="w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                            placeholder="ex: message.body"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Description (opcional)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                            placeholder="Descrição da property"
                            rows={3}
                        />
                    </div>
                </div>
            )}

            <div className="mt-6 flex gap-3">
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                >
                    {isSubmitting ? "Salvando..." : "Adicionar"}
                </button>
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                    Cancelar
                </button>
            </div>
        </form>
    );
}
