import { redirect } from "next/navigation";

export default async function LegacyWorkflowNodePage({
    params,
}: {
    params: Promise<{ nodeId: string }>;
}) {
    const { nodeId } = await params;
    redirect(`/workflow/nodes/${nodeId}`);
}
