"use server";

import { createClient } from "@/lib/supabase/server";

export async function completeOnboarding(siteUrl: string, keywords: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Create client site
  const { data: site, error: siteError } = await supabase
    .from("client_sites")
    .insert({ user_id: user.id, url: siteUrl })
    .select()
    .single();

  if (siteError) return { error: siteError.message };

  // Add keywords
  if (keywords.length > 0) {
    const keywordRows = keywords.map((keyword) => ({
      client_site_id: site.id,
      user_id: user.id,
      keyword,
    }));

    const { error: kwError } = await supabase
      .from("keywords")
      .insert(keywordRows);

    if (kwError) return { error: kwError.message };
  }

  // Mark onboarding as completed
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ onboarding_completed: true })
    .eq("id", user.id);

  if (profileError) return { error: profileError.message };

  return { data: site };
}

export async function analyzeSite(url: string) {
  // Placeholder - will be replaced with DataForSEO integration
  const mockNiches = [
    "Tecnologia",
    "Saúde",
    "Finanças",
    "Marketing Digital",
    "E-commerce",
    "Educação",
    "Turismo",
    "Gastronomia",
  ];

  const mockKeywords = [
    "como criar site",
    "SEO para iniciantes",
    "marketing digital",
    "backlinks de qualidade",
    "otimização de site",
    "rankeamento google",
    "estratégia de conteúdo",
    "palavras-chave long tail",
    "autoridade de domínio",
    "link building",
  ];

  // Simulate async processing
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const niche = mockNiches[Math.floor(Math.random() * mockNiches.length)];
  const da = Math.floor(Math.random() * 40) + 5;
  const suggestedKeywords = mockKeywords
    .sort(() => Math.random() - 0.5)
    .slice(0, 5);

  return {
    url,
    niche,
    da,
    suggestedKeywords,
  };
}
