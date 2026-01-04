"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function ProgressBar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [active, setActive] = useState(false);
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inflight = useRef(0);

    function begin() {
        inflight.current += 1;
        if (!active) setActive(true);
    }

    function end() {
        inflight.current = Math.max(0, inflight.current - 1);
        if (inflight.current === 0) {
            if (hideTimer.current) clearTimeout(hideTimer.current);
            hideTimer.current = setTimeout(() => {
                setActive(false);
            }, 300);
        }
    }

    useEffect(() => {
        if (typeof window === "undefined") return undefined;
        const originalFetch = window.fetch;
        if ((originalFetch as unknown as { __withProgress?: boolean }).__withProgress) {
            return undefined;
        }

        const wrappedFetch: typeof window.fetch & { __withProgress?: boolean } = async (
            input: RequestInfo | URL,
            init?: RequestInit
        ) => {
            begin();
            try {
                return await originalFetch(input as RequestInfo, init);
            } finally {
                end();
            }
        };
        wrappedFetch.__withProgress = true;
        window.fetch = wrappedFetch;

        return () => {
            window.fetch = originalFetch;
            if (hideTimer.current) clearTimeout(hideTimer.current);
            inflight.current = 0;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        // Ensure route transitions also show feedback, even if cached.
        begin();
        const t = setTimeout(() => end(), 400);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname, searchParams?.toString()]);

    if (!active) return null;

    return (
        <div className="pointer-events-none fixed left-0 right-0 top-0 z-[120] h-0.5 bg-transparent">
            <div className="h-full w-full bg-progress-gradient animate-progress" />
        </div>
    );
}
