import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { Route } from "./+types/home";
import type { ChatProduct, ChatUIMessage } from "~/lib/chat-message";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "AI チャットコマース サンプル" },
    {
      name: "description",
      content:
        "Cloudflare Workers AI (gpt-oss) + Stripe Search API + Vercel AI SDK を使ったAIチャットコマースのサンプル",
    },
  ];
}

function formatYen(amount: number | null) {
  if (amount === null) return "価格未設定";
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
  }).format(amount);
}

function ProductCards({ products }: { products: ChatProduct[] }) {
  if (products.length === 0) {
    return (
      <p className="text-sm text-gray-500 mt-2">
        条件に合う商品が見つかりませんでした。
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
      {products.map((product) => (
        <div
          key={product.id}
          className="border border-gray-200 rounded-lg p-3 bg-white"
        >
          <p className="font-semibold text-sm">{product.name}</p>
          {product.description && (
            <p className="text-xs text-gray-500 mt-1">
              {product.description}
            </p>
          )}
          <p className="text-sm font-mono mt-2">
            {formatYen(product.priceJpy)}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat<ChatUIMessage>({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const isBusy = status === "submitted" || status === "streaming";

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || isBusy) return;
    sendMessage({ text });
    setInput("");
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-2xl flex flex-col h-[85vh]">
        <header className="mb-4">
          <h1 className="text-xl font-bold">AI チャットコマース サンプル</h1>
          <p className="text-sm text-gray-500 mt-1">
            Cloudflare Workers AI (gpt-oss) が接客し、Stripe Search API
            で実在庫を検索します。
          </p>
        </header>

        <div className="flex-1 overflow-y-auto space-y-4 bg-white border border-gray-200 rounded-lg p-4">
          {messages.length === 0 && (
            <p className="text-sm text-gray-400">
              例:
              「雨の日のハイキングにおすすめの商品ある?」「1万円くらいのシューズを探しています」
            </p>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={
                message.role === "user"
                  ? "flex justify-end"
                  : "flex justify-start"
              }
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  message.role === "user"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                {message.parts.map((part, index) => {
                  if (part.type === "text") {
                    return (
                      <p key={index} className="whitespace-pre-wrap">
                        {part.text}
                      </p>
                    );
                  }

                  if (part.type === "data-products") {
                    return (
                      <ProductCards
                        key={index}
                        products={part.data.products}
                      />
                    );
                  }

                  return null;
                })}
              </div>
            </div>
          ))}

          {isBusy && (
            <p className="text-xs text-gray-400">Soraが入力中です…</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
          <input
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="欲しいものを聞いてみてください"
            disabled={isBusy}
          />
          <button
            type="submit"
            disabled={isBusy || input.trim().length === 0}
            className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            送信
          </button>
        </form>
      </div>
    </main>
  );
}
