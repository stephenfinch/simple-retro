import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { GoogleGenAI, ApiError as GeminiApiError } from "@google/genai";
import { z } from "zod/v4";
import { HttpError } from "./http";

/**
 * AI is optional. Set ANTHROPIC_API_KEY (Claude) or GEMINI_API_KEY (Gemini) to turn it on.
 * With both set, Claude is used unless AI_PROVIDER=gemini. AI_MODEL overrides the default model.
 */
type Provider = "anthropic" | "gemini";

export function aiProvider(): Provider | null {
  const hasClaude = !!process.env.ANTHROPIC_API_KEY;
  const hasGemini = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  const wanted = process.env.AI_PROVIDER?.toLowerCase();
  if (wanted === "gemini" && hasGemini) return "gemini";
  if ((wanted === "anthropic" || wanted === "claude") && hasClaude) return "anthropic";
  if (hasClaude) return "anthropic";
  if (hasGemini) return "gemini";
  return null;
}

export const aiEnabled = () => aiProvider() !== null;

const DEFAULT_MODEL: Record<Provider, string> = {
  anthropic: "claude-opus-5-5",
  // Google's alias for its current stable Flash model.
  gemini: "gemini-flash-latest",
};

const modelFor = (p: Provider) => process.env.AI_MODEL || DEFAULT_MODEL[p];

let anthropic: Anthropic | null = null;
let gemini: GoogleGenAI | null = null;

async function claudeJson<T extends z.ZodType>(schema: T, system: string, user: string): Promise<z.infer<T>> {
  anthropic ??= new Anthropic();
  try {
    const response = await anthropic.beta.messages.parse({
      model: modelFor("anthropic"),
      max_tokens: 16000,
      system,
      messages: [{ role: "user", content: user }],
      output_config: { format: betaZodOutputFormat(schema), effort: "low" },
    });
    if (response.stop_reason === "refusal") throw new HttpError(422, "The AI declined this request.");
    if (!response.parsed_output) throw new HttpError(502, "The AI returned an unexpected response.");
    return response.parsed_output as z.infer<T>;
  } catch (e) {
    if (e instanceof HttpError) throw e;
    if (e instanceof Anthropic.RateLimitError) throw new HttpError(429, "The AI is busy. Try again in a moment.");
    if (e instanceof Anthropic.AuthenticationError) throw new HttpError(503, "The ANTHROPIC_API_KEY is invalid.");
    if (e instanceof Anthropic.APIError) throw new HttpError(502, `The AI request failed (${e.status ?? "network"}).`);
    throw e;
  }
}

/** JSON Schema for Gemini, without the "$schema" key it doesn't need. */
function jsonSchema(schema: z.ZodType) {
  const out = z.toJSONSchema(schema) as Record<string, unknown>;
  delete out.$schema;
  return out;
}

async function geminiJson<T extends z.ZodType>(schema: T, system: string, user: string): Promise<z.infer<T>> {
  gemini ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY });
  try {
    const response = await gemini.models.generateContent({
      model: modelFor("gemini"),
      contents: user,
      config: {
        systemInstruction: system,
        responseMimeType: "application/json",
        responseJsonSchema: jsonSchema(schema),
      },
    });
    const parsed = schema.safeParse(JSON.parse(response.text ?? "null"));
    if (!parsed.success) throw new HttpError(502, "The AI returned an unexpected response.");
    return parsed.data as z.infer<T>;
  } catch (e) {
    if (e instanceof HttpError) throw e;
    if (e instanceof SyntaxError) throw new HttpError(502, "The AI returned an unexpected response.");
    if (e instanceof GeminiApiError) {
      if (e.status === 429) throw new HttpError(429, "The AI is busy. Try again in a moment.");
      if (e.status === 400 && /api key/i.test(e.message)) throw new HttpError(503, "The GEMINI_API_KEY is invalid.");
      if (e.status === 401 || e.status === 403) throw new HttpError(503, "The GEMINI_API_KEY is invalid.");
      throw new HttpError(502, `The AI request failed (${e.status}).`);
    }
    throw e;
  }
}

/** One structured-output call to whichever provider is configured, validated against the Zod schema. */
export async function aiJson<T extends z.ZodType>(schema: T, system: string, user: string): Promise<z.infer<T>> {
  const provider = aiProvider();
  if (!provider) throw new HttpError(503, "AI isn't set up. Add ANTHROPIC_API_KEY or GEMINI_API_KEY to turn it on.");
  return provider === "gemini" ? geminiJson(schema, system, user) : claudeJson(schema, system, user);
}

export { z };
