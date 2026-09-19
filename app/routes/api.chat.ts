import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
import type { Route } from "./+types/api.chat";
import { chatTools } from "~/lib/chat-tools.server";
import { getChatModel } from "~/lib/workers-ai.server";

const SYSTEM_PROMPT = `あなたは日本語で応対するAIチャットコマースのアシスタント「Sora」です。
ユーザーの要望を聞き、必要なら searchProducts ツールで Stripe の商品カタログを検索してから、
見つかった商品の中から合うものを理由つきで日本語でレコメンドしてください。
架空の商品や価格をでっち上げず、検索結果に無い情報は「わかりません」と正直に答えてください。
商品を複数提示した後や、ユーザーが購入・価格・在庫について具体的に質問したタイミングでは
assessPurchaseIntent ツールを呼び、needsHumanHandoff が true の場合はその旨をユーザーに伝えて
人間のサポート担当への引き継ぎを提案してください。
価格は日本円 (JPY) として提示し、最小単位が円であることを踏まえて表示してください。`;

export async function action({ request }: Route.ActionArgs) {
  const { messages }: { messages: UIMessage[] } = await request.json();

  const result = streamText({
    model: getChatModel(),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: chatTools,
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
