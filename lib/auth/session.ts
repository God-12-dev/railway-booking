import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { UserRole } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "railconnect_session";
const SESSION_DAYS = 14;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: { sessionToken: hashToken(token), userId, expires },
  });
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function getSessionUser() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { sessionToken: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.expires <= new Date() || !session.user.isActive) {
    if (session) await prisma.session.delete({ where: { id: session.id } });
    return null;
  }
  const { user } = session;
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function requireRole(role: UserRole) {
  const user = await getSessionUser();
  if (!user || user.role !== role) throw new Error("FORBIDDEN");
  return user;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { sessionToken: hashToken(token) } });
    jar.delete(COOKIE_NAME);
  }
}
