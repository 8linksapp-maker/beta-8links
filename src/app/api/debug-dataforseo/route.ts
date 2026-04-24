import { NextResponse } from "next/server";
import {
  getBacklinkSummary,
  getReferringDomains,
  getBacklinks,
  getKeywordRankings,
  getKeywordSuggestions,
  getRankedKeywords,
  getCompetitorDomains,
  analyzeSERP,
  checkAIOverview,
  parsePageContent,
} from "@/lib/apis/dataforseo";

/**
 * POST /api/debug-dataforseo
 * Proxy to call any DataForSEO function directly from the debug page.
 * Body: { fn: "functionName", args: [...] }
 */
export async function POST(request: Request) {
  const { fn, args } = await request.json();

  const fns: Record<string, (...a: any[]) => Promise<any>> = {
    getBacklinkSummary,
    getReferringDomains,
    getBacklinks,
    getKeywordRankings,
    getKeywordSuggestions,
    getRankedKeywords,
    getCompetitorDomains,
    analyzeSERP,
    checkAIOverview,
    parsePageContent,
  };

  if (!fns[fn]) {
    return NextResponse.json({ error: `Unknown function: ${fn}`, available: Object.keys(fns) }, { status: 400 });
  }

  try {
    const result = await fns[fn](...(args ?? []));
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: String(error) });
  }
}
