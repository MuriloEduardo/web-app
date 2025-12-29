import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/lib/auth";

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);

    return (
        <div className="flex min-h-screen items-center justify-center font-sans dark:bg-gray-900">
            <main className="w-full max-w-3xl rounded bg-white p-6 dark:bg-gray-900 dark:text-white">
                <h1 className="text-lg font-semibold">Bem-vindo!</h1>
                <p className="mt-2 text-sm">
                    Você está logado como <b>{session?.user?.email}</b>
                </p>
            </main>
        </div>
    );
}
