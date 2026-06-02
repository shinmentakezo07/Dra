-- Add user_id to prompts for user-scoped access control
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_prompts_user_id ON prompts(user_id);
