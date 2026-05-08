const COMBINING_MARKS = /[̀-ͯ]/g;

const FILLER_PATTERNS = [
  /-guia-(completo|definitivo|atualizado|pratico|essencial)(-e-(pratico|atualizado|comparativo|vantagens|seguro))?/g,
  /-para-(escolher|acertar|otimizar|aumentar|cuidar|facilitar|comprar|montar|proteger|cuidar-do-seu-veiculo)[a-z0-9-]*$/,
  /-em-20\d{2}$/,
  /-20\d{2}$/,
  /-(e-pratico|e-comparativo|e-vantagens|e-seguro|e-dicas-essenciais|e-atualizado)$/,
];

const ORPHAN_TRAILING = /-(para|em|de|do|da|dos|das|com|e|ou|por|no|na|nos|nas|sobre|os|as|um|uma|o|a|que|se)$/;

export function buildSlug(title: string, maxLength = 55, minLength = 25): string {
  const baseSlug = (title ?? "post")
    .toLowerCase()
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  let stripped = baseSlug;
  let prev = "";
  while (prev !== stripped) {
    prev = stripped;
    for (const p of FILLER_PATTERNS) stripped = stripped.replace(p, "");
    stripped = stripped.replace(/^-|-$/g, "");
  }

  // Aggressive strip can leave the slug too short to be useful for SEO.
  // If so, fall back to the base (only normalize+lowercase, no filler removal).
  let slug = stripped.length >= minLength ? stripped : baseSlug;

  if (slug.length > maxLength) {
    const truncated = slug.slice(0, maxLength);
    const lastDash = truncated.lastIndexOf("-");
    slug = lastDash > maxLength * 0.5 ? truncated.slice(0, lastDash) : truncated;
  }

  // Strip orphan connectors at the end, but never go below minLength.
  while (ORPHAN_TRAILING.test(slug)) {
    const next = slug.replace(ORPHAN_TRAILING, "");
    if (next.length < minLength) break;
    slug = next;
  }

  return slug || "post";
}

export function extractFirstImage(content: string): { content: string; image: string | null } {
  const lines = content.split("\n");
  let image: string | null = null;
  let idx = -1;

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^!\[[^\]]*\]\(([^)]+)\)/);
    if (m) {
      image = m[1];
      idx = i;
      break;
    }
  }

  if (idx === -1) {
    const htmlMatch = content.match(/src="([^"]+)"/);
    return { content, image: htmlMatch?.[1] ?? null };
  }

  lines.splice(idx, 1);
  if (lines[idx] && /^\s*\*[^*\n]+\*\s*$/.test(lines[idx])) {
    lines.splice(idx, 1);
  }

  return {
    content: lines.join("\n").replace(/\n{3,}/g, "\n\n").replace(/^\s+/, ""),
    image,
  };
}
