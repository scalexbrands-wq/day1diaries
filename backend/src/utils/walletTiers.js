// Coin-tier ladder for the Wallet feature. Replaces the old fixed rule
// (10,000 coins = 1 free Digital Certificate) with a scaled progression:
// small flat discounts at low tiers, free specific gift types at higher
// tiers, and a top-tier permanent perk. Admin-approved table — edit here
// if the business numbers ever change (no DB table; this is a fixed ladder,
// not meant to be admin-configurable per-deployment).

const WALLET_TIERS = [
  { cost: 1000, kind: 'discount', amount: 50, label: '₹50 off any gift' },
  { cost: 1500, kind: 'discount', amount: 100, label: '₹100 off any gift' },
  { cost: 2500, kind: 'free_gift', giftTypeKey: 'story_tribute_card', label: 'Free Story Tribute Card' },
  { cost: 5000, kind: 'free_gift', giftTypeKey: 'digital_certificate', label: 'Free Digital Certificate' },
  { cost: 10000, kind: 'free_gift', giftTypeKey: 'premium_certificate', label: 'Free Premium Certificate' },
  { cost: 25000, kind: 'free_gift', giftTypeKey: 'memory_scrapbook', label: 'Free Memory Scrapbook' },
  { cost: 50000, kind: 'free_gift', giftTypeKey: 'poster', label: 'Free Poster' },
  { cost: 100000, kind: 'free_gift', giftTypeKey: 'video_tribute', label: 'Free Video Tribute' },
  { cost: 250000, kind: 'free_gift', giftTypeKey: 'magazine_cover', label: 'Free Magazine Cover' },
  { cost: 1000000, kind: 'free_gift', giftTypeKey: 'legacy_package', label: 'Free Legacy Package', grantsUnlimitedSending: true },
]

function findTier(cost) {
  return WALLET_TIERS.find(t => t.cost === cost) || null
}

module.exports = { WALLET_TIERS, findTier }
