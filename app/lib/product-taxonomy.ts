/**
 * Single source of truth for the product categories used both when seeding
 * sample Stripe products (scripts/seed-products.ts) and when classifying a
 * user's request into a Stripe Search API query (app/lib/shopping-assistant.server.ts).
 * Keeping them in one place avoids the category taxonomy drifting apart.
 */
export const PRODUCT_CATEGORIES = {
  footwear: "靴・シューズ",
  outerwear: "アウター・ジャケット類",
  electronics: "電子機器・ガジェット",
  mobility: "移動手段 (自転車など)",
} as const;

export type ProductCategory = keyof typeof PRODUCT_CATEGORIES;
