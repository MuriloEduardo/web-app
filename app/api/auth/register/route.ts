import bcrypt from "bcrypt";
import { NextResponse } from "next/server";

import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      email?: string;
      phone_number?: string;
      password?: string;
      name?: string;
    };

    const email = (body.email ?? "").trim().toLowerCase();
    const phone_number = body.phone_number?.trim() || null;
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
      data: { email, phone_number, passwordHash, name },
      select: { id: true, email: true, phone_number: true, name: true },
    });

    return NextResponse.json({ ok: true, user }, { status: 201 });
  } catch (error: unknown) {
    const maybePrismaError = error as { code?: unknown } | null;

    if (maybePrismaError?.code === "P2002") {
      return NextResponse.json(
        { ok: false, error: "Email já cadastrado" },
        { status: 409 },
      );
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
