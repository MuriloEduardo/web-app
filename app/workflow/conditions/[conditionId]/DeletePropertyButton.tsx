"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type DeletePropertyButtonProps = {
    conditionId: number;
    edgeId: number;
    sourceNodeId: number;
    propertyId: number;
};

export default function DeletePropertyButton({ conditionId, edgeId, sourceNodeId, propertyId }: DeletePropertyButtonProps) {
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);

    async function handleDelete() {
        if (!confirm("Tem certeza que deseja desvincular esta property?")) return;

        setIsDeleting(true);

        try {
            const res = await fetch(`/api/condition-properties/${propertyId}?condition_id=${conditionId}&edge_id=${edgeId}&source_node_id=${sourceNodeId}`, {
                method: "DELETE",
            });

            if (res.ok) {
                router.refresh();
            } else {
                alert("Erro ao desvincular property");
            }
        } catch (error) {
            alert("Erro ao desvincular property");
        } finally {
            setIsDeleting(false);
        }
    }

    return (
        <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="rounded-lg border border-red-300 bg-red-50 p-2 text-red-600 hover:bg-red-100 disabled:opacity-50"
            title="Desvincular"
        >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
        </button>
    );
}
