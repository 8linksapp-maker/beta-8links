-- Usage tracking: count monthly usage per action per user
-- No balance to maintain, no cron to reset — just count rows this month
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('keyword_search', 'keyword_plan', 'article', 'diagnostic', 'backlink')),
  reference_id TEXT,              -- optional: keyword, backlink id, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_usage_user_action_month ON usage_tracking(user_id, action, created_at);

-- RLS: users can see their own usage
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own usage" ON usage_tracking
  FOR SELECT USING (auth.uid() = user_id);

-- Insert policy: allow server (service role) to insert
-- Users don't insert directly — API routes do via service role
CREATE POLICY "Service inserts usage" ON usage_tracking
  FOR INSERT WITH CHECK (true);
