import { NextResponse } from "next/server";

/**
 * POST /api/integrations/test-wordpress
 * Test WordPress REST API connection with Application Password.
 */
export async function POST(request: Request) {
  const { wpUrl, wpUsername, wpAppPassword } = await request.json();

  if (!wpUrl || !wpUsername || !wpAppPassword) {
    return NextResponse.json({ error: "Preencha a URL do WordPress, usuário e senha de aplicativo." }, { status: 400 });
  }

  // Normalize URL
  const baseUrl = wpUrl.replace(/\/+$/, "");
  const apiUrl = `${baseUrl}/wp-json/wp/v2/posts?per_page=1&status=any`;

  try {
    const auth = Buffer.from(`${wpUsername}:${wpAppPassword}`).toString("base64");

    const res = await fetch(apiUrl, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 401) {
        return NextResponse.json({ error: "Credenciais inválidas. Verifique o usuário e a Application Password." });
      }
      if (res.status === 404) {
        return NextResponse.json({ error: "REST API não encontrada. Verifique se a URL do WordPress está correta." });
      }
      console.error(`[test-wordpress] HTTP ${res.status}:`, text.slice(0, 500));
      return NextResponse.json({ error: "Não conseguimos conectar ao seu WordPress. Verifique a URL e as credenciais." });
    }

    const posts = await res.json();

    // Get site info
    let siteName = "";
    try {
      const infoRes = await fetch(`${baseUrl}/wp-json`, { headers: { Authorization: `Basic ${auth}` } });
      const info = await infoRes.json();
      siteName = info.name ?? "";
    } catch { /* ok */ }

    return NextResponse.json({
      success: true,
      siteName,
      postsCount: parseInt(res.headers.get("X-WP-Total") ?? "0"),
      message: `Conexão OK! ${siteName ? `Site: ${siteName}. ` : ""}${posts.length > 0 ? "Posts encontrados." : ""}`,
    });
  } catch (error) {
    console.error("[test-wordpress] connection failed:", error);
    return NextResponse.json({ error: "Não foi possível conectar ao seu WordPress. Verifique se o site está no ar e a URL está correta." });
  }
}
