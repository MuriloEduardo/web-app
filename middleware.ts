import { withAuth } from "next-auth/middleware";

export default withAuth({
    pages: {
        signIn: "/login",
    },
});

export const config = {
    matcher: [
        "/dashboard/:path*",
        "/conversas/:path*",
        "/configuracoes/:path*",
        "/api/sessions/:path*",
        "/api/messages/:path*",
    ],
};
