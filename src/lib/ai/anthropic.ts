import Anthropic from "@anthropic-ai/sdk";

/**
 * Returns a configured Anthropic client, or null when no API key is set.
 * Callers should treat null as "AI unavailable" and fall back gracefully.
 */
export function getAnthropic(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

// Override with the ANTHROPIC_MODEL env var if this string ever changes.
export const AI_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
