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

    const { data } = await supabase
      .from("client_sites")
      .select("id, url, niche_primary, da_current, seo_score, phase, autopilot_active, google_refresh_token, gsc_site_url, ga_property_id, github_token, github_repo, wp_url, avg_cpc")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

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
