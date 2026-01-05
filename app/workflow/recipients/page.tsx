import Link from "next/link";
import { headers } from "next/headers";
import { bffGet } from "@/app/lib/bff/fetcher";
import { type NotificationRecipientDto } from "@/app/workflow/WorkflowTypes";
import RecipientsList from "./RecipientsList";

export default async function RecipientsPage() {
    const h = await headers();
    const cookie = h.get("cookie");
    const opts = cookie ? { headers: { cookie } } : undefined;

    const recipientsPayload = await bffGet<NotificationRecipientDto[]>(`/api/notification-recipients`, opts);
    const recipients = Array.isArray(recipientsPayload.data) ? recipientsPayload.data : [];

    return (
        <main className="min-h-screen px-3 py-4 sm:px-4 sm:py-6">
            <div className="mx-auto max-w-4xl">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Recebedores de Notificações</h1>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                            Gerencie os destinatários que podem receber notificações do sistema
                        </p>
                    </div>
                    <Link
                        href="/workflow"
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700"
                    >
                        ← Voltar
                    </Link>
                </div>

                <RecipientsList recipients={recipients} />
            </div>
        </main>
    );
}
