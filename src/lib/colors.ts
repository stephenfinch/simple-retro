import type { ColumnColor } from "./types";

/** Tailwind classes for each column color. Written out in full so Tailwind can find them. */
export const COLUMN_STYLES: Record<ColumnColor, { dot: string; soft: string; border: string; text: string; bar: string }> = {
  green: {
    dot: "bg-emerald-500",
    soft: "bg-emerald-50/70 dark:bg-emerald-500/[0.07]",
    border: "border-emerald-200/80 dark:border-emerald-400/20",
    text: "text-emerald-700 dark:text-emerald-300",
    bar: "before:bg-emerald-400",
  },
  red: {
    dot: "bg-rose-500",
    soft: "bg-rose-50/70 dark:bg-rose-500/[0.07]",
    border: "border-rose-200/80 dark:border-rose-400/20",
    text: "text-rose-700 dark:text-rose-300",
    bar: "before:bg-rose-400",
  },
  blue: {
    dot: "bg-sky-500",
    soft: "bg-sky-50/70 dark:bg-sky-500/[0.07]",
    border: "border-sky-200/80 dark:border-sky-400/20",
    text: "text-sky-700 dark:text-sky-300",
    bar: "before:bg-sky-400",
  },
  amber: {
    dot: "bg-amber-500",
    soft: "bg-amber-50/70 dark:bg-amber-500/[0.07]",
    border: "border-amber-200/80 dark:border-amber-400/20",
    text: "text-amber-700 dark:text-amber-300",
    bar: "before:bg-amber-400",
  },
  violet: {
    dot: "bg-violet-500",
    soft: "bg-violet-50/70 dark:bg-violet-500/[0.07]",
    border: "border-violet-200/80 dark:border-violet-400/20",
    text: "text-violet-700 dark:text-violet-300",
    bar: "before:bg-violet-400",
  },
  pink: {
    dot: "bg-pink-500",
    soft: "bg-pink-50/70 dark:bg-pink-500/[0.07]",
    border: "border-pink-200/80 dark:border-pink-400/20",
    text: "text-pink-700 dark:text-pink-300",
    bar: "before:bg-pink-400",
  },
};
