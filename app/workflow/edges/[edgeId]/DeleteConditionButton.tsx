"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type DeleteConditionButtonProps = {
    conditionId: number;
    edgeId: number;
    sourceNodeId: number;
};

export default function DeleteConditionButton({ conditionId, edgeId, sourceNodeId }: DeleteConditionButtonProps) {
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);

    async function handleDelete(e: React.MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        
        if (!confirm("Tem certeza que deseja deletar esta condition?")) return;
        
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/conditions/${conditionId}?edge_id=${edgeId}&source_node_id=${sourceNodeId}`, {
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
        <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="rounded-lg border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100 disabled:opacity-50"
        >
            {isDeleting ? "..." : "Deletar"}
        </button>
    );
}
