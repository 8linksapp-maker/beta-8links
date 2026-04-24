"use server";

import { createClient } from "@/lib/supabase/server";

export async function createConversation(subject: string, message: string, channel: "platform" | "whatsapp" = "platform") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Create conversation
  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .insert({
      client_id: user.id,
      channel,
      tags: [subject.toLowerCase().includes("cancelar") ? "retention" : "general"],
      priority: subject.toLowerCase().includes("cancelar") ? "retention" : "normal",
    })
    .select()
    .single();

  if (convError || !conversation) return { error: convError?.message ?? "Failed to create conversation" };

  // Add first message
  await supabase.from("messages").insert({
    conversation_id: conversation.id,
    sender_type: "client",
    sender_id: user.id,
    content: `**${subject}**\n\n${message}`,
  });

  return { data: conversation };
}

export async function getConversations() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("conversations")
    .select("*, messages(content, sender_type, sent_at)")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function sendMessage(conversationId: string, content: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_type: "client",
    sender_id: user.id,
    content,
  });

  if (error) return { error: error.message };
  return { success: true };
}
