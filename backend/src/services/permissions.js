// ============================================================
// RBAC catalog — the single source of truth for what roles and
// permissions exist. Permissions are code-defined (they mirror real
// route surface); which ROLE has which permission is admin-editable
// data, stored in the `role_permissions` table (see db/pool.js).
//
// 'admin' is a superuser — it always passes every permission check
// and never appears as an editable row in the matrix, so it can't be
// accidentally locked out of its own admin panel.
// ============================================================

const ROLES = [
  { key: 'user', label: 'User', description: 'Default role for every sign-up. No admin access.' },
  { key: 'contributor', label: 'Contributor', description: 'Can create/manage their own habits, challenges, and community events.' },
  { key: 'moderator', label: 'Moderator', description: 'Content moderation — flagged stories, user blocking, announcements.' },
  { key: 'marketer', label: 'Marketer', description: 'Manages the Marketing/Ads module only.' },
  { key: 'support', label: 'Support', description: 'Read access to users and orders to help resolve issues.' },
  { key: 'finance', label: 'Finance', description: 'Verifies/refunds payments and wallet claims across Membership and Gifting.' },
  { key: 'admin', label: 'Admin', description: 'Superuser — full access to everything, not editable below.' },
]
const ROLE_KEYS = ROLES.map(r => r.key)
const EDITABLE_ROLE_KEYS = ROLE_KEYS.filter(k => k !== 'admin')

const PERMISSIONS = [
  // Users & Moderation
  { key: 'view_users', label: 'View users', category: 'Users & Moderation' },
  { key: 'manage_users', label: 'Edit / block users', category: 'Users & Moderation' },
  { key: 'delete_users', label: 'Delete users', category: 'Users & Moderation' },
  { key: 'manage_roles', label: 'Change user roles', category: 'Users & Moderation' },
  { key: 'moderate_content', label: 'Moderate flagged stories', category: 'Users & Moderation' },
  { key: 'manage_announcements', label: 'Manage announcements', category: 'Users & Moderation' },

  // Content
  { key: 'manage_habits', label: 'Manage habits', category: 'Content' },
  { key: 'manage_challenges', label: 'Manage challenges', category: 'Content' },
  { key: 'manage_community_events', label: 'Manage community events', category: 'Content' },
  { key: 'manage_categories', label: 'Manage story categories', category: 'Content' },

  // Membership
  { key: 'manage_membership', label: 'Manage plans, form fields & access rules', category: 'Membership' },
  { key: 'review_membership_applications', label: 'Review membership applications', category: 'Membership' },
  { key: 'manage_membership_payments', label: 'Verify / refund membership payments', category: 'Membership' },

  // Gifting
  { key: 'manage_gifting', label: 'Manage gift catalog & settings', category: 'Gifting' },
  { key: 'manage_gift_payments', label: 'Verify / refund gift payments & orders', category: 'Gifting' },
  { key: 'manage_wallet_claims', label: 'Approve / reject wallet claims', category: 'Gifting' },
  { key: 'manage_shipments', label: 'Create/cancel shipments & update tracking', category: 'Gifting' },

  // Marketing
  { key: 'manage_marketing', label: 'Manage ad campaigns & settings', category: 'Marketing' },

  // Promotions
  { key: 'manage_surprises', label: 'Manage daily surprise popup', category: 'Promotions' },
  { key: 'manage_coupons', label: 'Manage coupon codes', category: 'Promotions' },

  // Site & SEO
  { key: 'manage_seo', label: 'Manage SEO settings', category: 'Site & SEO' },
  { key: 'manage_landing_content', label: 'Manage landing page content', category: 'Site & SEO' },
  { key: 'manage_site_pages', label: 'Manage About/Blog/Careers/Contact pages', category: 'Site & SEO' },

  // Email
  { key: 'manage_email', label: 'Manage email templates & campaigns', category: 'Email' },

  // Settings
  { key: 'manage_settings', label: 'Manage global app settings', category: 'Settings' },
  { key: 'manage_certificates', label: 'Generate certificates', category: 'Settings' },
  { key: 'view_analytics', label: 'View analytics & overview stats', category: 'Settings' },
]
const PERMISSION_KEYS = PERMISSIONS.map(p => p.key)

// Default grants seeded once on first boot (admin can change anytime after).
const DEFAULT_ROLE_PERMISSIONS = {
  contributor: ['manage_habits', 'manage_challenges', 'manage_community_events', 'view_analytics'],
  moderator: ['view_users', 'manage_users', 'moderate_content', 'manage_announcements'],
  marketer: ['manage_marketing', 'manage_surprises', 'manage_coupons', 'view_analytics'],
  support: ['view_users', 'view_analytics'],
  finance: ['manage_membership_payments', 'manage_gift_payments', 'manage_wallet_claims', 'manage_shipments', 'view_analytics'],
  user: [],
}

module.exports = { ROLES, ROLE_KEYS, EDITABLE_ROLE_KEYS, PERMISSIONS, PERMISSION_KEYS, DEFAULT_ROLE_PERMISSIONS }
