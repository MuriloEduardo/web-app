"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

type Props = {
    className?: string;
};

export default function LogoutButton({ className }: Props) {
    const [loading, setLoading] = useState(false);

    return (
        <button
            type="button"
            className={
                className ??
                "rounded bg-black px-3 py-2 text-white disabled:opacity-60 dark:bg-white dark:text-black"
            }
            disabled={loading}
            onClick={async () => {
                setLoading(true);
                await signOut({ callbackUrl: "/login" });
            }}
        >
            {loading ? "Saindo..." : "Sair"}
        </button>
    );
}
