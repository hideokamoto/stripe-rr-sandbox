import type { UIMessage } from "ai";

export interface ChatProduct {
  id: string;
  name: string;
  description: string | null;
  priceJpy: number | null;
  currency: string | null;
}

/**
 * Data parts this chat stream can emit alongside gpt-oss's text reply.
 * `products` carries the real, already-searched-and-ranked Stripe catalog
 * items for the client to render as cards — no internal model scores.
 */
export type ChatDataParts = {
  products: { products: ChatProduct[] };
};

export type ChatUIMessage = UIMessage<unknown, ChatDataParts>;
