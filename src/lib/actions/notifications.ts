"use server";

import { createClient } from "@/lib/supabase/server";

export async function getNotifications(unreadOnly = false) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("sent_at", { ascending: false })
    .limit(20);

  if (unreadOnly) {
    query = query.eq("read", false);
  }

  const { data } = await query;
  return data ?? [];
}

export async function markNotificationRead(notificationId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function markAllNotificationsRead() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);

  if (error) return { error: error.message };
  return { success: true };
}

export async function getUnreadCount() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("read", false);

  return count ?? 0;
}

/** Create a notification (used internally by other server actions) */
export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  channel: "platform" | "email" | "whatsapp" = "platform",
  data?: Record<string, unknown>
) {
  const supabase = await createClient();

  await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title,
    message,
    data,
    channel,
  });
}
