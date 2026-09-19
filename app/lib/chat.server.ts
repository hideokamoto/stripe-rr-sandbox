import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import {
  cloudflareAiBaseUrl,
  cloudflareAiGatewayId,
  cloudflareApiToken,
} from "./cloudflare-ai.server";
import { shouldUseContext7 } from "./jev.server";
import { getContext7Tools } from "./mcp.server";

function workersAI() {
  return createOpenAICompatible({
    name: "cloudflare-workers-ai",
    baseURL: `${cloudflareAiBaseUrl()}/v1`,
    headers: {
      Authorization: `Bearer ${cloudflareApiToken()}`,
      "cf-aig-gateway-id": cloudflareAiGatewayId(),
    },
  });
}

function lastUserMessageText(messages: UIMessage[]): string {
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUserMessage) return "";
  return lastUserMessage.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("\n");
}

export async function runChat(messages: UIMessage[]) {
  const userText = lastUserMessageText(messages);
  const useContext7 = userText.length > 0 && (await shouldUseContext7(userText));
  const tools = useContext7 ? await getContext7Tools() : undefined;

  return streamText({
    model: workersAI()("@cf/openai/gpt-oss-20b"),
    system:
      "You are a helpful coding assistant. When library or framework documentation tools are available, use them before answering questions about specific APIs.",
    messages: await convertToModelMessages(messages),
    tools,
  });
}
