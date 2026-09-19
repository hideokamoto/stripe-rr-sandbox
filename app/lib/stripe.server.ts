import Stripe from "stripe";
import { getStripeSecretKey } from "./env.server";

let client: Stripe | undefined;

export function getStripeClient(): Stripe {
  if (!client) {
    client = new Stripe(getStripeSecretKey(), {
      appInfo: {
        name: "ai-chat-commerce-sample",
        url: "https://github.com/hideokamoto/stripe-rr-sandbox",
      },
    });
  }
  return client;
}

export interface StoreProduct {
  id: string;
  name: string;
  description: string | null;
  images: string[];
  metadata: Record<string, string>;
  price: {
    id: string;
    unitAmount: number | null;
    currency: string;
  } | null;
}

/**
 * Runs a Stripe Search API query against the account's product catalog.
 * `query` must follow Stripe's Search Query Language, e.g.
 * "active:'true' AND name~'shoe'". https://docs.stripe.com/search
 */
export async function searchStoreProducts(
  query: string,
  limit = 5,
): Promise<StoreProduct[]> {
  const stripe = getStripeClient();
  const result = await stripe.products.search({
    query,
    limit,
    expand: ["data.default_price"],
  });

  return result.data.map((product) => {
    const price =
      product.default_price && typeof product.default_price !== "string"
        ? {
            id: product.default_price.id,
            unitAmount: product.default_price.unit_amount,
            currency: product.default_price.currency,
          }
        : null;

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      images: product.images,
      metadata: product.metadata,
      price,
    };
  });
}
