import Link from "next/link";

export default function Home() {
  return (
    <div className="flex items-center justify-center font-sans">
      <main className="flex w-full max-w-3xl flex-col gap-10 rounded px-6 py-16 sm:px-16">
        <section className="flex flex-col gap-3 text-center sm:text-left">
          <h1 className="text-2xl font-semibold tracking-tight">Atendimento BR</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Crie sua conta para começar, ou entre se já tiver acesso.
          </p>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/register"
              className="rounded px-4 py-2 text-center bg-black text-white"
            >
              Criar conta
            </Link>
            <Link href="/login" className="rounded border px-4 py-2 text-center">
              Entrar
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
