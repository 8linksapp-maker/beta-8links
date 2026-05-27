"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

interface SiteData {
  id: string;
  url: string;
  niche_primary: string | null;
  da_current: number;
  seo_score: number;
  phase: string;
  autopilot_active: boolean;
  google_refresh_token: string | null;
  gsc_site_url: string | null;
  ga_property_id: string | null;
  github_token: string | null;
  github_repo: string | null;
  wp_url: string | null;
  // Optional fields — only present after migrations 024/025 are applied
  gsc_clicks_28d?: number | null;
  gsc_impressions_28d?: number | null;
  gsc_avg_position?: number | null;
  last_synced_at?: string | null;
  external_backlinks_total?: number | null;
}

interface SiteContextType {
  sites: SiteData[];
  activeSite: SiteData | null;
  activeSiteId: string | null;
  setActiveSiteId: (id: string) => void;
  loading: boolean;
  reload: () => Promise<void>;
}

const SiteContext = createContext<SiteContextType>({
  sites: [],
  activeSite: null,
  activeSiteId: null,
  setActiveSiteId: () => {},
  loading: true,
  reload: async () => {},
});

const STORAGE_KEY = "8links_active_site";

export function SiteProvider({ children }: { children: ReactNode }) {
  const [sites, setSites] = useState<SiteData[]>([]);
  const [activeSiteId, setActiveSiteIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSites = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // Try with the new GSC/backlinks columns first; fall back to the legacy SELECT
    // if migrations 024/025 haven't been applied yet (otherwise Postgres rejects the whole query).
    let { data, error } = await supabase
      .from("client_sites")
      .select("id, url, niche_primary, da_current, seo_score, phase, autopilot_active, google_refresh_token, gsc_site_url, ga_property_id, github_token, github_repo, wp_url, avg_cpc, gsc_clicks_28d, gsc_impressions_28d, gsc_avg_position, last_synced_at, external_backlinks_total")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[useSite] sync columns missing — falling back to legacy SELECT. Run migrations 024/025 to enable GSC metrics.", error);
      const fallback = await supabase
        .from("client_sites")
        .select("id, url, niche_primary, da_current, seo_score, phase, autopilot_active, google_refresh_token, gsc_site_url, ga_property_id, github_token, github_repo, wp_url, avg_cpc")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      data = fallback.data as typeof data;
      if (fallback.error) console.error("[useSite] failed to load sites:", fallback.error);
    }

    const sitesList = data ?? [];
    setSites(sitesList);

    // Restore from localStorage or use first site
    const stored = localStorage.getItem(STORAGE_KEY);
    const validStored = stored && sitesList.some(s => s.id === stored);

    if (validStored) {
      setActiveSiteIdState(stored);
    } else if (sitesList.length > 0) {
      setActiveSiteIdState(sitesList[0].id);
      localStorage.setItem(STORAGE_KEY, sitesList[0].id);
    }

    setLoading(false);
  };

  useEffect(() => { loadSites(); }, []);

  // Listen to storage changes so newly created sites can become active immediately
  useEffect(() => {
    const handleRefresh = () => {
      loadSites();
    };
    // Custom event for same-tab dispatches (e.g., after creating a site)
    window.addEventListener("8links_sites_refresh", handleRefresh);
    // Storage event for cross-tab sync
    window.addEventListener("storage", handleRefresh);
    return () => {
      window.removeEventListener("8links_sites_refresh", handleRefresh);
      window.removeEventListener("storage", handleRefresh);
    };
  }, []);

  const setActiveSiteId = (id: string) => {
    setActiveSiteIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  };

  const activeSite = sites.find(s => s.id === activeSiteId) ?? null;

  return (
    <SiteContext.Provider value={{ sites, activeSite, activeSiteId, setActiveSiteId, loading, reload: loadSites }}>
      {children}
    </SiteContext.Provider>
  );
}

export function useSite() {
  return useContext(SiteContext);
}
