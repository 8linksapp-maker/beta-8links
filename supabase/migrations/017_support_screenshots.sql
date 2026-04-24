-- Add screenshot support to messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS screenshot_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_type TEXT CHECK (attachment_type IN ('image', 'file'));

-- Add category to conversations (bug, feature, question)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'question' CHECK (category IN ('bug', 'feature', 'question'));

-- Allow staff to read all conversations and messages (for admin panel)
CREATE POLICY "Staff read all conversations" ON conversations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Staff update conversations" ON conversations
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Staff read all messages" ON messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Staff send messages" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Storage bucket for support screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('support', 'support', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can upload to support" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'support');

CREATE POLICY "Anyone can read support files" ON storage.objects
  FOR SELECT USING (bucket_id = 'support');
