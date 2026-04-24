"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Globe, Layers, MessageSquare, Search,
  Zap, Key, ScrollText, Link as LinkIcon, ArrowLeft, Activity, Ticket,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const adminNav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Usuários", icon: Users },
  { href: "/admin/network", label: "Rede de Sites", icon: Globe },
  { href: "/admin/queues", label: "Filas", icon: Layers },
  { href: "/admin/support", label: "Suporte", icon: MessageSquare },
  { href: "/admin/automation", label: "Automação", icon: Zap },
  { href: "/admin/api-keys", label: "API Keys", icon: Key },
  { href: "/admin/logs", label: "Logs", icon: ScrollText },
  { href: "/admin/tickets", label: "Tickets", icon: Ticket },
  { href: "/admin/searches", label: "Pesquisas", icon: Search },
  { href: "/admin/content-planner", label: "Planejamento", icon: LinkIcon },
  { href: "/admin/monitor", label: "Monitor APIs", icon: Activity },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Admin Sidebar */}
      <aside className="w-56 bg-[hsl(20,12%,5%)] border-r border-border flex flex-col shrink-0">
        <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-destructive to-[hsl(15,90%,55%)] flex items-center justify-center">
            <LinkIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-sm font-black font-[family-name:var(--font-display)] tracking-tight">8links</span>
            <span className="text-[10px] font-mono text-destructive block -mt-0.5">ADMIN</span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {adminNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
                  isActive
                    ? "bg-destructive/10 text-destructive font-semibold ring-1 ring-destructive/20"
                    : "text-[hsl(20,10%,50%)] hover:text-foreground hover:bg-white/[0.03]"
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground">
              <ArrowLeft className="w-4 h-4" /> Voltar ao App
            </Button>
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
