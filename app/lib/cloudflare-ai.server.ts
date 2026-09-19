function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function cloudflareAccountId(): string {
  return requireEnv("CLOUDFLARE_ACCOUNT_ID");
}

export function cloudflareApiToken(): string {
  return requireEnv("CLOUDFLARE_API_TOKEN");
}

export function cloudflareAiBaseUrl(): string {
  return `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId()}/ai`;
}

/**
 * Required by Cloudflare's AI Gateway REST API for @cf/-prefixed Workers AI
 * models (e.g. gpt-oss) called through /ai/v1/chat/completions. Not required
 * for third-party models like typesafe/jev, which route through the
 * account's default gateway automatically.
 */
export function cloudflareAiGatewayId(): string {
  return requireEnv("CLOUDFLARE_AI_GATEWAY_ID");
}
