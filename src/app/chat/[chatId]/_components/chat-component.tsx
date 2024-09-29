"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChat } from "ai/react";

type Props = {
  chatId: string;
};

const ChatComponent = ({ chatId }: Props) => {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: "/api/chat",
    body: {
      chatId,
    },
  });

  return (
    <div className="relative h-full">
      <div className="sticky top-0 inset-x-0 p-4 bg-white h-fit">
        <h3 className="text-xl font-bold">Chat</h3>
      </div>

      {messages.length == 0 ? (
        <div className="px-4 h-[80%] flex items-center justify-center">
          <div>hello</div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 px-4 h-[85%]">
          {messages.map((m) => (
            <div key={m.id}>
              {m.role === "user" ? "User: " : "AI: "}
              {m.content}
            </div>
          ))}
        </div>
      )}

      <form
        className="sticky bottom-4 inset-x-0 p-4 bg-white flex gap-4"
        onSubmit={handleSubmit}
      >
        <Input
          value={input}
          className="w-full"
          onChange={handleInputChange}
          placeholder="Ask about your comments..."
        />

        <Button type="submit">Send</Button>
      </form>
    </div>
  );
};

export default ChatComponent;
