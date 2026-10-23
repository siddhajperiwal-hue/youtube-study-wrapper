/** A logged generation error caused by the AI provider's quota / rate limit (HTTP 429), not by the video */
export const isQuotaError = (error: string | null | undefined) =>
  !!error && /\b429\b|RESOURCE_EXHAUSTED|quota|rate.?limit/i.test(error);

/** Every model in the cascade was out of quota or rate limited: retry later, don't count it against the video */
export class RateLimitError extends Error {
  name = "RateLimitError";
}
