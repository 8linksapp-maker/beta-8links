"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Globe, Link as LinkIcon, Mail, Shield, Calendar,
  ExternalLink, Trash2, Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [user, setUser] = useState<any>(null);
  const [sites, setSites] = useState<any[]>([]);
  const [backlinks, setBacklinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/admin/users/${userId}`);
      const data = await res.json();
      if (data.user) setUser(data.user);
      if (data.sites) setSites(data.sites);
      if (data.backlinks) setBacklinks(data.backlinks);
      setLoading(false);
    }
    load();
  }, [userId]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!user) return <div className="text-center py-20 text-muted-foreground">Usuário não encontrado</div>;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.push("/admin/users")} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold font-[family-name:var(--font-display)]">{user.name}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" /> {user.email}</p>
        </div>
        <Badge variant={user.status === "active" ? "success" : user.status === "trialing" ? "info" : "outline"} className="text-xs">
          {user.status === "active" ? "Ativo" : user.status === "trialing" ? "Trial" : user.status === "past_due" ? "Pendente" : "Cancelado"}
        </Badge>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <InfoCard label="Plano" value={user.plan} />
        <InfoCard label="Role" value={user.role} />
        <InfoCard label="Sites" value={sites.length} />
        <InfoCard label="Backlinks" value={backlinks.length} />
        <InfoCard label="Cadastro" value={new Date(user.joined).toLocaleDateString("pt-BR")} />
      </div>

      {/* Sites */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold flex items-center gap-2"><Globe className="w-4 h-4 text-primary" /> Sites cadastrados</h2>
            <span className="text-[10px] font-mono text-muted-foreground">{sites.length} sites</span>
          </div>

          {sites.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum site cadastrado</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left text-[10px] font-semibold text-muted-foreground px-3 py-2 uppercase tracking-wider font-mono">URL</th>
                    <th className="text-left text-[10px] font-semibold text-muted-foreground px-3 py-2 uppercase tracking-wider font-mono">Nicho</th>
                    <th className="text-center text-[10px] font-semibold text-muted-foreground px-3 py-2 uppercase tracking-wider font-mono">DA</th>
                    <th className="text-right text-[10px] font-semibold text-muted-foreground px-3 py-2 uppercase tracking-wider font-mono">Criado em</th>
                  </tr>
                </thead>
                <tbody>
                  {sites.map((site: any) => (
                    <tr key={site.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-3 py-2.5">
                        <a href={site.url} target="_blank" rel="noopener noreferrer"
                          className="text-xs font-mono text-primary hover:underline flex items-center gap-1">
                          {site.url?.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant="outline" className="text-[10px]">{site.niche_primary ?? "—"}</Badge>
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono font-bold">{site.da_current ?? 0}</td>
                      <td className="px-3 py-2.5 text-right text-[10px] font-mono text-muted-foreground">
                        {site.created_at ? new Date(site.created_at).toLocaleDateString("pt-BR") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Backlinks */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold flex items-center gap-2"><LinkIcon className="w-4 h-4 text-primary" /> Backlinks</h2>
            <span className="text-[10px] font-mono text-muted-foreground">{backlinks.length} backlinks</span>
          </div>

          {backlinks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum backlink criado</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left text-[10px] font-semibold text-muted-foreground px-3 py-2 uppercase tracking-wider font-mono">Status</th>
                    <th className="text-left text-[10px] font-semibold text-muted-foreground px-3 py-2 uppercase tracking-wider font-mono">Âncora</th>
                    <th className="text-left text-[10px] font-semibold text-muted-foreground px-3 py-2 uppercase tracking-wider font-mono">Destino</th>
                    <th className="text-left text-[10px] font-semibold text-muted-foreground px-3 py-2 uppercase tracking-wider font-mono">Artigo</th>
                    <th className="text-right text-[10px] font-semibold text-muted-foreground px-3 py-2 uppercase tracking-wider font-mono">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {backlinks.slice(0, 50).map((bl: any) => (
                    <tr key={bl.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-3 py-2">
                        <Badge variant={bl.status === "published" ? "success" : bl.status === "error" ? "error" : "pending"} className="text-[9px]">
                          {bl.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-xs font-medium break-words max-w-[150px]">{bl.anchor_text ?? "—"}</td>
                      <td className="px-3 py-2 text-[10px] font-mono text-muted-foreground truncate max-w-[200px]">{bl.target_url?.replace(/^https?:\/\//, "") ?? "—"}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground truncate max-w-[200px]">{bl.article_title ?? "—"}</td>
                      <td className="px-3 py-2 text-right text-[10px] font-mono text-muted-foreground">
                        {bl.created_at ? new Date(bl.created_at).toLocaleDateString("pt-BR") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {backlinks.length > 50 && (
                <p className="text-center text-[10px] text-muted-foreground py-2">Mostrando 50 de {backlinks.length}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: any }) {
  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">{label}</p>
        <p className="text-lg font-bold font-mono mt-0.5">{value}</p>
      </CardContent>
    </Card>
  );
}
