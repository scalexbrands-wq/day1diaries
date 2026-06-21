# Day1 Diaries — Feature Documentation

Day1 Diaries is a social platform where users share "Day 1" stories — first day at a job, first day of college, first business client, first failure, and so on — and build habits, join challenges, attend community events, and grow a public profile with followers, levels, and a coin wallet. The platform is monetized through a Membership program and a Gifting ("Surprise A Friend") module, and supports third-party advertising through a built-in Marketing module. Administration is governed by a full role-based access control (RBAC) system.

Stack: React frontend, Node/Express backend, PostgreSQL (AWS RDS), AWS Cognito (or a local JWT auth provider for offline dev), S3 for media, deployed on ECS Fargate behind CloudFront/ALB.

---

## 1. Stories, Discover & Feed

The core content type. Users write a story with a title, body, category, tags, and optional cover image, and choose a **visibility**: `public`, `followers_only`, or `private`.

- **Discover** — browse all public stories, filterable by category, with search and a "Latest / Trending" sort toggle. Lazy-loads via infinite scroll (10 stories per page).
- **My Feed** — a following-first algorithm: stories from people you follow surface first, then public stories fill the rest. Also lazy-loaded.
- **Story Detail** — full story view with likes, comments, saves, and share. Private stories owned by someone else show a locked preview; a non-follower can **unlock** a private story by spending 10 coins.
- **Engagement rewards** — most actions earn the author and/or actor coins + score: publishing (+20), liking, commenting, sharing, and being viewed (+10 each). A first-login-of-the-day bonus also exists.
- **Moderation** — new stories are scanned for flagged language; flagged stories enter an admin moderation queue (approve/remove).
- **Categories** — an admin-managed list (icon + name + sort order) used for filtering and the Discover category chips.

Key tables: `stories`, `likes`, `comments`, `saves`, `story_unlocks`, `story_views`, `story_categories`.
Backend: `backend/src/routes/stories.js`. Frontend: `Discover.js`, `Feed.js`, `StoryDetail.js`, `WriteStory.js`.

---

## 2. Habits & Challenges

- **Habits** — a curated catalog (e.g. "Evening Walk", "No Gossip Challenge") that users adopt. Adopting starts a streak counter; daily logging advances the streak (and breaks it if a day is missed).
- **Challenges** — time-boxed competitions tied to a habit (default 30 days), with daily/weekly/total point rewards and an optional participant cap. Challenges can be `free` or `restricted` visibility. A per-challenge leaderboard ranks participants by points earned, then streak length.
- Contributors (and admins) can create/edit/delete habits and challenges they own; admins can manage any.

Key tables: `habits`, `user_habits`, `habit_logs`, `habit_challenges`, `challenge_participations`.
Backend: `backend/src/routes/habits.js`. Frontend: `Habits.js`.

---

## 3. Community

A hub for events: free events, paid events, webinars, and workshops, plus community news/success-story posts. Events carry a date, duration, speaker bio, optional Zoom link, and a seat cap. Users register (with calendar-add) and can see "Upcoming Events" and "Active Challenges" in a sidebar. Paid events can be gated to Pro/premium members.

Key tables: `community_updates`, `event_registrations`.
Backend: `backend/src/routes/community.js`. Frontend: `Community.js`.

---

## 4. Profiles, Social & Gamification

- **Profiles** — username, bio, location, avatar/banner, public or private. Private profiles only show full content to approved followers; non-followers see a locked placeholder.
- **Follow graph** — follow/unfollow users; also **topic follows** for story categories and job departments, surfaced as a personalized "Following" feed tab.
- **Gamification** — a score accumulates from engagement and habit activity, mapping to levels (🥉 Beginner → 🥈 Explorer → 🥇 Achiever → 🏆 Hero → 🔥 Super Hero → 👑 Legend, plus special badges like Habit Master / Community Champion).
- **Leaderboard** — ranks users by score, shows level, badge progress, and top creators.

Key tables: `profiles`, `follows`, `topic_follows`, `gamification_levels`.
Backend: `backend/src/routes/profiles.js`, `social.js`. Frontend: `Profile.js`, `Leaderboard.js`.

---

## 5. Jobs & Careers

A lightweight job board layered on top of the social platform.

- Public job listings (title, department, location, type, salary range) with an apply flow (resume link + cover note), open to logged-in or anonymous applicants.
- Applicants track their own pipeline stage — Applied → Screening → Interview 1 → Interview 2 → Offer Received → Custom — and can leave personal notes or share a status update.
- Admins manage the job catalog and can view/update every applicant's stage across all jobs.

Key tables: `careers_jobs`, `job_applications`.
Backend: `backend/src/routes/pages.js` (careers section). Frontend: `Jobs.js`, `JobDetail.js`, `Careers.js`.

---

## 6. Membership (premium tier)

A paid membership program that unlocks higher feature limits platform-wide.

- **Plans** — admin-defined tiers (price, duration, badge, freeform marketing "benefits" text) that users apply to. Applications go through a review queue (pending → under_review → approved/rejected), with manual or Razorpay online payment, and an admin can override status at any point in the lifecycle (including renewal/expiry/suspension), each transition firing a templated lifecycle email.
- **Feature Access Control** — the mechanism that actually differentiates free vs. paid users. A global catalog of feature keys (story viewing, habit adoption, challenge joining, job applications, gift sending, etc.) each carries a **Free Users** limit and a **Paid Members** limit, set via a plain-language picker (♾️ Unlimited / 🚫 Not available / 🔢 Limited to N per day-week-month-year-lifetime) rather than raw numbers.
- **Per-plan overrides** — any individual plan can override a feature's paid-member limit just for that plan (e.g. a "Basic" plan capped at 10 stories/month vs. a "Premium" plan unlimited), via each plan's "Linked Features" picker — so different price tiers can actually mean different limits, not just a marketing label.
- A master `membership.module_enabled` switch disables all free-tier restriction enforcement instantly (e.g. while the program isn't running).

Key tables: `membership_plans`, `membership_applications`, `membership_payments`, `memberships`, `membership_form_fields`, `feature_access_rules`, `feature_usage`.
Backend: `backend/src/services/accessControl.js`, `backend/src/routes/membership.js`, `admin-membership.js`.

---

## 7. Gifting — "Surprise A Friend"

Lets a user commemorate someone's story with a paid or free digital tribute (certificate, poster, scrapbook page, video tribute, etc.), personalized with a message/photo/voice note and an AI-generated tribute line.

- **Catalog** — admin-managed categories (Birthday, Career Milestone, …), gift types with pricing (Digital Certificate, Premium Certificate, Legacy Package, …), and 5 visual templates (Luxury Gold, Glassmorphism Orange, Scrapbook Warm, Executive Black & Gold, Magazine Cover).
- **Payment** — Razorpay online payment, Cash on Delivery, or coin redemption; admin can manually reconcile/override payment status and issue refunds.
- **Wallet claims** — once a user has enough coins for a tier (see §8), they submit a claim; an admin approves (deducting coins) or rejects (no cost to the user) it.
- **Audience targeting** — the whole module can be restricted to a chosen audience (Membership / Contributors / Admins / hand-picked Custom Users), with a master enable/disable switch, enforced server-side so the CTA disappears for anyone outside the allowed group.

Key tables: `gift_categories`, `gift_types`, `gift_templates`, `gift_orders`, `gift_payments`, `wallet_claims`.
Backend: `backend/src/routes/gift.js`, `admin-gift.js`.

---

## 8. Wallet & Coins

Every engagement action (publishing, liking, commenting, sharing, being viewed, logging a habit, daily login) earns coins. Coins are spent two ways: unlocking a private story (10 coins) from someone you don't follow, or climbing the **Wallet unlock ladder** — a fixed tier list (e.g. 1,000 coins → ₹50 off any gift, up through 1,000,000 coins → a free Legacy Package + unlimited Surprise-A-Friend sending) redeemed via the wallet-claims flow above.

Backend: `backend/src/utils/walletTiers.js`. Frontend: `Wallet.js`.

---

## 9. Marketing / Ads Module

An admin-managed advertising system — image or video campaigns shown across the app, with real per-placement analytics and audience targeting.

- **7 placements**: Discover (inline card every 5th story + a sticky sidebar banner), Story Detail (sidebar banner above "Recent Stories"), My Feed (inline card every 5th story + an auto-rotating sidebar slideshow above "People to Follow"), Job Feed, Leaderboard, Community, and Wallet (each a banner slot).
- **Campaigns** — name, advertiser, image or video creative (upload up to 50MB, or paste an already-hosted URL), click-through URL, one or more placements, optional start/end date scheduling, and a draft/active/paused/archived lifecycle.
- **Analytics** — every impression and click is logged with its placement and (where applicable) story, so each campaign reports Views / Clicks / CTR overall and broken down per-placement.
- **Audience targeting** — mirrors the Gifting module's pattern: a master module toggle, plus "Show Ads To" restricted to any combination of Paid Members, Non-Paid (Free) Users, Contributors, or hand-picked Custom Users — enforced at the API level (`GET /ads/active`), so every ad slot across all 7 placements is gated with no per-page frontend logic.

Key tables: `ad_campaigns`, `ad_events`.
Backend: `backend/src/routes/ads.js`, `admin-ads.js`. Frontend: `components/AdSlot.js`, `AdCarousel.js`. Admin: Dashboard → Marketing (Campaigns + Settings sub-tabs).

---

## 10. RBAC — Roles & Permissions

A data-driven authorization layer replacing what used to be four separate, hardcoded permission mechanisms.

- **7 roles**: `user`, `contributor`, `moderator`, `marketer`, `support`, `finance`, and `admin` (a hardcoded superuser that always passes every check and is never restricted).
- **24 permissions** across 8 categories — Users & Moderation, Content, Membership, Gifting, Marketing, Site & SEO, Email, Settings — defined once in a code catalog (`backend/src/services/permissions.js`).
- **Admin → Roles & Permissions** — a full Role × Permission matrix (with Select All / Clear All per role), editable only by the true `admin` role so no role can grant itself more access. Changes take effect immediately, no deploy required.
- Every admin route across the backend (gift, membership, marketing, SEO, email, landing, site pages, announcements, certificates, habits, community, user management) is gated by `requirePermission(...)` rather than a hardcoded role check — including a precise carve-out so the **Finance** role can verify/refund payments and wallet claims in Gifting and Membership without being granted catalog-management access.
- The frontend Admin Dashboard's tab bar is filtered live to whatever permissions the signed-in role actually has, so e.g. a Marketer only ever sees Overview + Marketing.

Key tables: `role_permissions`, `role_permissions_seeded`. Backend: `backend/src/middleware/auth.js` (`requirePermission`), `backend/src/routes/admin-rbac.js`.

---

## 11. Notifications

In-app notifications (e.g. gift received, wallet claim approved/rejected) with an unread badge, mark-as-read, and mark-all-as-read.

Key table: `notifications`. Backend: `backend/src/routes/notifications.js`. Frontend: `components/NotificationBell.js`.

---

## 12. Email Center

A self-serve transactional/marketing email system (via Brevo) for admins.

- **Templates** — categorized (welcome, story, habit, challenge, event, certificate, digest, membership, gift, custom), with variable placeholders and full version history (every edit is restorable).
- **Audiences** — saved segments built from sources like all users, story authors, habit adopters, challenge participants, certificate recipients, or top-N leaderboard.
- **Workflows** — tie a template + audience together with a schedule (send now, one-time, or recurring via cron), with send-history and per-recipient delivery status.
- Membership and Gifting lifecycle events (application approved, payment received, claim approved, etc.) automatically fire their matching templates.

Key tables: `email_templates`, `email_template_versions`, `email_audiences`, `email_workflows`, `email_sends`, `email_recipients`.
Backend: `backend/src/routes/email.js`, `services/membershipEmails.js`, `services/giftEmails.js`.

---

## 13. SEO & Landing Page / Site CMS

- **Landing page** — fully admin-editable: hero section (headline, CTA text, up to 3 slideshow images, diary preview card, stat ticker), a bottom CTA section, featured stories, category tiles, testimonials, and live platform stats.
- **Site pages** — About (reorderable content sections), Blog (publish/draft posts), Careers (see §5), and Contact (inbound message inbox with read/replied status).
- **SEO** — configurable default title/description/OG image; auto-generated `sitemap.xml` from published stories/posts/jobs; per-entity Open Graph preview endpoints so shared story/profile/tribute links unfurl with the right title/image on social platforms instead of a generic card.

Key tables: `landing_hero`, `landing_bottom_section`, `landing_categories`, `landing_testimonials`, `about_sections`, `blog_posts`, `contact_messages`.
Backend: `backend/src/routes/landing.js`, `seo.js`, `pages.js`.

---

## 14. Certificates

An admin tool that turns a published story into a shareable "Contributor Certificate" — capturing company name, job title, industry, and an AI-generated impact level/insight tags from the story content and engagement metrics. Renders to PNG and PDF (via headless Chromium) with a QR code, uploaded to S3; the user can view, download, and share it.

Key table: `certificates`. Backend: `backend/src/routes/certificates.js`.

---

## 15. Visitor Counter

A site-wide, admin-editable page-visit counter. Increments exactly once per real browser load (not per in-app navigation), shown as a colorful animated pill — inline before "+ Share Story" in the logged-in app header, and next to the logo on the public landing page. Admin can view and manually overwrite the count from Settings.

Backend: `backend/src/routes/stats.js`. Frontend: `contexts/VisitorCountContext.js`, `components/VisitorCounter.js`.

---

## 16. Authentication

Supports two interchangeable auth providers selected by an environment flag:

- **AWS Cognito** (production) — standard signup/signin/refresh/signout, with an admin-togglable email verification requirement (`email_verification_required`). On first login, a WhatsApp welcome message is sent if a phone number is on file.
- **Local JWT provider** (offline dev) — self-signed HS256 tokens and a local password table, so the whole API can run without any AWS dependency for local development.

Backend: `backend/src/routes/auth.js` / `auth.local.js`.

---

## Admin Dashboard

A single tabbed control center (`/admin`) covering every module above — Overview/analytics, Announcements, Habits, Challenges, Events, Email Center, Membership, Gifting, Marketing, SEO, Users, Moderation, Landing, Site Pages, Categories, Settings, and (true-admin-only) Roles & Permissions. Tab visibility is driven entirely by the signed-in role's RBAC permissions (§10), so every role from Contributor to Finance gets a panel scoped to exactly what they're allowed to touch.
