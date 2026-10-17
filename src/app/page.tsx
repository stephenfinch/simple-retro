import Link from "next/link";
import { redirect } from "next/navigation";
import { ListChecks, MessagesSquare, PenLine, Vote } from "lucide-react";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/server/auth";

const STEPS = [
  { icon: PenLine, title: "Write", text: "Everyone jots down thoughts on their own, in private." },
  { icon: Vote, title: "Group and vote", text: "Put similar thoughts together and pick what matters most." },
  { icon: MessagesSquare, title: "Talk it through", text: "Discuss the top topics one at a time." },
  { icon: ListChecks, title: "Decide", text: "Agree on a few next steps and check them off next time." },
];

export default async function Landing() {
  const user = await getCurrentUser();
  if (user && !user.isGuest) redirect("/home");
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <Button asChild variant="ghost" size="lg">
          <Link href="/login">Sign in</Link>
        </Button>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center px-4 pt-12 pb-20 text-center sm:px-6 sm:pt-20">
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">Look back together. Decide what to change.</h1>
        <p className="mt-5 max-w-xl text-lg text-muted-foreground text-balance">
          Simple Retro is a calm, friendly place for a team, or a couple, to reflect on the last few weeks. No training needed.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="xl">
            <Link href="/signup">Start your first retro</Link>
          </Button>
          <Button asChild size="xl" variant="outline">
            <Link href="/login">I have an account</Link>
          </Button>
        </div>
        <ol className="mt-16 grid w-full gap-4 text-left sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-2xl border bg-card p-5 shadow-xs">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <s.icon className="size-5" />
                </span>
                <span className="text-xs font-medium text-muted-foreground">Step {i + 1}</span>
              </div>
              <h2 className="font-semibold">{s.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
      </main>
      <footer className="py-6 text-center text-xs text-muted-foreground">Open source and self-hostable.</footer>
    </div>
  );
}
