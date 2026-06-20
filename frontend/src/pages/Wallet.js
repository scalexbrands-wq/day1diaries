import React, { useEffect, useState, useCallback } from 'react'
import { getGiftWallet, claimWalletTier, getMyWalletClaims } from '../lib/api'
import { toast } from '../components/Toast'

export default function Wallet() {
  const [wallet, setWallet] = useState(null)
  const [claims, setClaims] = useState([])
  const [claimingCost, setClaimingCost] = useState(null)

  const load = useCallback(() => {
    getGiftWallet().then(({ data }) => setWallet(data))
    getMyWalletClaims().then(({ data }) => setClaims(data || []))
  }, [])
  useEffect(() => { load() }, [load])

  if (!wallet) return <div className="loading-center"><div className="spinner" /></div>

  const { coins, tiers, unlimitedSending } = wallet
  const nextTier = tiers.find(t => !t.unlocked)
  const pendingCosts = new Set(claims.filter(c => c.status === 'pending').map(c => c.tier_cost))

  const handleClaim = async (tier) => {
    setClaimingCost(tier.cost)
    const { error } = await claimWalletTier(tier.cost)
    setClaimingCost(null)
    if (error) return toast.error(error.message)
    toast.success(`Claim submitted for "${tier.label}" — an admin will review it shortly.`)
    load()
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
      <h2 style={{ fontFamily: "'Playfair Display',serif", marginBottom: 4 }}>🪙 Wallet</h2>
      <p style={{ color: '#8C7B6E', fontSize: 13, marginBottom: 20 }}>Earn coins across the platform, redeem them for free or discounted Surprise A Friend gifts.</p>

      <div style={{ background: 'linear-gradient(135deg,#FF6B2B,#FFB088)', borderRadius: 16, padding: 24, color: 'white', marginBottom: 20 }}>
        <div style={{ fontSize: 12, opacity: .85, fontWeight: 600 }}>Your Balance</div>
        <div style={{ fontSize: 36, fontWeight: 900, fontFamily: "'Playfair Display',serif" }}>{coins.toLocaleString()} coins</div>
        {unlimitedSending && (
          <div style={{ marginTop: 8, display: 'inline-flex', padding: '6px 14px', background: 'rgba(255,255,255,.25)', borderRadius: 100, fontSize: 12, fontWeight: 700 }}>
            ✓ Unlimited Surprise A Friend sends unlocked
          </div>
        )}
        {!unlimitedSending && nextTier && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 12, marginBottom: 6 }}>{(nextTier.cost - coins).toLocaleString()} coins to unlock "{nextTier.label}"</div>
            <div style={{ height: 8, background: 'rgba(255,255,255,.3)', borderRadius: 100, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(100, (coins / nextTier.cost) * 100)}%`, background: 'white', borderRadius: 100 }} />
            </div>
          </div>
        )}
      </div>

      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Unlock Ladder</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {tiers.map(tier => (
          <div key={tier.cost} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '14px 18px', borderRadius: 12,
            background: tier.unlocked ? '#FFF8F1' : 'white',
            border: `1.5px solid ${tier.unlocked ? '#FF6B2B' : '#F0EAE4'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: tier.unlocked ? '#FF6B2B' : '#F0EAE4', color: tier.unlocked ? 'white' : '#8C7B6E',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
              }}>
                {tier.unlocked ? '✓' : '🔒'}
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1A0800' }}>{tier.label}</div>
                <div style={{ fontSize: 11.5, color: '#8C7B6E' }}>{tier.cost.toLocaleString()} coins{tier.grantsUnlimitedSending ? ' + unlimited sending' : ''}</div>
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: tier.unlocked ? '#059669' : '#8C7B6E' }}>
                {tier.unlocked ? 'Unlocked' : 'Locked'}
              </div>
              {tier.unlocked && (
                pendingCosts.has(tier.cost)
                  ? <div style={{ fontSize: 11, color: '#F59E0B', fontWeight: 700, marginTop: 6 }}>Claim pending review</div>
                  : <button
                      onClick={() => handleClaim(tier)}
                      disabled={claimingCost === tier.cost}
                      className="btn btn-primary btn-sm"
                      style={{ marginTop: 6 }}
                    >
                      {claimingCost === tier.cost ? 'Submitting…' : 'Claim Now'}
                    </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
