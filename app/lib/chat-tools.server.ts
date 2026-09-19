import { tool, type ToolSet } from "ai";
import { z } from "zod";
import { searchStoreProducts } from "./stripe.server";
import { runJevEvaluation } from "./workers-ai.server";

const searchProducts = tool({
  description:
    "Stripe Search API (Stripe Search Query Language) を使って店舗のStripe商品カタログを検索する。" +
    "query は Stripe のクエリ構文で書くこと。対応フィールド: name, description, active, shippable, url, metadata['key']。" +
    "演算子: ~ (部分一致、text系フィールド), : (完全一致、bool/select系フィールド), AND/OR (同一クエリ内で混在不可), - (否定)。" +
    "商品が有効なものだけを探す場合は active:'true' を含めること。" +
    "例: \"active:'true' AND name~'シューズ'\"",
  inputSchema: z.object({
    query: z
      .string()
      .describe("Stripe Search Query Language に従った検索クエリ"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(10)
      .optional()
      .describe("取得する商品数の上限 (デフォルト5件)"),
  }),
  execute: async ({ query, limit }) => {
    const products = await searchStoreProducts(query, limit ?? 5);
    return {
      count: products.length,
      products: products.map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        priceJpy: product.price?.unitAmount ?? null,
        currency: product.price?.currency ?? null,
        metadata: product.metadata,
      })),
    };
  },
});

const assessPurchaseIntent = tool({
  description:
    "typesafe/jev (Workers AI の構造化評価モデル) を使って、会話の直近の文脈から" +
    "購入意欲の強さと、人間の販売担当へのエスカレーションが必要かどうかを評価する。" +
    "商品を複数提示した後や、ユーザーが価格・在庫・購入手順について質問したときに呼び出すと良い。",
  inputSchema: z.object({
    conversationSummary: z
      .string()
      .describe("これまでの会話内容の短い要約 (日本語で1〜3文)"),
    productsShown: z
      .number()
      .int()
      .min(0)
      .describe("これまでにユーザーへ提示した商品の件数"),
    userSignals: z
      .array(z.string())
      .describe(
        "購入意欲を示す/示さないユーザーの発言や行動の箇条書き (例: '価格を2回質問した', '在庫を確認した')",
      ),
  }),
  execute: async ({ conversationSummary, productsShown, userSignals }) => {
    const result = await runJevEvaluation({
      state: {
        conversation_summary: conversationSummary,
        products_shown: productsShown,
        user_signals: userSignals,
      },
      questions: {
        purchase_intent: {
          type: "score",
          instructions:
            "このユーザーは今すぐ購入する意欲がどれくらい強いか?",
          criteria: [
            "低: 情報収集段階で購入の兆候がない",
            "中: 価格や仕様への具体的な関心を示している",
            "高: 購入方法や在庫、決済について明確に質問している",
          ],
        },
        needs_human_handoff: {
          type: "noul",
          instructions:
            "このユーザーは人間の販売担当に引き継ぐべきか? (複雑な要望、クレーム、大口購入の兆候など)",
          criteria: {
            true: "AIチャットでは対応が難しい複雑さ・リスクがある",
            false: "AIチャットのまま案内を継続できる",
          },
        },
      },
    });

    return {
      purchaseIntent: result.answers.purchase_intent,
      needsHumanHandoff: result.answers.needs_human_handoff,
    };
  },
});

export const chatTools = {
  searchProducts,
  assessPurchaseIntent,
} satisfies ToolSet;
