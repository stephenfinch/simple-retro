"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { createSession, createUser, destroySession, findUserByEmail, getCurrentUser, hashPassword, safeNext, verifyPassword } from "@/server/auth";

export type FormState = { error?: string } | undefined;

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function signupAction(_: FormState, form: FormData): Promise<FormState> {
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!name) return { error: "Please enter your name" };
  if (!EMAIL.test(email)) return { error: "Please enter a valid email address" };
  if (password.length < 8) return { error: "Your password needs at least 8 characters" };
  const existing = await findUserByEmail(email);
  if (existing?.passwordHash) return { error: "There's already an account with this email. Try signing in." };
  const current = await getCurrentUser();
  let userId: string;
  if (existing) {
    // an account whose password the host cleared: let its owner set a new one
    await db.update(schema.users).set({ name, passwordHash: await hashPassword(password) }).where(eq(schema.users.id, existing.id));
    userId = existing.id;
  } else if (current?.isGuest) {
    // keep the cards and votes they made as a guest
    await db.update(schema.users).set({ name, email, passwordHash: await hashPassword(password), isGuest: false }).where(eq(schema.users.id, current.id));
    userId = current.id;
  } else {
    userId = (await createUser({ email, name, password })).id;
  }
  await createSession(userId);
  redirect(safeNext(form.get("next")));
}

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const user = await findUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.passwordHash))) return { error: "That email and password don't match" };
  await createSession(user.id);
  redirect(safeNext(form.get("next")));
}

export async function guestAction(_: FormState, form: FormData): Promise<FormState> {
  const name = String(form.get("name") ?? "").trim();
  const retroId = String(form.get("retroId") ?? "");
  if (!name) return { error: "Please enter your name" };
  const user = await createUser({ name, isGuest: true });
  await createSession(user.id);
  redirect(`/r/${retroId}`);
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
