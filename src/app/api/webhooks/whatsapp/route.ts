import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.json();

  if (!process.env.EVOLUTION_API_URL) {
    return NextResponse.json({ received: true });
  }

  try {
    const supabase = await createClient();
    const messageData = body?.data;
    const remoteJid = messageData?.key?.remoteJid;
    const messageText = messageData?.message?.conversation || messageData?.message?.extendedTextMessage?.text;

    if (!remoteJid || !messageText) {
      return NextResponse.json({ received: true });
    }

    const phone = remoteJid.replace("@s.whatsapp.net", "");

    // Find or create conversation
    let { data: conversations } = await supabase
      .from("conversations")
      .select("id, client_id")
      .eq("whatsapp_number", phone)
      .eq("status", "open")
      .limit(1);

    let conversationId = conversations?.[0]?.id;

    if (!conversationId) {
      // Find user by phone (would need phone in profiles - for now just log)
      const { data: newConv } = await supabase
        .from("conversations")
        .insert({ whatsapp_number: phone, client_id: "00000000-0000-0000-0000-000000000000", channel: "whatsapp" })
        .select()
        .single();
      conversationId = newConv?.id;
    }

    if (conversationId) {
      // Save message
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_type: "client",
        content: messageText,
      });

      // Try bot response
      if (process.env.ANTHROPIC_API_KEY) {
        try {
          const { supportBotResponse } = await import("@/lib/apis/claude");
          const botResult = await supportBotResponse({
            message: messageText,
            clientContext: { name: "Cliente", plan: "starter", sites: 0, backlinks: 0, score: 0, daysSinceJoin: 0 },
          });

          // Save bot response
          await supabase.from("messages").insert({
            conversation_id: conversationId,
            sender_type: "bot",
            content: botResult.response,
          });

          // Send via WhatsApp
          const { sendWhatsAppMessage } = await import("@/lib/apis/evolution");
          await sendWhatsAppMessage(phone, botResult.response);

          // If bot can't resolve, escalate
          if (!botResult.canResolve) {
            await supabase.from("conversations").update({ status: "escalated" }).eq("id", conversationId);
          }
        } catch (e) {
          console.error("[WhatsApp Bot] Error:", e);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[WhatsApp Webhook] Error:", error);
    return NextResponse.json({ received: true });
  }
}
