/**
 * Translates raw errors (network, API, exceptions) into user-friendly Portuguese messages.
 *
 * Returns two channels:
 *  - `user`: ready to show in toast/UI/error_message. Avoids jargon, suggests next action.
 *  - `technical`: original detail for logs, console.error, admin panels, Sentry.
 *
 * Pattern matching is forgiving — it tries to detect known failure modes and falls back
 * to a generic friendly message. Never returns a stack trace, status code, or English text
 * in the `user` channel.
 */
export function humanizeError(input: unknown): { user: string; technical: string } {
  const technical = extractTechnical(input);
  const lower = technical.toLowerCase();

  // Rate limits / quota
  if (/\b429\b|rate.?limit|too.?many.?requests|quota/i.test(technical)) {
    return {
      user: "Sistema sobrecarregado no momento. Aguarde 1 minuto e tente novamente.",
      technical,
    };
  }

  // Auth / API key
  if (/\b401\b|unauthor|invalid.?api.?key|invalid.?key/i.test(technical)) {
    return {
      user: "Serviço temporariamente indisponível. Nossa equipe foi avisada — tente novamente em alguns minutos.",
      technical,
    };
  }

  // Insufficient quota / billing
  if (/insufficient_quota|billing|payment.?required|\b402\b/i.test(technical)) {
    return {
      user: "Limite de uso atingido. Entre em contato com o suporte para liberar mais.",
      technical,
    };
  }

  // Content policy
  if (/content_policy|content.?filter|safety/i.test(technical)) {
    return {
      user: "O conteúdo solicitado foi bloqueado pelas regras de segurança. Tente reformular.",
      technical,
    };
  }

  // Timeouts
  if (/timeout|timed.?out|aborted|etimedout/i.test(lower)) {
    return {
      user: "A operação demorou demais para responder. Tente novamente em alguns instantes.",
      technical,
    };
  }

  // Network / fetch failures
  if (/failed.?to.?fetch|networkerror|enotfound|econnrefused|network.?request.?failed|load.?failed/i.test(lower)) {
    return {
      user: "Sem conexão com o servidor. Verifique sua internet e tente novamente.",
      technical,
    };
  }

  // Auth session expired
  if (/jwt|session.?expired|not authenticated|não autenticado|unauthenticated/i.test(lower)) {
    return {
      user: "Sua sessão expirou. Recarregue a página e faça login novamente.",
      technical,
    };
  }

  // Server errors (5xx)
  if (/\b5\d{2}\b|internal.?server|service.?unavailable|bad.?gateway/i.test(technical)) {
    return {
      user: "Estamos com uma instabilidade momentânea. Tente novamente em alguns instantes.",
      technical,
    };
  }

  // Specific OpenAI / Anthropic API responses
  if (/openai|anthropic|claude/i.test(technical) && /error|fail/i.test(lower)) {
    return {
      user: "A inteligência artificial não conseguiu processar agora. Tente novamente em instantes.",
      technical,
    };
  }

  // Specific DataForSEO failures
  if (/dataforseo/i.test(technical)) {
    return {
      user: "Serviço de análise SEO indisponível no momento. Tente novamente em instantes.",
      technical,
    };
  }

  // JSON parse failures (malformed response)
  if (/json|unexpected token|parse/i.test(lower)) {
    return {
      user: "Recebemos uma resposta inesperada do servidor. Tente novamente.",
      technical,
    };
  }

  // Generic fallback
  return {
    user: "Não foi possível concluir a operação. Tente novamente em alguns instantes.",
    technical,
  };
}

function extractTechnical(input: unknown): string {
  if (input == null) return "unknown";
  if (typeof input === "string") return input;
  if (input instanceof Error) return input.message || input.name || String(input);
  if (typeof input === "object") {
    const obj = input as Record<string, unknown>;
    if (typeof obj.message === "string") return obj.message;
    if (typeof obj.error === "string") return obj.error;
    if (obj.error && typeof obj.error === "object") {
      const e = obj.error as Record<string, unknown>;
      if (typeof e.message === "string") return e.message;
    }
    try {
      return JSON.stringify(input).slice(0, 500);
    } catch {
      return String(input);
    }
  }
  return String(input);
}
