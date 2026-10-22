import { z } from "zod";

/**
 * Admin-editable numbers the app can't read from any API: Gemini prices per model (Google has
 * no API for these, and its pages disagree), the monthly AI budget, and fixed plan costs.
 * Stored as one row per key in `admin_settings`; missing keys fall back to these defaults.
 */
export const ModelPriceSchema = z.object({
  /** USD per 1M input tokens */
  input: z.number().min(0),
  /** USD per 1M output tokens (thinking tokens included) */
  output: z.number().min(0),
});

export const AdminSettingsSchema = z.object({
  gemini_prices: z.record(z.string(), ModelPriceSchema),
  gemini_monthly_budget_usd: z.number().min(0),
  supabase_plan: z.object({
    name: z.string().max(60),
    monthly_usd: z.number().min(0),
    db_limit_mb: z.number().min(1),
  }),
  hosting: z.object({
    name: z.string().max(60),
    monthly_usd: z.number().min(0),
  }),
  usd_to_inr: z.number().min(0),
});

export type AdminSettings = z.infer<typeof AdminSettingsSchema>;
export type ModelPrice = z.infer<typeof ModelPriceSchema>;

// Check https://ai.google.dev/gemini-api/docs/pricing and edit on the admin page.
// gemini-3-flash-preview is from the official page (Oct 2026); the other two are estimates.
export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  gemini_prices: {
    "gemini-3-flash-preview": { input: 0.5, output: 3 },
    "gemini-3.5-flash": { input: 1.5, output: 9 },
    "gemini-2.5-flash": { input: 0.3, output: 2.5 },
  },
  gemini_monthly_budget_usd: 10,
  supabase_plan: { name: "Free", monthly_usd: 0, db_limit_mb: 500 },
  hosting: { name: "Self-hosted", monthly_usd: 0 },
  usd_to_inr: 88,
};

/** Defaults overlaid with whatever valid keys are stored */
export function mergeSettings(rows: { key: string; value: unknown }[]): AdminSettings {
  const merged: AdminSettings = structuredClone(DEFAULT_ADMIN_SETTINGS);
  for (const row of rows) {
    const field = AdminSettingsSchema.shape[row.key as keyof AdminSettings];
    if (!field) continue;
    const parsed = field.safeParse(row.value);
    if (parsed.success) (merged as Record<string, unknown>)[row.key] = parsed.data;
  }
  return merged;
}

/** USD cost of one Gemini call; unknown models are priced at the most expensive known rate */
export function tokenCostUsd(
  prices: Record<string, ModelPrice>,
  model: string | null | undefined,
  inputTokens: number,
  outputTokens: number
): number {
  const known = Object.values(prices);
  const price =
    (model && prices[model]) ||
    (known.length
      ? known.reduce((a, b) => (a.input + a.output >= b.input + b.output ? a : b))
      : { input: 0, output: 0 });
  return (inputTokens / 1e6) * price.input + (outputTokens / 1e6) * price.output;
}
