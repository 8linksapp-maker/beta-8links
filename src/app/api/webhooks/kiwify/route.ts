import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();

  // TODO: Validate Kiwify webhook
  // TODO: Handle purchase confirmation, create subscription

  console.log("[Kiwify Webhook] Received", { email: body?.Customer?.email });

  return NextResponse.json({ received: true });
}
