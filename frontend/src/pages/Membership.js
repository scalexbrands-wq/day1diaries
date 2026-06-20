import React, { useState, useEffect, useCallback } from 'react'
import {
  getMembershipStatus, getMembershipPlans, getMembershipFormFields, getMembershipPaymentSettings,
  getMyMembershipApplication, getMyMembership, getMyMembershipPayments, getMyFeatureUsage,
  submitMembershipApplication, createRazorpayOrder,
} from '../lib/api'
import { toast } from '../components/Toast'

const Label = ({children}) => <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#5C3D2E', marginBottom:5 }}>{children}</label>
const Input = (p) => <input {...p} style={{ width:'100%', padding:'10px 14px', border:'1.5px solid #DDD3CA', borderRadius:8, fontSize:13, fontFamily:'inherit', outline:'none', marginBottom:14, ...p.style }}/>
const TextArea = (p) => <textarea {...p} style={{ width:'100%', padding:'10px 14px', border:'1.5px solid #DDD3CA', borderRadius:8, fontSize:13, fontFamily:'inherit', outline:'none', resize:'vertical', minHeight:80, marginBottom:14, ...p.style }}/>
const Btn = ({children, variant='primary', ...p}) => {
  const styles = { primary:{background:'#FF6B2B',color:'white',border:'none'}, secondary:{background:'transparent',color:'#FF6B2B',border:'1.5px solid #FF6B2B'} }
  return <button {...p} style={{ padding:'11px 22px', borderRadius:100, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', ...styles[variant], ...p.style }}>{children}</button>
}
const Card = ({children, style}) => <div style={{ background:'white', border:'1px solid #F0EAE4', borderRadius:16, padding:20, marginBottom:16, ...style }}>{children}</div>

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

const STATUS_LABELS = {
  pending: 'Pending Review', under_review: 'Under Review', approved: 'Approved', rejected: 'Rejected',
  expired: 'Expired', cancelled: 'Cancelled', suspended: 'Suspended', renewal_due: 'Renewal Due',
}

export default function Membership() {
  const [loading, setLoading] = useState(true)
  const [plans, setPlans] = useState([])
  const [membership, setMembership] = useState(null)
  const [card, setCard] = useState(null)
  const [application, setApplication] = useState(null)
  const [view, setView] = useState('plans') // plans | apply | status | dashboard | disabled
  const [selectedPlan, setSelectedPlan] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [statusRes, plansRes, memRes, appRes] = await Promise.all([
      getMembershipStatus(), getMembershipPlans(), getMyMembership(), getMyMembershipApplication(),
    ])
    setPlans(plansRes.data || [])
    setMembership(memRes.data?.membership || null)
    setCard(memRes.data?.card || null)
    setApplication(appRes.data || null)
    if (memRes.data?.membership) setView('dashboard')
    else if (appRes.data && ['pending', 'under_review'].includes(appRes.data.status)) setView('status')
    else if (statusRes.data === false) setView('disabled')
    else setView('plans')
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'#8C7B6E' }}>Loading…</div>

  return (
    <div style={{ padding:16, maxWidth:760, margin:'0 auto' }}>
      <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, marginBottom:6 }}>🎫 Membership</h2>
      <p style={{ color:'#8C7B6E', fontSize:13, marginTop:0, marginBottom:24 }}>Upgrade to premium for unlimited access to stories, habits, challenges, jobs, and the full community.</p>

      {view === 'dashboard' && <MembershipDashboard membership={membership} card={card} onRenew={() => setView('plans')}/>}
      {view === 'status' && <ApplicationStatus application={application} onBack={() => setView('plans')}/>}
      {view === 'plans' && <PlanSelector plans={plans} onSelect={(plan) => { setSelectedPlan(plan); setView('apply') }}/>}
      {view === 'apply' && <ApplicationFlow plan={selectedPlan} onDone={load} onCancel={() => setView('plans')}/>}
      {view === 'disabled' && <Card><p style={{ color:'#8C7B6E', fontSize:13, margin:0 }}>The membership program isn't currently accepting new applications. Check back soon!</p></Card>}
    </div>
  )
}

function PlanSelector({ plans, onSelect }) {
  if (!plans.length) return <Card><p style={{ color:'#8C7B6E', fontSize:13, margin:0 }}>No membership plans are available right now. Check back soon!</p></Card>
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:16 }}>
      {plans.map(p => (
        <Card key={p.id} style={{ display:'flex', flexDirection:'column' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <span style={{ fontSize:24 }}>{p.badge_emoji}</span>
            <span style={{ fontWeight:700, fontSize:16 }}>{p.name}</span>
          </div>
          <div style={{ fontSize:26, fontWeight:800, color:p.badge_color, marginBottom:8 }}>
            {p.currency} {p.price}
            <span style={{ fontSize:12, fontWeight:500, color:'#8C7B6E' }}> / {p.duration_type}</span>
          </div>
          {p.description && <p style={{ fontSize:12, color:'#5C3D2E', marginBottom:10 }}>{p.description}</p>}
          <ul style={{ fontSize:12, color:'#4A2800', paddingLeft:18, marginBottom:16, flex:1 }}>
            {(p.benefits || []).map((b, i) => <li key={i} style={{ marginBottom:4 }}>{b}</li>)}
          </ul>
          <Btn onClick={() => onSelect(p)} style={{ width:'100%', justifyContent:'center' }}>Apply Now</Btn>
        </Card>
      ))}
    </div>
  )
}

function ApplicationStatus({ application, onBack }) {
  if (!application) return null
  return (
    <Card>
      <div style={{ fontSize:14, fontWeight:700, marginBottom:8 }}>Application Status: {STATUS_LABELS[application.status] || application.status}</div>
      <p style={{ fontSize:13, color:'#5C3D2E' }}>Plan: {application.plan_name}</p>
      <p style={{ fontSize:13, color:'#5C3D2E' }}>Submitted: {new Date(application.submitted_at).toLocaleDateString('en-IN')}</p>
      {application.status === 'rejected' && application.admin_notes && (
        <p style={{ fontSize:13, color:'#DC2626' }}>Reason: {application.admin_notes}</p>
      )}
      {application.status === 'rejected' && <Btn onClick={onBack} style={{ marginTop:10 }}>Apply Again</Btn>}
      {['pending', 'under_review'].includes(application.status) && (
        <p style={{ fontSize:12, color:'#8C7B6E', marginTop:10 }}>Our team is reviewing your application — you'll get an email once it's approved.</p>
      )}
    </Card>
  )
}

function MembershipDashboard({ membership, card, onRenew }) {
  const [payments, setPayments] = useState([])
  const [usage, setUsage] = useState([])
  useEffect(() => {
    getMyMembershipPayments().then(({ data }) => setPayments(data || []))
    getMyFeatureUsage().then(({ data }) => setUsage(data || []))
  }, [])

  const expiringSoon = membership.end_date && new Date(membership.end_date) - new Date() < 1000 * 60 * 60 * 24 * 14

  return (
    <div>
      <Card style={{ background: `linear-gradient(135deg, ${membership.badge_color || '#FF6B2B'}, #1A0800)`, color:'white' }}>
        <div style={{ fontSize:12, opacity:.85, textTransform:'uppercase', letterSpacing:'.08em' }}>{membership.plan_name}</div>
        <div style={{ fontSize:13, opacity:.85, marginTop:4 }}>{membership.membership_number}</div>
        <div style={{ display:'flex', gap:24, marginTop:16 }}>
          <div><div style={{ fontSize:11, opacity:.7 }}>Member Since</div><div style={{ fontWeight:700 }}>{new Date(membership.start_date).toLocaleDateString('en-IN')}</div></div>
          <div><div style={{ fontSize:11, opacity:.7 }}>Valid Until</div><div style={{ fontWeight:700 }}>{membership.end_date ? new Date(membership.end_date).toLocaleDateString('en-IN') : 'Lifetime'}</div></div>
        </div>
        {expiringSoon && <Btn onClick={onRenew} style={{ marginTop:14, background:'white', color:'#1A0800' }}>Renew Now</Btn>}
      </Card>

      <Card>
        <div style={{ fontWeight:700, marginBottom:10 }}>Membership Card</div>
        {!card && <p style={{ fontSize:13, color:'#8C7B6E' }}>Generating your card…</p>}
        {card?.status === 'processing' && <p style={{ fontSize:13, color:'#8C7B6E' }}>Your card is being generated — refresh in a moment.</p>}
        {card?.status === 'completed' && (
          <div>
            <img src={card.card_image_url} alt="Membership card" style={{ width:'100%', maxWidth:420, borderRadius:12, display:'block', marginBottom:12 }}/>
            <div style={{ display:'flex', gap:10 }}>
              <a href={card.card_image_url} download><Btn variant="secondary">Download PNG</Btn></a>
              <a href={card.card_pdf_url} download><Btn variant="secondary">Download PDF</Btn></a>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <div style={{ fontWeight:700, marginBottom:10 }}>Feature Usage</div>
        {usage.map(u => (
          <div key={u.feature_key} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #F0EAE4', fontSize:13 }}>
            <span>{u.label}</span>
            <span style={{ color:'#8C7B6E' }}>{u.remaining === -1 ? 'Unlimited' : `${u.remaining} remaining`}</span>
          </div>
        ))}
      </Card>

      <Card>
        <div style={{ fontWeight:700, marginBottom:10 }}>Payment History</div>
        {payments.length === 0 && <p style={{ fontSize:13, color:'#8C7B6E' }}>No payments recorded.</p>}
        {payments.map(p => (
          <div key={p.id} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #F0EAE4', fontSize:13 }}>
            <span>{p.plan_name} · {p.method}</span>
            <span>{p.currency} {p.amount} ({p.status})</span>
          </div>
        ))}
      </Card>
    </div>
  )
}

function ApplicationFlow({ plan, onDone, onCancel }) {
  const [step, setStep] = useState(1)
  const [fields, setFields] = useState([])
  const [values, setValues] = useState({})
  const [files, setFiles] = useState({})
  const [paymentMethod, setPaymentMethod] = useState('manual')
  const [paymentSettings, setPaymentSettings] = useState({})
  const [proofFile, setProofFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getMembershipFormFields().then(({ data }) => setFields(data || []))
    getMembershipPaymentSettings().then(({ data }) => setPaymentSettings(data || {}))
  }, [])

  if (!plan) return <Card><p>No plan selected.</p><Btn onClick={onCancel}>Back to Plans</Btn></Card>

  const setValue = (key, v) => setValues(s => ({ ...s, [key]: v }))
  const setFile = (key, f) => setFiles(s => ({ ...s, [key]: f }))

  const validateStep2 = () => {
    for (const f of fields) {
      const isFileType = f.field_type === 'file' || f.field_type === 'image'
      if (f.is_required && isFileType && !files[f.field_key]) { toast.error(`${f.label} is required`); return false }
      if (f.is_required && !isFileType && !values[f.field_key]) { toast.error(`${f.label} is required`); return false }
    }
    return true
  }

  const finalizeSubmit = async (razorpayInfo) => {
    setSubmitting(true)
    const { error } = await submitMembershipApplication({
      planId: plan.id, paymentMethod, fields: values, files, paymentProofFile: proofFile, razorpay: razorpayInfo,
    })
    setSubmitting(false)
    if (error) return toast.error(error.message)
    toast.success('Application submitted! We will review it shortly.')
    onDone()
  }

  const submit = async () => {
    if (paymentMethod === 'razorpay') return payViaRazorpay()
    if (paymentMethod !== 'manual' && !proofFile) return toast.error('Please upload your payment proof screenshot')
    finalizeSubmit()
  }

  const payViaRazorpay = async () => {
    setSubmitting(true)
    try {
      await loadRazorpayScript()
      const { data: order, error } = await createRazorpayOrder(plan.id)
      if (error) { setSubmitting(false); return toast.error(error.message) }

      const checkout = new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: 'Day1 Diaries',
        description: `${plan.name} Membership`,
        handler: (response) => {
          finalizeSubmit({
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          })
        },
        modal: { ondismiss: () => setSubmitting(false) },
      })
      checkout.open()
    } catch (err) {
      setSubmitting(false)
      toast.error(err.message)
    }
  }

  const renderField = (f) => {
    const common = { key: f.field_key }
    if (f.field_type === 'textarea') return <TextArea {...common} value={values[f.field_key]||''} onChange={e=>setValue(f.field_key, e.target.value)}/>
    if (f.field_type === 'dropdown') return (
      <select {...common} value={values[f.field_key]||''} onChange={e=>setValue(f.field_key, e.target.value)} style={{ width:'100%', padding:'10px 14px', border:'1.5px solid #DDD3CA', borderRadius:8, fontSize:13, marginBottom:14 }}>
        <option value="">Select…</option>
        {(f.options||[]).map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    )
    if (f.field_type === 'radio') return (
      <div {...common} style={{ display:'flex', gap:14, marginBottom:14, flexWrap:'wrap' }}>
        {(f.options||[]).map(o => (
          <label key={o} style={{ display:'flex', alignItems:'center', gap:6, fontSize:13 }}>
            <input type="radio" name={f.field_key} checked={values[f.field_key]===o} onChange={()=>setValue(f.field_key,o)}/> {o}
          </label>
        ))}
      </div>
    )
    if (f.field_type === 'checkbox') return (
      <label {...common} style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, marginBottom:14, cursor:'pointer' }}>
        <input type="checkbox" checked={!!values[f.field_key]} onChange={e=>setValue(f.field_key, e.target.checked)}/> Yes
      </label>
    )
    if (f.field_type === 'file' || f.field_type === 'image') return (
      <input {...common} type="file" accept={f.field_type==='image'?'image/*':undefined} onChange={e=>setFile(f.field_key, e.target.files?.[0])} style={{ marginBottom:14, display:'block' }}/>
    )
    return <Input {...common} type={f.field_type==='number'?'number':f.field_type==='email'?'email':f.field_type==='phone'?'tel':'text'} value={values[f.field_key]||''} onChange={e=>setValue(f.field_key, e.target.value)}/>
  }

  return (
    <Card>
      <div style={{ fontWeight:700, fontSize:15, marginBottom:14 }}>Applying for: {plan.badge_emoji} {plan.name} ({plan.currency} {plan.price})</div>

      {step === 1 && (
        <div>
          <p style={{ fontSize:13, color:'#5C3D2E' }}>Fill out the application form to get started.</p>
          <Btn onClick={() => setStep(2)} style={{ width:'100%', justifyContent:'center' }}>Continue</Btn>
        </div>
      )}

      {step === 2 && (
        <div>
          {fields.map(f => (
            <div key={f.id}>
              <Label>{f.label}{f.is_required && ' *'}</Label>
              {renderField(f)}
            </div>
          ))}
          <div style={{ display:'flex', gap:10 }}>
            <Btn variant="secondary" onClick={() => setStep(1)}>Back</Btn>
            <Btn onClick={() => validateStep2() && setStep(3)} style={{ flex:1, justifyContent:'center' }}>Continue to Payment</Btn>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <Label>Payment Method</Label>
          <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
            {(paymentSettings.paymentMethodsEnabled || ['manual','upi','bank_transfer']).map(m => (
              <button key={m} onClick={() => setPaymentMethod(m)} style={{ flex:1, padding:10, borderRadius:8, border:`1.5px solid ${paymentMethod===m?'#FF6B2B':'#DDD3CA'}`, background:paymentMethod===m?'#FFF1EA':'white', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                {m === 'manual' ? 'Manual / Sponsor' : m === 'upi' ? 'UPI QR' : m === 'razorpay' ? 'Pay Online' : 'Bank Transfer'}
              </button>
            ))}
          </div>

          {paymentMethod === 'razorpay' && (
            <p style={{ fontSize:12, color:'#8C7B6E', marginBottom:16 }}>Pay securely via card, UPI, netbanking, or wallet — verified instantly, no screenshot needed.</p>
          )}

          {paymentMethod === 'upi' && paymentSettings.upiQrUrl && (
            <div style={{ marginBottom:16, textAlign:'center' }}>
              <img src={paymentSettings.upiQrUrl} alt="UPI QR" style={{ width:200, height:200, objectFit:'contain', border:'1px solid #F0EAE4', borderRadius:10 }}/>
              <p style={{ fontSize:12, color:'#8C7B6E' }}>Scan to pay {plan.currency} {plan.price}, then upload your payment screenshot below.</p>
            </div>
          )}
          {paymentMethod === 'bank_transfer' && paymentSettings.bankDetails && (
            <div style={{ background:'#F7F3EF', borderRadius:10, padding:14, marginBottom:16, fontSize:13 }}>
              <div>Bank: {paymentSettings.bankDetails.bank_name}</div>
              <div>Account Name: {paymentSettings.bankDetails.account_name}</div>
              <div>Account Number: {paymentSettings.bankDetails.account_number}</div>
              <div>IFSC: {paymentSettings.bankDetails.ifsc}</div>
              <div>Branch: {paymentSettings.bankDetails.branch}</div>
            </div>
          )}
          {(paymentMethod === 'upi' || paymentMethod === 'bank_transfer') && (
            <div>
              <Label>Upload Payment Screenshot *</Label>
              <input type="file" accept="image/*" onChange={e => setProofFile(e.target.files?.[0])} style={{ marginBottom:14, display:'block' }}/>
            </div>
          )}
          {paymentMethod === 'manual' && <p style={{ fontSize:12, color:'#8C7B6E', marginBottom:14 }}>Your application will be reviewed for manual/sponsor approval — no payment proof needed.</p>}

          <div style={{ display:'flex', gap:10 }}>
            <Btn variant="secondary" onClick={() => setStep(2)}>Back</Btn>
            <Btn onClick={submit} disabled={submitting} style={{ flex:1, justifyContent:'center' }}>
              {submitting ? 'Processing…' : paymentMethod === 'razorpay' ? `Pay ${plan.currency} ${plan.price}` : 'Submit Application'}
            </Btn>
          </div>
        </div>
      )}
    </Card>
  )
}
