"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard, Globe, Search, Link as LinkIcon, FileText, Wand,
  ClipboardCheck, Map, Bot, Users, HeartPulse,
  Briefcase, BarChart3, Radio,
  MessageSquare, Settings, LogOut, ChevronLeft,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, Globe, Search, Link: LinkIcon, FileText, Wand,
  ClipboardCheck, Map, Bot, Users, HeartPulse,
  Briefcase, BarChart3, Radio,
  MessageSquare, Settings,
};

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  userName?: string;
  userPlan?: string;
}

export function AppSidebar({ collapsed, onToggle, userName = "Usuário", userPlan = "starter" }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const initials = userName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const renderGroup = (label: string, items: readonly { href: string; label: string; icon: string; soon?: boolean }[]) => (
    <div className="mb-2">
      {!collapsed && (
        <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-sidebar-muted px-3 py-2 font-mono">
          {label}
        </p>
      )}
      {items.map((item) => {
        const Icon = iconMap[item.icon] || Globe;
        const isSoon = "soon" in item && item.soon;
        const isActive = !isSoon && (pathname === item.href || pathname.startsWith(item.href + "/"));
        return isSoon ? (
          <div
            key={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm opacity-40 cursor-default",
              collapsed && "justify-center px-2",
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1">{item.label}</span>
                <span className="text-[8px] font-bold uppercase tracking-wider bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">breve</span>
              </>
            )}
          </div>
        ) : (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 group",
              collapsed && "justify-center px-2",
              isActive
                ? "bg-sidebar-active text-primary font-semibold ring-1 ring-primary/20"
                : "text-sidebar-foreground hover:text-foreground hover:bg-white/[0.03]"
            )}
          >
            <Icon className={cn("w-4 h-4 shrink-0", isActive && "text-primary")} />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        );
      })}
    </div>
  );

  return (
    <aside className={cn(
      "flex flex-col bg-sidebar border-r border-border h-full transition-all duration-300",
      collapsed ? "w-16" : "w-60"
    )}>
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-[hsl(35,100%,60%)] flex items-center justify-center shadow-[0_0_16px_hsl(24_100%_55%/0.3)] shrink-0">
            <LinkIcon className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <span className="text-sm font-black text-white font-[family-name:var(--font-display)] tracking-tight">
              8links
            </span>
          )}
        </div>
        <button
          onClick={onToggle}
          className="text-sidebar-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ChevronLeft className={cn("w-4 h-4 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {renderGroup("Principal", NAV_ITEMS.main)}
        {renderGroup("Inteligência", NAV_ITEMS.intelligence)}
        {renderGroup("Negócio", NAV_ITEMS.business)}
      </nav>

      {/* Bottom nav */}
      <div className="p-2 space-y-0.5">
        {NAV_ITEMS.bottom.map((item) => {
          const Icon = iconMap[item.icon] || Settings;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
                collapsed && "justify-center px-2",
                isActive
                  ? "bg-sidebar-active text-primary font-semibold"
                  : "text-sidebar-foreground hover:text-foreground hover:bg-white/[0.03]"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </div>

      {/* User */}
      <div className="p-3 border-t border-border">
        <div className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.03] transition-all",
          collapsed && "justify-center px-0"
        )}>
          <Avatar size="sm">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{userName}</p>
              <p className="text-[10px] font-mono text-primary font-semibold uppercase">{userPlan}</p>
            </div>
          )}
          <button onClick={handleSignOut} title="Sair" className="cursor-pointer hover:text-foreground transition-colors">
            <LogOut className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        </div>
      </div>
    </aside>
  );
}
