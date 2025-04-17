"use client";
import { Button } from "@/components/ui/button";
import { Database } from "@/types/database";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Chat {
  id: number;
  title: string;
  created_at: string;
}

export default function ChatSidebar() {
  const supabase = createClientComponentClient<Database>();
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>([]);

  useEffect(() => {
    const loadChats = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const { data: chats, error } = await supabase
        .from("chats")
        .select("*")
        .eq("created_by", session.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading chats:", error);
        return;
      }

      setChats(chats || []);
    };

    loadChats();
  }, [supabase, router]);

  const createNewChat = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      router.push("/login");
      return;
    }

    const { data: chat, error } = await supabase
      .from("chats")
      .insert([
        {
          title: "New Chat",
          created_by: session.user.id,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error creating chat:", error);
      return;
    }

    router.push(`/chat/${chat.id}`);
  };

  return (
    <div className="w-64 bg-gray-50 h-full p-4 flex flex-col gap-4">
      <Button onClick={createNewChat} className="w-full">
        <PlusIcon className="h-4 w-4 mr-2" />
        New Chat
      </Button>
      <div className="flex flex-col gap-2">
        {chats.map((chat) => (
          <Link
            key={chat.id}
            href={`/chat/${chat.id}`}
            className="p-2 hover:bg-gray-100 rounded-lg truncate"
          >
            {chat.title}
          </Link>
        ))}
      </div>
    </div>
  );
}
