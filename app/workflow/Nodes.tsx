import Link from "next/link";

export default async function WorkflowPage() {
    return (
        <main className="mx-auto min-h-screen max-w-4xl px-4 py-8">
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                        Workflow Management
                    </h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                        Gerencie todos os componentes do seu workflow
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <Link
                        href="/workflow/nodes"
                        className="group rounded-lg border border-slate-200 bg-white p-6 transition hover:border-blue-400 hover:shadow-md dark:bg-slate-800"
                    >
                        <h2 className="text-xl font-semibold text-blue-600 dark:text-blue-400">
                            Nodes
                        </h2>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            Gerenciar nós do fluxo de trabalho (prompts e lógica)
                        </p>
                    </Link>

                    <Link
                        href="/workflow/edges"
                        className="group rounded-lg border border-slate-200 bg-white p-6 transition hover:border-green-400 hover:shadow-md dark:bg-slate-800"
                    >
                        <h2 className="text-xl font-semibold text-green-600 dark:text-green-400">
                            Edges
                        </h2>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            Gerenciar conexões entre nodes (transições)
                        </p>
                    </Link>

                    <Link
                        href="/workflow/properties"
                        className="group rounded-lg border border-slate-200 bg-white p-6 transition hover:border-purple-400 hover:shadow-md dark:bg-slate-800"
                    >
                        <h2 className="text-xl font-semibold text-purple-600 dark:text-purple-400">
                            Properties
                        </h2>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            Gerenciar propriedades do sistema
                        </p>
                    </Link>

                    <Link
                        href="/workflow/conditions"
                        className="group rounded-lg border border-slate-200 bg-white p-6 transition hover:border-orange-400 hover:shadow-md dark:bg-slate-800"
                    >
                        <h2 className="text-xl font-semibold text-orange-600 dark:text-orange-400">
                            Conditions
                        </h2>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            Gerenciar condições de validação das edges
                        </p>
                    </Link>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 dark:bg-slate-800">
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                        Estrutura do Workflow
                    </h3>
                    <ul className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                        <li>
                            <strong>Node:</strong> Representa um ponto no fluxo (ex: prompt de IA, decisão)
                        </li>
                        <li>
                            <strong>Edge:</strong> Conecta dois nodes (origem → destino) com label e prioridade
                        </li>
                        <li>
                            <strong>Property:</strong> Define variáveis/campos do sistema (ex: nome, telefone)
                        </li>
                        <li>
                            <strong>Condition:</strong> Define regras de validação para as edges (ex: operador, valor)
                        </li>
                    </ul>
                </div>
            </div>
        </main>
    );
}
