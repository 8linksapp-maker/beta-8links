/**
 * Mocks de APIs externas pra evitar custo $$$ + flakiness em CI.
 *
 * Use no início de cada teste que faz chamada indireta:
 *   await mockExternalAPIs(page);
 *
 * Não mocka Supabase (queremos validar o banco de verdade) nem nossas APIs.
 */

import type { Page } from "@playwright/test";

export async function mockOpenAI(page: Page): Promise<void> {
  await page.route(/api\.openai\.com/, async route => {
    const body = await route.request().postDataJSON().catch(() => ({}));
    // Resposta default: JSON válido pra qualquer prompt
    const fake = {
      id: "chatcmpl-mock",
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: body?.model ?? "gpt-4.1-nano",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: JSON.stringify({
              tagsPt: ["mock", "teste", "exemplo"],
              queryEn: "mock test",
              description: "Imagem mock pra teste",
              tags: ["mock", "teste", "exemplo", "ilustração", "negócio", "trabalho", "moderno", "limpo", "simples", "geral"],
              outline: { title: "Mock title", sections: [] },
              article: "# Mock Article\n\nContent.",
              niche: "Tecnologia",
              keywords: [],
            }),
          },
          finish_reason: "stop",
        },
      ],
      usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 },
    };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(fake) });
  });
}

export async function mockDataForSEO(page: Page): Promise<void> {
  await page.route(/api\.dataforseo\.com/, async route => {
    const fake = {
      tasks: [
        {
          id: "mock-task",
          status_code: 20000,
          status_message: "Ok.",
          result: [{ items: [], total_count: 0, target: "mock.com" }],
        },
      ],
      tasks_count: 1,
      tasks_error: 0,
    };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(fake) });
  });
}

export async function mockUnsplash(page: Page): Promise<void> {
  await page.route(/api\.unsplash\.com/, async route => {
    const fake = {
      results: [
        {
          urls: { regular: "https://images.unsplash.com/mock-1.jpg", small: "https://images.unsplash.com/mock-1-sm.jpg" },
          user: { name: "Mock Photographer" },
          links: { download_location: "" },
          width: 1920,
          height: 1080,
        },
      ],
    };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(fake) });
  });
  // Quando o fluxo baixa a imagem, devolve um placeholder
  await page.route(/images\.unsplash\.com/, async route => {
    await route.fulfill({ status: 200, contentType: "image/jpeg", body: Buffer.from("mock") });
  });
}

export async function mockPexels(page: Page): Promise<void> {
  await page.route(/api\.pexels\.com/, async route => {
    const fake = {
      photos: [
        {
          src: { large: "https://images.pexels.com/mock-1.jpg", medium: "https://images.pexels.com/mock-1-md.jpg" },
          photographer: "Mock Pexels",
          width: 1920,
          height: 1080,
        },
      ],
    };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(fake) });
  });
}

/** Atalho: mocka todas as APIs pagas/flakey de uma vez. */
export async function mockExternalAPIs(page: Page): Promise<void> {
  await mockOpenAI(page);
  await mockDataForSEO(page);
  await mockUnsplash(page);
  await mockPexels(page);
}
