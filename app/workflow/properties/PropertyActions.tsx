"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type PropertyActionsProps = {
    propertyId: number;
    name?: string;
    type?: string;
    propertyKey?: string | null;
    description?: string | null;
};

export default function PropertyActions({ propertyId, name, type, propertyKey, description }: PropertyActionsProps) {
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);

    async function handleDelete() {
        if (!confirm("Tem certeza que deseja deletar esta property? Ela será removida de todos os nodes e conditions que a utilizam.")) return;

        setIsDeleting(true);
        try {
            const res = await fetch(`/api/properties/${propertyId}`, {
                method: "DELETE",
            });

            if (res.ok) {
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

    return (
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-mono font-semibold text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                            #{propertyId}
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-white break-words">
                            {name}
                        </span>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                            {type}
                        </span>
                    </div>
                    {propertyKey && (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 break-words">
                            Key: {propertyKey}
                        </p>
                    )}
                    {description && (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 break-words">
                            {description}
                        </p>
                    )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                    <Link
                        href={`/workflow/properties/${propertyId}/edit`}
                        className="rounded-lg border border-slate-300 p-2 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700"
                        title="Editar"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </Link>
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
