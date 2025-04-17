export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      chats: {
        Row: {
          created_at: string;
          created_by: string;
          id: number;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          id?: never;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          id?: never;
          title?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          chat_id: number;
          content: string;
          created_at: string;
          id: number;
          role: "user" | "assistant";
        };
        Insert: {
          chat_id: number;
          content: string;
          created_at?: string;
          id?: never;
          role: "user" | "assistant";
        };
        Update: {
          chat_id?: number;
          content?: string;
          created_at?: string;
          id?: never;
          role?: "user" | "assistant";
        };
      };
    };
  };
}
