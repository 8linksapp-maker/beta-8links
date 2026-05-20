"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { useUser } from "@/lib/hooks/use-user";
import { cn } from "@/lib/utils";
import { PLANS } from "@/lib/constants";
import { SiteProvider } from "@/lib/hooks/use-site";
import { createClient } from "@/lib/supabase/client";
import { MigrationBanner } from "@/components/migration-banner";
import { SentryUserSync } from "@/components/sentry-user-sync";
import { SimpleModeBanner } from "@/components/simple-mode-banner";
import { WhatsAppFab } from "@/components/whatsapp-fab";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

// Command palette ships cmdk (~30 KB) and only opens on Ctrl/Cmd+K. Defer
// the bundle until the user actually triggers it.
const CommandPalette = dynamic(
  () => import("@/components/layout/command-palette").then(m => ({ default: m.CommandPalette })),
  { ssr: false }
);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile, loading } = useUser();
  const router = useRouter();

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

  // Bloqueia usuários inativos (exceto active e trialing)
  if (!loading && profile && !["active", "trialing"].includes(profile.subscription_status)) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="max-w-md text-center space-y-6 p-8">
          <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold font-[family-name:var(--font-display)] mb-2">
              Assinatura suspensa
            </h1>
            <p className="text-muted-foreground">
              Sua assinatura está {profile.subscription_status === "canceled" ? "cancelada" : "com pendência"}.
              Regularize seu pagamento para continuar usando o 8links.
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => window.open("/api/billing/portal", "_blank")}>
              Regularizar Pagamento
            </Button>
            <Button variant="outline" onClick={() => router.push("/sites")}>
              Ver Meus Sites
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="w-8 h-8 rounded-lg bg-primary/40 animate-pulse" />
      </div>
    );
  }

  return (
    <SiteProvider>
    <SentryUserSync />
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
        <SimpleModeBanner />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1400px] p-6">
            {children}
          </div>
        </main>
      </div>

      <CommandPalette />
      <WhatsAppFab />
    </div>
    </SiteProvider>
  );
}
