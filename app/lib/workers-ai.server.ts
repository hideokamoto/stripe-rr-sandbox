import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import {
  getChatModelId,
  getCloudflareAccountId,
  getCloudflareApiToken,
} from "./env.server";

/**
 * Cloudflare Workers AI exposes an OpenAI Chat Completions compatible
 * endpoint at /ai/v1/chat/completions, which lets the Vercel AI SDK talk
 * to Workers AI models (gpt-oss included) like any other OpenAI-compatible
 * provider — including tool calling and streaming.
 * https://developers.cloudflare.com/workers-ai/configuration/ai-sdk/
 */
export function getWorkersAIProvider() {
  const accountId = getCloudflareAccountId();
  const apiToken = getCloudflareApiToken();

  return createOpenAICompatible({
    name: "workers-ai",
    baseURL: `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`,
    apiKey: apiToken,
  });
}

export function getChatModel() {
  return getWorkersAIProvider().chatModel(getChatModelId());
}

type JevChoiceQuestion = {
  type: "choice";
  instructions: string;
  criteria: Record<string, string>;
};

type JevScoreQuestion = {
  type: "score";
  instructions: string;
  criteria: string[];
};

type JevNoulQuestion = {
  type: "noul";
  instructions: string;
  criteria: Record<"true" | "false", string>;
};

export type JevQuestion = JevChoiceQuestion | JevScoreQuestion | JevNoulQuestion;

export type JevAnswer =
  | {
      type: "choice";
      choice: string;
      confidence: number;
      probabilities: Record<string, number>;
    }
  | {
      type: "score";
      score: number;
      confidence: number;
    }
  | {
      type: "noul";
      value: boolean;
      confidence: number;
      probabilities: { true: number; false: number };
    };

export interface JevResult {
  model: string;
  answers: Record<string, JevAnswer>;
  usage: { input_tokens: number; output_tokens: number };
}

/**
 * typesafe/jev is Workers AI's structured evaluation model: it scores one
 * `state` object against typed Noul/Choice/Score questions and returns
 * calibrated answers with probabilities and confidence. It does not speak
 * the Chat Completions format, so it's called through the native Workers AI
 * run endpoint instead of the OpenAI-compatible one.
 * https://developers.cloudflare.com/ai/models/typesafe/jev/
 */
export async function runJevEvaluation(input: {
  state: Record<string, unknown>;
  questions: Record<string, JevQuestion>;
}): Promise<JevResult> {
  const accountId = getCloudflareAccountId();
  const apiToken = getCloudflareApiToken();

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/typesafe/jev`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Jev evaluation failed (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as {
    result: JevResult;
    success: boolean;
    errors: Array<{ message: string }>;
  };

  if (!payload.success) {
    throw new Error(
      `Jev evaluation returned an error: ${payload.errors.map((e) => e.message).join(", ")}`,
    );
  }

  return payload.result;
}
