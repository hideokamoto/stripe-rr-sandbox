import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
} from "ai";
import type { Route } from "./+types/api.chat";
import type { ChatUIMessage } from "~/lib/chat-message";
import {
  runShoppingPipeline,
  type ShoppingPipelineResult,
} from "~/lib/shopping-assistant.server";
import { getChatModel } from "~/lib/workers-ai.server";

const PERSONA = `あなたは日本語で応対するAIチャットコマースのアシスタント「Sora」です。
丁寧かつ簡潔に、ユーザーの要望に合わせて商品を案内してください。`;

function getLatestUserText(messages: ChatUIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role !== "user") continue;
    return message.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n");
  }
  return "";
}

function buildSystemPrompt(pipeline: ShoppingPipelineResult): string {
  if (pipeline.candidates.length === 0) {
    return `${PERSONA}

Stripeの商品検索結果は0件でした。実在しない商品をでっち上げてはいけません。
扱っていない旨を正直に伝えるか、条件(用途・予算など)を聞き直してください。`;
  }

  const list = pipeline.candidates
    .map(
      (c) =>
        `- ${c.name} / ${c.priceJpy !== null ? `${c.priceJpy}円` : "価格不明"} / 適合度${c.fitScore.toFixed(2)} / ${c.description ?? "説明なし"}`,
    )
    .join("\n");

  const handoffNote = pipeline.needsHumanHandoff.value
    ? "\nこの相談は内部評価上、複雑または対応が難しい可能性があると判定されています。断定はせず、必要なら「担当者にもご案内できます」と自然に申し出てください。"
    : "";

  return `${PERSONA}

以下はStripeの実際の商品検索結果を、ユーザーの要望への適合度が高い順に並べたものです。
この一覧に無い商品名・価格を挙げてはいけません。適合度が高いものを優先して勧め、
なぜその商品がユーザーの要望に合うのかを具体的に説明してください。

${list}${handoffNote}`;
}

export async function action({ request }: Route.ActionArgs) {
  const { messages }: { messages: ChatUIMessage[] } = await request.json();
  const userText = getLatestUserText(messages);

  const pipeline = await runShoppingPipeline(userText);

  const stream = createUIMessageStream<ChatUIMessage>({
    execute: async ({ writer }) => {
      // Structured, real product data for the UI to render as cards.
      // Internal signals (fit score, handoff hint) are deliberately left
      // out — they steer gpt-oss's reply below, not something a shopper
      // needs to see as a number on screen.
      writer.write({
        type: "data-products",
        data: {
          products: pipeline.candidates.map((c) => ({
            id: c.id,
            name: c.name,
            description: c.description,
            priceJpy: c.priceJpy,
            currency: c.currency,
          })),
        },
      });

      const result = streamText({
        model: getChatModel(),
        system: buildSystemPrompt(pipeline),
        messages: await convertToModelMessages(messages),
      });

      writer.merge(toUIMessageStream({ stream: result.fullStream }));
    },
  });

  return createUIMessageStreamResponse({ stream });
}
