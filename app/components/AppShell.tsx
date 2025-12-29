"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function isActive(pathname: string, href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
}

export default function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname() || "/";

    const hideNav = pathname === "/" || pathname === "/login" || pathname === "/register";

    return (
        <div className={hideNav ? "min-h-screen" : "min-h-screen pb-20"}>
            {children}

            {hideNav ? null : (
                <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white px-4 py-3 dark:bg-black">
                    <div className="mx-auto flex w-full max-w-3xl items-center gap-2">
                        <Link
                            href="/conversas"
                            className={
                                "flex-1 rounded px-3 py-2 text-center text-sm font-medium " +
                                (isActive(pathname, "/conversas")
                                    ? "text-black dark:text-white"
                                    : "text-zinc-500 dark:text-zinc-400")
                            }
                        >
                            Conversas
                        </Link>
                        <Link
                            href="/configuracoes"
                            className={
                                "flex-1 rounded px-3 py-2 text-center text-sm font-medium " +
                                (isActive(pathname, "/configuracoes")
                                    ? "text-black dark:text-white"
                                    : "text-zinc-500 dark:text-zinc-400")
                            }
                        >
                            Configurações
                        </Link>
                    </div>
                </nav>
            )}
        </div>
    );
}
