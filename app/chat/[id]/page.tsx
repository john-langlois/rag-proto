"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePipeline } from "@/lib/hooks/use-pipeline";
import { cn } from "@/lib/utils";
import { Database } from "@/types/database";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useChat } from "ai/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Message {
  id: string;
  role: string;
  content: string;
}

export default function ChatPage() {
  const supabase = createClientComponentClient<Database>();
  const router = useRouter();
  const params = useParams();
  const chatId = parseInt(params.id as string);
  const [messages, setMessages] = useState<Message[]>([]);

  const generateEmbedding = usePipeline(
    "feature-extraction",
    "Supabase/gte-small"
  );

  const {
    messages: aiMessages,
    input,
    handleInputChange,
    handleSubmit: aiHandleSubmit,
    isLoading,
  } = useChat({
    api: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/chat`,
    id: chatId?.toString(),
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!generateEmbedding || !chatId) {
      return;
    }

    const output = await generateEmbedding(input, {
      pooling: "mean",
      normalize: true,
    });

    const embedding = JSON.stringify(Array.from(output.data));

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/login");
      return;
    }

    // Store the user message
    const { error: userMsgError } = await supabase.from("messages").insert([
      {
        chat_id: chatId,
        role: "user",
        content: input,
      },
    ]);

    if (userMsgError) {
      console.error("Error storing user message:", userMsgError);
      return;
    }

    // Update chat title if this is the first message
    const { data: messageCount } = await supabase
      .from("messages")
      .select("id", { count: "exact" })
      .eq("chat_id", chatId);

    // If this is the first message (we've just inserted it), update the chat title
    if (messageCount?.length === 1) {
      // Truncate to a reasonable length if needed
      const title = input.length > 50 ? input.substring(0, 47) + "..." : input;

      const { error: titleUpdateError } = await supabase
        .from("chats")
        .update({ title })
        .eq("id", chatId);

      if (titleUpdateError) {
        console.error("Error updating chat title:", titleUpdateError);
      }
    }

    // Send to AI and get response
    aiHandleSubmit(e, {
      options: {
        headers: {
          authorization: `Bearer ${session.access_token}`,
        },
        body: {
          embedding,
        },
      },
    });
  };

  // Store AI responses
  useEffect(() => {
    const storeAIMessage = async () => {
      // Only proceed if we have messages, streaming is complete, and there are messages
      if (!chatId || aiMessages.length === 0) return;

      // Only store message when streaming completes (isLoading transitions from true to false)
      if (isLoading) return;

      const lastMessage = aiMessages[aiMessages.length - 1];
      if (lastMessage?.role !== "assistant" || !lastMessage.content?.trim())
        return;

      // Check if message was already stored to prevent duplicates
      const { data: existing } = await supabase
        .from("messages")
        .select("id")
        .eq("chat_id", chatId)
        .eq("role", "assistant")
        .eq("content", lastMessage.content)
        .maybeSingle();

      if (existing) return; // Skip if already stored

      try {
        const { error } = await supabase.from("messages").insert([
          {
            chat_id: chatId,
            role: "assistant",
            content: lastMessage.content,
          },
        ]);

        if (error) {
          console.error("Error storing AI message:", error);
          throw error;
        }
      } catch (err) {
        console.error("Failed to store AI message:", err);
      }
    };

    storeAIMessage();
  }, [aiMessages, chatId, supabase, isLoading]); // Keep isLoading in dependencies

  // Load existing messages
  useEffect(() => {
    const loadMessages = async () => {
      if (!chatId) return;

      const { data: existingMessages, error } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error loading messages:", error);
        return;
      }

      // Initialize messages in the UI
      if (existingMessages && existingMessages.length > 0) {
        setMessages(
          existingMessages.map((msg) => ({
            id: msg.id.toString(),
            role: msg.role,
            content: msg.content,
          }))
        );
      }
    };

    loadMessages();
  }, [chatId, supabase, setMessages]);

  // Update messages when AI responds
  useEffect(() => {
    if (aiMessages.length > 0) {
      setMessages(
        aiMessages.map((msg) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
        }))
      );
    }
  }, [aiMessages]);

  const isReady = !!generateEmbedding;

  return (
    <div className="flex-1 flex flex-col w-full h-full">
      <div className="flex flex-col w-full gap-6 grow p-4 sm:p-8 overflow-y-auto">
        <div className="border-slate-400 rounded-lg flex flex-col justify-start gap-4 pr-2 grow overflow-y-scroll">
          {messages.map(({ id, role, content }) => (
            <div
              key={id}
              className={cn(
                "rounded-xl bg-gray-500 text-white px-4 py-2 max-w-lg",
                role === "user" ? "self-end bg-blue-600" : "self-start"
              )}
            >
              {content}
            </div>
          ))}
          {isLoading && (
            <div className="self-start m-6 text-gray-500 before:text-gray-500 after:text-gray-500 dot-pulse" />
          )}
          {messages.length === 0 && (
            <div className="self-stretch flex grow items-center justify-center">
              <svg
                className="opacity-10"
                width="150px"
                height="150px"
                version="1.1"
                viewBox="0 0 100 100"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g>
                  <path d="m77.082 39.582h-29.164c-3.543 0-6.25 2.707-6.25 6.25v16.668c0 3.332 2.707 6.25 6.25 6.25h20.832l8.332 8.332v-8.332c3.543 0 6.25-2.918 6.25-6.25v-16.668c0-3.5391-2.707-6.25-6.25-6.25z" />
                  <path d="m52.082 25h-29.164c-3.543 0-6.25 2.707-6.25 6.25v16.668c0 3.332 2.707 6.25 6.25 6.25v8.332l8.332-8.332h6.25v-8.332c0-5.832 4.582-10.418 10.418-10.418h10.418v-4.168c-0.003907-3.543-2.7109-6.25-6.2539-6.25z" />
                </g>
              </svg>
            </div>
          )}
        </div>
        <form
          className="flex items-center space-x-2 gap-2"
          onSubmit={handleSubmit}
        >
          <Input
            type="text"
            autoFocus
            placeholder="Send a message"
            value={input}
            onChange={handleInputChange}
          />
          <Button type="submit" disabled={!isReady}>
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}
