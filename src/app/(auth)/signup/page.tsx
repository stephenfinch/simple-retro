import Link from "next/link";
import { SignupForm } from "@/components/auth-forms";
import { getCurrentUser } from "@/server/auth";

export const metadata = { title: "Create an account" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const { next } = await searchParams;
  const n = typeof next === "string" ? next : undefined;
  const user = await getCurrentUser();
  return (
    <>
      <h1 className="mb-1 text-xl font-semibold">Create your account</h1>
      <p className="mb-6 text-sm text-muted-foreground">It takes a minute. Then you can start your first retro.</p>
      <SignupForm next={n} name={user?.isGuest ? user.name : undefined} />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href={`/login${n ? `?next=${encodeURIComponent(n)}` : ""}`} className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
