// One-off: remove a 1ª imagem do `content` dos posts da rede (já existe como featured_image,
// estava sendo renderizada 2x nos sites). Slugs ficam intactos pra preservar URLs indexadas.
//
// Uso:
//   node scripts/backfill-posts.mjs --domain=cideb.com.br             (dry-run)
//   node scripts/backfill-posts.mjs --domain=cideb.com.br --apply     (executa)
//   node scripts/backfill-posts.mjs --apply                           (todos os domínios)

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// .env.local não é carregado por dotenv/config — carregar manualmente:
try {
  const envLocal = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of envLocal.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
} catch {}

const URL = process.env.NETWORK_SUPABASE_URL;
const KEY = process.env.NETWORK_SUPABASE_SERVICE_KEY;

if (!URL || !KEY) {
  console.error("Faltam env vars NETWORK_SUPABASE_URL / NETWORK_SUPABASE_SERVICE_KEY (.env.local)");
  process.exit(1);
}

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const domainArg = args.find(a => a.startsWith("--domain="))?.split("=")[1];

function extractFirstImage(content) {
  const lines = content.split("\n");
  let image = null;
  let idx = -1;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^!\[[^\]]*\]\(([^)]+)\)/);
    if (m) { image = m[1]; idx = i; break; }
  }
  if (idx === -1) return { content, image: null, changed: false };

  lines.splice(idx, 1);
  if (lines[idx] && /^\s*\*[^*\n]+\*\s*$/.test(lines[idx])) lines.splice(idx, 1);

  const cleaned = lines.join("\n").replace(/\n{3,}/g, "\n\n").replace(/^\s+/, "");
  return { content: cleaned, image, changed: cleaned !== content };
}

const supabase = createClient(URL, KEY);

console.log("=".repeat(70));
console.log(apply ? "🔥 APPLY MODE — vai escrever no banco" : "👀 DRY RUN — só lista, nada é gravado");
console.log("Domínio:", domainArg ?? "(todos)");
console.log("=".repeat(70));

let query = supabase
  .from("network_posts")
  .select("id, domain, slug, content, featured_image")
  .order("id");

if (domainArg) query = query.eq("domain", domainArg);

const { data: posts, error } = await query;

if (error) {
  console.error("Erro buscando posts:", error.message);
  process.exit(1);
}

console.log(`\n${posts.length} posts encontrados.\n`);

let changed = 0;
let skipped = 0;
let errors = 0;
const sampleDiffs = [];

for (const p of posts) {
  if (!p.content) { skipped++; continue; }

  const { content: cleanContent, image, changed: didChange } = extractFirstImage(p.content);

  if (!didChange) { skipped++; continue; }

  const sizeBefore = p.content.length;
  const sizeAfter = cleanContent.length;
  const diff = sizeBefore - sizeAfter;

  if (sampleDiffs.length < 3) {
    sampleDiffs.push({
      id: p.id,
      domain: p.domain,
      slug: p.slug,
      sizeBefore,
      sizeAfter,
      diff,
      imageRemoved: image,
      featuredImageMatches: image === p.featured_image,
    });
  }

  if (apply) {
    const { error: updateErr } = await supabase
      .from("network_posts")
      .update({ content: cleanContent })
      .eq("id", p.id);

    if (updateErr) {
      console.error(`  ❌ Erro id=${p.id}: ${updateErr.message}`);
      errors++;
      continue;
    }
  }

  changed++;
}

console.log("\n=".repeat(35));
console.log("Sample diffs (primeiros 3):");
for (const d of sampleDiffs) {
  console.log(`  id=${d.id} ${d.domain}/${d.slug}`);
  console.log(`    -${d.diff} chars (${d.sizeBefore} → ${d.sizeAfter})`);
  console.log(`    img removida: ${d.imageRemoved?.slice(0, 80)}...`);
  console.log(`    bate com featured_image: ${d.featuredImageMatches ? "✅" : "⚠️ DIFERENTE"}`);
}

console.log("\n=".repeat(35));
console.log(`Total: ${posts.length}`);
console.log(`Mudaram: ${changed}`);
console.log(`Sem mudança: ${skipped}`);
console.log(`Erros: ${errors}`);
console.log(apply ? "✅ APLICADO" : "ℹ️  DRY RUN — rode com --apply pra gravar");
