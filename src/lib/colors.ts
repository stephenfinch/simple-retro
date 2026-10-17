import type { ColumnColor } from "./types";

/** Tailwind classes for each column color. Written out in full so Tailwind can find them.
 * `note` sets the sticky-note color (--note) and the title highlighter (--hl) for the column. */
export const COLUMN_STYLES: Record<ColumnColor, { dot: string; soft: string; border: string; text: string; bar: string; note: string }> = {
  green: {
    dot: "bg-emerald-500",
    soft: "bg-emerald-50/70 dark:bg-emerald-500/[0.07]",
    border: "border-emerald-200/80 dark:border-emerald-400/20",
    text: "text-emerald-700 dark:text-emerald-300",
    bar: "before:bg-emerald-400",
    note: "[--note:#d7f5bd] [--hl:#b5ea8a] dark:[--note:oklch(0.32_0.05_140)] dark:[--hl:oklch(0.45_0.09_140)]",
  },
  red: {
    dot: "bg-rose-500",
    soft: "bg-rose-50/70 dark:bg-rose-500/[0.07]",
    border: "border-rose-200/80 dark:border-rose-400/20",
    text: "text-rose-700 dark:text-rose-300",
    bar: "before:bg-rose-400",
    note: "[--note:#ffd5df] [--hl:#ffb0c3] dark:[--note:oklch(0.32_0.05_10)] dark:[--hl:oklch(0.45_0.1_10)]",
  },
  blue: {
    dot: "bg-sky-500",
    soft: "bg-sky-50/70 dark:bg-sky-500/[0.07]",
    border: "border-sky-200/80 dark:border-sky-400/20",
    text: "text-sky-700 dark:text-sky-300",
    bar: "before:bg-sky-400",
    note: "[--note:#fff3a3] [--hl:#ffe45c] dark:[--note:oklch(0.33_0.05_95)] dark:[--hl:oklch(0.47_0.09_95)]",
  },
  amber: {
    dot: "bg-amber-500",
    soft: "bg-amber-50/70 dark:bg-amber-500/[0.07]",
    border: "border-amber-200/80 dark:border-amber-400/20",
    text: "text-amber-700 dark:text-amber-300",
    bar: "before:bg-amber-400",
    note: "[--note:#ffe2bd] [--hl:#ffc77a] dark:[--note:oklch(0.33_0.05_65)] dark:[--hl:oklch(0.47_0.09_65)]",
  },
  violet: {
    dot: "bg-violet-500",
    soft: "bg-violet-50/70 dark:bg-violet-500/[0.07]",
    border: "border-violet-200/80 dark:border-violet-400/20",
    text: "text-violet-700 dark:text-violet-300",
    bar: "before:bg-violet-400",
    note: "[--note:#e6dcff] [--hl:#cdb8ff] dark:[--note:oklch(0.31_0.05_295)] dark:[--hl:oklch(0.45_0.1_295)]",
  },
  pink: {
    dot: "bg-pink-500",
    soft: "bg-pink-50/70 dark:bg-pink-500/[0.07]",
    border: "border-pink-200/80 dark:border-pink-400/20",
    text: "text-pink-700 dark:text-pink-300",
    bar: "before:bg-pink-400",
    note: "[--note:#ffd8f0] [--hl:#ffb3e1] dark:[--note:oklch(0.32_0.05_350)] dark:[--hl:oklch(0.45_0.1_350)]",
  },
};
