import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import LogoutButton from "@/app/components/LogoutButton";
import { authOptions } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.trim().toLowerCase();

    if (!email) {
        redirect("/login");
    }

    const user = await prisma.user.findUnique({
        where: { email },
        select: { email: true, phone_number: true },
    });

    return (
        <div className="flex min-h-screen items-center justify-center font-sans">
            <main className="w-full max-w-3xl rounded p-6 dark:text-white">
                <h1 className="text-lg font-semibold">Configurações</h1>

                <div className="mt-4 grid gap-3">
                    <div className="rounded border p-3 dark:border-gray-800">
                        <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                            Email
                        </div>
                        <div className="mt-1 break-all text-sm">
                            {user?.email ?? email}
                        </div>
                    </div>

                    <div className="rounded border p-3 dark:border-gray-800">
                        <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                            Telefone
                        </div>
                        <div className="mt-1 break-all text-sm">
                            {user?.phone_number ?? "—"}
                        </div>
                    </div>

                    <div className="pt-2">
                        <LogoutButton />
                    </div>
                </div>
            </main>
        </div>
    );
}
