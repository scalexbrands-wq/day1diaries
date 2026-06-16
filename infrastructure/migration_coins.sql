-- ============================================================
-- HOTFIX MIGRATION — Coins system
-- ============================================================

-- Add coins to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS coins integer NOT NULL DEFAULT 0;

-- Track coin transactions
CREATE TABLE IF NOT EXISTS coin_transactions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES profiles(id) ON DELETE CASCADE,
  amount       integer NOT NULL,  -- positive = earn, negative = spend
  type         text NOT NULL,     -- 'story_publish', 'unlock_story', 'bonus'
  reference_id uuid,              -- story_id or other reference
  note         text,
  created_at   timestamptz DEFAULT now()
);

-- Track unlocked private stories
CREATE TABLE IF NOT EXISTS story_unlocks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES profiles(id) ON DELETE CASCADE,
  story_id   uuid REFERENCES stories(id) ON DELETE CASCADE,
  coins_spent integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, story_id)
);

CREATE INDEX IF NOT EXISTS idx_coin_transactions_user ON coin_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_story_unlocks_user ON story_unlocks(user_id);
CREATE INDEX IF NOT EXISTS idx_story_unlocks_story ON story_unlocks(story_id);

-- Give existing users 100 starter coins
UPDATE profiles SET coins = 100 WHERE coins = 0;

SELECT 'Coins migration complete.' AS status;
SELECT count(*) AS profiles_with_coins FROM profiles WHERE coins > 0;
