import { createMCPClient } from "@ai-sdk/mcp";

let context7Client: ReturnType<typeof createMCPClient> | undefined;

function getContext7Client() {
  if (!context7Client) {
    const apiKey = process.env.CONTEXT7_API_KEY;
    context7Client = createMCPClient({
      transport: {
        type: "http",
        url: "https://mcp.context7.com/mcp",
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
      },
    });
  }
  return context7Client;
}

export async function getContext7Tools() {
  const client = await getContext7Client();
  return client.tools();
}
