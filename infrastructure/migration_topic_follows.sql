-- Topic follows — lets a user follow story categories and job
-- departments ("companies"), so the Feed's "Following" tab can
-- surface content matching what they followed.

CREATE TABLE IF NOT EXISTS topic_follows (
  id          BIGSERIAL PRIMARY KEY,
  user_id     TEXT NOT NULL,
  topic_type  TEXT NOT NULL CHECK (topic_type IN ('category','department')),
  topic_value TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, topic_type, topic_value)
);
