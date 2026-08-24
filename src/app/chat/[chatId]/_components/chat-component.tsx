"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChat, type Message } from "ai/react";
import { useEffect, useRef } from "react";

type Props = {
  chatId: string;
  initialMessages?: Message[];
};

const ChatComponent = ({ chatId, initialMessages = [] }: Props) => {
  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: "/api/chat",
      body: { chatId },
      initialMessages,
    });

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="relative flex flex-col h-full min-h-0">
      <div className="shrink-0 px-4 py-2.5 bg-white border-b">
        <h3 className="text-base font-semibold">Chat</h3>
        <p className="text-xs text-muted-foreground">
          Dig into themes, questions, or specific reactions
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {messages.length === 0 && !isLoading ? (
          <div className="h-full flex items-center justify-center text-center text-muted-foreground text-sm">
            <div>
              <p className="font-medium text-foreground mb-1">
                No messages yet
              </p>
              <p>
                Try: "What are people mostly saying?" or
                "Summarize the criticism"
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-current animate-pulse" />
                  Thinking...
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </>
        )}
      </div>

      <form
        className="shrink-0 p-4 bg-white border-t flex gap-3"
        onSubmit={handleSubmit}
      >
        <Input
          value={input}
          className="w-full"
          onChange={handleInputChange}
          placeholder="Ask about your comments..."
          disabled={isLoading}
        />
        <Button type="submit" disabled={isLoading || !input.trim()}>
          {isLoading ? "..." : "Send"}
        </Button>
      </form>
    </div>
  );
};

export default ChatComponent;
