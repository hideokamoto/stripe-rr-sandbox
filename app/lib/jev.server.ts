import { cloudflareAiBaseUrl, cloudflareApiToken } from "./cloudflare-ai.server";

interface JevChoiceAnswer {
  type: "choice";
  choice: string;
  confidence: number;
  probabilities: Record<string, number>;
}

interface JevRunResult {
  model: string;
  answers: Record<string, JevChoiceAnswer>;
  usage: { input_tokens: number; output_tokens: number };
}

/**
 * Judgment layer: asks typesafe/jev (Cloudflare Workers AI) a single typed
 * choice question to decide whether the Context7 MCP tools are needed to
 * answer the user's message. Jev returns a calibrated decision instead of
 * free text, which is why it isn't run through the chat model.
 */
export async function shouldUseContext7(userMessage: string): Promise<boolean> {
  const response = await fetch(`${cloudflareAiBaseUrl()}/run`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cloudflareApiToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "typesafe/jev",
      input: {
        state: { user_message: userMessage },
        questions: {
          use_context7: {
            type: "choice",
            instructions:
              "Does answering this message require looking up current, version-specific library or framework documentation via the Context7 MCP tools?",
            criteria: {
              yes: "The message asks about a specific library, framework, package, or API and needs up-to-date documentation to answer accurately",
              no: "The message is general conversation, or can be answered correctly without an external documentation lookup",
            },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Jev request failed: ${response.status} ${await response.text()}`);
  }

  const result = (await response.json()) as JevRunResult;
  return result.answers.use_context7?.choice === "yes";
}
