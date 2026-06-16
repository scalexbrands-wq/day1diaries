#!/bin/bash
# ============================================================
# Day1 Diaries — Migrate data from Supabase Postgres to RDS
# Usage: ./migrate-data.sh
#
# Requires:
#  - SUPABASE_DB_URL set (Settings → Database → Connection string, "URI" mode)
#  - RDS_DB_URL set (postgres://user:pass@rds-endpoint:5432/day1diaries)
#  - pg_dump / psql installed (Postgres 16 client tools)
#
# NOTE: profiles.id in Supabase is the auth.users UUID. After
# migration these UUIDs will NOT match new Cognito "sub" values.
# This script migrates data AS-IS (old UUIDs preserved) so existing
# content/relationships stay intact. New users created via Cognito
# will get fresh UUIDs from their Cognito sub — both coexist fine
# since profiles.id has no FK constraint to an auth table anymore.
# ============================================================
set -e

if [ -z "$SUPABASE_DB_URL" ] || [ -z "$RDS_DB_URL" ]; then
  echo "ERROR: Set SUPABASE_DB_URL and RDS_DB_URL environment variables first."
  echo "  export SUPABASE_DB_URL='postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres'"
  echo "  export RDS_DB_URL='postgresql://day1admin:[PASSWORD]@[RDS_ENDPOINT]:5432/day1diaries'"
  exit 1
fi

TABLES=(
  profiles stories likes comments saves follows
  habits user_habits habit_logs user_badges
  habit_challenges challenge_participations
  community_updates event_registrations
  landing_hero landing_categories landing_testimonials
)

echo "── Step 1: Ensure schema exists on RDS ─────────────────"
echo "   (skip if you already ran: psql \$RDS_DB_URL -f infrastructure/schema.sql)"
read -p "Run schema.sql against RDS now? (y/N) " run_schema
if [[ "$run_schema" == "y" ]]; then
  psql "$RDS_DB_URL" -f infrastructure/schema.sql
fi

echo ""
echo "── Step 2: Export data from Supabase (public schema only) ──"
mkdir -p /tmp/day1_migration

for table in "${TABLES[@]}"; do
  echo "  Exporting $table ..."
  pg_dump "$SUPABASE_DB_URL" \
    --data-only \
    --table="public.${table}" \
    --no-owner --no-privileges --no-comments \
    -f "/tmp/day1_migration/${table}.sql" || echo "    (skipped — table may not exist)"
done

echo ""
echo "── Step 3: Import data into RDS ────────────────────────"
# Order matters due to FKs: profiles first, then dependents
for table in "${TABLES[@]}"; do
  file="/tmp/day1_migration/${table}.sql"
  if [ -s "$file" ]; then
    echo "  Importing $table ..."
    psql "$RDS_DB_URL" -f "$file" -v ON_ERROR_STOP=0 -q
  fi
done

echo ""
echo "── Step 4: Resync derived counts ───────────────────────"
psql "$RDS_DB_URL" <<SQL
UPDATE profiles p SET followers_count = (SELECT count(*) FROM follows WHERE following_id = p.id);
UPDATE profiles p SET following_count = (SELECT count(*) FROM follows WHERE follower_id = p.id);
UPDATE profiles p SET stories_count   = (SELECT count(*) FROM stories WHERE user_id = p.id AND status = 'published');
UPDATE stories  s SET likes_count     = (SELECT count(*) FROM likes WHERE story_id = s.id);
UPDATE stories  s SET comments_count  = (SELECT count(*) FROM comments WHERE story_id = s.id);
SELECT 'Migration complete. Tables: ' || count(*) FROM information_schema.tables WHERE table_schema='public';
SQL

echo ""
echo "✅ Data migration complete!"
echo ""
echo "⚠️  IMPORTANT: Existing users' profiles.id values come from"
echo "   Supabase auth.users. When those users sign up again via"
echo "   Cognito, they'll get NEW ids and won't be linked to their"
echo "   old profile/stories automatically. For a clean launch,"
echo "   consider this a fresh start for auth, or write a one-time"
echo "   email-matching script to relink old profile rows to new"
echo "   Cognito subs after each user's first Cognito login."
