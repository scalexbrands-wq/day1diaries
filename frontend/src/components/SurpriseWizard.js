import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getGiftCategories, getGiftTypes, getGiftTemplates, getGiftTributeOptions,
  searchGiftStories, createGiftOrder, createGiftRazorpayOrder, verifyGiftPayment,
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

export default function SurpriseWizard({ initialStoryId, initialStoryTitle, initialAuthorName, onClose }) {
  const navigate = useNavigate()
  const [step, setStep] = useState(initialStoryId ? 1 : 0)
  const [submitting, setSubmitting] = useState(false)

  const [categories, setCategories] = useState([])
  const [types, setTypes] = useState([])
  const [templates, setTemplates] = useState([])

  const [scope, setScope] = useState('public')
  const [query, setQuery] = useState('')
  const [storyResults, setStoryResults] = useState([])
  const [selectedStory, setSelectedStory] = useState(initialStoryId ? { id: initialStoryId, title: initialStoryTitle, author_name: initialAuthorName } : null)

  const [categoryKey, setCategoryKey] = useState(null)
  const [giftTypeKey, setGiftTypeKey] = useState(null)
  const [templateKey, setTemplateKey] = useState(null)

  const [recipientName, setRecipientName] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [message, setMessage] = useState('')
  const [tributeOptions, setTributeOptions] = useState([])
  const [aiTributeKind, setAiTributeKind] = useState(null)

  const [order, setOrder] = useState(null)

  useEffect(() => {
    getGiftCategories().then(({ data }) => setCategories(data || []))
    getGiftTypes().then(({ data }) => setTypes(data || []))
    getGiftTemplates().then(({ data }) => setTemplates(data || []))
  }, [])

  const runSearch = useCallback(() => {
    searchGiftStories(query, scope).then(({ data }) => setStoryResults(data || []))
  }, [query, scope])
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
    setStep(s => Math.min(s + 1, STEPS.length - 1))
  }
  const goBack = () => setStep(s => Math.max(s - 1, 0))

  const selectedType = types.find(t => t.key === giftTypeKey)

  const handleCreate = async () => {
    if (message.length > 1000) return toast.error('Message must be 1000 characters or fewer')
    setSubmitting(true)
    const { data, error } = await createGiftOrder({
      storyId: selectedStory.id, categoryKey, giftTypeKey, templateKey,
      recipientName, recipientEmail, message, aiTributeKind,
    })
    setSubmitting(false)
    if (error) return toast.error(error.message)
    setOrder(data)
    if (data.payment_status === 'free') {
      toast.success('Your gift is being created! 🎁')
      navigate('/gifts')
      onClose()
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
          navigate('/gifts')
          onClose()
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

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,8,0,.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 620, maxHeight: '92vh', overflowY: 'auto', padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#1A0800' }}>🎁 Surprise A Friend</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: '#8C7B6E', cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ fontSize: 12, color: '#8C7B6E', marginBottom: 18 }}>Step {step + 1} of {STEPS.length} — {STEPS[step]}</div>

        {step === 0 && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {['mine', 'friends', 'public'].map(s => (
                <button key={s} onClick={() => setScope(s)} style={{ padding: '6px 14px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${scope === s ? '#FF6B2B' : '#DDD3CA'}`, background: scope === s ? '#FFF1EA' : 'white' }}>
                  {s === 'mine' ? 'My Stories' : s === 'friends' ? 'Friend Stories' : 'Public Stories'}
                </button>
              ))}
            </div>
            <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && runSearch()} placeholder="Search stories by title..."
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #DDD3CA', borderRadius: 8, fontSize: 13, marginBottom: 14, fontFamily: 'inherit' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
              {storyResults.map(s => (
                <div key={s.id} onClick={() => setSelectedStory(s)}
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
            <Btn onClick={handleCreate} disabled={submitting} style={{ width: '100%', justifyContent: 'center', display: 'flex' }}>
              {submitting ? 'Processing…' : selectedType?.base_price > 0 ? `Pay ₹${Number(selectedType.base_price).toFixed(0)} & Send Gift` : 'Send Gift'}
            </Btn>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          {step > 0 && step < 5 && <Btn variant="secondary" onClick={goBack}>Back</Btn>}
          {step < 5 && <Btn onClick={goNext} style={{ flex: 1, justifyContent: 'center', display: 'flex' }}>Next</Btn>}
        </div>
      </div>
    </div>
  )
}
