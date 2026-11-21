"use server";

import argon2 from "argon2";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession } from "@/lib/auth/session";
import { loginSchema, registerSchema } from "@/lib/auth/schemas";

const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000;
export type AuthActionState = { error?: string };

async function assertRateLimit(email: string) {
  const since = new Date(Date.now() - WINDOW_MS);
  await prisma.authAttempt.deleteMany({ where: { attemptedAt: { lt: since } } });
  const attempts = await prisma.authAttempt.count({ where: { emailKey: email, attemptedAt: { gte: since } } });
  if (attempts >= MAX_ATTEMPTS) throw new Error("Too many attempts. Try again in 15 minutes.");
}

export async function registerAction(_previousState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Please enter a valid name, email, and password (12 characters minimum)." };
  const { name, email, password } = parsed.data;
  let userId: string;
  try {
    await assertRateLimit(email);
    await prisma.authAttempt.create({ data: { emailKey: email } });
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) return { error: "Unable to create account with these details." };
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const user = await prisma.user.create({ data: { name, email, passwordHash } });
    userId = user.id;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Too many attempts")) return { error: error.message };
    return { error: "We could not create your account. Please try again." };
  }
  await createSession(userId);
  redirect("/dashboard");
}

export async function loginAction(_previousState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid email or password." };
  const { email, password } = parsed.data;
  let userId: string;
  try {
    await assertRateLimit(email);
    const user = await prisma.user.findUnique({ where: { email } });
    const verified = user ? await argon2.verify(user.passwordHash, password).catch(() => false) : false;
    if (!user || !user.isActive || !verified) {
      await prisma.authAttempt.create({ data: { emailKey: email, userId: user?.id } });
      return { error: "Invalid email or password." };
    }
    await prisma.authAttempt.deleteMany({ where: { emailKey: email } });
    userId = user.id;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Too many attempts")) return { error: error.message };
    return { error: "Sign in is temporarily unavailable. Please try again." };
  }
  await createSession(userId);
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
