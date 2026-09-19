import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { Route } from "./+types/chat";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Agent Chat" }];
}

export default function Chat() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  return (
    <div className="mx-auto flex h-dvh max-w-2xl flex-col p-4">
      <h1 className="mb-4 text-lg font-semibold">Agent Chat</h1>
      <div className="flex-1 space-y-4 overflow-y-auto">
        {messages.map((message) => (
          <div key={message.id} className="text-sm">
            <span className="font-semibold">
              {message.role === "user" ? "You" : "Assistant"}:
            </span>{" "}
            {message.parts.map((part, index) =>
              part.type === "text" ? (
                <span key={index}>{part.text}</span>
              ) : null,
            )}
          </div>
        ))}
      </div>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!input.trim()) return;
          sendMessage({ text: input });
          setInput("");
        }}
      >
        <input
          className="flex-1 rounded border px-3 py-2"
          value={input}
          placeholder="Ask something..."
          disabled={status === "streaming" || status === "submitted"}
          onChange={(event) => setInput(event.target.value)}
        />
        <button
          type="submit"
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
          disabled={status === "streaming" || status === "submitted"}
        >
          Send
        </button>
      </form>
    </div>
  );
}
