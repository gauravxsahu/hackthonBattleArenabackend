import { env } from "../config/env";
import { logger } from "../utils/logger";

/**
 * Thin wrapper around OpenAI's Chat Completions endpoint. Callers pass a
 * system prompt instructing "respond with JSON only" and get back the raw
 * parsed JSON (or throw) — no library-specific validation happens here,
 * that's the job of src/utils/validation/aiResponses.ts (hand-rolled, no
 * Zod) once the caller has this raw object.
 */

export interface AIJsonRequest {
  system: string;
  prompt: string;
  maxTokens?: number;
}

function extractJsonBlock(text: string): string {
  // Strip markdown code fences if the model wrapped its JSON in ```json ... ```
  const fenced = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(text);
  return fenced ? fenced[1] : text;
}

export async function requestAIJson({ system, prompt, maxTokens = 1024 }: AIJsonRequest): Promise<unknown> {
  if (!env.aiApiKey) {
    throw new Error("AI_API_KEY is not configured");
  }

  const response = await fetch(env.aiApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.aiApiKey}`,
    },
    body: JSON.stringify({
      model: env.aiModel,
      // OpenAI standardized on `max_completion_tokens` across the Chat
      // Completions API (the older `max_tokens` param is rejected by
      // newer models) — see the error this replaced:
      // "Unsupported parameter: 'max_tokens' ... Use 'max_completion_tokens' instead."
      max_completion_tokens: maxTokens,
      // Ask OpenAI to guarantee a JSON object back (supported on gpt-4o /
      // gpt-4-turbo / gpt-3.5-turbo-1106+; harmless to omit on older models
      // that ignore unknown fields, but keep the markdown-fence fallback
      // below regardless).
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`AI API request failed (${response.status}): ${body.slice(0, 300)}`);
  }

  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const textBlock = data.choices?.[0]?.message?.content;
  if (!textBlock) {
    throw new Error("AI API response contained no text content");
  }

  try {
    return JSON.parse(extractJsonBlock(textBlock));
  } catch (err) {
    logger.error("Failed to parse AI JSON response", { text: textBlock.slice(0, 500) });
    throw new Error("AI API returned malformed JSON");
  }
}