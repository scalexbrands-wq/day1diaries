import React, { useEffect, useState } from 'react'
import { getReferralInfo } from '../lib/api'
import { toast } from '../components/Toast'

export default function ReferEarn() {
  const [info, setInfo] = useState(null)

  useEffect(() => {
    getReferralInfo().then(({ data, error }) => {
      if (error) return toast.error(error.message)
      setInfo(data)
    })
  }, [])

  if (!info) return <div className="loading-center"><div className="spinner" /></div>

  const { referralCode, referrerReward, referredReward, referredCount, coinsEarned } = info
  const referralLink = `${window.location.origin}/register?ref=${referralCode}`

  const copy = (text, label) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success(`${label} copied!`),
      () => toast.error('Could not copy')
    )
  }

  const shareText = `Join me on Day1 Diaries and get ${referredReward.toLocaleString()} bonus coins! Use my referral code ${referralCode} or sign up here: ${referralLink}`

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
      <h2 style={{ fontFamily: "'Playfair Display',serif", marginBottom: 4 }}>🎁 Refer & Earn</h2>
      <p style={{ color: '#8C7B6E', fontSize: 13, marginBottom: 20 }}>
        Invite friends to Day1 Diaries. You get {referrerReward.toLocaleString()} coins, they get {referredReward.toLocaleString()} coins — instantly.
      </p>

      <div style={{ background: 'linear-gradient(135deg,#FF6B2B,#FFB088)', borderRadius: 16, padding: 24, color: 'white', marginBottom: 20 }}>
        <div style={{ fontSize: 12, opacity: .85, fontWeight: 600 }}>Your Referral Code</div>
        <div style={{ fontSize: 32, fontWeight: 900, fontFamily: "'Playfair Display',serif", letterSpacing: '0.05em' }}>{referralCode}</div>
        <button
          onClick={() => copy(referralCode, 'Referral code')}
          className="btn btn-sm"
          style={{ marginTop: 10, background: 'rgba(255,255,255,.25)', color: 'white', border: 'none' }}
        >
          📋 Copy Code
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <div style={{ flex: 1, padding: '14px 18px', borderRadius: 12, background: '#FFF8F1', border: '1.5px solid #F0EAE4' }}>
          <div style={{ fontSize: 11.5, color: '#8C7B6E' }}>Friends Referred</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#1A0800' }}>{referredCount}</div>
        </div>
        <div style={{ flex: 1, padding: '14px 18px', borderRadius: 12, background: '#FFF8F1', border: '1.5px solid #F0EAE4' }}>
          <div style={{ fontSize: 11.5, color: '#8C7B6E' }}>Coins Earned</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#1A0800' }}>{coinsEarned.toLocaleString()}</div>
        </div>
      </div>

      <div style={{ padding: '14px 18px', borderRadius: 12, background: 'white', border: '1.5px solid #F0EAE4' }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Share your link</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            readOnly
            value={referralLink}
            onFocus={(e) => e.target.select()}
            className="form-control"
            style={{ flex: 1, fontSize: 12 }}
          />
          <button onClick={() => copy(referralLink, 'Link')} className="btn btn-primary btn-sm">Copy</button>
        </div>
        {navigator.share && (
          <button
            onClick={() => navigator.share({ title: 'Day1 Diaries', text: shareText, url: referralLink }).catch(() => {})}
            className="btn btn-primary btn-sm"
            style={{ marginTop: 10 }}
          >
            📤 Share
          </button>
        )}
      </div>
    </div>
  )
}
