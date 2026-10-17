import Link from "next/link";
import { LoginForm } from "@/components/auth-forms";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const n = typeof next === "string" ? next : undefined;
  return (
    <>
      <h1 className="mb-1 text-xl font-semibold">Welcome back</h1>
      <p className="mb-6 text-sm text-muted-foreground">Sign in to see your team and your retros.</p>
      <LoginForm next={n} />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link href={`/signup${n ? `?next=${encodeURIComponent(n)}` : ""}`} className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </>
  );
}
