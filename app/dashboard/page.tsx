import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/lib/auth";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="w-full max-w-3xl rounded bg-white p-6 dark:bg-black">
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <p className="mt-2 text-sm">
          Você está logado como <b>{session?.user?.email}</b>
        </p>
      </main>
    </div>
  );
}
