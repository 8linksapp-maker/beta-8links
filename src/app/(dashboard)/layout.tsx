"use client";

import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { CommandPalette } from "@/components/layout/command-palette";
import { useUser } from "@/lib/hooks/use-user";
import { cn } from "@/lib/utils";
import { PLANS } from "@/lib/constants";
import { SiteProvider } from "@/lib/hooks/use-site";
import { createClient } from "@/lib/supabase/client";
import { MigrationBanner } from "@/components/migration-banner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile, loading } = useUser();

  // Track last activity for cron optimization
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from("profiles")
          .update({ last_active_at: new Date().toISOString() })
          .eq("id", user.id)
          .then(({ error }) => {
            if (error) console.error("[Layout] Error updating last_active_at:", error.message);
          });
      }
    }).catch((err) => {
      console.error("[Layout] Error getting user:", err);
    });
  }, []);

  const userName = profile?.name || profile?.email?.split("@")[0] || "Usuário";
  const planId = (profile?.plan_id || "starter") as keyof typeof PLANS;
  const plan = PLANS[planId];

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-[hsl(35,100%,60%)] animate-pulse" />
      </div>
    );
  }

  return (
    <SiteProvider>
    <div className="flex h-screen overflow-hidden">
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className={cn(
        "fixed lg:relative z-50 h-full transition-transform duration-300",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <AppSidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
          userName={userName}
          userPlan={plan?.name ?? "Starter"}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          onMenuClick={() => setMobileOpen(!mobileOpen)}
          userName={userName}
          planName={plan?.name ?? "Starter"}
        />
        <MigrationBanner />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1400px] p-6">
            {children}
          </div>
        </main>
      </div>

      <CommandPalette />
    </div>
    </SiteProvider>
  );
}
