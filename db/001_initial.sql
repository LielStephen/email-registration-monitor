CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO users (id, email) VALUES ('local-user', 'local@example.invalid') ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS email_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('gmail', 'outlook')),
  email_address TEXT NOT NULL,
  encrypted_tokens TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, provider)
);
CREATE TABLE IF NOT EXISTS monitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_account_id UUID NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
  registration_number TEXT NOT NULL,
  poll_interval_seconds INTEGER NOT NULL DEFAULT 60 CHECK (poll_interval_seconds >= 30),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_scanned_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS processed_messages (
  monitor_id UUID NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  provider_message_id TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (monitor_id, provider_message_id)
);
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id UUID NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  provider_message_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  sender TEXT,
  received_at TIMESTAMPTZ,
  filename TEXT,
  location TEXT NOT NULL,
  location_key TEXT NOT NULL,
  excerpt TEXT,
  status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (monitor_id, provider_message_id, location_key)
);
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (match_id)
);
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, subscription)
);
CREATE TABLE IF NOT EXISTS oauth_states (
  state TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
