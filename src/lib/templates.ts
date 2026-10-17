import type { Column, ColumnColor } from "./types";

export type Template = {
  key: string;
  name: string;
  blurb: string;
  columns: Omit<Column, "id">[];
};

const col = (title: string, prompt: string, color: ColumnColor) => ({ title, prompt, color });

export const TEMPLATES: Template[] = [
  {
    key: "classic",
    name: "Went well · To improve · Ideas",
    blurb: "The classic. Works for any team.",
    columns: [
      col("Went well", "What should we keep doing?", "green"),
      col("To improve", "What got in the way?", "red"),
      col("Ideas", "What could we try next?", "blue"),
    ],
  },
  {
    key: "couple",
    name: "Check-in for two",
    blurb: "For couples and close partners. Gentle and honest.",
    columns: [
      col("I appreciated", "Something your partner did that meant a lot", "pink"),
      col("I struggled with", "Something that was hard for you lately", "amber"),
      col("I'd love for us to", "Something to try, plan or look forward to", "violet"),
    ],
  },
  {
    key: "start-stop-continue",
    name: "Start · Stop · Continue",
    blurb: "Quick and action focused.",
    columns: [
      col("Start", "What should we begin doing?", "green"),
      col("Stop", "What should we stop doing?", "red"),
      col("Continue", "What is working that we should keep?", "blue"),
    ],
  },
  {
    key: "mad-sad-glad",
    name: "Mad · Sad · Glad",
    blurb: "Talk about how the time felt.",
    columns: [
      col("Mad", "What frustrated you?", "red"),
      col("Sad", "What disappointed you?", "blue"),
      col("Glad", "What made you happy?", "green"),
    ],
  },
  {
    key: "rose-bud-thorn",
    name: "Rose · Bud · Thorn",
    blurb: "Highlights, potential and pain points.",
    columns: [
      col("Rose", "A highlight or success", "pink"),
      col("Bud", "Something new that could grow", "green"),
      col("Thorn", "A challenge or pain point", "amber"),
    ],
  },
  {
    key: "four-ls",
    name: "Liked · Learned · Lacked · Longed for",
    blurb: "A fuller look back after a big stretch of work.",
    columns: [
      col("Liked", "What did you enjoy?", "green"),
      col("Learned", "What did you learn?", "blue"),
      col("Lacked", "What was missing?", "amber"),
      col("Longed for", "What do you wish we had?", "violet"),
    ],
  },
];

export const DEFAULT_TEMPLATE = TEMPLATES[0];

export function templateByKey(key: string | null | undefined) {
  return TEMPLATES.find((t) => t.key === key) ?? DEFAULT_TEMPLATE;
}
