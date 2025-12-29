import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt";

import { prisma } from "@/app/lib/prisma";

export const authOptions: NextAuthOptions = {
    providers: [
        Credentials({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Senha", type: "password" },
            },
            async authorize(credentials) {
                const email = credentials?.email;
                const password = credentials?.password;

                if (!email || !password) return null;

                const user = await prisma.user.findUnique({ where: { email } });
                if (!user) return null;

                const isValid = await bcrypt.compare(password, user.passwordHash);
                if (!isValid) return null;

                return {
                    id: user.id,
                    name: user.name ?? undefined,
                    email: user.email,
                };
            },
        }),
    ],
    session: { strategy: "jwt" },
    pages: { signIn: "/login" },
    secret: process.env.NEXTAUTH_SECRET,
};
