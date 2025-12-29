import bcrypt from "bcrypt";
import { NextResponse } from "next/server";

import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      email?: string;
      password?: string;
      name?: string;
    };

    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";
    const name = body.name?.trim() || null;

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "Email e senha são obrigatórios" },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { email, passwordHash, name },
      select: { id: true, email: true, name: true },
    });

    return NextResponse.json({ ok: true, user }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { ok: false, error: "Email já cadastrado" },
        { status: 409 },
      );
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
