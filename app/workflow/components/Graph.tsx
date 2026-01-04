import { Suspense } from "react";
import { GraphNodes, fetchNodes } from "./GraphNodes";
import { fetchEdges } from "./GraphEdges";

async function GraphWithEdges() {
    const nodes = await fetchNodes();
    const nodeIds = nodes.map((n) => n.id);
    const edges = await fetchEdges(nodeIds);

    return <GraphNodes edges={edges} />;
}

export async function Graph() {
    return (
        <div>
            <Suspense fallback={
                <div className="animate-pulse space-y-4">
                    <div className="h-32 rounded bg-gray-200"></div>
                    <div className="h-32 rounded bg-gray-200"></div>
                    <div className="h-32 rounded bg-gray-200"></div>
                </div>
            }>
                <GraphWithEdges />
            </Suspense>
        </div>
    );
}
