import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import {
  getGiftCategories, getGiftTypes, getGiftTemplates, getGiftTributeOptions,
  searchGiftStories, createGiftOrder, createGiftRazorpayOrder, verifyGiftPayment, getMyFeatureUsage, getMyCoins,
  getGiftOrder, getGiftDownloadUrl, previewGiftCertificate, getGiftWallet, uploadGiftImage, redeemWalletClaim,
} from '../lib/api'
import { toast } from './Toast'

const Btn = ({ children, variant = 'primary', ...p }) => {
  const styles = {
    primary: { background: '#FF6B2B', color: 'white', border: 'none' },
    secondary: { background: 'transparent', color: '#FF6B2B', border: '1.5px solid #FF6B2B' },
  }
  return <button {...p} style={{ padding: '11px 22px', borderRadius: 100, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', ...styles[variant], ...p.style }}>{children}</button>
}

let razorpayScriptPromise = null
function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve()
  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = resolve
      script.onerror = () => reject(new Error('Could not load Razorpay checkout script'))
      document.body.appendChild(script)
    })
  }
  return razorpayScriptPromise
}

const STEPS = ['Select Story', 'Category', 'Gift Type', 'Design', 'Message', 'Review & Pay']

export default function SurpriseWizard({ initialStoryId, initialStoryTitle, initialAuthorName, lockedAuthorUsername, onClose, claimId, lockedGiftTypeKey, claimTierLabel }) {
  const claimMode = !!claimId
  const [step, setStep] = useState(initialStoryId ? 1 : 0)
  const [result, setResult] = useState(null)
  const pollRef = useRef(null)
  const [submitting, setSubmitting] = useState(false)

  const [categories, setCategories] = useState([])
  const [types, setTypes] = useState([])
  const [templates, setTemplates] = useState([])
  const [usage, setUsage] = useState(null)

  const [scope, setScope] = useState('public')
  const [query, setQuery] = useState('')
  const [storyResults, setStoryResults] = useState([])
  const [selectedStory, setSelectedStory] = useState(initialStoryId ? { id: initialStoryId, title: initialStoryTitle, author_name: initialAuthorName } : null)

  const [categoryKey, setCategoryKey] = useState(null)
  const [giftTypeKey, setGiftTypeKey] = useState(lockedGiftTypeKey || null)
  const [templateKey, setTemplateKey] = useState(null)

  const [recipientName, setRecipientName] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [message, setMessage] = useState('')
  const [tributeOptions, setTributeOptions] = useState([])
  const [aiTributeKind, setAiTributeKind] = useState(null)

  const [order, setOrder] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('razorpay')
  const [coinTierCost, setCoinTierCost] = useState(null)
  const [coins, setCoins] = useState(0)
  const [walletTiers, setWalletTiers] = useState([])
  const [previewImage, setPreviewImage] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [imageUrl, setImageUrl] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  useEffect(() => {
    getGiftCategories().then(({ data }) => setCategories(data || []))
    getGiftTypes().then(({ data }) => setTypes(data || []))
    getGiftTemplates().then(({ data }) => setTemplates(data || []))
    getMyFeatureUsage().then(({ data }) => setUsage((data || []).find(u => u.feature_key === 'gift_sending') || null))
    getMyCoins().then(({ data }) => setCoins(data || 0))
    getGiftWallet().then(({ data }) => setWalletTiers(data?.tiers || []))
  }, [])

  useEffect(() => () => clearInterval(pollRef.current), [])

  // Rendering (Puppeteer + S3 upload) happens in the background, so once an
  // order is created/paid we poll until status leaves 'processing' and show
  // the download buttons here instead of making the sender hunt for them.
  const startPolling = (orderId) => {
    clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      const { data } = await getGiftOrder(orderId)
      if (data && data.status !== 'processing') {
        clearInterval(pollRef.current)
        setResult(data)
      }
    }, 3000)
  }

  const runSearch = useCallback(() => {
    searchGiftStories(query, scope, lockedAuthorUsername).then(({ data }) => setStoryResults(data || []))
  }, [query, scope, lockedAuthorUsername])
  useEffect(() => { if (step === 0) runSearch() }, [step, scope, runSearch])

  useEffect(() => {
    if (step === 4 && categoryKey && selectedStory) {
      getGiftTributeOptions({ categoryKey, name: selectedStory.author_name, storyTitle: selectedStory.title }).then(({ data }) => setTributeOptions(data || []))
    }
  }, [step, categoryKey, selectedStory])

  const goNext = () => {
    if (step === 0 && !selectedStory) return toast.error('Select a story first')
    if (step === 1 && !categoryKey) return toast.error('Choose a category')
    if (step === 2 && !giftTypeKey) return toast.error('Choose a gift type')
    if (step === 3 && !templateKey) return toast.error('Choose a design template')
    if (step === 4 && !recipientName.trim()) return toast.error("Enter the recipient's name")
    // Claim redemptions have the gift type fixed by the approved tier — skip that step.
    setStep(s => {
      const next = Math.min(s + 1, STEPS.length - 1)
      return claimMode && next === 2 ? 3 : next
    })
  }
  const goBack = () => setStep(s => {
    const prev = Math.max(s - 1, 0)
    return claimMode && prev === 2 ? 1 : prev
  })

  const selectedType = types.find(t => t.key === giftTypeKey)
  const applicableTiers = walletTiers.filter(t => t.kind === 'discount' || t.giftTypeKey === giftTypeKey)
  const selectedTier = walletTiers.find(t => t.cost === coinTierCost)

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImage(true)
    const { data, error } = await uploadGiftImage(file)
    setUploadingImage(false)
    if (error) return toast.error(error.message)
    setImageUrl(data)
    setPreviewImage(null) // photo changed — old preview is stale
  }

  const handlePreview = async () => {
    setPreviewLoading(true)
    setPreviewImage(null)
    const { data, error } = await previewGiftCertificate({
      storyId: selectedStory.id, categoryKey, templateKey, message, aiTributeKind, imageUrl,
    })
    setPreviewLoading(false)
    if (error) return toast.error(error.message)
    setPreviewImage(data)
  }

  // Claim redemptions are already "paid" (coins were deducted when the
  // admin approved the claim) — submitting just hands the gift details
  // (story/recipient/message) to admin to manually process, same as
  // every other admin-gated flow in this module.
  const handleClaimRedeemSubmit = async () => {
    if (message.length > 1000) return toast.error('Message must be 1000 characters or fewer')
    setSubmitting(true)
    const { data, error } = await redeemWalletClaim(claimId, {
      storyId: selectedStory.id, categoryKey, templateKey, recipientName, recipientEmail, message, aiTributeKind, imageUrl,
    })
    setSubmitting(false)
    if (error) return toast.error(error.message)
    toast.success('Submitted! Our team will create your gift shortly.')
    setResult({ ...data, payment_method: 'claim' })
  }

  const handleCreate = async () => {
    if (message.length > 1000) return toast.error('Message must be 1000 characters or fewer')
    const effectiveMethod = selectedType?.base_price > 0 ? paymentMethod : 'razorpay'
    setSubmitting(true)
    const { data, error } = await createGiftOrder({
      storyId: selectedStory.id, categoryKey, giftTypeKey, templateKey,
      recipientName, recipientEmail, message, aiTributeKind, imageUrl,
      paymentMethod: effectiveMethod,
      coinTierCost: effectiveMethod === 'coins' ? coinTierCost : undefined,
    })
    setSubmitting(false)
    if (error) return toast.error(error.message)
    setOrder(data)
    if (data.payment_status === 'free' || data.payment_status === 'paid') {
      toast.success(effectiveMethod === 'coins' ? 'Redeemed! Your gift is being created 🎁' : 'Your gift is being created! 🎁')
      setResult(data)
      startPolling(data.id)
    } else if (effectiveMethod === 'cod') {
      toast.success("Order placed — we'll confirm once payment is collected.")
      setResult(data)
    } else {
      payViaRazorpay(data)
    }
  }

  const payViaRazorpay = async (giftOrder) => {
    setSubmitting(true)
    try {
      await loadRazorpayScript()
      const { data: rpOrder, error } = await createGiftRazorpayOrder(giftOrder.id)
      if (error) { setSubmitting(false); return toast.error(error.message) }

      const checkout = new window.Razorpay({
        key: rpOrder.keyId,
        order_id: rpOrder.orderId,
        amount: rpOrder.amount,
        currency: rpOrder.currency,
        name: 'Day1 Diaries',
        description: `${selectedType?.label} — Surprise A Friend`,
        handler: async (response) => {
          const { error: verifyError } = await verifyGiftPayment({
            giftOrderId: giftOrder.id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          })
          setSubmitting(false)
          if (verifyError) return toast.error(verifyError.message)
          toast.success('Payment confirmed — your gift is being created! 🎁')
          // giftOrder here is the pre-payment snapshot (status: 'pending_payment') —
          // verify already flipped it server-side, so show 'processing' until the
          // poll below fetches the real row.
          setResult({ ...giftOrder, status: 'processing', payment_status: 'paid' })
          startPolling(giftOrder.id)
        },
        modal: { ondismiss: () => setSubmitting(false) },
        theme: { color: '#FF6B2B' },
      })
      checkout.open()
    } catch (err) {
      setSubmitting(false)
      toast.error(err.message || 'Could not start payment')
    }
  }

  return createPortal((
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(26,8,0,.55)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end', boxSizing: 'border-box' }}
    >
      <style>{`
        @keyframes surpriseDrawerIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: 'white', height: '100%', width: '100%', maxWidth: 460, overflowY: 'auto', padding: 28, boxSizing: 'border-box', boxShadow: '-8px 0 32px rgba(26,8,0,.18)', animation: 'surpriseDrawerIn .25s ease' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#1A0800' }}>{claimMode ? `🎁 Claim Your ${claimTierLabel || 'Gift'}` : '🎁 Surprise A Friend'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: '#8C7B6E', cursor: 'pointer' }}>×</button>
        </div>
        {result ? (
          <GiftResultView result={result} onClose={onClose} />
        ) : (
        <>
        <div style={{ fontSize: 12, color: '#8C7B6E', marginBottom: 12 }}>Step {step + 1} of {STEPS.length} — {STEPS[step]}</div>

        {usage && usage.limit !== -1 && (
          <div style={{ fontSize: 11.5, fontWeight: 600, color: usage.remaining === 0 ? '#DC2626' : '#8C7B6E', marginBottom: 14, padding: '8px 12px', borderRadius: 8, background: usage.remaining === 0 ? '#FFF5F5' : '#FBF6EC' }}>
            {usage.remaining === 0
              ? "You've used your free gift this period — become a member for unlimited Surprise A Friend gifts."
              : `${usage.remaining} of ${usage.limit} free gift${usage.limit === 1 ? '' : 's'} left this period.`}
          </div>
        )}

        {step === 0 && (
          <div>
            {lockedAuthorUsername ? (
              <div style={{ fontSize: 12, color: '#8C7B6E', marginBottom: 12 }}>Showing published stories from this profile.</div>
            ) : (
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {['mine', 'friends', 'public'].map(s => (
                  <button key={s} onClick={() => setScope(s)} style={{ padding: '6px 14px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${scope === s ? '#FF6B2B' : '#DDD3CA'}`, background: scope === s ? '#FFF1EA' : 'white' }}>
                    {s === 'mine' ? 'My Stories' : s === 'friends' ? 'Friend Stories' : 'Public Stories'}
                  </button>
                ))}
              </div>
            )}
            <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && runSearch()} placeholder="Search stories by title..."
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #DDD3CA', borderRadius: 8, fontSize: 13, marginBottom: 14, fontFamily: 'inherit' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
              {storyResults.map(s => (
                <div key={s.id} onClick={e => { e.stopPropagation(); setSelectedStory(s) }}
                  style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 10, borderRadius: 10, cursor: 'pointer', border: `1.5px solid ${selectedStory?.id === s.id ? '#FF6B2B' : '#F0EAE4'}`, background: selectedStory?.id === s.id ? '#FFF1EA' : 'white' }}>
                  {s.cover_image_url
                    ? <img src={s.cover_image_url} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                    : <div style={{ width: 48, height: 48, borderRadius: 8, background: '#F0EAE4', flexShrink: 0 }} />}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1A0800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</div>
                    <div style={{ fontSize: 11, color: '#8C7B6E' }}>{s.author_name}</div>
                  </div>
                </div>
              ))}
              {storyResults.length === 0 && <div style={{ fontSize: 12, color: '#8C7B6E', padding: 10 }}>No stories found.</div>}
            </div>
          </div>
        )}

        {step === 1 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {categories.map(c => (
              <button key={c.key} onClick={() => setCategoryKey(c.key)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                  border: `1.5px solid ${categoryKey === c.key ? '#FF6B2B' : '#F0EAE4'}`, background: categoryKey === c.key ? '#FFF1EA' : 'white' }}>
                <span style={{ fontSize: 20 }}>{c.emoji}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1A0800' }}>{c.label}</span>
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {types.map(t => (
              <button key={t.key} onClick={() => setGiftTypeKey(t.key)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                  border: `1.5px solid ${giftTypeKey === t.key ? '#FF6B2B' : '#F0EAE4'}`, background: giftTypeKey === t.key ? '#FFF1EA' : 'white' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1A0800' }}>{t.label}</div>
                  <div style={{ fontSize: 11, color: '#8C7B6E' }}>{t.description}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#FF6B2B', flexShrink: 0, marginLeft: 12 }}>
                  {t.base_price > 0 ? `₹${Number(t.base_price).toFixed(0)}` : 'Free'}
                </div>
              </button>
            ))}
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {templates.map(t => (
              <button key={t.key} onClick={() => setTemplateKey(t.key)}
                style={{ padding: '12px 16px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                  border: `1.5px solid ${templateKey === t.key ? '#FF6B2B' : '#F0EAE4'}`, background: templateKey === t.key ? '#FFF1EA' : 'white' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1A0800' }}>{t.label}</div>
              </button>
            ))}
          </div>
        )}

        {step === 4 && (
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#5C3D2E', marginBottom: 5 }}>Recipient's Name</label>
            <input value={recipientName} onChange={e => setRecipientName(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #DDD3CA', borderRadius: 8, fontSize: 13, marginBottom: 12, fontFamily: 'inherit' }} />
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#5C3D2E', marginBottom: 5 }}>Recipient's Email (optional — for delivery)</label>
            <input value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} type="email"
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #DDD3CA', borderRadius: 8, fontSize: 13, marginBottom: 12, fontFamily: 'inherit' }} />
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#5C3D2E', marginBottom: 5 }}>Your Message ({message.length}/1000)</label>
            <textarea value={message} onChange={e => setMessage(e.target.value.slice(0, 1000))} placeholder="Proud of your journey."
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #DDD3CA', borderRadius: 8, fontSize: 13, minHeight: 70, marginBottom: 14, fontFamily: 'inherit', resize: 'vertical' }} />

            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#5C3D2E', marginBottom: 5 }}>Photo (optional — used as the certificate's hero image)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              {imageUrl && <img src={imageUrl} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />}
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 100, border: '1.5px solid #DDD3CA', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#5C3D2E' }}>
                {uploadingImage ? 'Uploading…' : imageUrl ? 'Change Photo' : '📷 Upload Photo'}
                <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} style={{ display: 'none' }} />
              </label>
              {imageUrl && <button onClick={() => { setImageUrl(null); setPreviewImage(null) }} style={{ background: 'none', border: 'none', color: '#DC2626', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Remove</button>}
            </div>

            <div style={{ fontSize: 12, fontWeight: 700, color: '#5C3D2E', marginBottom: 6 }}>✨ Add an AI Tribute (optional)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {tributeOptions.map(o => (
                <button key={o.kind} onClick={() => setAiTributeKind(aiTributeKind === o.kind ? null : o.kind)}
                  style={{ textAlign: 'left', padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                    border: `1.5px solid ${aiTributeKind === o.kind ? '#FF6B2B' : '#F0EAE4'}`, background: aiTributeKind === o.kind ? '#FFF1EA' : 'white' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#FF6B2B' }}>{o.label}</div>
                  <div style={{ fontSize: 12, color: '#3A2410', marginTop: 2 }}>{o.text}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div>
            <div style={{ background: '#FBF6EC', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#8C7B6E', marginBottom: 4 }}>Story</div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>{selectedStory?.title}</div>
              <div style={{ fontSize: 12, color: '#8C7B6E', marginBottom: 4 }}>For</div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>{recipientName}</div>
              <div style={{ fontSize: 12, color: '#8C7B6E', marginBottom: 4 }}>Gift Type</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{selectedType?.label}</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              {!previewImage && (
                <Btn variant="secondary" onClick={handlePreview} disabled={previewLoading} style={{ width: '100%', justifyContent: 'center', display: 'flex' }}>
                  {previewLoading ? 'Rendering preview…' : '👁 Preview Certificate'}
                </Btn>
              )}
              {previewLoading && (
                <div style={{ fontSize: 11.5, color: '#8C7B6E', textAlign: 'center', marginTop: 8 }}>This takes a few seconds — building the real design.</div>
              )}
              {previewImage && (
                <div>
                  <img src={previewImage} alt="Certificate preview" style={{ width: '100%', borderRadius: 10, border: '1px solid #F0EAE4' }} />
                  <button onClick={() => setPreviewImage(null)} style={{ background: 'none', border: 'none', color: '#FF6B2B', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 8 }}>
                    Re-render preview
                  </button>
                </div>
              )}
            </div>

            {claimMode && (
              <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 10, background: '#F0FDF4', border: '1.5px solid #BBF7D0' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>🎁 Already paid via your approved claim — {claimTierLabel}</div>
                <div style={{ fontSize: 11.5, color: '#5C7C6E', marginTop: 4 }}>Submitting sends these details to our team — they'll create and deliver your gift.</div>
              </div>
            )}

            {!claimMode && selectedType?.base_price > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#5C3D2E', marginBottom: 8 }}>Payment Method</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', border: `1.5px solid ${paymentMethod === 'razorpay' ? '#FF6B2B' : '#F0EAE4'}`, background: paymentMethod === 'razorpay' ? '#FFF1EA' : 'white' }}>
                    <input type="radio" checked={paymentMethod === 'razorpay'} onChange={() => setPaymentMethod('razorpay')} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>Pay Online</div>
                      <div style={{ fontSize: 11, color: '#8C7B6E' }}>Card, UPI, netbanking, wallet — instant</div>
                    </div>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', border: `1.5px solid ${paymentMethod === 'cod' ? '#FF6B2B' : '#F0EAE4'}`, background: paymentMethod === 'cod' ? '#FFF1EA' : 'white' }}>
                    <input type="radio" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>Cash on Delivery</div>
                      <div style={{ fontSize: 11, color: '#8C7B6E' }}>We'll confirm once payment is collected; gift is created after confirmation</div>
                    </div>
                  </label>
                  {applicableTiers.length > 0 && (
                    <>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: '#5C3D2E', marginTop: 4 }}>🪙 Or redeem coins (balance: {coins.toLocaleString()})</div>
                      {applicableTiers.map(tier => {
                        const affordable = coins >= tier.cost
                        const checked = paymentMethod === 'coins' && coinTierCost === tier.cost
                        return (
                          <label key={tier.cost} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, cursor: affordable ? 'pointer' : 'not-allowed', opacity: affordable ? 1 : .5, border: `1.5px solid ${checked ? '#FF6B2B' : '#F0EAE4'}`, background: checked ? '#FFF1EA' : 'white' }}>
                            <input type="radio" checked={checked} disabled={!affordable} onChange={() => { setPaymentMethod('coins'); setCoinTierCost(tier.cost) }} />
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700 }}>{tier.label}</div>
                              <div style={{ fontSize: 11, color: '#8C7B6E' }}>{tier.cost.toLocaleString()} coins</div>
                            </div>
                          </label>
                        )
                      })}
                    </>
                  )}
                </div>
              </div>
            )}

            <Btn
              onClick={claimMode ? handleClaimRedeemSubmit : handleCreate}
              disabled={submitting || (!claimMode && paymentMethod === 'coins' && !coinTierCost)}
              style={{ width: '100%', justifyContent: 'center', display: 'flex' }}
            >
              {submitting ? 'Submitting…' : claimMode
                ? 'Submit to Admin'
                : selectedType?.base_price > 0
                  ? (paymentMethod === 'coins'
                      ? (selectedTier?.kind === 'free_gift' ? 'Redeem & Send Gift' : `Redeem ${selectedTier ? '₹' + Number(Math.max(0, selectedType.base_price - selectedTier.amount)).toFixed(0) + ' Remaining & Send' : '& Send Gift'}`)
                      : paymentMethod === 'cod' ? 'Place Order (Pay on Delivery)' : `Pay ₹${Number(selectedType.base_price).toFixed(0)} & Send Gift`)
                  : 'Send Gift'}
            </Btn>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          {step > 0 && step < 5 && <Btn variant="secondary" onClick={goBack}>Back</Btn>}
          {step < 5 && <Btn onClick={goNext} style={{ flex: 1, justifyContent: 'center', display: 'flex' }}>Next</Btn>}
        </div>
        </>
        )}
      </div>
    </div>
  ), document.body)
}

// Shown after a successful order — polls in the background (see
// startPolling above) until the certificate render finishes, then surfaces
// download/share actions right here instead of making the sender hunt
// for them on the My Gifts page.
function GiftResultView({ result, onClose }) {
  const processing = result.status === 'processing'
  const failed = result.status === 'failed'
  const awaitingCod = result.payment_method === 'cod' && result.payment_status === 'pending'
  const awaitingClaim = result.payment_method === 'claim'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center', paddingTop: 40 }}>
      {awaitingClaim && (
        <>
          <div style={{ fontSize: 40 }}>🎁</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1A0800' }}>Submitted to our team!</div>
          <div style={{ fontSize: 13, color: '#8C7B6E' }}>We'll create your gift and notify you once it's ready — usually within a day.</div>
        </>
      )}
      {!awaitingClaim && awaitingCod && (
        <>
          <div style={{ fontSize: 40 }}>📦</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1A0800' }}>Order placed!</div>
          <div style={{ fontSize: 13, color: '#8C7B6E' }}>We'll create the certificate as soon as your Cash on Delivery payment is confirmed.</div>
        </>
      )}
      {!awaitingClaim && !awaitingCod && processing && (
        <>
          <div style={{ width: 36, height: 36, border: '3px solid rgba(255,107,43,.2)', borderTopColor: '#FF6B2B', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1A0800' }}>Creating your gift…</div>
          <div style={{ fontSize: 12, color: '#8C7B6E' }}>This usually takes a few seconds. You can keep this open or close it — it'll keep going either way.</div>
        </>
      )}
      {!awaitingClaim && !awaitingCod && failed && (
        <>
          <div style={{ fontSize: 40 }}>⚠️</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#DC2626' }}>Something went wrong generating this gift.</div>
          <div style={{ fontSize: 12, color: '#8C7B6E' }}>Please try again, or contact support if it keeps happening.</div>
        </>
      )}
      {!awaitingClaim && !awaitingCod && !processing && !failed && (
        <>
          <div style={{ fontSize: 40 }}>🎉</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1A0800' }}>Your gift is ready!</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <a href={getGiftDownloadUrl(result.id, 'png')} className="btn btn-primary" style={{ textDecoration: 'none' }}>⬇ Download PNG</a>
            <a href={getGiftDownloadUrl(result.id, 'pdf')} className="btn btn-secondary" style={{ textDecoration: 'none' }}>⬇ Download PDF</a>
          </div>
          <Link to={`/tribute/${result.tribute_slug}`} onClick={onClose} style={{ fontSize: 13, fontWeight: 600, color: '#FF6B2B' }}>View Tribute Page →</Link>
        </>
      )}
      <Link to="/gifts" onClick={onClose} style={{ fontSize: 12, color: '#8C7B6E', marginTop: 10 }}>View All My Gifts</Link>
    </div>
  )
}
