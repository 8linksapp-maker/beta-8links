import { NextResponse } from "next/server";

/**
 * GET /api/admin/sentry-test
 * Throws a deliberate error to verify Sentry is capturing server-side exceptions.
 */
export async function GET() {
  const tag = Math.floor(Math.random() * 100000);
  throw new Error(`Sentry server test #${tag} em ${new Date().toISOString()}`);
}
