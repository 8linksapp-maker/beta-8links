/** Evolution API - WhatsApp integration */

function getConfig() {
  const url = process.env.EVOLUTION_API_URL;
  const key = process.env.EVOLUTION_API_KEY;
  if (!url || !key) throw new Error("Evolution API not configured");
  return { url, key };
}

/** Send a WhatsApp message */
export async function sendWhatsAppMessage(to: string, text: string, instance = "8links") {
  const { url, key } = getConfig();

  const res = await fetch(`${url}/message/sendText/${instance}`, {
    method: "POST",
    headers: {
      "apikey": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      number: to,
      text,
    }),
  });

  if (!res.ok) throw new Error(`Evolution API error: ${res.status}`);
  return res.json();
}

/** Send a proactive alert via WhatsApp */
export async function sendAlert(to: string, type: "rank_up" | "rank_down" | "achievement" | "report" | "competitor", data: Record<string, string>) {
  const templates: Record<string, string> = {
    rank_up: `📈 Boa notícia! Sua keyword "${data.keyword}" subiu para a posição #${data.position}. ${data.position && parseInt(data.position) <= 10 ? "Você está na página 1! 🎉" : "Continue assim!"}`,
    rank_down: `⚠️ Alerta: sua keyword "${data.keyword}" caiu de #${data.from} para #${data.to}. Recomendamos atualizar o artigo. Quer que a gente atualize com IA? Responda SIM.`,
    achievement: `🏆 Conquista desbloqueada: ${data.label}! ${data.description}`,
    report: `📊 Seu relatório ${data.type} está pronto! Seu SEO vale R$${data.roi}/mês em Google Ads equivalente. Acesse: ${data.url}`,
    competitor: `🕵️ Seu concorrente ${data.domain} publicou ${data.count} artigos novos essa semana. Quer criar conteúdo melhor? Responda SIM.`,
  };

  const text = templates[type] ?? data.message ?? "Notificação do 8links";
  return sendWhatsAppMessage(to, text);
}
