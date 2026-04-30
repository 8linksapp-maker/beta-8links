/**
 * Sentry Alerts Setup
 *
 * Creates 3 alert rules via the Sentry REST API:
 *  1. Novo erro em produção (qualquer issue novo)
 *  2. Erro regrediu (resolvido voltou)
 *  3. Pico de volume (50+ em 1h)
 *
 * Each alert posts to the Slack #alerts channel via the connected workspace.
 *
 * Usage: node scripts/sentry-setup-alerts.mjs
 *
 * Required env vars (from .env.local):
 *  - SENTRY_AUTH_TOKEN — must have scopes: alerts:write, org:read
 *
 * Required Sentry setup:
 *  - Slack integration installed (Settings → Integrations → Slack)
 *  - Channel #alerts exists in the workspace
 */

import { readFileSync } from "node:fs";

const ORG = "8links";
const PROJECT = "javascript-nextjs";
const SLACK_CHANNEL = "#alerts";
const ENVIRONMENT = "production";

// ─── Parse .env.local ────────────────────────────────────────────────────────
const env = {};
try {
  const raw = readFileSync(".env.local", "utf-8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch (e) {
  console.error("❌ Could not read .env.local:", e.message);
  process.exit(1);
}

const TOKEN = env.SENTRY_AUTH_TOKEN;
if (!TOKEN) {
  console.error("❌ SENTRY_AUTH_TOKEN not found in .env.local");
  process.exit(1);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function api(path, init = {}) {
  const res = await fetch(`https://sentry.io/api/0${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { ok: res.ok, status: res.status, body };
}

// ─── Step 1: Find Slack integration ──────────────────────────────────────────
console.log("🔍 Looking up Slack integration...");
const slackRes = await api(`/organizations/${ORG}/integrations/?provider_key=slack`);

if (!slackRes.ok) {
  console.error(`❌ Could not list integrations (HTTP ${slackRes.status}):`, slackRes.body);
  if (slackRes.status === 401 || slackRes.status === 403) {
    console.error(
      "\n⚠️  Token is missing required scopes. Generate a new token at:\n" +
        "   https://sentry.io/settings/account/api/auth-tokens/\n" +
        "   Required scopes: alerts:write, org:read"
    );
  }
  process.exit(1);
}

const integrations = Array.isArray(slackRes.body) ? slackRes.body : [];
const slack = integrations.find((i) => i.status === "active");

if (!slack) {
  console.error("❌ No active Slack integration found.");
  console.error("   Install at: https://8links.sentry.io/settings/integrations/slack/");
  process.exit(1);
}

console.log(`✅ Found Slack workspace: ${slack.name} (id=${slack.id})\n`);

// ─── Step 2: Define the 3 alert rules ────────────────────────────────────────
const slackAction = {
  id: "sentry.integrations.slack.notify_action.SlackNotifyServiceAction",
  workspace: slack.id,
  channel: SLACK_CHANNEL,
  tags: "",
  notes: "",
};

const envFilter = {
  id: "sentry.rules.filters.event_attribute.EventAttributeFilter",
  attribute: "environment",
  match: "eq",
  value: ENVIRONMENT,
};

const rules = [
  {
    name: "🔴 Novo erro em produção",
    actionMatch: "all",
    filterMatch: "all",
    conditions: [
      { id: "sentry.rules.conditions.first_seen_event.FirstSeenEventCondition" },
    ],
    filters: [envFilter],
    actions: [slackAction],
    frequency: 30,
    environment: ENVIRONMENT,
  },
  {
    name: "♻️ Erro regrediu (resolvido voltou)",
    actionMatch: "all",
    filterMatch: "all",
    conditions: [
      { id: "sentry.rules.conditions.regression_event.RegressionEventCondition" },
    ],
    filters: [envFilter],
    actions: [slackAction],
    frequency: 30,
    environment: ENVIRONMENT,
  },
  {
    name: "📈 Pico de volume (50+ em 1h)",
    actionMatch: "all",
    filterMatch: "all",
    conditions: [
      {
        id: "sentry.rules.conditions.event_frequency.EventFrequencyCondition",
        value: 50,
        interval: "1h",
      },
    ],
    filters: [envFilter],
    actions: [slackAction],
    frequency: 60,
    environment: ENVIRONMENT,
  },
  {
    name: "👥 Bug afetando múltiplos usuários (3+ em 1h)",
    actionMatch: "all",
    filterMatch: "all",
    conditions: [
      {
        id: "sentry.rules.conditions.event_frequency.EventUniqueUserFrequencyCondition",
        value: 3,
        interval: "1h",
      },
    ],
    filters: [envFilter],
    actions: [slackAction],
    frequency: 60,
    environment: ENVIRONMENT,
  },
];

// ─── Step 3: List existing rules (idempotent) ────────────────────────────────
console.log("🔍 Listing existing rules...");
const existingRes = await api(`/projects/${ORG}/${PROJECT}/rules/`);
const existingNames = new Set(
  Array.isArray(existingRes.body) ? existingRes.body.map((r) => r.name) : []
);
console.log(`   Found ${existingNames.size} existing rule(s)\n`);

// ─── Step 4: Create rules (skip duplicates) ──────────────────────────────────
let created = 0;
let skipped = 0;
let failed = 0;

for (const rule of rules) {
  if (existingNames.has(rule.name)) {
    console.log(`⏭️  Skipping (already exists): ${rule.name}\n`);
    skipped++;
    continue;
  }

  console.log(`📝 Creating: ${rule.name}`);
  const res = await api(`/projects/${ORG}/${PROJECT}/rules/`, {
    method: "POST",
    body: JSON.stringify(rule),
  });

  if (res.ok) {
    console.log(`   ✅ Created (id=${res.body?.id})\n`);
    created++;
  } else {
    console.error(`   ❌ Failed (HTTP ${res.status}):`, res.body);
    failed++;
  }
}

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log("─".repeat(60));
console.log(`Done. ${created} created, ${skipped} skipped, ${failed} failed.`);
console.log(`View at: https://${ORG}.sentry.io/alerts/rules/`);

if (failed > 0) process.exit(1);
