import { Suspense } from "react";
import { GraphNodes, fetchNodes } from "./GraphNodes";
import { GraphEdges } from "./GraphEdges";

export async function Graph() {
    // Primeiro busca os nodes
    const nodes = await fetchNodes();

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold">Workflow Graph</h1>
                <p className="mt-1 text-sm text-gray-600">
                    Visualização dos nodes e suas conexões (edges)
                </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <div>
                    <Suspense fallback={<div>Carregando nodes...</div>}>
                        <GraphNodes />
                    </Suspense>
                </div>

                <div>
                    <Suspense fallback={<div>Carregando edges...</div>}>
                        <GraphEdges nodes={nodes} />
                    </Suspense>
                </div>
            </div>
        </div>
    );
}
