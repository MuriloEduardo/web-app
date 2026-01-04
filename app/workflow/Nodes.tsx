import Link from "next/link";

export default async function WorkflowPage() {
    return (
        <main className="min-h-screen px-3 py-4 sm:px-4 sm:py-6 md:py-8">
            <div className="mx-auto max-w-4xl space-y-4 sm:space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
                        Workflow
                    </h1>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 sm:mt-2">
                        Gerencie os nós do seu fluxo de trabalho
                    </p>
                </div>

                <Link
                    href="/workflow/nodes"
                    className="group block rounded-lg border border-slate-200 bg-white p-6 transition hover:border-blue-400 hover:shadow-md dark:bg-slate-800"
                >
                    <h2 className="text-xl font-semibold text-blue-600 dark:text-blue-400">
                        Nodes
                    </h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Visualize e gerencie todos os nós do workflow. Dentro de cada nó você pode gerenciar suas edges e properties.
                    </p>
                </Link>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 dark:bg-slate-800">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white sm:text-base">
                        Como funciona
                    </h3>
                    <ul className="mt-2 space-y-1.5 text-xs text-gray-600 dark:text-gray-400 sm:mt-3 sm:space-y-2 sm:text-sm">
                        <li>
                            <strong>Nodes:</strong> Pontos do fluxo contendo prompts e lógica
                        </li>
                        <li>
                            <strong>Edges:</strong> Conexões entre nodes (gerenciadas dentro de cada node)
                        </li>
                        <li>
                            <strong>Properties:</strong> Propriedades do sistema vinculadas aos nodes
                        </li>
                    </ul>
                </div>
            </div>
        </main>
    );
}
