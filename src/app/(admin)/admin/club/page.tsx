"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  Play, Plus, Edit, Trash2, Search, Calendar, Clock, Users,
  CheckCircle2, XCircle, Eye, Send, ChevronRight, ArrowLeft,
  Video, Globe, Tag, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type Replay = {
  id: string;
  title: string;
  site_analyzed: string;
  niche: string;
  duration: string;
  video_url: string;
  highlights: string[];
  views: number;
  created_at: string;
};

type Session = {
  id: string;
  title: string;
  scheduled_at: string;
  max_slots: number;
  status: "scheduled" | "completed" | "cancelled";
};

type Candidate = {
  id: string;
  session_id: string;
  user_id: string;
  client_site_id: string;
  goal: string;
  selected: boolean;
  user_email?: string;
  profiles?: { email?: string } | null;
};

export default function ClubAdminPage() {
  const [activeTab, setActiveTab] = useState<"replays" | "sessions" | "candidates">("replays");
  const [replays, setReplays] = useState<Replay[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Dialog states
  const [replayDialogOpen, setReplayDialogOpen] = useState(false);
  const [editingReplay, setEditingReplay] = useState<Replay | null>(null);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);

  // Form states
  const [replayForm, setReplayForm] = useState({
    title: "",
    site_analyzed: "",
    niche: "",
    duration: "",
    video_url: "",
    highlights: "",
  });

  // Upload states
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [sessionForm, setSessionForm] = useState({
    title: "",
    scheduled_at: "",
    max_slots: 5,
    status: "scheduled" as Session["status"],
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const supabase = createClient();

    const [replaysRes, sessionsRes, candidatesRes] = await Promise.all([
      supabase.from("club_replays").select("*").order("created_at", { ascending: false }),
      supabase.from("club_sessions").select("*").order("scheduled_at", { ascending: false }),
      supabase.from("club_candidates").select("*, profiles!inner(email, name)"),
    ]);

    if (replaysRes.data) setReplays(replaysRes.data);
    if (sessionsRes.data) setSessions(sessionsRes.data);
    if (candidatesRes.data) setCandidates(candidatesRes.data);

    setLoading(false);
  }

  async function handleSaveReplay() {
    const supabase = createClient();
    const highlightsArray = replayForm.highlights.split("\n").filter(h => h.trim());

    const payload = {
      title: replayForm.title,
      site_analyzed: replayForm.site_analyzed,
      niche: replayForm.niche,
      duration: replayForm.duration,
      video_url: replayForm.video_url,
      highlights: highlightsArray,
      views: 0,
    };

    let error;
    if (editingReplay) {
      const res = await supabase.from("club_replays").update(payload).eq("id", editingReplay.id);
      error = res.error;
    } else {
      const res = await supabase.from("club_replays").insert(payload);
      error = res.error;
    }

    if (error) {
      toast.error("Erro ao salvar replay");
      return;
    }

    toast.success(editingReplay ? "Replay atualizado" : "Replay criado");
    setReplayDialogOpen(false);
    setEditingReplay(null);
    setReplayForm({ title: "", site_analyzed: "", niche: "", duration: "", video_url: "", highlights: "" });
    loadData();
  }

  async function handleDeleteReplay(id: string) {
    if (!confirm("Tem certeza que deseja deletar este replay?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("club_replays").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao deletar");
      return;
    }
    toast.success("Replay deletado");
    loadData();
  }

  async function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/club/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro no upload');
      }

      setReplayForm({ ...replayForm, video_url: data.publicUrl });
      toast.success('Vídeo enviado com sucesso!');
    } catch (error) {
      console.error('[Upload Error]', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao fazer upload do vídeo');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      e.target.value = '';
    }
  }

  async function handleSaveSession() {
    if (!sessionForm.scheduled_at) {
      toast.error("Informe a data da sessão");
      return;
    }
    if (!sessionForm.title.trim()) {
      toast.error("Informe o título da sessão");
      return;
    }
    const supabase = createClient();
    const payload = {
      title: sessionForm.title,
      scheduled_at: new Date(sessionForm.scheduled_at).toISOString(),
      max_slots: sessionForm.max_slots,
      status: sessionForm.status,
    };

    let error;
    if (editingSession) {
      const res = await supabase.from("club_sessions").update(payload).eq("id", editingSession.id);
      error = res.error;
    } else {
      const res = await supabase.from("club_sessions").insert(payload);
      error = res.error;
    }

    if (error) {
      toast.error("Erro ao salvar sessão");
      return;
    }

    toast.success(editingSession ? "Sessão atualizada" : "Sessão criada");
    setSessionDialogOpen(false);
    setEditingSession(null);
    setSessionForm({ title: "", scheduled_at: "", max_slots: 5, status: "scheduled" });
    loadData();
  }

  async function handleDeleteSession(id: string) {
    if (!confirm("Tem certeza que deseja deletar esta sessão?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("club_sessions").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao deletar");
      return;
    }
    toast.success("Sessão deletada");
    loadData();
  }

  async function handleToggleCandidate(candidateId: string, selected: boolean) {
    const supabase = createClient();
    const { error } = await supabase.from("club_candidates").update({ selected }).eq("id", candidateId);
    if (error) {
      toast.error("Erro ao atualizar candidato");
      return;
    }
    toast.success(selected ? "Candidato selecionado" : "Candidato desmarcado");
    loadData();
  }

  function openNewReplayDialog() {
    setEditingReplay(null);
    setReplayForm({ title: "", site_analyzed: "", niche: "", duration: "", video_url: "", highlights: "" });
    setReplayDialogOpen(true);
  }

  function openEditReplayDialog(replay: Replay) {
    setEditingReplay(replay);
    setReplayForm({
      title: replay.title,
      site_analyzed: replay.site_analyzed || "",
      niche: replay.niche || "",
      duration: replay.duration || "",
      video_url: replay.video_url || "",
      highlights: replay.highlights?.join("\n") || "",
    });
    setReplayDialogOpen(true);
  }

  function openNewSessionDialog() {
    setEditingSession(null);
    setSessionForm({ title: "", scheduled_at: "", max_slots: 5, status: "scheduled" });
    setSessionDialogOpen(true);
  }

  function openEditSessionDialog(session: Session) {
    setEditingSession(session);
    setSessionForm({
      title: session.title || "",
      scheduled_at: session.scheduled_at,
      max_slots: session.max_slots,
      status: session.status,
    });
    setSessionDialogOpen(true);
  }

  const filteredReplays = replays.filter(r =>
    r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.niche.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.site_analyzed?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCandidates = candidates.filter(c =>
    c.client_site_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.user_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold font-[family-name:var(--font-display)] tracking-tight mb-1">Club 8links</h1>
          <p className="text-sm text-muted-foreground">Gerencie replays, sessões e candidatos</p>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab("replays")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "replays"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Play className="w-4 h-4 inline mr-2" />
          Replays
        </button>
        <button
          onClick={() => setActiveTab("sessions")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "sessions"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Calendar className="w-4 h-4 inline mr-2" />
          Sessões
        </button>
        <button
          onClick={() => setActiveTab("candidates")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "candidates"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          Candidatos
        </button>
      </div>

      {/* Replays Tab */}
      {activeTab === "replays" && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Video className="w-5 h-5" />
                  Replays
                </CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar..."
                      className="pl-9 w-64"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Button onClick={openNewReplayDialog}>
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Replay
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Nicho</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReplays.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {loading ? "Carregando..." : "Nenhum replay encontrado"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReplays.map((replay) => (
                      <TableRow key={replay.id}>
                        <TableCell className="font-medium max-w-[300px] truncate">{replay.title}</TableCell>
                        <TableCell><Badge variant="outline">{replay.niche}</Badge></TableCell>
                        <TableCell className="text-muted-foreground">{replay.site_analyzed || "-"}</TableCell>
                        <TableCell>{replay.duration || "-"}</TableCell>
                        <TableCell>{replay.views}</TableCell>
                        <TableCell>{new Date(replay.created_at).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEditReplayDialog(replay)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteReplay(replay.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Sessions Tab */}
      {activeTab === "sessions" && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Sessões Agendadas
                </CardTitle>
                <Button onClick={openNewSessionDialog}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Sessão
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Vagas</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Nenhuma sessão encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    sessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell>{new Date(session.scheduled_at).toLocaleString("pt-BR")}</TableCell>
                        <TableCell>{session.max_slots} vagas</TableCell>
                        <TableCell>
                          <Badge variant={session.status === "scheduled" ? "default" : session.status === "completed" ? "success" : "destructive"}>
                            {session.status === "scheduled" ? "Agendada" : session.status === "completed" ? "Concluída" : "Cancelada"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEditSessionDialog(session)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteSession(session.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Candidates Tab */}
      {activeTab === "candidates" && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Candidatos
                </CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    className="pl-9 w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Objetivo</TableHead>
                    <TableHead>Sessão</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCandidates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {loading ? "Carregando..." : "Nenhum candidato encontrado"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCandidates.map((candidate) => {
                      const profile = candidate.profiles as any;
                      const email = profile?.email || candidate.user_email || "-";
                      return (
                        <TableRow key={candidate.id}>
                          <TableCell>{email}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{candidate.client_site_id}</span>
                              {candidate.selected && (
                                <Badge variant="success" className="text-xs">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Analisado
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate">{candidate.goal}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {new Date(
                                sessions.find(s => s.id === candidate.session_id)?.scheduled_at || ""
                              ).toLocaleDateString("pt-BR")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={candidate.selected ? "success" : "default"}>
                              {candidate.selected ? "Selecionado" : "Pendente"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {candidate.selected ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleCandidate(candidate.id, false)}
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleCandidate(candidate.id, true)}
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Replay Dialog */}
      <Dialog open={replayDialogOpen} onOpenChange={setReplayDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingReplay ? "Editar Replay" : "Novo Replay"}</DialogTitle>
            <DialogDescription>
              Preencha os dados do replay da análise do Club.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  placeholder="Análise: E-commerce de Roupas Fitness"
                  value={replayForm.title}
                  onChange={(e) => setReplayForm({ ...replayForm, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Nicho</Label>
                <Input
                  placeholder="Fitness"
                  value={replayForm.niche}
                  onChange={(e) => setReplayForm({ ...replayForm, niche: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Site Analisado</Label>
              <Input
                placeholder="fitstore.com.br"
                value={replayForm.site_analyzed}
                onChange={(e) => setReplayForm({ ...replayForm, site_analyzed: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>URL do Vídeo (Backblaze B2)</Label>
              <Input
                placeholder="https://f001.backblazeb2.com/file/seu-bucket/video.mp4"
                value={replayForm.video_url}
                onChange={(e) => setReplayForm({ ...replayForm, video_url: e.target.value })}
              />
              {replayForm.video_url && (
                <p className="text-xs text-muted-foreground truncate">URL: {replayForm.video_url}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Ou faça upload para Backblaze B2</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoUpload}
                  disabled={uploading}
                  className="hidden"
                  id="video-upload"
                />
                <label htmlFor="video-upload" className="cursor-pointer">
                  {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-primary">Enviando vídeo...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <p className="text-sm text-muted-foreground">Clique para selecionar o vídeo</p>
                      <p className="text-xs text-muted-foreground">MP4, WebM, etc.</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Duração</Label>
              <Input
                placeholder="42min"
                value={replayForm.duration}
                onChange={(e) => setReplayForm({ ...replayForm, duration: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Highlights (um por linha)</Label>
              <Textarea
                placeholder="DA subiu 15 pontos em 3 meses&#10;Backlinks de nicho esportivo&#10;Artigos com 2.000+ palavras rankeando"
                rows={4}
                value={replayForm.highlights}
                onChange={(e) => setReplayForm({ ...replayForm, highlights: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplayDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveReplay}>
              {editingReplay ? "Atualizar" : "Criar"} Replay
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Session Dialog */}
      <Dialog open={sessionDialogOpen} onOpenChange={setSessionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSession ? "Editar Sessão" : "Nova Sessão"}</DialogTitle>
            <DialogDescription>
              Agende uma nova sessão ao vivo do Club.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título da Sessão</Label>
              <Input
                placeholder="Ex: Análise de Sites - Turma Abril"
                value={sessionForm.title}
                onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Data/Hora</Label>
              <Input
                type="datetime-local"
                value={sessionForm.scheduled_at}
                onChange={(e) => setSessionForm({ ...sessionForm, scheduled_at: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Vagas Máximas</Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={sessionForm.max_slots}
                onChange={(e) => setSessionForm({ ...sessionForm, max_slots: parseInt(e.target.value) || 5 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={sessionForm.status}
                onChange={(e) => setSessionForm({ ...sessionForm, status: e.target.value as Session["status"] })}
              >
                <option value="scheduled">Agendada</option>
                <option value="completed">Concluída</option>
                <option value="cancelled">Cancelada</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSessionDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveSession}>
              {editingSession ? "Atualizar" : "Criar"} Sessão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
