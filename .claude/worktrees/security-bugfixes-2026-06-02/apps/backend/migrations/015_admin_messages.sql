-- Admin Messages: direct messaging from admin to users
-- Supports targeting: all users, specific users, by tier, by group

CREATE TABLE IF NOT EXISTS admin_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'normal',
    target_type TEXT NOT NULL DEFAULT 'all',
    target_ids TEXT[] DEFAULT '{}',
    sent_by UUID NOT NULL REFERENCES users(id),
    sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_messages_sent_by ON admin_messages(sent_by);
CREATE INDEX IF NOT EXISTS idx_admin_messages_target_type ON admin_messages(target_type);
CREATE INDEX IF NOT EXISTS idx_admin_messages_sent_at ON admin_messages(sent_at);

-- Track which users have read which messages
CREATE TABLE IF NOT EXISTS admin_message_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES admin_messages(id),
    user_id UUID NOT NULL REFERENCES users(id),
    read_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_message_reads_message ON admin_message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_admin_message_reads_user ON admin_message_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_message_reads_unique ON admin_message_reads(message_id, user_id);
