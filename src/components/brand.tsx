import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden>
      <defs>
        <linearGradient id="sr-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6D5DF6" />
          <stop offset="1" stopColor="#F2706B" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#sr-g)" />
      <path d="M10.5 12.5a7 7 0 1 1-1.2 7.4" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M7.6 9.6l3 3.1-3.6 1.4" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16.5" cy="16.5" r="2.2" fill="#fff" />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <LogoMark />
      <span className="text-[17px]">
        Simple <span className="text-primary">Retro</span>
      </span>
    </Link>
  );
}
