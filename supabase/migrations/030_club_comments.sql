-- ============================================
-- Comentários nos replays do Club
-- ============================================

-- Tabela de comentários
CREATE TABLE IF NOT EXISTS club_replay_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  replay_id UUID NOT NULL REFERENCES club_replays(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de respostas aos comentários
CREATE TABLE IF NOT EXISTS club_replay_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES club_replay_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices pra performance
CREATE INDEX IF NOT EXISTS idx_club_replay_comments_replay_id ON club_replay_comments(replay_id);
CREATE INDEX IF NOT EXISTS idx_club_replay_comments_user_id ON club_replay_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_club_replay_replies_comment_id ON club_replay_replies(comment_id);
CREATE INDEX IF NOT EXISTS idx_club_replay_replies_user_id ON club_replay_replies(user_id);

-- RLS Policies
ALTER TABLE club_replay_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_replay_replies ENABLE ROW LEVEL SECURITY;

-- Comentários: qualquer usuário autenticado pode ler
CREATE POLICY "Usuários autenticados podem ver comentários"
  ON club_replay_comments FOR SELECT
  TO authenticated
  USING (true);

-- Comentários: apenas o próprio usuário pode criar
CREATE POLICY "Usuários podem criar seus próprios comentários"
  ON club_replay_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Comentários: apenas o próprio usuário pode deletar/editar
CREATE POLICY "Usuários podem editar/deletar seus próprios comentários"
  ON club_replay_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios comentários"
  ON club_replay_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Respostas: mesmas regras
CREATE POLICY "Usuários autenticados podem ver respostas"
  ON club_replay_replies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários podem criar suas próprias respostas"
  ON club_replay_replies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem editar/deletar suas próprias respostas"
  ON club_replay_replies FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias respostas"
  ON club_replay_replies FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
