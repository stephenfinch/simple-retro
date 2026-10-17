import Link from "next/link";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-canvas px-4 text-center">
      <Logo />
      <div>
        <h1 className="text-2xl font-semibold">We couldn&apos;t find that page</h1>
        <p className="mt-1 text-muted-foreground">It may have been deleted, or the link is missing a part.</p>
      </div>
      <Button asChild size="lg">
        <Link href="/">Go home</Link>
      </Button>
    </div>
  );
}
