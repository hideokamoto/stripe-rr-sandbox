function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. See .env.example.`,
    );
  }
  return value;
}

export function getCloudflareAccountId(): string {
  return requireEnv("CLOUDFLARE_ACCOUNT_ID");
}

export function getCloudflareApiToken(): string {
  return requireEnv("CLOUDFLARE_API_TOKEN");
}

export function getStripeSecretKey(): string {
  return requireEnv("STRIPE_SECRET_KEY");
}

export function getChatModelId(): string {
  return process.env.CHAT_MODEL_ID || "@cf/openai/gpt-oss-120b";
}
