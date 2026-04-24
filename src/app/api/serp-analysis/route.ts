import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { keyword } = await request.json();
  if (!keyword) return NextResponse.json({ error: "keyword required" }, { status: 400 });

  if (!process.env.DATAFORSEO_LOGIN) {
    return NextResponse.json({ error: "DataForSEO not configured" });
  }

  try {
    const { analyzeSERP, parsePageContent } = await import("@/lib/apis/dataforseo");
    const serpResult = await analyzeSERP(keyword);

    const items = serpResult?.tasks?.[0]?.result?.[0]?.items ?? [];
    const organicResults = items.filter((item: any) => item.type === "organic").slice(0, 10);

    const competitors = organicResults.map((item: any) => ({
      position: item.rank_absolute,
      url: item.url,
      domain: item.domain,
      title: item.title,
      description: item.description,
      breadcrumb: item.breadcrumb,
    }));

    // Parse top 3 pages for content analysis
    const contentAnalysis = [];
    for (const comp of competitors.slice(0, 3)) {
      try {
        const pageContent = await parsePageContent(comp.url);
        const content = pageContent?.tasks?.[0]?.result?.[0];
        contentAnalysis.push({
          url: comp.url,
          domain: comp.domain,
          wordCount: content?.plain_text_word_count ?? 0,
          headingsCount: (content?.headings?.h2?.length ?? 0) + (content?.headings?.h3?.length ?? 0),
          imagesCount: content?.images?.length ?? 0,
          headings: {
            h2: content?.headings?.h2 ?? [],
            h3: content?.headings?.h3 ?? [],
          },
        });
      } catch {
        contentAnalysis.push({
          url: comp.url,
          domain: comp.domain,
          wordCount: 0,
          headingsCount: 0,
          imagesCount: 0,
          headings: { h2: [], h3: [] },
        });
      }
    }

    // Calculate averages for Content Score targets
    const avgWordCount = contentAnalysis.length > 0
      ? Math.round(contentAnalysis.reduce((a, c) => a + c.wordCount, 0) / contentAnalysis.length)
      : 2000;
    const avgHeadings = contentAnalysis.length > 0
      ? Math.round(contentAnalysis.reduce((a, c) => a + c.headingsCount, 0) / contentAnalysis.length)
      : 12;
    const avgImages = contentAnalysis.length > 0
      ? Math.round(contentAnalysis.reduce((a, c) => a + c.imagesCount, 0) / contentAnalysis.length)
      : 6;

    // Extract common terms from headings (simplified NLP)
    const allHeadings = contentAnalysis.flatMap(c => [...c.headings.h2, ...c.headings.h3]);
    const wordFreq: Record<string, number> = {};
    for (const heading of allHeadings) {
      const words = (heading as string).toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
      for (const word of words) {
        wordFreq[word] = (wordFreq[word] ?? 0) + 1;
      }
    }
    const commonTerms = Object.entries(wordFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .map(([term, count]) => ({ term, frequency: count, target: Math.max(2, Math.min(7, count)) }));

    return NextResponse.json({
      keyword,
      competitors,
      contentAnalysis,
      targets: {
        wordCount: avgWordCount,
        headings: avgHeadings,
        images: avgImages,
      },
      commonTerms,
      totalResults: serpResult?.tasks?.[0]?.result?.[0]?.se_results_count ?? 0,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) });
  }
}
