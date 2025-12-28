import { ChatClient } from "./ChatClient";

export const dynamic = "force-dynamic";

function getBaseUrlFromEnv(): string {
    const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl) return appUrl.replace(/\/$/, "");

    const vercelUrl = process.env.VERCEL_URL;
    if (vercelUrl) return `https://${vercelUrl}`;

    return "http://localhost:3000";
}

async function getInitialMessages() {
    const res = await fetch(`${getBaseUrlFromEnv()}/api/messages`, {
        cache: 'default',
    });

    if (!res.ok) {
        return { data: [] } as { data: unknown[] };
    }

    return res.json();
}

export default async function ChatPage() {
    const { data } = await getInitialMessages();

    return <ChatClient initialMessages={Array.isArray(data) ? data : []} />;
}
