-- WhatsApp community welcome message
-- Adds the phone number collected at signup and a timestamp marking
-- whether the automated WhatsApp welcome message has already been sent
-- (so it only goes out once per user, not on every login).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_welcome_sent_at TIMESTAMPTZ DEFAULT NULL;
