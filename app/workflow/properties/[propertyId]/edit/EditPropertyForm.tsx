"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type EditPropertyFormProps = {
    property: {
        id: number;
        name: string;
        type: string;
        key?: string | null;
        description?: string | null;
    };
};

export default function EditPropertyForm({ property }: EditPropertyFormProps) {
    const router = useRouter();
    const [name, setName] = useState(property.name);
    const [type, setType] = useState(property.type);
    const [key, setKey] = useState(property.key || "");
    const [description, setDescription] = useState(property.description || "");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const res = await fetch(`/api/properties/${property.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    type,
                    key: key || null,
                    description: description || null
                }),
            });

            if (res.ok) {
                router.back();
                router.refresh();
            } else {
                const data = await res.json();
                setError(data.error?.code || "Erro ao atualizar property");
            }
        } catch (err) {
            setError("Erro ao processar requisição");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            {error && (
                <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-200">
                <p className="font-semibold">⚠️ Atenção</p>
                <p className="mt-1">Esta property é compartilhada. Alterá-la afetará todos os nodes e conditions que a utilizam.</p>
            </div>

            <div className="space-y-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Nome *
                    </label>
                    <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                        required
                    />
                </div>

                <div>
                    <label htmlFor="type" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Type *
                    </label>
                    <input
                        id="type"
                        type="text"
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                        placeholder="ex: string, number, boolean"
                        required
                    />
                </div>

                <div>
                    <label htmlFor="key" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Key (opcional)
                    </label>
                    <input
                        id="key"
                        type="text"
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                        placeholder="ex: message.body"
                    />
                </div>

                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Description (opcional)
                    </label>
                    <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                        placeholder="Descrição da property"
                        rows={4}
                    />
                </div>
            </div>

            <div className="flex gap-3">
                <button
                    type="submit"
                    disabled={isSubmitting || !name.trim() || !type.trim()}
                    className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                >
                    {isSubmitting ? "Salvando..." : "Salvar alterações"}
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
