import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

/**
 * GET /api/admin/sentry-test
 * Captura um erro proposital com fingerprint único para validar Sentry + alertas.
 * Cada chamada gera um issue novo no dashboard (não agrupa com chamadas anteriores).
 */
export async function GET() {
  const tag = Math.floor(Math.random() * 100000);
  const err = new Error(`Sentry server test #${tag} em ${new Date().toISOString()}`);

  Sentry.withScope((scope) => {
    scope.setFingerprint([`sentry-test-server-${tag}`]);
    scope.setTag("test", "true");
    Sentry.captureException(err);
  });

  return NextResponse.json(
    { ok: false, message: "Erro de teste capturado pelo Sentry", tag },
    { status: 500 }
  );
}
