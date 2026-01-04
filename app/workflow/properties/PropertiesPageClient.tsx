"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useConfirm } from "@/app/components/ConfirmProvider";
import { type Envelope, type PropertyDto } from "@/app/workflow/WorkflowTypes";

type Props = {
    initialProperties: PropertyDto[];
    initialErrorCode: string | null;
    initialQuery: string;
};

export function PropertiesPageClient({ initialProperties, initialErrorCode, initialQuery }: Props) {
    const confirm = useConfirm();

    const [properties, setProperties] = useState<PropertyDto[]>(initialProperties);
    const [errorCode, setErrorCode] = useState<string | null>(initialErrorCode);
    const [query, setQuery] = useState(initialQuery);

    const [name, setName] = useState("");
    const [type, setType] = useState("");
    const [description, setDescription] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState("");
    const [editType, setEditType] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const filtered = useMemo(() => {
        const needle = query.trim().toLowerCase();
        if (!needle) return properties;
        return properties.filter((p) => {
            return (
                String(p.id) === needle ||
                (p.name ?? "").toLowerCase().includes(needle) ||
                (p.key ?? "").toLowerCase().includes(needle)
            );
        });
    }, [properties, query]);

    async function reload() {
        setErrorCode(null);
        try {
            const res = await fetch("/api/properties", { headers: { accept: "application/json" } });
            const payload = (await res.json().catch(() => null)) as Envelope<PropertyDto[]> | null;
            if (!res.ok) {
                setErrorCode(payload?.error?.code ?? "PROPERTIES_FETCH_FAILED");
                setProperties([]);
                return;
            }
            setProperties(Array.isArray(payload?.data) ? payload!.data! : []);
        } catch {
            setErrorCode("PROPERTIES_FETCH_FAILED");
            setProperties([]);
        }
    }

    async function createProperty() {
        const trimmedName = name.trim();
        const trimmedType = type.trim();
        const trimmedDesc = description.trim();
        if (!trimmedName || !trimmedType) {
            setCreateError("NAME_AND_TYPE_REQUIRED");
            return;
        }

        setIsCreating(true);
        setCreateError(null);
        try {
            const res = await fetch("/api/properties", {
                method: "POST",
                headers: { accept: "application/json", "Content-Type": "application/json" },
                body: JSON.stringify({ name: trimmedName, type: trimmedType, description: trimmedDesc || undefined }),
            });
            const payload = (await res.json().catch(() => null)) as Envelope<unknown> | null;
            if (!res.ok) {
                setCreateError(payload?.error?.code ?? "PROPERTIES_CREATE_FAILED");
                return;
            }
            setName("");
            setType("");
            setDescription("");
            await reload();
        } catch {
            setCreateError("PROPERTIES_CREATE_FAILED");
        } finally {
            setIsCreating(false);
        }
    }

    function startEdit(p: PropertyDto) {
        setEditingId(p.id);
        setEditName(p.name ?? "");
        setEditType(p.type ?? "");
        setEditDescription(p.description ?? "");
    }

    function cancelEdit() {
        setEditingId(null);
        setEditName("");
        setEditType("");
        setEditDescription("");
    }

    async function saveProperty(propertyId: number) {
        const trimmedName = editName.trim();
        const trimmedType = editType.trim();
        const trimmedDesc = editDescription.trim();
        if (!trimmedName || !trimmedType) {
            setErrorCode("NAME_AND_TYPE_REQUIRED");
            return;
        }

        setIsSaving(true);
        setErrorCode(null);
        try {
            const res = await fetch(`/api/properties/${propertyId}`, {
                method: "PUT",
                headers: { accept: "application/json", "Content-Type": "application/json" },
                body: JSON.stringify({ name: trimmedName, type: trimmedType, description: trimmedDesc || null }),
            });
            const payload = (await res.json().catch(() => null)) as Envelope<unknown> | null;
            if (!res.ok) {
                setErrorCode(payload?.error?.code ?? "PROPERTIES_UPDATE_FAILED");
                return;
            }
            cancelEdit();
            await reload();
        } catch {
            setErrorCode("PROPERTIES_UPDATE_FAILED");
        } finally {
            setIsSaving(false);
        }
    }

    async function deleteProperty(propertyId: number) {
        const ok = await confirm(`Remover property #${propertyId}?`);
        if (!ok) return;
        setDeleteId(propertyId);
        setErrorCode(null);
        try {
            const res = await fetch(`/api/properties/${propertyId}`, {
                method: "DELETE",
                headers: { accept: "application/json" },
            });
            const payload = (await res.json().catch(() => null)) as Envelope<unknown> | null;
            if (!res.ok) {
                setErrorCode(payload?.error?.code ?? "PROPERTIES_DELETE_FAILED");
                return;
            }
            await reload();
        } catch {
            setErrorCode("PROPERTIES_DELETE_FAILED");
        } finally {
            setDeleteId(null);
        }
    }

    return (
        <section className="space-y-5">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <div className="text-xs text-slate-600">Workflow / Properties</div>
                    <h1 className="text-xl font-semibold text-slate-900">Properties</h1>
                </div>
                <Link href="/workflow/nodes" className="rounded border px-3 py-1 text-sm text-slate-900">
                    Voltar para nodes
                </Link>
            </div>

            {errorCode ? (
                <div className="rounded border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">Erro: {errorCode}</div>
            ) : null}

            <div className="rounded border p-4">
                <div className="text-sm font-semibold text-slate-900">Nova property</div>
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                    <label className="text-xs text-slate-700">
                        Nome
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="mt-1 w-full rounded border px-3 py-2 text-sm text-slate-900"
                        />
                    </label>
                    <label className="text-xs text-slate-700">
                        Tipo
                        <input
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="mt-1 w-full rounded border px-3 py-2 text-sm text-slate-900"
                        />
                    </label>
                    <label className="text-xs text-slate-700 md:col-span-3">
                        Descrição (opcional)
                        <input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="mt-1 w-full rounded border px-3 py-2 text-sm text-slate-900"
                        />
                    </label>
                </div>
                <div className="mt-2 flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => createProperty()}
                        disabled={isCreating}
                        className="rounded border px-3 py-2 text-sm text-slate-900 disabled:opacity-60"
                    >
                        {isCreating ? "Criando..." : "Criar"}
                    </button>
                    {createError ? <span className="text-sm text-red-700">Erro: {createError}</span> : null}
                </div>
            </div>

            <div className="rounded border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-slate-900">Catálogo</div>
                    <div className="flex flex-wrap items-center gap-2">
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Filtrar por nome ou id"
                            className="w-full max-w-xs rounded border px-3 py-2 text-sm text-slate-900"
                        />
                        <button type="button" onClick={() => reload()} className="rounded border px-3 py-2 text-xs text-slate-900">
                            Recarregar
                        </button>
                    </div>
                </div>

                <div className="mt-3 overflow-hidden rounded border">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
                            <tr>
                                <th className="px-3 py-2">ID</th>
                                <th className="px-3 py-2">Nome</th>
                                <th className="px-3 py-2">Tipo</th>
                                <th className="px-3 py-2">Descrição</th>
                                <th className="px-3 py-2">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((p) => (
                                <tr key={p.id} className="border-t">
                                    <td className="px-3 py-2 align-top text-slate-900">{p.id}</td>
                                    <td className="px-3 py-2 align-top text-slate-900">
                                        {editingId === p.id ? (
                                            <input
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                className="w-full rounded border px-2 py-1 text-sm text-slate-900"
                                            />
                                        ) : (
                                            p.name
                                        )}
                                    </td>
                                    <td className="px-3 py-2 align-top text-slate-900">
                                        {editingId === p.id ? (
                                            <input
                                                value={editType}
                                                onChange={(e) => setEditType(e.target.value)}
                                                className="w-full rounded border px-2 py-1 text-sm text-slate-900"
                                            />
                                        ) : (
                                            p.type
                                        )}
                                    </td>
                                    <td className="px-3 py-2 align-top text-slate-900">
                                        {editingId === p.id ? (
                                            <input
                                                value={editDescription}
                                                onChange={(e) => setEditDescription(e.target.value)}
                                                className="w-full rounded border px-2 py-1 text-sm text-slate-900"
                                            />
                                        ) : (
                                            p.description || ""
                                        )}
                                    </td>
                                    <td className="px-3 py-2 align-top">
                                        {editingId === p.id ? (
                                            <div className="flex flex-wrap gap-2 text-xs">
                                                <button
                                                    type="button"
                                                    onClick={() => saveProperty(p.id as number)}
                                                    disabled={isSaving}
                                                    className="rounded border px-2 py-1 text-slate-900 disabled:opacity-60"
                                                >
                                                    {isSaving ? "Salvando..." : "Salvar"}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => cancelEdit()}
                                                    className="rounded border px-2 py-1 text-slate-900"
                                                >
                                                    Cancelar
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-wrap gap-2 text-xs">
                                                <button
                                                    type="button"
                                                    onClick={() => startEdit(p)}
                                                    className="rounded border px-2 py-1 text-slate-900"
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => deleteProperty(p.id as number)}
                                                    disabled={deleteId === p.id}
                                                    className="rounded border border-red-300 px-2 py-1 text-red-700 disabled:opacity-60"
                                                >
                                                    {deleteId === p.id ? "Removendo..." : "Excluir"}
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-3 py-6 text-center text-sm text-slate-600">
                                        Nenhuma property encontrada.
                                    </td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
}
