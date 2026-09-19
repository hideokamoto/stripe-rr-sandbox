/**
 * Creates a small sample catalog in Stripe so the AI chat commerce demo has
 * something to search and recommend. Safe to re-run — it skips products
 * whose name already exists in the account.
 *
 * Usage: npm run seed
 */
import "dotenv/config";
import Stripe from "stripe";

const SAMPLE_PRODUCTS = [
  {
    name: "トレイルランニングシューズ Alpha",
    description: "軽量メッシュアッパーと高グリップソールを備えたトレイル向けランニングシューズ。",
    unitAmount: 14800,
    metadata: { category: "footwear", use_case: "trail-running" },
  },
  {
    name: "シティスニーカー Nova",
    description: "通勤・通学にも使えるミニマルデザインの日常履きスニーカー。",
    unitAmount: 9800,
    metadata: { category: "footwear", use_case: "everyday" },
  },
  {
    name: "撥水トレッキングジャケット Ridge",
    description: "急な雨でも安心の撥水加工シェルジャケット。3シーズン対応。",
    unitAmount: 21800,
    metadata: { category: "outerwear", use_case: "hiking" },
  },
  {
    name: "ウルトラライトダウンベスト",
    description: "収納袋込みで携行性抜群の防寒ベスト。秋冬のレイヤードに。",
    unitAmount: 12800,
    metadata: { category: "outerwear", use_case: "cold-weather" },
  },
  {
    name: "ランニングウォッチ Pulse GPS",
    description: "GPS内蔵で心拍数・ペース・ルートを記録できるランニング向けスマートウォッチ。",
    unitAmount: 24800,
    metadata: { category: "electronics", use_case: "running" },
  },
  {
    name: "折りたたみ電動アシスト自転車 Compact-E",
    description: "都市部の移動に最適な軽量折りたたみ電動アシスト自転車。",
    unitAmount: 128000,
    metadata: { category: "mobility", use_case: "commute" },
  },
] as const;

async function main() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not set. Copy .env.example to .env first.");
  }

  const stripe = new Stripe(secretKey);

  const existing = await stripe.products.list({ limit: 100 });
  const existingNames = new Set(existing.data.map((p) => p.name));

  for (const item of SAMPLE_PRODUCTS) {
    if (existingNames.has(item.name)) {
      console.log(`skip (already exists): ${item.name}`);
      continue;
    }

    const product = await stripe.products.create({
      name: item.name,
      description: item.description,
      metadata: item.metadata,
    });

    const price = await stripe.prices.create({
      product: product.id,
      currency: "jpy",
      unit_amount: item.unitAmount,
    });

    await stripe.products.update(product.id, { default_price: price.id });

    console.log(`created: ${item.name} (${product.id}, ${price.id})`);
  }

  console.log(
    "\nDone. Stripe's Search API index can take up to ~1 minute to catch up on newly created products.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
