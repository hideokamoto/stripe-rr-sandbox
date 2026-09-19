import { PRODUCT_CATEGORIES, type ProductCategory } from "./product-taxonomy";
import { searchStoreProducts, type StoreProduct } from "./stripe.server";
import { runJevEvaluation, type JevQuestion } from "./workers-ai.server";

export interface RankedCandidate {
  id: string;
  name: string;
  description: string | null;
  priceJpy: number | null;
  currency: string | null;
  /** 0-1 fit score from jev; internal ranking signal, not shown to the shopper. */
  fitScore: number;
}

export interface ShoppingPipelineResult {
  category: ProductCategory | "other";
  categoryConfidence: number;
  query: string;
  candidates: RankedCandidate[];
  needsHumanHandoff: { value: boolean; confidence: number };
}

/**
 * Step 1: classify the user's free-text request into one of the fixed
 * product categories we actually store in Stripe product metadata.
 * jev's Choice type is a calibrated classifier over a known label set,
 * which is a better fit for this than asking gpt-oss to freehand a
 * Stripe Search Query Language string (which is easy to get syntactically
 * wrong: mixed AND/OR, wrong operator for a field, etc).
 */
async function classifyCategory(
  userText: string,
): Promise<{ category: ProductCategory | "other"; confidence: number }> {
  const result = await runJevEvaluation({
    state: { user_message: userText },
    questions: {
      category: {
        type: "choice",
        instructions: "ユーザーの発言は、どの商品カテゴリについての相談か?",
        criteria: {
          ...PRODUCT_CATEGORIES,
          other: "上記のどれにも該当しない、または商品探し以外の話題",
        },
      },
    },
  });

  const answer = result.answers.category;
  if (answer.type !== "choice") {
    throw new Error(`Unexpected jev answer type for category: ${answer.type}`);
  }

  return {
    category: answer.choice as ProductCategory | "other",
    confidence: answer.confidence,
  };
}

function buildProductQuery(category: ProductCategory | "other"): string {
  if (category === "other") {
    return "active:'true'";
  }
  return `active:'true' AND metadata['category']:'${category}'`;
}

/**
 * Step 3: score how well each search result actually fits the user's
 * stated need, and (in the same jev call, since it evaluates one `state`
 * against several questions at once) whether this conversation looks like
 * it needs a human. This is an internal ranking/routing signal — it is
 * never rendered to the shopper directly, only used to order results and
 * to hint gpt-oss's final reply.
 */
async function rankAndAssess(
  userText: string,
  candidates: StoreProduct[],
): Promise<{
  rankings: RankedCandidate[];
  needsHumanHandoff: { value: boolean; confidence: number };
}> {
  if (candidates.length === 0) {
    return { rankings: [], needsHumanHandoff: { value: false, confidence: 0 } };
  }

  const questions: Record<string, JevQuestion> = {
    needs_human_handoff: {
      type: "noul",
      instructions:
        "このユーザーの相談は、AIチャットだけでは対応が難しく人間の担当者に引き継ぐべきか?",
      criteria: {
        true: "複雑な要望・クレーム・大口購入などAIだけでは対応しきれない可能性が高い",
        false: "商品を案内すればAIチャットのまま完結できそう",
      },
    },
  };

  for (const candidate of candidates) {
    const priceText =
      candidate.price?.unitAmount != null
        ? `${candidate.price.unitAmount}円`
        : "価格不明";
    questions[`fit_${candidate.id}`] = {
      type: "score",
      instructions: `商品「${candidate.name}」(${priceText}。${candidate.description ?? "説明なし"})は、ユーザーの要望「${userText}」にどれくらい合っているか?`,
      criteria: [
        "低: 用途や予算がユーザーの要望と噛み合っていない",
        "中: 一部の条件は満たすが、決め手に欠ける",
        "高: 用途・予算ともにユーザーの要望に強く合致する",
      ],
    };
  }

  const result = await runJevEvaluation({
    state: { user_message: userText, candidate_count: candidates.length },
    questions,
  });

  const handoffAnswer = result.answers.needs_human_handoff;
  const needsHumanHandoff =
    handoffAnswer && handoffAnswer.type === "noul"
      ? { value: handoffAnswer.value, confidence: handoffAnswer.confidence }
      : { value: false, confidence: 0 };

  const rankings = candidates
    .map((candidate) => {
      const answer = result.answers[`fit_${candidate.id}`];
      const fitScore = answer && answer.type === "score" ? answer.score : 0;
      return {
        id: candidate.id,
        name: candidate.name,
        description: candidate.description,
        priceJpy: candidate.price?.unitAmount ?? null,
        currency: candidate.price?.currency ?? null,
        fitScore,
      };
    })
    .sort((a, b) => b.fitScore - a.fitScore);

  return { rankings, needsHumanHandoff };
}

/**
 * The full pipeline behind the chat: classify -> search (Stripe Search API)
 * -> rank/assess. gpt-oss is not involved in any of these steps; it only
 * sees the final, already-grounded result when composing its reply.
 */
export async function runShoppingPipeline(
  userText: string,
): Promise<ShoppingPipelineResult> {
  const { category, confidence } = await classifyCategory(userText);
  const query = buildProductQuery(category);
  const candidates = await searchStoreProducts(query, 6);
  const { rankings, needsHumanHandoff } = await rankAndAssess(
    userText,
    candidates,
  );

  return {
    category,
    categoryConfidence: confidence,
    query,
    candidates: rankings,
    needsHumanHandoff,
  };
}
