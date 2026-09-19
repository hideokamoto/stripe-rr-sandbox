import type { UIMessage } from "ai";
import type { Route } from "./+types/api.chat";
import { runChat } from "~/lib/chat.server";

export async function action({ request }: Route.ActionArgs) {
  const { messages }: { messages: UIMessage[] } = await request.json();
  const result = await runChat(messages);
  return result.toUIMessageStreamResponse();
}
