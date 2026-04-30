import { NextResponse } from "next/server";

/**
 * GET /api/admin/sentry-test
 * Throws a deliberate error to verify Sentry is capturing server-side exceptions.
 */
export async function GET() {
  throw new Error("Sentry server test — disparado de /api/admin/sentry-test em " + new Date().toISOString());
  // unreachable
  return NextResponse.json({ ok: true });
}
