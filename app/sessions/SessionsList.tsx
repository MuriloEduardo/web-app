import Link from "next/link";

type Props = {
    sessions: number[];
    selectedSessionId?: number;
};

export function SessionsList({ sessions, selectedSessionId }: Props) {
    return (
        <div className="flex flex-col gap-2">
            <div className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                Sessões
            </div>
            <div className="flex flex-col gap-1">
                {sessions.map((id) => {
                    const selected = id === selectedSessionId;
                    return (
                        <Link
                            key={id}
                            href={`/sessions/${id}`}
                            className={
                                selected
                                    ? "rounded-md bg-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                                    : "rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900"
                            }
                        >
                            Session {id}
                        </Link>
                    );
                })}

                {sessions.length === 0 && (
                    <div className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
                        Nenhuma sessão encontrada.
                    </div>
                )}
            </div>
        </div>
    );
}
