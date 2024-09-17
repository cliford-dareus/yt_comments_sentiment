"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChat } from "ai/react";

type Props = {};

const ChatComponent = ({}: Props) => {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: "/api/chat",
    body: {}
  });

  return (
    <div className="relative h-full">
      <div className="sticky top-0 inset-x-0 p-2 bg-white h-fit">
        <h3 className="text-xl font-bold">Chat</h3>
      </div>

      <div className="flex flex-col gap-2 px-4">
        {messages.map((m) => (
          <div key={m.id}>
            {m.role === "user" ? "User: " : "AI: "}
            {m.content}
          </div>
        ))}
      </div>

      <form
        className="sticky bottom-4 inset-x-0 px-2 py-4 bg-white"
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
