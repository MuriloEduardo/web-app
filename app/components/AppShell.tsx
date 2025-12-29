"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
    HomeIcon,
    Cog6ToothIcon,
    ChatBubbleBottomCenterIcon
} from "@heroicons/react/24/solid";

function isActive(pathname: string, href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
}

export default function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname() || "/";

    const isConversationDetail = /^\/conversas\/[^/]+$/.test(pathname);
    const hideNav =
        pathname === "/" ||
        pathname === "/login" ||
        pathname === "/register" ||
        isConversationDetail;

    return (
        <div className="min-h-screen">
            {children}

            {hideNav ? null : (
                <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white px-4 py-3 dark:bg-black">
                    <div className="mx-auto flex w-full max-w-3xl items-center gap-2">
                        <Link
                            href="/dashboard"
                            className={
                                "flex-1 rounded px-3 py-2 text-center text-sm font-medium " +
                                (isActive(pathname, "/dashboard")
                                    ? "opacity-25"
                                    : "")
                            }
                        >
                            <HomeIcon className="mx-auto h-5 w-5" />
                        </Link>
                        <Link
                            href="/conversas"
                            className={
                                "flex-1 rounded px-3 py-2 text-center text-sm font-medium " +
                                (isActive(pathname, "/conversas")
                                    ? "opacity-25"
                                    : "")
                            }
                        >
                            <ChatBubbleBottomCenterIcon className="mx-auto h-5 w-5" />
                        </Link>
                        <Link
                            href="/configuracoes"
                            className={
                                "flex-1 rounded px-3 py-2 text-center text-sm font-medium " +
                                (isActive(pathname, "/configuracoes")
                                    ? "opacity-25"
                                    : "")
                            }
                        >
                            <Cog6ToothIcon className="mx-auto h-5 w-5" />
                        </Link>
                    </div>
                </nav>
            )}
        </div>
    );
}
