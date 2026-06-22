import React, { useState, useEffect, useCallback } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '../contexts/AuthContext'
import {
  getAdminStats, adminGetUsers, adminFlaggedStories, adminModerateStory, adminBlockUser, adminUpdateUser, adminDeleteUser,
  adminGetHabits, adminUpsertHabit, adminDeleteHabit,
  getChallenges, adminUpsertChallenge, adminDeleteChallenge,
  getCommunityUpdates, adminUpsertCommunityUpdate, adminDeleteCommunityUpdate,
  getHabits, adminGetSettings, adminUpdateSettings,
  getVisitCount, adminSetVisitCount,
  adminGetAboutSections, adminUpsertAboutSection, adminDeleteAboutSection,
  adminGetBlogPosts, adminUpsertBlogPost, adminDeleteBlogPost,
  adminGetCareersJobs, adminUpsertCareersJob, adminDeleteCareersJob,
  adminGetAllApplications, adminGetCareersStats, adminUpdateApplicationStatus,
  adminGetContactMessages, adminUpdateContactStatus,
  adminGetCategories, adminUpsertCategory, adminDeleteCategory,
  adminGetAnnouncements, adminUpsertAnnouncement, adminDeleteAnnouncement,
  adminListEmailTemplates, adminCreateEmailTemplate, adminUpdateEmailTemplate, adminCloneEmailTemplate,
  adminArchiveEmailTemplate, adminRestoreEmailTemplate, adminGetEmailTemplateVersions, adminRestoreEmailTemplateVersion,
  adminTestSendEmailTemplate,
  adminGetEmailAudienceSources, adminListEmailAudiences, adminCreateEmailAudience, adminUpdateEmailAudience,
  adminDeleteEmailAudience, adminPreviewEmailAudienceDraft, adminPreviewEmailAudience,
  adminListEmailWorkflows, adminCreateEmailWorkflow, adminUpdateEmailWorkflow, adminDeleteEmailWorkflow,
  adminActivateEmailWorkflow, adminPauseEmailWorkflow, adminRunEmailWorkflowNow,
  adminListEmailSends, adminGetEmailSendRecipients,
  adminListMembershipPlans, adminCreateMembershipPlan, adminUpdateMembershipPlan, adminCloneMembershipPlan, adminSetMembershipPlanStatus,
  adminListMembershipFormFields, adminCreateMembershipFormField, adminUpdateMembershipFormField, adminDeleteMembershipFormField,
  adminListMembershipApplications, adminGetMembershipApplication, adminApproveMembershipApplication, adminRejectMembershipApplication,
  adminListMembershipPayments, adminVerifyMembershipPayment, adminRejectMembershipPayment, adminRefundMembershipPayment,
  adminListAccessRules, adminUpdateAccessRule,
  adminGetMembershipSettings, adminUpdateMembershipSettings, adminUploadMembershipUpiQr,
  adminGetMembershipStats,
  adminGetSeoSettings, adminUpdateSeoSettings, adminUploadSeoOgImage,
  adminGetGiftCategories, adminCreateGiftCategory, adminUpdateGiftCategory, adminDeleteGiftCategory,
  adminGetGiftTypes, adminCreateGiftType, adminUpdateGiftType, adminDeleteGiftType,
  adminGetGiftTemplates, adminCreateGiftTemplate, adminUpdateGiftTemplate, adminDeleteGiftTemplate,
  adminGetGiftOrders, adminGetGiftOrder, adminRefundGiftOrder,
  adminGetGiftPayments, adminGetGiftAnalytics, adminGetGiftSettings, adminUpdateGiftSettings, adminConfirmGiftCod,
  adminSetGiftPaymentStatus, adminGetWalletClaims, adminApproveWalletClaim, adminRejectWalletClaim,
  adminShipGiftOrder, adminCancelGiftShipment, adminGetGiftTracking, adminSetGiftOrderStatus, adminUpdateGiftShippingAddress,
  adminListAdCampaigns, adminGetAdAnalytics, adminCreateAdCampaign, adminUpdateAdCampaign,
  adminSetAdCampaignStatus, adminDeleteAdCampaign,
  adminGetMarketingSettings, adminUpdateMarketingSettings,
  adminGetRbacMatrix, adminSetRolePermissions,
} from '../lib/api'
import AdminLandingContent from './AdminLandingContent'
import { toast } from '../components/Toast'
import CertificateGenerator from '../components/CertificateGenerator'
import GiftTrackingTimeline from '../components/GiftTrackingTimeline'

const L = ({c}) => <label style={{display:'block',fontSize:12,fontWeight:600,color:'#5C3D2E',marginBottom:5}}>{c}</label>
const Inp = (p) => <input {...p} style={{width:'100%',padding:'9px 12px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',marginBottom:12,...p.style}} onFocus={e=>e.target.style.borderColor='#FF6B2B'} onBlur={e=>e.target.style.borderColor='#DDD3CA'}/>
const TA  = (p) => <textarea {...p} style={{width:'100%',padding:'9px 12px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',resize:'vertical',minHeight:72,marginBottom:12,...p.style}} onFocus={e=>e.target.style.borderColor='#FF6B2B'} onBlur={e=>e.target.style.borderColor='#DDD3CA'}/>
const Btn = ({children,v='primary',...p}) => {
  const m={primary:{bg:'#FF6B2B',co:'white',bd:'#FF6B2B'},secondary:{bg:'transparent',co:'#FF6B2B',bd:'#FF6B2B'},danger:{bg:'transparent',co:'#DC2626',bd:'#DC2626'},green:{bg:'#059669',co:'white',bd:'#059669'}}[v]
  return <button {...p} style={{padding:'8px 18px',borderRadius:100,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',transition:'all .2s',background:m.bg,color:m.co,border:`1.5px solid ${m.bd}`,...p.style}}>{children}</button>
}
const Card = ({children,style,...rest}) => <div {...rest} style={{background:'white',border:'1px solid #F0EAE4',borderRadius:16,padding:20,marginBottom:16,...style}}>{children}</div>
const SH = ({c}) => <div style={{fontSize:14,fontWeight:700,color:'#1A0800',marginBottom:14,paddingBottom:10,borderBottom:'1px solid #F0EAE4'}}>{c}</div>
const Modal = ({title,onClose,children}) => (
  <div style={{position:'fixed',inset:0,background:'rgba(26,8,0,.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20,overflowY:'auto'}}>
    <div style={{background:'white',borderRadius:20,padding:28,width:'100%',maxWidth:540,margin:'auto',maxHeight:'90vh',overflowY:'auto'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
        <div style={{fontSize:15,fontWeight:700}}>{title}</div>
        <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',fontSize:20,color:'#8C7B6E',lineHeight:1}}>×</button>
      </div>
      {children}
    </div>
  </div>
)

// Each tab lists the permission key(s) that unlock it — a tab shows if
// the signed-in role has ANY of them (or is the 'admin' superuser).
// 'rbac' has none listed here; it's gated separately to the true admin
// role only (see AdminDashboard below) so no role can grant itself more
// access by editing the matrix.
const TABS = [
  ['overview','📊 Overview', ['view_analytics']],
  ['announcements','📢 Announcements', ['manage_announcements']],
  ['habits','💪 Habits', ['manage_habits']],
  ['challenges','🏆 Challenges', ['manage_challenges']],
  ['events','📅 Events', ['manage_community_events']],
  ['email','✉️ Email Center', ['manage_email']],
  ['membership','🎫 Membership', ['manage_membership','review_membership_applications','manage_membership_payments']],
  ['gifting','🎁 Gifting', ['manage_gifting','manage_gift_payments','manage_wallet_claims','manage_shipments']],
  ['marketing','📣 Marketing', ['manage_marketing']],
  ['seo','🔎 SEO', ['manage_seo']],
  ['users','👥 Users', ['view_users','manage_users','delete_users','manage_roles']],
  ['content','🛡️ Moderation', ['moderate_content']],
  ['landing','🎯 Landing', ['manage_landing_content']],
  ['sitepages','🌐 Site Pages', ['manage_site_pages']],
  ['categories','📂 Categories', ['manage_categories']],
  ['settings','⚙️ Settings', ['manage_settings']],
]

export default function AdminDashboard() {
  const { profile, permissions, hasPermission } = useAuth()
  const isSuperAdmin = profile?.role === 'admin'
  const visibleTabs = TABS.filter(([,,perms]) => isSuperAdmin || hasPermission(...perms))
  const [tab, setTab] = useState(null)
  const activeTab = tab && (isSuperAdmin || visibleTabs.some(([k])=>k===tab) || tab==='rbac') ? tab : (visibleTabs[0]?.[0] || null)

  if (!permissions) return <Card>Loading…</Card>

  return (
    <div className="admin-dash" style={{padding:'24px 32px',maxWidth:1100}}>
      <style>{`@media (max-width: 600px) { .admin-dash { padding: 16px !important; } }`}</style>
      <div style={{display:'flex',gap:0,borderBottom:'2px solid #F0EAE4',marginBottom:24,flexWrap:'wrap'}}>
        {visibleTabs.map(([k,l]) => (
          <button key={k} onClick={()=>setTab(k)} style={{padding:'8px 14px',background:'none',border:'none',cursor:'pointer',fontSize:12,fontWeight:600,fontFamily:'inherit',color:activeTab===k?'#FF6B2B':'#8C7B6E',borderBottom:activeTab===k?'2px solid #FF6B2B':'2px solid transparent',marginBottom:'-2px',whiteSpace:'nowrap'}}>{l}</button>
        ))}
        {isSuperAdmin && (
          <button onClick={()=>setTab('rbac')} style={{padding:'8px 14px',background:'none',border:'none',cursor:'pointer',fontSize:12,fontWeight:600,fontFamily:'inherit',color:activeTab==='rbac'?'#FF6B2B':'#8C7B6E',borderBottom:activeTab==='rbac'?'2px solid #FF6B2B':'2px solid transparent',marginBottom:'-2px',whiteSpace:'nowrap'}}>🔐 Roles &amp; Permissions</button>
        )}
      </div>
      {!activeTab && <Card><p style={{color:'#8C7B6E',fontSize:13,margin:0}}>No admin permissions are assigned to your role yet.</p></Card>}
      {activeTab==='overview'       && <OverviewTab/>}
      {activeTab==='announcements'  && <AnnouncementsTab/>}
      {activeTab==='habits'         && <HabitsTab/>}
      {activeTab==='challenges' && <ChallengesTab/>}
      {activeTab==='events'     && <EventsTab/>}
      {activeTab==='email'      && <EmailCenterTab/>}
      {activeTab==='membership' && <MembershipTab/>}
      {activeTab==='gifting' && <GiftingTab/>}
      {activeTab==='marketing' && <MarketingTab/>}
      {activeTab==='seo' && <SeoTab/>}
      {activeTab==='users'      && <UsersTab/>}
      {activeTab==='content'    && <ModerationTab/>}
      {activeTab==='landing'    && <AdminLandingContent/>}
      {activeTab==='sitepages'  && <SitePagesTab/>}
      {activeTab==='categories' && <CategoriesTab/>}
      {activeTab==='settings'   && <SettingsTab/>}
      {activeTab==='rbac'       && isSuperAdmin && <RolesPermissionsTab/>}
    </div>
  )
}

/* ══ ANNOUNCEMENTS ═════════════════════════════════════════════ */
const PRESET_COLORS = ['#FF6B2B','#7C3AED','#059669','#2563EB','#DC2626','#F59E0B','#EC4899','#1A0800']
const PRESET_EMOJIS = ['📢','🎉','🚀','⭐','💡','🔥','🏆','🎯','💪','✨','📣','🎊']

function AnnouncementsTab() {
  const [list, setList] = useState([])
  const [form, setForm] = useState({ title:'', message:'', emoji:'📢', bg_color:'#FF6B2B', is_active:true })
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const load = useCallback(() => {
    adminGetAnnouncements().then(({ data }) => setList(data || []))
  }, [])
  useEffect(() => { load() }, [load])

  const openNew = () => {
    setEditing(null)
    setForm({ title:'', message:'', emoji:'📢', bg_color:'#FF6B2B', is_active:true })
    setShowModal(true)
  }
  const openEdit = (a) => {
    setEditing(a)
    setForm({ title:a.title, message:a.message, emoji:a.emoji||'📢', bg_color:a.bg_color||'#FF6B2B', is_active:a.is_active })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.title.trim() || !form.message.trim()) return toast.error('Title and message required')
    setSaving(true)
    const payload = editing ? { ...form, id: editing.id } : form
    const { data, error } = await adminUpsertAnnouncement(payload)
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success(editing ? 'Updated' : 'Announcement created')
    setShowModal(false)
    load()
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return
    await adminDeleteAnnouncement(id)
    toast.success('Deleted')
    load()
  }

  const toggleActive = async (a) => {
    await adminUpsertAnnouncement({ ...a, is_active: !a.is_active })
    load()
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <h3 style={{margin:0,fontSize:15,fontWeight:700}}>Announcements</h3>
        <Btn onClick={openNew}>+ New Announcement</Btn>
      </div>

      {list.length === 0 && (
        <Card><p style={{color:'#8C7B6E',fontSize:13,margin:0,textAlign:'center'}}>No announcements yet. Create one to show a popup to users on login.</p></Card>
      )}

      {list.map(a => (
        <Card key={a.id} style={{display:'flex',gap:14,alignItems:'flex-start'}}>
          <div style={{width:44,height:44,borderRadius:12,background:`linear-gradient(135deg,${a.bg_color||'#FF6B2B'},${a.bg_color||'#FF6B2B'}88)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>
            {a.emoji||'📢'}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
              <span style={{fontWeight:700,fontSize:14}}>{a.title}</span>
              <span style={{fontSize:10,padding:'2px 8px',borderRadius:100,background:a.is_active?'rgba(5,150,105,.1)':'rgba(107,114,128,.1)',color:a.is_active?'#059669':'#6B7280',fontWeight:700}}>
                {a.is_active?'ACTIVE':'INACTIVE'}
              </span>
            </div>
            <p style={{fontSize:13,color:'#4A2800',margin:'0 0 8px',lineHeight:1.5,wordBreak:'break-word'}}>{a.message}</p>
            <div style={{fontSize:11,color:'#8C7B6E'}}>{new Date(a.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</div>
          </div>
          <div style={{display:'flex',gap:6,flexShrink:0,flexWrap:'wrap',justifyContent:'flex-end'}}>
            <Btn v='secondary' style={{fontSize:11,padding:'5px 12px'}} onClick={()=>toggleActive(a)}>
              {a.is_active?'Deactivate':'Activate'}
            </Btn>
            <Btn v='secondary' style={{fontSize:11,padding:'5px 12px'}} onClick={()=>openEdit(a)}>Edit</Btn>
            <Btn v='danger' style={{fontSize:11,padding:'5px 12px'}} onClick={()=>handleDelete(a.id)}>Delete</Btn>
          </div>
        </Card>
      ))}

      {showModal && (
        <Modal title={editing?'Edit Announcement':'New Announcement'} onClose={()=>setShowModal(false)}>
          {/* Preview */}
          <div style={{background:`linear-gradient(135deg,${form.bg_color},${form.bg_color}cc)`,borderRadius:16,padding:'20px',textAlign:'center',marginBottom:16}}>
            <div style={{fontSize:36,marginBottom:6}}>{form.emoji||'📢'}</div>
            <div style={{color:'white',fontWeight:700,fontSize:14,marginBottom:4}}>{form.title||'Announcement title'}</div>
            <div style={{color:'rgba(255,255,255,.85)',fontSize:12,lineHeight:1.5}}>{form.message||'Message preview…'}</div>
          </div>

          <L c="Title"/>
          <Inp value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. New Feature Launched 🎉"/>
          <L c="Message"/>
          <TA value={form.message} onChange={e=>setForm(f=>({...f,message:e.target.value}))} placeholder="Describe the announcement…" style={{minHeight:90}}/>

          <L c="Emoji"/>
          <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:12}}>
            {PRESET_EMOJIS.map(e=>(
              <button key={e} onClick={()=>setForm(f=>({...f,emoji:e}))} style={{width:36,height:36,borderRadius:8,border:`2px solid ${form.emoji===e?'#FF6B2B':'#DDD3CA'}`,background:'white',cursor:'pointer',fontSize:18}}>
                {e}
              </button>
            ))}
          </div>

          <L c="Background Color"/>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
            {PRESET_COLORS.map(c=>(
              <button key={c} onClick={()=>setForm(f=>({...f,bg_color:c}))} style={{width:32,height:32,borderRadius:50,background:c,border:form.bg_color===c?'3px solid #1A0800':'3px solid transparent',cursor:'pointer',transition:'all .15s'}}/>
            ))}
          </div>

          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
            <input type="checkbox" id="ann-active" checked={form.is_active} onChange={e=>setForm(f=>({...f,is_active:e.target.checked}))} style={{width:16,height:16}}/>
            <label htmlFor="ann-active" style={{fontSize:13,fontWeight:600,color:'#1A0800',cursor:'pointer'}}>Active (show to users)</label>
          </div>

          <Btn onClick={handleSave} disabled={saving} style={{width:'100%',padding:'11px'}}>
            {saving?'Saving…':editing?'Save Changes':'Create Announcement'}
          </Btn>
        </Modal>
      )}
    </div>
  )
}

/* ══ SETTINGS ══════════════════════════════════════════════════ */
function SettingsTab() {
  const [settings, setSettings] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    adminGetSettings().then(({ data, error }) => {
      if (error) { toast.error(error.message); return }
      setSettings(data || {})
    })
  }, [])

  useEffect(() => { load() }, [load])

  const toggleEmailVerification = async () => {
    if (!settings) return
    const current = settings.email_verification_required !== false
    setSaving(true)
    const { data, error } = await adminUpdateSettings({ email_verification_required: !current })
    setSaving(false)
    if (error) { toast.error(error.message); return }
    setSettings(data)
    toast.success(!current
      ? 'Email verification is now required for new sign-ups.'
      : 'Email verification is now optional — new users are signed in immediately.')
  }

  if (!settings) return <Card>Loading settings…</Card>

  const required = settings.email_verification_required !== false

  return (
    <>
    <Card>
      <SH c="Authentication"/>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:16,padding:'4px 0'}}>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>Require email verification on sign-up</div>
          <div style={{fontSize:12,color:'#8C7B6E',lineHeight:1.6}}>
            When enabled, new users must enter a 6-digit code sent to their email before they can sign in.
            When disabled, accounts are created and signed in immediately — no email code step.
          </div>
        </div>
        <button
          onClick={toggleEmailVerification}
          disabled={saving}
          aria-label="Toggle email verification requirement"
          style={{
            position:'relative', flexShrink:0, width:46, height:26, borderRadius:100, border:'none',
            cursor: saving ? 'default' : 'pointer', padding:0,
            background: required ? '#FF6B2B' : '#DDD3CA', transition:'background .2s',
          }}
        >
          <span style={{
            position:'absolute', top:3, left: required ? 23 : 3, width:20, height:20, borderRadius:'50%',
            background:'white', transition:'left .2s', boxShadow:'0 1px 3px rgba(0,0,0,.25)'
          }}/>
        </button>
      </div>
      <div style={{marginTop:10, fontSize:12, fontWeight:600, color: required ? '#059669' : '#FF6B2B'}}>
        {required ? '✓ Verification required' : '✓ Verification not required — instant sign-up'}
      </div>
    </Card>
    <VisitorCounterSettings/>
    </>
  )
}

/* ── Site-wide page-visit counter — shown at the top of every page,
   incremented on every page load; admins can override the number
   directly (e.g. to seed it with prior analytics history). ── */
function VisitorCounterSettings() {
  const [count, setCount] = useState(null)
  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    getVisitCount().then(({ data, error }) => {
      if (error) { toast.error(error.message); return }
      setCount(data)
      setInput(String(data))
    })
  }, [])

  useEffect(() => { load() }, [load])

  const save = async () => {
    const next = parseInt(input, 10)
    if (!Number.isFinite(next) || next < 0) { toast.error('Enter a non-negative whole number'); return }
    setSaving(true)
    const { data, error } = await adminSetVisitCount(next)
    setSaving(false)
    if (error) { toast.error(error.message); return }
    setCount(data)
    setInput(String(data))
    toast.success('Visitor count updated')
  }

  return (
    <Card>
      <SH c="Page Visitor Counter"/>
      <div style={{fontSize:12,color:'#8C7B6E',lineHeight:1.6,marginBottom:14}}>
        Shown at the top of every page, from the landing page onward. It increments by one on every page load. Override the number below if needed.
      </div>
      {count == null ? <div style={{fontSize:13,color:'#8C7B6E'}}>Loading…</div> : (
        <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
          <input
            type="number" min="0" value={input} onChange={e=>setInput(e.target.value)}
            style={{width:160,padding:'9px 12px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none'}}
            onFocus={e=>e.target.style.borderColor='#FF6B2B'} onBlur={e=>e.target.style.borderColor='#DDD3CA'}
          />
          <Btn onClick={save} disabled={saving}>{saving?'Saving…':'Save'}</Btn>
          <span style={{fontSize:12,color:'#8C7B6E'}}>Current: {count.toLocaleString()}</span>
        </div>
      )}
    </Card>
  )
}

/* ══ OVERVIEW ══════════════════════════════════════════════════ */
function OverviewTab() {
  const [stats,setStats]=useState(null)
  useEffect(()=>{ getAdminStats().then(({data})=>setStats(data)) },[])
  const fmt = n => n!=null?Number(n).toLocaleString():'—'
  const KPIS = stats?[
    {icon:'👥',label:'Total Users',val:fmt(stats.total_users),color:'#FF6B2B'},
    {icon:'🟢',label:'Active (30d)',val:fmt(stats.active_users),color:'#059669'},
    {icon:'💪',label:'Total Habits',val:fmt(stats.total_habits),color:'#2563EB'},
    {icon:'🏆',label:'Active Challenges',val:fmt(stats.active_challenges),color:'#F59E0B'},
    {icon:'📝',label:'Total Stories',val:fmt(stats.total_stories),color:'#EC4899'},
    {icon:'📅',label:'Events Booked',val:fmt(stats.events_booked),color:'#0EA5E9'},
  ]:[]
  return (
    <div>
      <div className="grid-3" style={{marginBottom:24}}>
        {KPIS.map(k=>(
          <div key={k.label} style={{background:'white',border:'1px solid #F0EAE4',borderRadius:14,padding:'16px 18px'}}>
            <div style={{fontSize:20,marginBottom:6}}>{k.icon}</div>
            <div style={{fontSize:22,fontWeight:700,color:k.color,fontFamily:"'Playfair Display',serif"}}>{k.val}</div>
            <div style={{fontSize:12,color:'#8C7B6E',marginTop:2}}>{k.label}</div>
          </div>
        ))}
        {!stats&&Array.from({length:6}).map((_,i)=><div key={i} style={{background:'#F5EDE4',borderRadius:14,height:90}}/>)}
      </div>
    </div>
  )
}

/* ══ HABITS ════════════════════════════════════════════════════ */
function HabitsTab() {
  const [habits,setHabits]=useState([])
  const [search,setSearch]=useState('')
  const [editing,setEditing]=useState(null)
  const [form,setForm]=useState({})
  const set=k=>e=>setForm(f=>({...f,[k]:e.target.type==='checkbox'?e.target.checked:e.target.value}))
  const load=useCallback(()=>adminGetHabits().then(({data})=>setHabits(data||[])),[])
  useEffect(()=>{load()},[load])
  const filtered=habits.filter(h=>h.title.toLowerCase().includes(search.toLowerCase())||(h.category||'').toLowerCase().includes(search.toLowerCase()))
  const startEdit=(h=null)=>{setEditing(h?.id||'new');setForm(h?{...h}:{title:'',description:'',icon:'✨',category:'',adopters_count:0,completion_rate:0,likes_count:0,comments_count:0,is_active:true})}
  const save=async()=>{
    if(!form.title?.trim()){toast.error('Title required');return}
    const p={...form,adopters_count:Number(form.adopters_count)||0,completion_rate:Number(form.completion_rate)||0,likes_count:Number(form.likes_count)||0,comments_count:Number(form.comments_count)||0}
    if(editing!=='new')p.id=editing;else delete p.id
    const{error}=await adminUpsertHabit(p)
    if(error){toast.error(error.message);return}
    toast.success(editing==='new'?'Habit created!':'Habit updated!');setEditing(null);load()
  }
  const remove=async(id)=>{if(!window.confirm('Delete habit?'))return;const{error}=await adminDeleteHabit(id);if(error)toast.error(error.message);else{toast.success('Deleted');load()}}
  return (
    <div>
      <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:16,flexWrap:'wrap'}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search habits by name or category..." style={{flex:1,minWidth:200,padding:'9px 14px',border:'1.5px solid #DDD3CA',borderRadius:100,fontSize:13,fontFamily:'inherit',outline:'none'}}/>
        <Btn onClick={()=>startEdit()}>+ New Habit</Btn>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))',gap:12}}>
        {filtered.map(h=>(
          <div key={h.id} style={{background:'white',border:'1px solid #F0EAE4',borderRadius:14,padding:18,opacity:h.is_active?1:.6}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
              <div style={{fontSize:22,width:42,height:42,borderRadius:10,background:'rgba(255,107,43,.1)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{h.icon||'✨'}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{h.title}</div>
                <div style={{fontSize:11,color:'#8C7B6E'}}>{h.category}</div>
              </div>
              {!h.is_active&&<span style={{fontSize:10,padding:'2px 7px',borderRadius:100,background:'#F0EAE4',color:'#8C7B6E'}}>Hidden</span>}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,marginBottom:10}}>
              {[[h.adopters_count?.toLocaleString()||'0','Adopters'],[h.completion_rate+'%','Done'],[(h.likes_count||0).toLocaleString(),'Likes'],[(h.comments_count||0).toLocaleString(),'Comments']].map(([v,l])=>(
                <div key={l} style={{textAlign:'center',background:'#FDF6EE',borderRadius:8,padding:'7px 4px'}}>
                  <div style={{fontSize:13,fontWeight:700,color:'#FF6B2B'}}>{v}</div>
                  <div style={{fontSize:9,color:'#8C7B6E'}}>{l}</div>
                </div>
              ))}
            </div>
            {h.description&&<div style={{fontSize:12,color:'#8C7B6E',marginBottom:10,lineHeight:1.5}}>{h.description.slice(0,70)}{h.description.length>70?'…':''}</div>}
            <div style={{display:'flex',gap:6}}>
              <Btn v="secondary" onClick={()=>startEdit(h)} style={{padding:'5px 12px',fontSize:11}}>Edit</Btn>
              <Btn v="danger" onClick={()=>remove(h.id)} style={{padding:'5px 12px',fontSize:11}}>Delete</Btn>
            </div>
          </div>
        ))}
        {filtered.length===0&&<div style={{gridColumn:'1/-1',textAlign:'center',padding:'40px 0',color:'#8C7B6E',fontSize:13}}>No habits found</div>}
      </div>
      {editing&&(
        <Modal title={editing==='new'?'Create Habit':'Edit Habit'} onClose={()=>setEditing(null)}>
          <div style={{display:'grid',gridTemplateColumns:'70px 1fr',gap:10}}>
            <div><L c="Icon"/><Inp value={form.icon||''} onChange={set('icon')} style={{textAlign:'center',fontSize:22,padding:'6px'}}/></div>
            <div><L c="Title"/><Inp value={form.title||''} onChange={set('title')} placeholder="Wake Up at 5AM"/></div>
          </div>
          <L c="Description"/><TA value={form.description||''} onChange={set('description')} placeholder="What this habit involves..."/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div><L c="Category"/><Inp value={form.category||''} onChange={set('category')} placeholder="Productivity"/></div>
            <div><L c="Adopters Count"/><Inp type="number" value={form.adopters_count||0} onChange={set('adopters_count')}/></div>
            <div><L c="Completion Rate (%)"/><Inp type="number" min="0" max="100" value={form.completion_rate||0} onChange={set('completion_rate')}/></div>
            <div><L c="Likes Count"/><Inp type="number" value={form.likes_count||0} onChange={set('likes_count')}/></div>
          </div>
          <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,marginBottom:16,cursor:'pointer'}}>
            <input type="checkbox" checked={form.is_active!==false} onChange={set('is_active')}/> Active (visible to users)
          </label>
          <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
            <Btn v="secondary" onClick={()=>setEditing(null)}>Cancel</Btn>
            <Btn onClick={save}>Save Habit</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ══ CHALLENGES ════════════════════════════════════════════════ */
function ChallengesTab() {
  const [items,setItems]=useState([])
  const [allHabits,setAllHabits]=useState([])
  const [editing,setEditing]=useState(null)
  const [form,setForm]=useState({})
  const set=k=>e=>setForm(f=>({...f,[k]:e.target.type==='checkbox'?e.target.checked:e.target.value}))
  const load=useCallback(async()=>{const[{data:c},{data:h}]=await Promise.all([getChallenges(),getHabits()]);setItems(c||[]);setAllHabits(h||[])},[])
  useEffect(()=>{load()},[load])
  const startEdit=(c=null)=>{setEditing(c?.id||'new');setForm(c?{...c}:{title:'',description:'',habit_id:'',duration_days:30,start_date:'',end_date:'',reward_points:1000,daily_points:10,weekly_points:100,participants_limit:'',visibility:'free',status:'upcoming'})}
  const save=async()=>{
    if(!form.title?.trim()){toast.error('Title required');return}
    const p={...form,duration_days:Number(form.duration_days)||30,reward_points:Number(form.reward_points)||1000,daily_points:Number(form.daily_points)||10,weekly_points:Number(form.weekly_points)||100,participants_limit:form.participants_limit?Number(form.participants_limit):null,start_date:form.start_date||null,end_date:form.end_date||null}
    if(editing!=='new')p.id=editing;else delete p.id
    delete p.habits
    const{error}=await adminUpsertChallenge(p)
    if(error){toast.error(error.message);return}
    toast.success('Challenge saved!');setEditing(null);load()
  }
  const SC={upcoming:'#2563EB',active:'#059669',completed:'#8C7B6E'}
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div style={{fontSize:15,fontWeight:700}}>Habit Challenges ({items.length})</div>
        <Btn onClick={()=>startEdit()}>+ New Challenge</Btn>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {items.map(c=>(
          <div key={c.id} style={{background:'white',border:'1px solid #F0EAE4',borderRadius:14,padding:18}}>
            <div style={{display:'flex',alignItems:'flex-start',gap:12,flexWrap:'wrap'}}>
              <div style={{flex:1,minWidth:180}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:5,flexWrap:'wrap'}}>
                  <div style={{fontSize:14,fontWeight:700}}>{c.title}</div>
                  <span style={{fontSize:10,padding:'2px 8px',borderRadius:100,background:'rgba(0,0,0,.05)',color:SC[c.status],fontWeight:600,textTransform:'uppercase'}}>{c.status}</span>
                  <span style={{fontSize:10,padding:'2px 8px',borderRadius:100,background:'rgba(255,107,43,.1)',color:'#FF6B2B',fontWeight:600}}>{c.visibility}</span>
                </div>
                <div style={{display:'flex',gap:14,fontSize:12,color:'#8C7B6E',flexWrap:'wrap'}}>
                  <span>⏱ {c.duration_days}d</span>{c.start_date&&<span>📅 {c.start_date}</span>}
                  <span>🏆 {c.reward_points}pts</span>
                  <span>👥 {c.participants_count||0}{c.participants_limit?` / ${c.participants_limit}`:''} joined</span>
                  <span>⚡ {c.daily_points}pts/day</span>
                </div>
              </div>
              <div style={{display:'flex',gap:6}}>
                <Btn v="secondary" onClick={()=>startEdit(c)} style={{padding:'5px 12px',fontSize:11}}>Edit</Btn>
                <Btn v="danger" onClick={async()=>{if(window.confirm('Delete?')){await adminDeleteChallenge(c.id);load()}}} style={{padding:'5px 12px',fontSize:11}}>Delete</Btn>
              </div>
            </div>
          </div>
        ))}
        {items.length===0&&<div style={{textAlign:'center',padding:'40px 0',color:'#8C7B6E',fontSize:13}}>No challenges yet</div>}
      </div>
      {editing&&(
        <Modal title={editing==='new'?'Create Challenge':'Edit Challenge'} onClose={()=>setEditing(null)}>
          <L c="Title"/><Inp value={form.title||''} onChange={set('title')} placeholder="Wake Up 5AM — July Challenge"/>
          <L c="Description"/><TA value={form.description||''} onChange={set('description')}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div><L c="Linked Habit"/>
              <select value={form.habit_id||''} onChange={set('habit_id')} style={{width:'100%',padding:'9px 12px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:13,marginBottom:12,background:'white',fontFamily:'inherit'}}>
                <option value="">— None —</option>
                {allHabits.map(h=><option key={h.id} value={h.id}>{h.icon} {h.title}</option>)}
              </select>
            </div>
            <div><L c="Duration (days)"/><Inp type="number" value={form.duration_days||30} onChange={set('duration_days')}/></div>
            <div><L c="Start Date"/><Inp type="date" value={form.start_date||''} onChange={set('start_date')}/></div>
            <div><L c="End Date"/><Inp type="date" value={form.end_date||''} onChange={set('end_date')}/></div>
            <div><L c="Reward Points"/><Inp type="number" value={form.reward_points||1000} onChange={set('reward_points')}/></div>
            <div><L c="Daily Points"/><Inp type="number" value={form.daily_points||10} onChange={set('daily_points')}/></div>
            <div><L c="Weekly Points"/><Inp type="number" value={form.weekly_points||100} onChange={set('weekly_points')}/></div>
            <div><L c="Participants Limit (blank=∞)"/><Inp type="number" value={form.participants_limit||''} onChange={set('participants_limit')} placeholder="Unlimited"/></div>
            <div><L c="Visibility"/>
              <select value={form.visibility||'free'} onChange={set('visibility')} style={{width:'100%',padding:'9px 12px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:13,marginBottom:12,background:'white',fontFamily:'inherit'}}>
                <option value="free">Free — Everyone</option>
                <option value="pro">Restricted</option>
              </select>
            </div>
            <div><L c="Status"/>
              <select value={form.status||'upcoming'} onChange={set('status')} style={{width:'100%',padding:'9px 12px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:13,marginBottom:12,background:'white',fontFamily:'inherit'}}>
                <option value="upcoming">Upcoming</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
            <Btn v="secondary" onClick={()=>setEditing(null)}>Cancel</Btn>
            <Btn onClick={save}>Save Challenge</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ══ EVENTS ════════════════════════════════════════════════════ */
function EventsTab() {
  const [items,setItems]=useState([])
  const [editing,setEditing]=useState(null)
  const [form,setForm]=useState({})
  const set=k=>e=>setForm(f=>({...f,[k]:e.target.type==='checkbox'?e.target.checked:e.target.value}))
  const load=useCallback(()=>getCommunityUpdates().then(({data})=>setItems(data||[])),[])
  useEffect(()=>{load()},[load])
  const startEdit=(item=null)=>{setEditing(item?.id||'new');setForm(item?{...item}:{title:'',description:'',event_type:'community_news',event_date:'',duration_mins:60,seats_available:'',speaker_name:'',speaker_bio:'',agenda:'',zoom_link:'',is_published:true,cover_image_url:''})}
  const save=async()=>{
    if(!form.title?.trim()){toast.error('Title required');return}
    const p={...form,duration_mins:Number(form.duration_mins)||60,seats_available:form.seats_available?Number(form.seats_available):null,event_date:form.event_date||null}
    if(editing!=='new')p.id=editing;else delete p.id
    const{error}=await adminUpsertCommunityUpdate(p)
    if(error){toast.error(error.message);return}
    toast.success('Event saved!');setEditing(null);load()
  }
  const TL={community_news:'📢 News',success_story:'⭐ Story',free_event:'🎉 Event',webinar:'🎥 Webinar',workshop:'🛠 Workshop'}
  const TC={community_news:'#2563EB',success_story:'#059669',free_event:'#FF6B2B',webinar:'#F59E0B',workshop:'#EC4899'}
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div style={{fontSize:15,fontWeight:700}}>Events & Community Updates ({items.length})</div>
        <Btn onClick={()=>startEdit()}>+ New Event</Btn>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {items.map(item=>(
          <div key={item.id} style={{background:'white',border:'1px solid #F0EAE4',borderRadius:14,padding:16}}>
            <div style={{display:'flex',alignItems:'flex-start',gap:12,flexWrap:'wrap'}}>
              <div style={{flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:5,flexWrap:'wrap'}}>
                  <span style={{fontSize:11,padding:'2px 9px',borderRadius:100,background:'rgba(0,0,0,.05)',color:TC[item.event_type]||'#FF6B2B',fontWeight:600}}>{TL[item.event_type]||item.event_type}</span>
                  {!item.is_published&&<span style={{fontSize:10,padding:'2px 7px',borderRadius:100,background:'#F5EDE4',color:'#8C7B6E'}}>Draft</span>}
                </div>
                <div style={{fontSize:14,fontWeight:600,marginBottom:4}}>{item.title}</div>
                <div style={{fontSize:12,color:'#8C7B6E',display:'flex',gap:14,flexWrap:'wrap'}}>
                  {item.event_date&&<span>📅 {new Date(item.event_date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span>}
                  {item.duration_mins&&<span>⏱ {item.duration_mins}min</span>}
                  {item.seats_available&&<span>💺 {item.seats_available-(item.seats_booked||0)}/{item.seats_available} left</span>}
                  {item.speaker_name&&<span>🎤 {item.speaker_name}</span>}
                </div>
              </div>
              <div style={{display:'flex',gap:6}}>
                <Btn v="secondary" onClick={()=>startEdit(item)} style={{padding:'5px 12px',fontSize:11}}>Edit</Btn>
                <Btn v="danger" onClick={async()=>{if(window.confirm('Delete?')){await adminDeleteCommunityUpdate(item.id);load()}}} style={{padding:'5px 12px',fontSize:11}}>Delete</Btn>
              </div>
            </div>
          </div>
        ))}
        {items.length===0&&<div style={{textAlign:'center',padding:'40px 0',color:'#8C7B6E',fontSize:13}}>No events yet</div>}
      </div>
      {editing&&(
        <Modal title={editing==='new'?'Create Event / Update':'Edit Event'} onClose={()=>setEditing(null)}>
          <L c="Title"/><Inp value={form.title||''} onChange={set('title')} placeholder="30-Day Morning Challenge Kickoff"/>
          <L c="Description"/><TA value={form.description||''} onChange={set('description')} style={{minHeight:80}}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div><L c="Event Type"/>
              <select value={form.event_type||'community_news'} onChange={set('event_type')} style={{width:'100%',padding:'9px 12px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:13,marginBottom:12,background:'white',fontFamily:'inherit'}}>
                <option value="community_news">📢 Community News</option>
                <option value="success_story">⭐ Success Story</option>
                <option value="free_event">🎉 Free Event</option>
                <option value="webinar">🎥 Webinar</option>
                <option value="workshop">🛠 Workshop</option>
              </select>
            </div>
            <div><L c="Date & Time"/><Inp type="datetime-local" value={form.event_date?.slice(0,16)||''} onChange={set('event_date')}/></div>
            <div><L c="Duration (min)"/><Inp type="number" value={form.duration_mins||60} onChange={set('duration_mins')}/></div>
            <div><L c="Seats (blank=∞)"/><Inp type="number" value={form.seats_available||''} onChange={set('seats_available')}/></div>
            <div><L c="Speaker Name"/><Inp value={form.speaker_name||''} onChange={set('speaker_name')}/></div>
            <div><L c="Zoom / Meet Link"/><Inp value={form.zoom_link||''} onChange={set('zoom_link')}/></div>
          </div>
          <L c="Speaker Bio"/><Inp value={form.speaker_bio||''} onChange={set('speaker_bio')}/>
          <L c="Agenda (line by line)"/><TA value={form.agenda||''} onChange={set('agenda')} placeholder={"10:00 - Welcome\n10:15 - Main talk\n11:00 - Q&A"}/>
          <L c="Cover Image URL"/><Inp value={form.cover_image_url||''} onChange={set('cover_image_url')} placeholder="https://..."/>
          <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,cursor:'pointer',marginBottom:16}}>
            <input type="checkbox" checked={form.is_published!==false} onChange={set('is_published')}/> Published
          </label>
          <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
            <Btn v="secondary" onClick={()=>setEditing(null)}>Cancel</Btn>
            <Btn onClick={save}>Save Event</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ══ USERS ════════════════════════════════════════════════════ */
function UsersTab() {
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // user object being edited
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [certifyingUser, setCertifyingUser] = useState(null) // user object to generate a certificate for

  const load = () => adminGetUsers().then(({ data }) => { setUsers(data || []); setLoading(false) })
  useEffect(() => { load() }, [])

  const COLORS = ['#FF6B2B', '#7C3AED', '#059669', '#2563EB', '#EC4899']
  const getColor = n => COLORS[(n || '').charCodeAt(0) % COLORS.length]
  const getInit = n => (n || '?').split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2)

  const filtered = users.filter(u =>
    (u.full_name || u.username || u.email || '').toLowerCase().includes(search.toLowerCase())
  )

  const startEdit = (u) => {
    setForm({
      full_name: u.full_name || '',
      username: u.username || '',
      bio: u.bio || '',
      location: u.location || '',
      role: u.role || 'user',
      is_blocked: u.is_blocked || false,
      coins: u.coins || 0,
    })
    setEditing(u)
  }

  const saveEdit = async () => {
    setSaving(true)
    const { data, error } = await adminUpdateUser(editing.id, { ...form, coins: Number(form.coins) || 0 })
    setSaving(false)
    if (error) { toast.error(error.message || 'Failed to update'); return }
    setUsers(us => us.map(u => u.id === editing.id ? { ...u, ...data } : u))
    setEditing(null)
    toast.success('User updated')
  }

  const handleDelete = async (u) => {
    if (!window.confirm(`Permanently delete @${u.username}? This removes their account, stories, comments and cannot be undone.`)) return
    const { error } = await adminDeleteUser(u.id)
    if (error) { toast.error(error.message || 'Failed to delete'); return }
    setUsers(us => us.filter(x => x.id !== u.id))
    toast.success(`User @${u.username} deleted`)
  }

  const roleColor = { admin: '#7C3AED', contributor: '#059669', user: '#8C7B6E' }
  const roleBg = { admin: 'rgba(124,58,237,.1)', contributor: 'rgba(5,150,105,.1)', user: 'rgba(0,0,0,.05)' }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  return (
    <div>
      {/* Search bar + count */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, username or email..."
          style={{ flex: 1, padding: '9px 14px', border: '1.5px solid #DDD3CA', borderRadius: 100, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
        />
        <div style={{ fontSize: 13, color: '#8C7B6E', whiteSpace: 'nowrap' }}>{filtered.length} users</div>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40, color: '#8C7B6E' }}>Loading...</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(u => (
          <div key={u.id} style={{
            background: 'white',
            border: u.is_blocked ? '1.5px solid #FECACA' : '1px solid #F0EAE4',
            borderRadius: 12,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}>
            {/* Avatar */}
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: getColor(u.full_name || u.username), color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0, overflow: 'hidden' }}>
              {u.avatar_url
                ? <img src={u.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}  loading="lazy" />
                : getInit(u.full_name || u.username || '?')}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {u.full_name || u.username}
                <span style={{ fontSize: 9, padding: '1px 7px', borderRadius: 100, background: roleBg[u.role] || roleBg.user, color: roleColor[u.role] || roleColor.user, fontWeight: 700 }}>
                  {(u.role || 'user').toUpperCase()}
                </span>
                {u.is_blocked && <span style={{ fontSize: 9, padding: '1px 7px', borderRadius: 100, background: '#FEE2E2', color: '#DC2626', fontWeight: 700 }}>BLOCKED</span>}
              </div>
              <div style={{ fontSize: 11, color: '#8C7B6E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                @{u.username} · {u.location || '—'} · {(u.score || 0).toLocaleString()} pts · 🪙 {(u.coins || 0).toLocaleString()} coins · joined {u.created_at ? formatDistanceToNow(new Date(u.created_at), { addSuffix: true }) : '—'}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button
                onClick={() => startEdit(u)}
                style={{ padding: '5px 14px', borderRadius: 100, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: 'transparent', color: '#FF6B2B', border: '1.5px solid #FF6B2B' }}
              >
                Edit
              </button>
              <button
                onClick={() => setCertifyingUser(u)}
                style={{ padding: '5px 14px', borderRadius: 100, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: 'transparent', color: '#7C3AED', border: '1.5px solid #7C3AED' }}
              >
                🎖 Certificate
              </button>
              <button
                onClick={() => handleDelete(u)}
                style={{ padding: '5px 14px', borderRadius: 100, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: 'transparent', color: '#DC2626', border: '1.5px solid #DC2626' }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editing && (
        <Modal title={`Edit User — @${editing.username}`} onClose={() => setEditing(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <L c="Full Name" />
              <Inp value={form.full_name} onChange={set('full_name')} placeholder="Priya Sharma" />
            </div>
            <div>
              <L c="Username" />
              <Inp value={form.username} onChange={set('username')} placeholder="priya_s" />
            </div>
          </div>
          <L c="Bio" />
          <TA value={form.bio} onChange={set('bio')} placeholder="Short bio..." style={{ minHeight: 60 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <L c="Location" />
              <Inp value={form.location} onChange={set('location')} placeholder="Mumbai, India" />
            </div>
            <div>
              <L c="Role" />
              <select
                value={form.role}
                onChange={set('role')}
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #DDD3CA', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', marginBottom: 12, background: 'white' }}
              >
                <option value="user">User</option>
                <option value="contributor">Contributor</option>
                <option value="moderator">Moderator</option>
                <option value="marketer">Marketer</option>
                <option value="support">Support</option>
                <option value="finance">Finance</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <L c="Coins (wallet balance)" />
          <Inp type="number" min="0" value={form.coins} onChange={set('coins')} placeholder="0" />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginBottom: 20, padding: '10px 12px', background: form.is_blocked ? '#FEF2F2' : '#F0FDF4', borderRadius: 8 }}>
            <input type="checkbox" checked={form.is_blocked} onChange={set('is_blocked')} />
            <span style={{ fontWeight: 600, color: form.is_blocked ? '#DC2626' : '#059669' }}>
              {form.is_blocked ? '🚫 Account is blocked' : '✓ Account is active'}
            </span>
          </label>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Btn v="secondary" onClick={() => setEditing(null)}>Cancel</Btn>
            <Btn onClick={saveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Btn>
          </div>
        </Modal>
      )}

      {/* Certificate Modal */}
      {certifyingUser && (
        <CertificateGenerator user={certifyingUser} onClose={() => setCertifyingUser(null)} />
      )}
    </div>
  )
}

/* ══ MODERATION ════════════════════════════════════════════════ */
function ModerationTab() {
  const [flagged, setFlagged] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})
  const [blocking, setBlocking] = useState({})

  useEffect(() => {
    adminFlaggedStories().then(({ data }) => { setFlagged(data || []); setLoading(false) })
  }, [])

  const removeFromList = (id) => setFlagged(f => f.filter(s => s.id !== id))

  const handleApprove = async (id) => {
    await adminModerateStory(id, 'published')
    removeFromList(id)
    toast.success('Post approved & flag cleared')
  }

  const handleDelete = async (id) => {
    await adminModerateStory(id, 'removed')
    removeFromList(id)
    toast.success('Post removed')
  }

  const handleBlock = async (story) => {
    const userId = story.user_id
    const author = story.profiles || {}
    const alreadyBlocked = author.is_blocked
    setBlocking(b => ({ ...b, [userId]: true }))
    await adminBlockUser(userId, !alreadyBlocked)
    setBlocking(b => ({ ...b, [userId]: false }))
    // Update is_blocked in local state
    setFlagged(f => f.map(s => s.user_id === userId
      ? { ...s, profiles: { ...s.profiles, is_blocked: !alreadyBlocked } }
      : s
    ))
    toast.success(alreadyBlocked ? `User @${author.username} unblocked` : `User @${author.username} blocked`)
  }

  const highlightBadWords = (text, flagReason) => {
    if (!flagReason || !text) return text
    const words = flagReason.replace('Detected: ', '').split(', ').filter(Boolean)
    if (!words.length) return text
    const re = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi')
    const parts = text.split(re)
    return parts.map((p, i) =>
      re.test(p) ? <mark key={i} style={{ background: '#FEE2E2', color: '#DC2626', borderRadius: 3, padding: '0 2px', fontWeight: 700 }}>{p}</mark> : p
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Flagged Content</div>
        {flagged.length > 0 && (
          <span style={{ background: '#DC2626', color: 'white', fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 100 }}>
            {flagged.length}
          </span>
        )}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40, color: '#8C7B6E' }}>Loading...</div>}
      {!loading && flagged.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#8C7B6E' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>All clear — no flagged content</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Bad words in posts are automatically detected and shown here.</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {flagged.map(s => {
          const author = s.profiles || {}
          const isExpanded = expanded[s.id]
          const isBlocked = author.is_blocked
          const preview = s.content?.slice(0, 300)
          const needsMore = (s.content?.length || 0) > 300

          return (
            <div key={s.id} style={{
              background: 'white',
              border: '2px solid #FECACA',
              borderRadius: 16,
              overflow: 'hidden',
            }}>
              {/* Red header bar */}
              <div style={{ background: 'linear-gradient(90deg,#FEF2F2,#FFF5F5)', padding: '12px 20px', borderBottom: '1px solid #FECACA', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 16 }}>🚩</span>
                <span style={{ fontWeight: 700, fontSize: 13.5, color: '#DC2626' }}>Flagged Post</span>
                {s.flag_reason && (
                  <span style={{ fontSize: 11, background: '#FEE2E2', color: '#DC2626', padding: '2px 8px', borderRadius: 100, fontWeight: 600 }}>
                    {s.flag_reason}
                  </span>
                )}
                <span style={{ marginLeft: 'auto', fontSize: 11, color: '#8C7B6E' }}>
                  {s.created_at ? formatDistanceToNow(new Date(s.created_at), { addSuffix: true }) : ''}
                </span>
              </div>

              {/* Content */}
              <div style={{ padding: '16px 20px' }}>
                {/* Author row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#FF6B2B', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                    {(author.full_name || author.username || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1A0800' }}>
                      {author.full_name || author.username}
                      {isBlocked && <span style={{ marginLeft: 6, fontSize: 10, background: '#DC2626', color: 'white', padding: '1px 6px', borderRadius: 100, fontWeight: 600 }}>BLOCKED</span>}
                    </div>
                    <div style={{ fontSize: 11, color: '#8C7B6E' }}>@{author.username} · {s.category}</div>
                  </div>
                </div>

                {/* Story title */}
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: '#1A0800', lineHeight: 1.4 }}>
                  {highlightBadWords(s.title, s.flag_reason)}
                </div>

                {/* Story content preview */}
                <div style={{ fontSize: 13, color: '#4A2800', lineHeight: 1.7, marginBottom: 10 }}>
                  {isExpanded
                    ? highlightBadWords(s.content, s.flag_reason)
                    : highlightBadWords(preview, s.flag_reason)
                  }
                  {needsMore && (
                    <button onClick={() => setExpanded(e => ({ ...e, [s.id]: !isExpanded }))} style={{ background: 'none', border: 'none', color: '#FF6B2B', cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: '0 4px' }}>
                      {isExpanded ? ' Show less' : '... Show more'}
                    </button>
                  )}
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 12, borderTop: '1px solid #F5EFE9' }}>
                  <button
                    onClick={() => handleDelete(s.id)}
                    style={{ padding: '7px 16px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: '#DC2626', color: 'white', border: 'none' }}
                  >
                    🗑 Delete Post
                  </button>
                  <button
                    onClick={() => handleBlock(s)}
                    disabled={blocking[s.user_id]}
                    style={{ padding: '7px 16px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: isBlocked ? '#059669' : '#7C3AED', color: 'white', border: 'none', opacity: blocking[s.user_id] ? 0.6 : 1 }}
                  >
                    {blocking[s.user_id] ? '...' : isBlocked ? '✓ Unblock User' : '🚫 Block User'}
                  </button>
                  <button
                    onClick={() => handleApprove(s.id)}
                    style={{ padding: '7px 16px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'transparent', color: '#059669', border: '1.5px solid #059669' }}
                  >
                    ✓ Dismiss Flag
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ══ SITE PAGES (About / Blog / Careers / Applications / Contact) ══ */
function SitePagesTab() {
  const [sub, setSub] = useState('about')
  const SUBS = [
    ['about','About'],
    ['blog','Blog'],
    ['careers','Careers'],
    ['applications','Applications'],
    ['contact','Contact'],
  ]
  return (
    <div>
      <div style={{display:'flex',gap:6,marginBottom:18,flexWrap:'wrap'}}>
        {SUBS.map(([k,l]) => (
          <button key={k} onClick={()=>setSub(k)} style={{padding:'6px 14px',borderRadius:100,border:'1.5px solid '+(sub===k?'#FF6B2B':'#DDD3CA'),background:sub===k?'rgba(255,107,43,.08)':'white',color:sub===k?'#FF6B2B':'#5C3D2E',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{l}</button>
        ))}
      </div>
      {sub==='about'        && <AboutTab/>}
      {sub==='blog'         && <BlogTab/>}
      {sub==='careers'      && <CareersTab/>}
      {sub==='applications' && <ApplicationsTab/>}
      {sub==='contact'      && <ContactTab/>}
    </div>
  )
}

/* ── ABOUT SECTIONS ── */
function AboutTab() {
  const [sections, setSections] = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.type==='checkbox' ? e.target.checked : e.target.value }))

  const load = useCallback(() => adminGetAboutSections().then(({data,error})=>{
    if (error) { toast.error(error.message); return }
    setSections((data||[]).slice().sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)))
  }), [])
  useEffect(()=>{ load() }, [load])

  const startEdit = (s=null) => {
    setEditing(s?.id || 'new')
    setForm(s ? {...s} : { title:'', content:'', image_url:'', video_url:'', sort_order: sections.length+1, is_active:true })
  }
  const save = async () => {
    if (!form.content?.trim() && !form.title?.trim()) { toast.error('Add a title or content'); return }
    const p = { ...form, sort_order: Number(form.sort_order)||0 }
    if (editing !== 'new') p.id = editing; else delete p.id
    const { error } = await adminUpsertAboutSection(p)
    if (error) { toast.error(error.message); return }
    toast.success(editing==='new' ? 'Section added!' : 'Section updated!')
    setEditing(null); load()
  }
  const remove = async (id) => {
    if (!window.confirm('Delete this section?')) return
    const { error } = await adminDeleteAboutSection(id)
    if (error) toast.error(error.message); else { toast.success('Deleted'); load() }
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:14}}>
        <Btn onClick={()=>startEdit()}>+ New Section</Btn>
      </div>
      {sections.map(s => (
        <Card key={s.id} style={{opacity: s.is_active===false ? .55 : 1}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12,marginBottom:8}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:700}}>{s.title || '(untitled section)'}</div>
              {s.content && <div style={{fontSize:12,color:'#8C7B6E',marginTop:4,lineHeight:1.5}}>{s.content.slice(0,140)}{s.content.length>140?'…':''}</div>}
              <div style={{display:'flex',gap:8,marginTop:8,fontSize:11,color:'#8C7B6E'}}>
                <span>Order: {s.sort_order}</span>
                {s.image_url && <span>· 🖼️ Image</span>}
                {s.video_url && <span>· 🎬 Video</span>}
                {s.is_active===false && <span style={{color:'#DC2626'}}>· Hidden</span>}
              </div>
            </div>
            <div style={{display:'flex',gap:6,flexShrink:0}}>
              <Btn v="secondary" onClick={()=>startEdit(s)} style={{padding:'5px 12px',fontSize:11}}>Edit</Btn>
              <Btn v="danger" onClick={()=>remove(s.id)} style={{padding:'5px 12px',fontSize:11}}>Delete</Btn>
            </div>
          </div>
        </Card>
      ))}
      {sections.length===0 && <Card style={{textAlign:'center',color:'#8C7B6E'}}>No sections yet — add one to start building the About page.</Card>}

      {editing && (
        <Modal title={editing==='new' ? 'New About Section' : 'Edit Section'} onClose={()=>setEditing(null)}>
          <L c="Title"/><Inp value={form.title||''} onChange={set('title')} placeholder="Our Story"/>
          <L c="Content"/><TA value={form.content||''} onChange={set('content')} placeholder="Tell your story..." style={{minHeight:120}}/>
          <L c="Image URL"/><Inp value={form.image_url||''} onChange={set('image_url')} placeholder="https://..."/>
          <L c="Video URL (YouTube / Vimeo)"/><Inp value={form.video_url||''} onChange={set('video_url')} placeholder="https://youtube.com/watch?v=..."/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,alignItems:'center'}}>
            <div><L c="Sort order"/><Inp type="number" value={form.sort_order??0} onChange={set('sort_order')}/></div>
            <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,fontWeight:600,color:'#5C3D2E',marginBottom:12,cursor:'pointer'}}>
              <input type="checkbox" checked={form.is_active!==false} onChange={set('is_active')}/> Visible on About page
            </label>
          </div>
          <Btn onClick={save} style={{width:'100%',justifyContent:'center'}}>Save Section</Btn>
        </Modal>
      )}
    </div>
  )
}

/* ── BLOG POSTS ── */
function BlogTab() {
  const [posts, setPosts] = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.type==='checkbox' ? e.target.checked : e.target.value }))

  const load = useCallback(() => adminGetBlogPosts().then(({data,error})=>{
    if (error) { toast.error(error.message); return }
    setPosts(data||[])
  }), [])
  useEffect(()=>{ load() }, [load])

  const startEdit = (p=null) => {
    setEditing(p?.id || 'new')
    setForm(p ? {...p} : { title:'', excerpt:'', content:'', cover_image:'', author_name:'', is_published:false })
  }
  const save = async () => {
    if (!form.title?.trim() || !form.content?.trim()) { toast.error('Title and content are required'); return }
    const p = {...form}
    if (editing !== 'new') p.id = editing; else delete p.id
    const { error } = await adminUpsertBlogPost(p)
    if (error) { toast.error(error.message); return }
    toast.success(editing==='new' ? 'Post created!' : 'Post updated!')
    setEditing(null); load()
  }
  const remove = async (id) => {
    if (!window.confirm('Delete this post?')) return
    const { error } = await adminDeleteBlogPost(id)
    if (error) toast.error(error.message); else { toast.success('Deleted'); load() }
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:14}}>
        <Btn onClick={()=>startEdit()}>+ New Post</Btn>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:12}}>
        {posts.map(p => (
          <div key={p.id} style={{background:'white',border:'1px solid #F0EAE4',borderRadius:14,padding:16}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8,marginBottom:6}}>
              <div style={{fontSize:13,fontWeight:700,flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.title}</div>
              <span style={{fontSize:10,padding:'2px 8px',borderRadius:100,background:p.is_published?'rgba(5,150,105,.1)':'#F0EAE4',color:p.is_published?'#059669':'#8C7B6E',flexShrink:0}}>{p.is_published?'Published':'Draft'}</span>
            </div>
            {p.excerpt && <div style={{fontSize:12,color:'#8C7B6E',marginBottom:10,lineHeight:1.5}}>{p.excerpt.slice(0,90)}{p.excerpt.length>90?'…':''}</div>}
            <div style={{fontSize:11,color:'#8C7B6E',marginBottom:10}}>/blog/{p.slug}</div>
            <div style={{display:'flex',gap:6}}>
              <Btn v="secondary" onClick={()=>startEdit(p)} style={{padding:'5px 12px',fontSize:11}}>Edit</Btn>
              <Btn v="danger" onClick={()=>remove(p.id)} style={{padding:'5px 12px',fontSize:11}}>Delete</Btn>
            </div>
          </div>
        ))}
        {posts.length===0 && <div style={{gridColumn:'1/-1',textAlign:'center',padding:'40px 0',color:'#8C7B6E',fontSize:13}}>No blog posts yet</div>}
      </div>

      {editing && (
        <Modal title={editing==='new' ? 'New Blog Post' : 'Edit Post'} onClose={()=>setEditing(null)}>
          <L c="Title"/><Inp value={form.title||''} onChange={set('title')} placeholder="5 Habits That Changed My First Year at Work"/>
          <L c="Excerpt (short preview)"/><TA value={form.excerpt||''} onChange={set('excerpt')} placeholder="A short summary shown on the blog list..." style={{minHeight:60}}/>
          <L c="Content"/><TA value={form.content||''} onChange={set('content')} placeholder="Write the full post here..." style={{minHeight:180}}/>
          <L c="Cover image URL"/><Inp value={form.cover_image||''} onChange={set('cover_image')} placeholder="https://..."/>
          <L c="Author name"/><Inp value={form.author_name||''} onChange={set('author_name')} placeholder="Day1 Diaries Team"/>
          <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,fontWeight:600,color:'#5C3D2E',marginBottom:14,cursor:'pointer'}}>
            <input type="checkbox" checked={!!form.is_published} onChange={set('is_published')}/> Published (visible on /blog)
          </label>
          <Btn onClick={save} style={{width:'100%',justifyContent:'center'}}>Save Post</Btn>
        </Modal>
      )}
    </div>
  )
}

/* ── CAREERS JOBS ── */
function CareersTab() {
  const [jobs, setJobs] = useState([])
  const [stats, setStats] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.type==='checkbox' ? e.target.checked : e.target.value }))

  const load = useCallback(() => {
    adminGetCareersJobs().then(({data,error})=>{
      if (error) { toast.error(error.message); return }
      setJobs(data||[])
    })
    adminGetCareersStats().then(({data})=>{ if(data) setStats(data) })
  }, [])
  useEffect(()=>{ load() }, [load])

  const startEdit = (j=null) => {
    setEditing(j?.id || 'new')
    setForm(j ? {...j} : { title:'', department:'', location:'', job_type:'Full-time', salary_min:'', salary_max:'', currency:'INR', description:'', requirements:'', is_active:true, sort_order: jobs.length+1 })
  }
  const save = async () => {
    if (!form.title?.trim() || !form.description?.trim()) { toast.error('Title and description are required'); return }
    const p = {
      ...form,
      salary_min: form.salary_min ? Number(form.salary_min) : null,
      salary_max: form.salary_max ? Number(form.salary_max) : null,
      sort_order: Number(form.sort_order)||0,
    }
    if (editing !== 'new') p.id = editing; else delete p.id
    const { error } = await adminUpsertCareersJob(p)
    if (error) { toast.error(error.message); return }
    toast.success(editing==='new' ? 'Job posted!' : 'Job updated!')
    setEditing(null); load()
  }
  const remove = async (id) => {
    if (!window.confirm('Delete this job posting?')) return
    const { error } = await adminDeleteCareersJob(id)
    if (error) toast.error(error.message); else { toast.success('Deleted'); load() }
  }

  return (
    <div>
      {/* KPI Cards */}
      {stats && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:12,marginBottom:20}}>
          {[
            ['🟢','Open Jobs',stats.open_jobs,'Active listings'],
            ['📋','Total Jobs',stats.total_jobs,'All time'],
            ['📨','Applications',stats.total_applications,'Received'],
            ['✨','New',stats.new_applications,'Awaiting review'],
          ].map(([icon,label,val,sub])=>(
            <div key={label} style={{background:'white',border:'1px solid #F0EAE4',borderRadius:14,padding:'14px 16px'}}>
              <div style={{fontSize:22,marginBottom:6}}>{icon}</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:'1.5rem',fontWeight:900,color:'#FF6B2B'}}>{val??'—'}</div>
              <div style={{fontSize:12,fontWeight:600,color:'#1A0800'}}>{label}</div>
              <div style={{fontSize:11,color:'#8C7B6E'}}>{sub}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:14}}>
        <Btn onClick={()=>startEdit()}>+ New Job</Btn>
      </div>
      {jobs.map(j => (
        <Card key={j.id} style={{opacity: j.is_active===false ? .55 : 1}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:700}}>{j.title}</div>
              <div style={{fontSize:11,color:'#8C7B6E',marginTop:4}}>
                {[j.department, j.location, j.job_type].filter(Boolean).join(' · ')}
                {j.is_active===false && <span style={{color:'#DC2626'}}> · Hidden</span>}
              </div>
              <div style={{display:'flex',gap:8,marginTop:8}}>
                <span style={{fontSize:11,padding:'2px 8px',borderRadius:100,background:Number(j.applications_count)>0?'rgba(255,107,43,.1)':'#F0EAE4',color:Number(j.applications_count)>0?'#FF6B2B':'#8C7B6E',fontWeight:600}}>
                  {j.applications_count} applied
                </span>
                <span style={{fontSize:11,padding:'2px 8px',borderRadius:100,background:j.is_active!==false?'rgba(5,150,105,.1)':'#F0EAE4',color:j.is_active!==false?'#059669':'#8C7B6E',fontWeight:600}}>
                  {j.is_active!==false?'Open':'Closed'}
                </span>
              </div>
            </div>
            <div style={{display:'flex',gap:6,flexShrink:0}}>
              <Btn v="secondary" onClick={()=>startEdit(j)} style={{padding:'5px 12px',fontSize:11}}>Edit</Btn>
              <Btn v="danger" onClick={()=>remove(j.id)} style={{padding:'5px 12px',fontSize:11}}>Delete</Btn>
            </div>
          </div>
        </Card>
      ))}
      {jobs.length===0 && <Card style={{textAlign:'center',color:'#8C7B6E'}}>No job postings yet.</Card>}

      {editing && (
        <Modal title={editing==='new' ? 'New Job Posting' : 'Edit Job Posting'} onClose={()=>setEditing(null)}>
          <L c="Job title"/><Inp value={form.title||''} onChange={set('title')} placeholder="Frontend Engineer (React)"/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div><L c="Department"/><Inp value={form.department||''} onChange={set('department')} placeholder="Engineering"/></div>
            <div><L c="Location"/><Inp value={form.location||''} onChange={set('location')} placeholder="Remote (India)"/></div>
          </div>
          <L c="Job type"/>
          <select value={form.job_type||'Full-time'} onChange={set('job_type')} style={{width:'100%',padding:'9px 12px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',marginBottom:12}}>
            {['Full-time','Part-time','Contract','Internship','Remote'].map(t=><option key={t} value={t}>{t}</option>)}
          </select>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
            <div><L c="Salary min"/><Inp type="number" value={form.salary_min??''} onChange={set('salary_min')} placeholder="800000"/></div>
            <div><L c="Salary max"/><Inp type="number" value={form.salary_max??''} onChange={set('salary_max')} placeholder="1500000"/></div>
            <div><L c="Currency"/>
              <select value={form.currency||'INR'} onChange={set('currency')} style={{width:'100%',padding:'9px 12px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',marginBottom:12}}>
                {['INR','USD','EUR'].map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <L c="Description"/><TA value={form.description||''} onChange={set('description')} placeholder="What this role involves..." style={{minHeight:100}}/>
          <L c="Requirements (one per line)"/><TA value={form.requirements||''} onChange={set('requirements')} placeholder={"3+ years of experience with React\nStrong CSS skills"} style={{minHeight:100}}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,alignItems:'center'}}>
            <div><L c="Sort order"/><Inp type="number" value={form.sort_order??0} onChange={set('sort_order')}/></div>
            <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,fontWeight:600,color:'#5C3D2E',marginBottom:12,cursor:'pointer'}}>
              <input type="checkbox" checked={form.is_active!==false} onChange={set('is_active')}/> Active (visible on /careers)
            </label>
          </div>
          <Btn onClick={save} style={{width:'100%',justifyContent:'center'}}>Save Job</Btn>
        </Modal>
      )}
    </div>
  )
}

/* ── JOB APPLICATIONS ── */
function ApplicationsTab() {
  const [apps, setApps] = useState([])
  const [filter, setFilter] = useState('all')

  const load = useCallback(() => adminGetAllApplications().then(({data,error})=>{
    if (error) { toast.error(error.message); return }
    setApps(data||[])
  }), [])
  useEffect(()=>{ load() }, [load])

  const updateStatus = async (id, status) => {
    const { error } = await adminUpdateApplicationStatus(id, status)
    if (error) { toast.error(error.message); return }
    setApps(a => a.map(x => x.id===id ? {...x, status} : x))
  }

  const STATUS_COLORS = { new:'#FF6B2B', reviewed:'#2563EB', shortlisted:'#059669', rejected:'#DC2626', hired:'#7C3AED' }
  const filtered = filter==='all' ? apps : apps.filter(a=>a.status===filter)

  return (
    <div>
      <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
        {['all','new','reviewed','shortlisted','rejected','hired'].map(s=>(
          <button key={s} onClick={()=>setFilter(s)} style={{padding:'5px 12px',borderRadius:100,border:'1.5px solid '+(filter===s?'#FF6B2B':'#DDD3CA'),background:filter===s?'rgba(255,107,43,.08)':'white',color:filter===s?'#FF6B2B':'#5C3D2E',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit',textTransform:'capitalize'}}>{s}</button>
        ))}
      </div>
      {filtered.map(a => (
        <Card key={a.id}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12,flexWrap:'wrap'}}>
            <div style={{flex:1,minWidth:200}}>
              <div style={{fontSize:13,fontWeight:700}}>{a.full_name} <span style={{fontWeight:400,color:'#8C7B6E'}}>· {a.email}</span></div>
              <div style={{fontSize:11,color:'#8C7B6E',marginTop:2}}>Applied for: <strong>{a.job_title || '(deleted job)'}</strong></div>
              {a.phone && <div style={{fontSize:11,color:'#8C7B6E'}}>📞 {a.phone}</div>}
              {a.resume_url && <div style={{fontSize:11}}><a href={a.resume_url} target="_blank" rel="noreferrer" style={{color:'#FF6B2B'}}>View Resume →</a></div>}
              {a.cover_note && <div style={{fontSize:12,color:'#4A2800',marginTop:6,lineHeight:1.5,background:'#FDF6EE',borderRadius:8,padding:'8px 10px'}}>{a.cover_note}</div>}
            </div>
            <select value={a.status} onChange={e=>updateStatus(a.id, e.target.value)} style={{padding:'6px 10px',borderRadius:8,border:'1.5px solid #DDD3CA',fontSize:12,fontFamily:'inherit',outline:'none',color:STATUS_COLORS[a.status],fontWeight:600}}>
              {['new','reviewed','shortlisted','rejected','hired'].map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </Card>
      ))}
      {filtered.length===0 && <Card style={{textAlign:'center',color:'#8C7B6E'}}>No applications{filter!=='all'?` with status "${filter}"`:''}.</Card>}
    </div>
  )
}

/* ── CONTACT MESSAGES ── */
function ContactTab() {
  const [messages, setMessages] = useState([])
  const [filter, setFilter] = useState('all')

  const load = useCallback(() => adminGetContactMessages().then(({data,error})=>{
    if (error) { toast.error(error.message); return }
    setMessages(data||[])
  }), [])
  useEffect(()=>{ load() }, [load])

  const updateStatus = async (id, status) => {
    const { error } = await adminUpdateContactStatus(id, status)
    if (error) { toast.error(error.message); return }
    setMessages(m => m.map(x => x.id===id ? {...x, status} : x))
  }

  const STATUS_COLORS = { new:'#FF6B2B', read:'#2563EB', replied:'#059669' }
  const filtered = filter==='all' ? messages : messages.filter(m=>m.status===filter)

  return (
    <div>
      <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
        {['all','new','read','replied'].map(s=>(
          <button key={s} onClick={()=>setFilter(s)} style={{padding:'5px 12px',borderRadius:100,border:'1.5px solid '+(filter===s?'#FF6B2B':'#DDD3CA'),background:filter===s?'rgba(255,107,43,.08)':'white',color:filter===s?'#FF6B2B':'#5C3D2E',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit',textTransform:'capitalize'}}>{s}</button>
        ))}
      </div>
      {filtered.map(m => (
        <Card key={m.id}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12,flexWrap:'wrap'}}>
            <div style={{flex:1,minWidth:200}}>
              <div style={{fontSize:13,fontWeight:700}}>{m.name} <span style={{fontWeight:400,color:'#8C7B6E'}}>· {m.email}</span></div>
              {m.subject && <div style={{fontSize:12,fontWeight:600,marginTop:4}}>{m.subject}</div>}
              <div style={{fontSize:12,color:'#4A2800',marginTop:6,lineHeight:1.5,background:'#FDF6EE',borderRadius:8,padding:'8px 10px'}}>{m.message}</div>
              <div style={{fontSize:11,color:'#8C7B6E',marginTop:6}}>
                <a href={`mailto:${m.email}`} style={{color:'#FF6B2B'}}>Reply via email →</a>
              </div>
            </div>
            <select value={m.status} onChange={e=>updateStatus(m.id, e.target.value)} style={{padding:'6px 10px',borderRadius:8,border:'1.5px solid #DDD3CA',fontSize:12,fontFamily:'inherit',outline:'none',color:STATUS_COLORS[m.status],fontWeight:600}}>
              {['new','read','replied'].map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </Card>
      ))}
      {filtered.length===0 && <Card style={{textAlign:'center',color:'#8C7B6E'}}>No messages{filter!=='all'?` with status "${filter}"`:''}.</Card>}
    </div>
  )
}

/* ══ STORY CATEGORIES TAB ══ */
function CategoriesTab() {
  const [cats, setCats] = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.type==='checkbox' ? e.target.checked : e.target.value }))

  const load = useCallback(() => adminGetCategories().then(({data,error})=>{
    if (error) { toast.error(error.message); return }
    setCats((data||[]).slice().sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)))
  }), [])
  useEffect(()=>{ load() }, [load])

  const startEdit = (c=null) => {
    setEditing(c?.id || 'new')
    setForm(c ? {...c} : { name:'', icon:'📖', sort_order: cats.length+1, is_active:true })
  }
  const save = async () => {
    if (!form.name?.trim()) { toast.error('Category name is required'); return }
    const p = { ...form, sort_order: Number(form.sort_order)||0 }
    if (editing !== 'new') p.id = editing; else delete p.id
    const { error } = await adminUpsertCategory(p)
    if (error) { toast.error(error.message); return }
    toast.success(editing==='new' ? 'Category added!' : 'Category updated!')
    setEditing(null); load()
  }
  const remove = async (id) => {
    if (!window.confirm('Delete this category? Existing stories with this category will keep it.')) return
    const { error } = await adminDeleteCategory(id)
    if (error) toast.error(error.message); else { toast.success('Deleted'); load() }
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <div style={{fontSize:13,color:'#8C7B6E'}}>Categories appear in the Create Story dropdown and feed filters.</div>
        <Btn onClick={()=>startEdit()}>+ New Category</Btn>
      </div>
      {cats.map(c => (
        <Card key={c.id} style={{opacity:c.is_active===false?.55:1}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
            <div style={{display:'flex',alignItems:'center',gap:10,flex:1,minWidth:0}}>
              <span style={{fontSize:22,flexShrink:0}}>{c.icon||'📖'}</span>
              <div>
                <div style={{fontSize:13,fontWeight:700}}>{c.name}</div>
                <div style={{fontSize:11,color:'#8C7B6E'}}>
                  Order: {c.sort_order}
                  {c.is_active===false && <span style={{color:'#DC2626'}}> · Hidden</span>}
                </div>
              </div>
            </div>
            <div style={{display:'flex',gap:6,flexShrink:0}}>
              <Btn v="secondary" onClick={()=>startEdit(c)} style={{padding:'5px 12px',fontSize:11}}>Edit</Btn>
              <Btn v="danger" onClick={()=>remove(c.id)} style={{padding:'5px 12px',fontSize:11}}>Delete</Btn>
            </div>
          </div>
        </Card>
      ))}
      {cats.length===0 && <Card style={{textAlign:'center',color:'#8C7B6E'}}>No categories yet. Run the migration first.</Card>}

      {editing && (
        <Modal title={editing==='new' ? 'New Category' : 'Edit Category'} onClose={()=>setEditing(null)}>
          <div style={{display:'grid',gridTemplateColumns:'80px 1fr',gap:10}}>
            <div><L c="Icon (emoji)"/><Inp value={form.icon||''} onChange={set('icon')} placeholder="📖" style={{textAlign:'center',fontSize:20}}/></div>
            <div><L c="Category Name"/><Inp value={form.name||''} onChange={set('name')} placeholder="First Day at Job"/></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,alignItems:'center'}}>
            <div><L c="Sort order"/><Inp type="number" value={form.sort_order??0} onChange={set('sort_order')}/></div>
            <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,fontWeight:600,color:'#5C3D2E',marginBottom:12,cursor:'pointer'}}>
              <input type="checkbox" checked={form.is_active!==false} onChange={set('is_active')}/> Visible to users
            </label>
          </div>
          <Btn onClick={save} style={{width:'100%',justifyContent:'center'}}>Save Category</Btn>
        </Modal>
      )}
    </div>
  )
}

/* ══ EMAIL CENTER ══════════════════════════════════════════════ */
const EMAIL_CATEGORIES = ['welcome','story','habit','challenge','event','leaderboard','certificate','weekly_digest','monthly_digest','custom']
const EMAIL_SUB_TABS = [['templates','Templates'],['audiences','Audiences'],['workflows','Workflows'],['logs','Logs']]
const extractTokens = (text) => [...new Set([...(text||'').matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)].map(m=>m[1]))]
const Badge = ({children,color}) => <span style={{fontSize:10,padding:'2px 8px',borderRadius:100,background:`${color}1a`,color,fontWeight:700}}>{children}</span>
const STATUS_COLORS = {draft:'#6B7280',active:'#059669',archived:'#8C7B6E',paused:'#F59E0B',completed:'#059669',failed:'#DC2626',partial:'#F59E0B',pending:'#6B7280',processing:'#2563EB',
  verified:'#059669',rejected:'#DC2626',expired:'#8C7B6E',cancelled:'#6B7280',suspended:'#DC2626',under_review:'#2563EB',renewal_due:'#F59E0B',approved:'#059669'}

function EmailCenterTab() {
  const [sub, setSub] = useState('templates')
  return (
    <div>
      <div style={{display:'flex',gap:8,marginBottom:18}}>
        {EMAIL_SUB_TABS.map(([k,l]) => (
          <button key={k} onClick={()=>setSub(k)} style={{padding:'6px 14px',borderRadius:100,border:`1.5px solid ${sub===k?'#FF6B2B':'#DDD3CA'}`,background:sub===k?'#FF6B2B':'white',color:sub===k?'white':'#5C3D2E',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{l}</button>
        ))}
      </div>
      {sub==='templates' && <EmailTemplatesTab/>}
      {sub==='audiences' && <EmailAudiencesTab/>}
      {sub==='workflows' && <EmailWorkflowsTab/>}
      {sub==='logs'      && <EmailLogsTab/>}
    </div>
  )
}

function EmailTemplatesTab() {
  const [list, setList] = useState([])
  const [form, setForm] = useState(null) // null = no modal; object = editing/new
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [versionsFor, setVersionsFor] = useState(null)
  const [versions, setVersions] = useState([])
  const [testSendFor, setTestSendFor] = useState(null)
  const [testEmail, setTestEmail] = useState('')

  const load = useCallback(() => { adminListEmailTemplates().then(({data}) => setList(data||[])) }, [])
  useEffect(() => { load() }, [load])

  const openNew = () => { setEditingId(null); setForm({ name:'', category:'welcome', subject:'', html_body:'', preview_text:'' }) }
  const openEdit = (t) => { setEditingId(t.id); setForm({ name:t.name, category:t.category, subject:t.subject, html_body:t.html_body, preview_text:t.preview_text||'' }) }

  const save = async () => {
    if (!form.name.trim() || !form.subject.trim() || !form.html_body.trim()) return toast.error('Name, subject and HTML body are required')
    setSaving(true)
    const { error } = editingId ? await adminUpdateEmailTemplate(editingId, form) : await adminCreateEmailTemplate(form)
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success(editingId ? 'Template updated' : 'Template created')
    setForm(null)
    load()
  }

  const clone = async (id) => { const { error } = await adminCloneEmailTemplate(id); if (error) return toast.error(error.message); toast.success('Cloned'); load() }
  const archive = async (id) => { await adminArchiveEmailTemplate(id); toast.success('Archived'); load() }
  const restore = async (id) => { await adminRestoreEmailTemplate(id); toast.success('Restored'); load() }
  const openVersions = async (t) => { setVersionsFor(t); const { data } = await adminGetEmailTemplateVersions(t.id); setVersions(data||[]) }
  const restoreVersion = async (version) => { await adminRestoreEmailTemplateVersion(versionsFor.id, version); toast.success('Version restored'); setVersionsFor(null); load() }
  const sendTest = async () => {
    if (!testEmail.trim()) return toast.error('Enter a recipient email')
    const tokens = extractTokens(testSendFor.subject + ' ' + testSendFor.html_body)
    const sampleVariables = Object.fromEntries(tokens.map(t => [t, `[${t}]`]))
    const { error } = await adminTestSendEmailTemplate(testSendFor.id, { toEmail: testEmail, toName: 'Test', sampleVariables })
    if (error) return toast.error(error.message)
    toast.success('Test email sent')
    setTestSendFor(null); setTestEmail('')
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <h3 style={{margin:0,fontSize:15,fontWeight:700}}>Email Templates</h3>
        <Btn onClick={openNew}>+ New Template</Btn>
      </div>
      {list.length===0 && <Card><p style={{color:'#8C7B6E',fontSize:13,margin:0,textAlign:'center'}}>No templates yet.</p></Card>}
      {list.map(t => (
        <Card key={t.id} style={{display:'flex',gap:14,alignItems:'flex-start'}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
              <span style={{fontWeight:700,fontSize:14}}>{t.name}</span>
              <Badge color="#7C3AED">{t.category}</Badge>
              <Badge color={STATUS_COLORS[t.status]}>{t.status.toUpperCase()}</Badge>
              <span style={{fontSize:11,color:'#8C7B6E'}}>v{t.current_version}</span>
            </div>
            <div style={{fontSize:13,color:'#4A2800',marginBottom:4}}>{t.subject}</div>
            <div style={{fontSize:11,color:'#8C7B6E'}}>Updated {new Date(t.updated_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</div>
          </div>
          <div style={{display:'flex',gap:6,flexShrink:0,flexWrap:'wrap',justifyContent:'flex-end',maxWidth:260}}>
            <Btn v='secondary' style={{fontSize:11,padding:'5px 12px'}} onClick={()=>openEdit(t)}>Edit</Btn>
            <Btn v='secondary' style={{fontSize:11,padding:'5px 12px'}} onClick={()=>clone(t.id)}>Clone</Btn>
            <Btn v='secondary' style={{fontSize:11,padding:'5px 12px'}} onClick={()=>openVersions(t)}>Versions</Btn>
            <Btn v='secondary' style={{fontSize:11,padding:'5px 12px'}} onClick={()=>{setTestSendFor(t); setTestEmail('')}}>Test Send</Btn>
            {t.status==='archived'
              ? <Btn v='green' style={{fontSize:11,padding:'5px 12px'}} onClick={()=>restore(t.id)}>Restore</Btn>
              : <Btn v='danger' style={{fontSize:11,padding:'5px 12px'}} onClick={()=>archive(t.id)}>Archive</Btn>}
          </div>
        </Card>
      ))}

      {form && (
        <Modal title={editingId?'Edit Template':'New Template'} onClose={()=>setForm(null)}>
          <L c="Name"/>
          <Inp value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Welcome Email v2"/>
          <L c="Category"/>
          <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} style={{width:'100%',padding:'9px 12px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:13,fontFamily:'inherit',marginBottom:12}}>
            {EMAIL_CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_',' ')}</option>)}
          </select>
          <L c="Subject"/>
          <Inp value={form.subject} onChange={e=>setForm(f=>({...f,subject:e.target.value}))} placeholder="Welcome to Day1 Diaries, {{name}}!"/>
          <L c="HTML Body"/>
          <TA value={form.html_body} onChange={e=>setForm(f=>({...f,html_body:e.target.value}))} placeholder="<p>Hi {{name}}, ...</p>" style={{minHeight:160,fontFamily:'monospace',fontSize:12}}/>
          <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:12}}>
            {extractTokens(form.subject+' '+form.html_body).map(tok => <Badge key={tok} color="#2563EB">{'{{'+tok+'}}'}</Badge>)}
            {extractTokens(form.subject+' '+form.html_body).length===0 && <span style={{fontSize:11,color:'#8C7B6E'}}>No {'{{variables}}'} used yet — type tokens like {'{{name}}'} into subject/body.</span>}
          </div>
          <L c="Live Preview"/>
          <iframe title="preview" srcDoc={form.html_body} style={{width:'100%',height:180,border:'1.5px solid #DDD3CA',borderRadius:8,marginBottom:14,background:'white'}}/>
          <Btn onClick={save} disabled={saving} style={{width:'100%',padding:'11px'}}>{saving?'Saving…':editingId?'Save Changes':'Create Template'}</Btn>
        </Modal>
      )}

      {versionsFor && (
        <Modal title={`Version History — ${versionsFor.name}`} onClose={()=>setVersionsFor(null)}>
          {versions.length===0 && <p style={{fontSize:13,color:'#8C7B6E'}}>No prior versions — this template hasn't been edited yet.</p>}
          {versions.map(v => (
            <div key={v.id} style={{border:'1px solid #F0EAE4',borderRadius:10,padding:12,marginBottom:8}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                <span style={{fontWeight:700,fontSize:13}}>v{v.version}</span>
                <Btn v='secondary' style={{fontSize:11,padding:'4px 10px'}} onClick={()=>restoreVersion(v.version)}>Restore</Btn>
              </div>
              <div style={{fontSize:12,color:'#4A2800'}}>{v.subject}</div>
              <div style={{fontSize:11,color:'#8C7B6E',marginTop:4}}>{new Date(v.created_at).toLocaleString('en-IN')}</div>
            </div>
          ))}
        </Modal>
      )}

      {testSendFor && (
        <Modal title={`Test Send — ${testSendFor.name}`} onClose={()=>setTestSendFor(null)}>
          <L c="Send test email to"/>
          <Inp value={testEmail} onChange={e=>setTestEmail(e.target.value)} placeholder="you@example.com" type="email"/>
          <p style={{fontSize:12,color:'#8C7B6E',marginBottom:14}}>Template variables will be filled with placeholder sample values for this test.</p>
          <Btn onClick={sendTest} style={{width:'100%',padding:'11px'}}>Send Test</Btn>
        </Modal>
      )}
    </div>
  )
}

function EmailAudiencesTab() {
  const [list, setList] = useState([])
  const [sources, setSources] = useState([])
  const [habits, setHabits] = useState([])
  const [challenges, setChallenges] = useState([])
  const [events, setEvents] = useState([])
  const [form, setForm] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [preview, setPreview] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => { adminListEmailAudiences().then(({data}) => setList(data||[])) }, [])
  useEffect(() => {
    load()
    adminGetEmailAudienceSources().then(({data}) => setSources(data||[]))
    getHabits().then(({data}) => setHabits(data||[])).catch(()=>{})
    getChallenges().then(({data}) => setChallenges(data||[])).catch(()=>{})
    getCommunityUpdates().then(({data}) => setEvents(data||[])).catch(()=>{})
  }, [load])

  const sourceDef = (id) => sources.find(s => s.id === id)

  const openNew = () => { setEditingId(null); setForm({ name:'', description:'', source: sources[0]?.id||'all_users', filters:{} }); setPreview(null) }
  const openEdit = (a) => { setEditingId(a.id); setForm({ name:a.name, description:a.description||'', source:a.source, filters:a.filters||{} }); setPreview(null) }

  const setFilter = (key, value) => setForm(f => ({ ...f, filters: { ...f.filters, [key]: value } }))

  const runPreview = async () => {
    const { data, error } = await adminPreviewEmailAudienceDraft(form.source, form.filters)
    if (error) return toast.error(error.message)
    setPreview(data)
  }

  const save = async () => {
    if (!form.name.trim()) return toast.error('Name is required')
    setSaving(true)
    const { error } = editingId ? await adminUpdateEmailAudience(editingId, form) : await adminCreateEmailAudience(form)
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success(editingId ? 'Audience updated' : 'Audience created')
    setForm(null)
    load()
  }

  const remove = async (id) => { if (!window.confirm('Delete this audience?')) return; await adminDeleteEmailAudience(id); toast.success('Deleted'); load() }

  const renderFilterField = (f) => {
    const value = form.filters[f.key] ?? ''
    if (f.type === 'select') return (
      <select key={f.key} value={value} onChange={e=>setFilter(f.key, e.target.value||undefined)} style={{width:'100%',padding:'9px 12px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:13,fontFamily:'inherit',marginBottom:12}}>
        <option value="">Any</option>
        {f.options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    )
    if (f.type === 'boolean') return (
      <label key={f.key} style={{display:'flex',alignItems:'center',gap:8,fontSize:13,fontWeight:600,marginBottom:12,cursor:'pointer'}}>
        <input type="checkbox" checked={!!value} onChange={e=>setFilter(f.key, e.target.checked)}/> {f.label}
      </label>
    )
    if (f.type === 'habit_select') return (
      <select key={f.key} value={value} onChange={e=>setFilter(f.key, e.target.value||undefined)} style={{width:'100%',padding:'9px 12px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:13,fontFamily:'inherit',marginBottom:12}}>
        <option value="">Any habit</option>
        {habits.map(h => <option key={h.id} value={h.id}>{h.title}</option>)}
      </select>
    )
    if (f.type === 'challenge_select') return (
      <select key={f.key} value={value} onChange={e=>setFilter(f.key, e.target.value||undefined)} style={{width:'100%',padding:'9px 12px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:13,fontFamily:'inherit',marginBottom:12}}>
        <option value="">Select challenge</option>
        {challenges.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
      </select>
    )
    if (f.type === 'event_select') return (
      <select key={f.key} value={value} onChange={e=>setFilter(f.key, e.target.value||undefined)} style={{width:'100%',padding:'9px 12px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:13,fontFamily:'inherit',marginBottom:12}}>
        <option value="">Select event</option>
        {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
      </select>
    )
    return <Inp key={f.key} type={f.type==='number'?'number':'text'} value={value} onChange={e=>setFilter(f.key, f.type==='number' ? (e.target.value?Number(e.target.value):undefined) : e.target.value)} placeholder={f.label}/>
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <h3 style={{margin:0,fontSize:15,fontWeight:700}}>Audiences (Recipient Sources)</h3>
        <Btn onClick={openNew}>+ New Audience</Btn>
      </div>
      {list.length===0 && <Card><p style={{color:'#8C7B6E',fontSize:13,margin:0,textAlign:'center'}}>No audiences yet.</p></Card>}
      {list.map(a => (
        <Card key={a.id} style={{display:'flex',gap:14,alignItems:'center'}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:700,fontSize:14,marginBottom:2}}>{a.name}</div>
            <div style={{fontSize:12,color:'#8C7B6E'}}>{sourceDef(a.source)?.label || a.source}{a.description ? ` — ${a.description}` : ''}</div>
          </div>
          <div style={{display:'flex',gap:6,flexShrink:0}}>
            <Btn v='secondary' style={{fontSize:11,padding:'5px 12px'}} onClick={()=>openEdit(a)}>Edit</Btn>
            <Btn v='danger' style={{fontSize:11,padding:'5px 12px'}} onClick={()=>remove(a.id)}>Delete</Btn>
          </div>
        </Card>
      ))}

      {form && (
        <Modal title={editingId?'Edit Audience':'New Audience'} onClose={()=>setForm(null)}>
          <L c="Name"/>
          <Inp value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Active streak holders"/>
          <L c="Description (optional)"/>
          <Inp value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="What is this audience for?"/>
          <L c="Data Source"/>
          <select value={form.source} onChange={e=>setForm(f=>({...f,source:e.target.value,filters:{}}))} style={{width:'100%',padding:'9px 12px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:13,fontFamily:'inherit',marginBottom:12}}>
            {sources.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          {sourceDef(form.source)?.filters?.length > 0 && <L c="Filters"/>}
          {sourceDef(form.source)?.filters?.map(renderFilterField)}

          <Btn v='secondary' onClick={runPreview} style={{width:'100%',marginBottom:12}}>Preview Matching Recipients</Btn>
          {preview && (
            <div style={{background:'#F7F3EF',borderRadius:10,padding:12,marginBottom:14,fontSize:12}}>
              <div style={{fontWeight:700,marginBottom:6}}>{preview.totalCount} recipient(s) match</div>
              {preview.sample.slice(0,5).map((r,i) => <div key={i} style={{color:'#5C3D2E'}}>{r.name||'(no name)'} — {r.email}</div>)}
            </div>
          )}
          <Btn onClick={save} disabled={saving} style={{width:'100%',padding:'11px'}}>{saving?'Saving…':editingId?'Save Changes':'Create Audience'}</Btn>
        </Modal>
      )}
    </div>
  )
}

const CRON_PRESETS = [
  ['Every day at 9am','0 9 * * *'],
  ['Every Monday at 9am','0 9 * * 1'],
  ['Every 1st of the month at 9am','0 9 1 * *'],
]

function EmailWorkflowsTab() {
  const [list, setList] = useState([])
  const [templates, setTemplates] = useState([])
  const [audiences, setAudiences] = useState([])
  const [form, setForm] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => { adminListEmailWorkflows().then(({data}) => setList(data||[])) }, [])
  useEffect(() => {
    load()
    adminListEmailTemplates().then(({data}) => setTemplates((data||[]).filter(t=>t.status!=='archived')))
    adminListEmailAudiences().then(({data}) => setAudiences(data||[]))
  }, [load])

  const openNew = () => { setEditingId(null); setForm({ name:'', template_id:templates[0]?.id||'', audience_id:audiences[0]?.id||'', schedule_type:'immediate', scheduled_at:'', cron_expression:'0 9 * * *', timezone:'Asia/Kolkata' }) }
  const openEdit = (w) => { setEditingId(w.id); setForm({ name:w.name, template_id:w.template_id, audience_id:w.audience_id, schedule_type:w.schedule_type, scheduled_at:w.scheduled_at?w.scheduled_at.slice(0,16):'', cron_expression:w.cron_expression||'0 9 * * *', timezone:w.timezone||'Asia/Kolkata' }) }

  const save = async () => {
    if (!form.name.trim() || !form.template_id || !form.audience_id) return toast.error('Name, template and audience are required')
    setSaving(true)
    const { error } = editingId ? await adminUpdateEmailWorkflow(editingId, form) : await adminCreateEmailWorkflow(form)
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success(editingId ? 'Workflow updated' : 'Workflow created')
    setForm(null)
    load()
  }

  const remove = async (id) => { if (!window.confirm('Delete this workflow?')) return; await adminDeleteEmailWorkflow(id); toast.success('Deleted'); load() }
  const activate = async (id) => { const { error } = await adminActivateEmailWorkflow(id); if (error) return toast.error(error.message); toast.success('Activated'); load() }
  const pause = async (id) => { await adminPauseEmailWorkflow(id); toast.success('Paused'); load() }
  const runNow = async (id) => { const { data, error } = await adminRunEmailWorkflowNow(id); if (error) return toast.error(error.message); toast.success(`Sending to ${data?.recipientCount ?? 0} recipients`); load() }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <h3 style={{margin:0,fontSize:15,fontWeight:700}}>Workflows</h3>
        <Btn onClick={openNew} disabled={!templates.length || !audiences.length}>+ New Workflow</Btn>
      </div>
      {(!templates.length || !audiences.length) && <Card><p style={{color:'#8C7B6E',fontSize:13,margin:0}}>Create at least one Template and one Audience before building a workflow.</p></Card>}
      {list.map(w => (
        <Card key={w.id}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12,flexWrap:'wrap'}}>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                <span style={{fontWeight:700,fontSize:14}}>{w.name}</span>
                <Badge color={STATUS_COLORS[w.status]}>{w.status.toUpperCase()}</Badge>
              </div>
              <div style={{fontSize:12,color:'#8C7B6E'}}>{w.template_name} → {w.audience_name} · {w.schedule_type.replace('_',' ')}</div>
              {w.next_run_at && <div style={{fontSize:11,color:'#8C7B6E',marginTop:2}}>Next run: {new Date(w.next_run_at).toLocaleString('en-IN')}</div>}
            </div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              <Btn v='secondary' style={{fontSize:11,padding:'5px 12px'}} onClick={()=>openEdit(w)}>Edit</Btn>
              {w.status==='active'
                ? <Btn v='secondary' style={{fontSize:11,padding:'5px 12px'}} onClick={()=>pause(w.id)}>Pause</Btn>
                : w.status!=='archived' && <Btn v='green' style={{fontSize:11,padding:'5px 12px'}} onClick={()=>activate(w.id)}>Activate</Btn>}
              <Btn v='secondary' style={{fontSize:11,padding:'5px 12px'}} onClick={()=>runNow(w.id)}>Run Now</Btn>
              <Btn v='danger' style={{fontSize:11,padding:'5px 12px'}} onClick={()=>remove(w.id)}>Delete</Btn>
            </div>
          </div>
        </Card>
      ))}

      {form && (
        <Modal title={editingId?'Edit Workflow':'New Workflow'} onClose={()=>setForm(null)}>
          <L c="Name"/>
          <Inp value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Weekly Streak Digest"/>
          <L c="Template"/>
          <select value={form.template_id} onChange={e=>setForm(f=>({...f,template_id:e.target.value}))} style={{width:'100%',padding:'9px 12px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:13,fontFamily:'inherit',marginBottom:12}}>
            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <L c="Audience"/>
          <select value={form.audience_id} onChange={e=>setForm(f=>({...f,audience_id:e.target.value}))} style={{width:'100%',padding:'9px 12px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:13,fontFamily:'inherit',marginBottom:12}}>
            {audiences.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <L c="Schedule"/>
          <div style={{display:'flex',gap:8,marginBottom:12}}>
            {['immediate','one_time','recurring'].map(s => (
              <button key={s} onClick={()=>setForm(f=>({...f,schedule_type:s}))} style={{flex:1,padding:'8px',borderRadius:8,border:`1.5px solid ${form.schedule_type===s?'#FF6B2B':'#DDD3CA'}`,background:form.schedule_type===s?'#FFF1EA':'white',fontSize:12,fontWeight:600,cursor:'pointer'}}>{s.replace('_',' ')}</button>
            ))}
          </div>
          {form.schedule_type==='one_time' && (
            <>
              <L c="Send at"/>
              <Inp type="datetime-local" value={form.scheduled_at} onChange={e=>setForm(f=>({...f,scheduled_at:e.target.value}))}/>
            </>
          )}
          {form.schedule_type==='recurring' && (
            <>
              <L c="Preset"/>
              <select onChange={e=>setForm(f=>({...f,cron_expression:e.target.value}))} value={CRON_PRESETS.some(([,c])=>c===form.cron_expression)?form.cron_expression:''} style={{width:'100%',padding:'9px 12px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:13,fontFamily:'inherit',marginBottom:12}}>
                <option value="">Custom</option>
                {CRON_PRESETS.map(([label,c]) => <option key={c} value={c}>{label}</option>)}
              </select>
              <L c="Cron expression"/>
              <Inp value={form.cron_expression} onChange={e=>setForm(f=>({...f,cron_expression:e.target.value}))} placeholder="0 9 * * *"/>
              <L c="Timezone"/>
              <Inp value={form.timezone} onChange={e=>setForm(f=>({...f,timezone:e.target.value}))} placeholder="Asia/Kolkata"/>
            </>
          )}
          {form.schedule_type==='immediate' && <p style={{fontSize:12,color:'#8C7B6E',marginBottom:12}}>Sends immediately once you click Activate.</p>}
          <Btn onClick={save} disabled={saving} style={{width:'100%',padding:'11px'}}>{saving?'Saving…':editingId?'Save Changes':'Create Workflow'}</Btn>
        </Modal>
      )}
    </div>
  )
}

function EmailLogsTab() {
  const [list, setList] = useState([])
  const [recipientsFor, setRecipientsFor] = useState(null)
  const [recipients, setRecipients] = useState([])

  const load = useCallback(() => { adminListEmailSends().then(({data}) => setList(data||[])) }, [])
  useEffect(() => { load() }, [load])

  const openRecipients = async (s) => { setRecipientsFor(s); const { data } = await adminGetEmailSendRecipients(s.id); setRecipients(data||[]) }

  return (
    <div>
      <h3 style={{margin:'0 0 16px',fontSize:15,fontWeight:700}}>Send Logs</h3>
      {list.length===0 && <Card><p style={{color:'#8C7B6E',fontSize:13,margin:0,textAlign:'center'}}>No sends yet.</p></Card>}
      {list.map(s => (
        <Card key={s.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,cursor:'pointer'}} onClick={()=>openRecipients(s)}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
              <span style={{fontWeight:700,fontSize:13}}>{s.template_name}</span>
              <Badge color={STATUS_COLORS[s.status]}>{s.status.toUpperCase()}</Badge>
              <span style={{fontSize:11,color:'#8C7B6E'}}>{s.trigger_type.replace('_',' ')}</span>
            </div>
            <div style={{fontSize:11,color:'#8C7B6E'}}>{new Date(s.created_at).toLocaleString('en-IN')}</div>
          </div>
          <div style={{fontSize:12,color:'#5C3D2E',whiteSpace:'nowrap'}}>{s.sent_count}/{s.total_recipients} sent{s.failed_count>0?`, ${s.failed_count} failed`:''}</div>
        </Card>
      ))}

      {recipientsFor && (
        <Modal title="Recipients" onClose={()=>setRecipientsFor(null)}>
          {recipients.length===0 && <p style={{fontSize:13,color:'#8C7B6E'}}>No recipients logged.</p>}
          {recipients.map(r => (
            <div key={r.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid #F0EAE4',fontSize:12}}>
              <div>
                <div style={{fontWeight:600}}>{r.name||'(no name)'}</div>
                <div style={{color:'#8C7B6E'}}>{r.email}</div>
              </div>
              <Badge color={STATUS_COLORS[r.status]}>{r.status.toUpperCase()}</Badge>
            </div>
          ))}
        </Modal>
      )}
    </div>
  )
}

/* ══ GIFTING (Surprise A Friend) ══════════════════════════════════ */
const GIFT_SUB_TABS = [['categories','Categories'],['types','Types & Pricing'],['templates','Templates'],['orders','Orders'],['claims','Claims'],['payments','Payments'],['analytics','Analytics'],['settings','Settings']]

function GiftingTab() {
  const [sub, setSub] = useState('orders')
  return (
    <div>
      <div style={{display:'flex',gap:8,marginBottom:18,flexWrap:'wrap'}}>
        {GIFT_SUB_TABS.map(([k,l]) => (
          <button key={k} onClick={()=>setSub(k)} style={{padding:'6px 14px',borderRadius:100,border:`1.5px solid ${sub===k?'#FF6B2B':'#DDD3CA'}`,background:sub===k?'#FF6B2B':'white',color:sub===k?'white':'#5C3D2E',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{l}</button>
        ))}
      </div>
      {sub==='categories' && <GiftCategoriesTab/>}
      {sub==='types'      && <GiftTypesTab/>}
      {sub==='templates'  && <GiftTemplatesTab/>}
      {sub==='orders'     && <GiftOrdersTab/>}
      {sub==='claims'     && <GiftClaimsTab/>}
      {sub==='payments'   && <GiftPaymentsTab/>}
      {sub==='analytics'  && <GiftAnalyticsTab/>}
      {sub==='settings'   && <GiftSettingsTab/>}
    </div>
  )
}

function GiftCategoriesTab() {
  const [list, setList] = useState([])
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({ label: '', emoji: '🎁' })
  const [creating, setCreating] = useState(false)
  const load = useCallback(() => { adminGetGiftCategories().then(({data}) => setList(data||[])) }, [])
  useEffect(() => { load() }, [load])

  const update = async (cat, field, value) => {
    const { error } = await adminUpdateGiftCategory(cat.id, { [field]: value })
    if (error) return toast.error(error.message)
    load()
  }
  const create = async () => {
    if (!newForm.label.trim()) return toast.error('Label is required')
    setCreating(true)
    const { error } = await adminCreateGiftCategory(newForm)
    setCreating(false)
    if (error) return toast.error(error.message)
    toast.success('Category added')
    setNewForm({ label: '', emoji: '🎁' }); setShowNew(false); load()
  }
  const remove = async (cat) => {
    if (!window.confirm(`Delete "${cat.label}"?`)) return
    const { error } = await adminDeleteGiftCategory(cat.id)
    if (error) return toast.error(error.message)
    toast.success('Deleted'); load()
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <h3 style={{margin:0,fontSize:15,fontWeight:700}}>Gift Categories</h3>
        <Btn onClick={()=>setShowNew(v=>!v)}>{showNew?'Cancel':'+ New Category'}</Btn>
      </div>
      {showNew && (
        <Card style={{display:'flex',gap:10,alignItems:'center'}}>
          <input value={newForm.emoji} onChange={e=>setNewForm(f=>({...f,emoji:e.target.value}))} style={{width:36,padding:6,textAlign:'center',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:16}}/>
          <input value={newForm.label} onChange={e=>setNewForm(f=>({...f,label:e.target.value}))} placeholder="Category label" style={{flex:1,padding:'6px 10px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:13}}/>
          <Btn onClick={create} disabled={creating}>{creating?'Adding…':'Add'}</Btn>
        </Card>
      )}
      {list.map(c => (
        <Card key={c.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <input value={c.emoji} onChange={e=>update(c,'emoji',e.target.value)} style={{width:36,padding:6,textAlign:'center',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:16}}/>
            <input defaultValue={c.label} onBlur={e=>e.target.value!==c.label && update(c,'label',e.target.value)} style={{padding:'6px 10px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:13,fontWeight:600}}/>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <label style={{display:'flex',alignItems:'center',gap:8,fontSize:12,fontWeight:700,cursor:'pointer'}}>
              <input type="checkbox" checked={c.is_active} onChange={e=>update(c,'is_active',e.target.checked)}/> {c.is_active?'Active':'Hidden'}
            </label>
            <button onClick={()=>remove(c)} style={{background:'none',border:'none',color:'#DC2626',cursor:'pointer',fontSize:12,fontWeight:700}}>Delete</button>
          </div>
        </Card>
      ))}
    </div>
  )
}

function GiftTypesTab() {
  const [list, setList] = useState([])
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({ label: '', description: '', base_price: 0, is_physical: false })
  const [creating, setCreating] = useState(false)
  const load = useCallback(() => { adminGetGiftTypes().then(({data}) => setList(data||[])) }, [])
  useEffect(() => { load() }, [load])

  const update = async (t, field, value) => {
    const { error } = await adminUpdateGiftType(t.id, { [field]: value })
    if (error) return toast.error(error.message)
    load()
  }
  const create = async () => {
    if (!newForm.label.trim()) return toast.error('Label is required')
    setCreating(true)
    const { error } = await adminCreateGiftType(newForm)
    setCreating(false)
    if (error) return toast.error(error.message)
    toast.success('Gift type added')
    setNewForm({ label: '', description: '', base_price: 0, is_physical: false }); setShowNew(false); load()
  }
  const remove = async (t) => {
    if (!window.confirm(`Delete "${t.label}"?`)) return
    const { error } = await adminDeleteGiftType(t.id)
    if (error) return toast.error(error.message)
    toast.success('Deleted'); load()
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <h3 style={{margin:0,fontSize:15,fontWeight:700}}>Gift Types & Pricing</h3>
        <Btn onClick={()=>setShowNew(v=>!v)}>{showNew?'Cancel':'+ New Gift Type'}</Btn>
      </div>
      {showNew && (
        <Card>
          <input value={newForm.label} onChange={e=>setNewForm(f=>({...f,label:e.target.value}))} placeholder="Label" style={{padding:'6px 10px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:13,width:'100%',marginBottom:8}}/>
          <input value={newForm.description} onChange={e=>setNewForm(f=>({...f,description:e.target.value}))} placeholder="Description" style={{padding:'6px 10px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:12,width:'100%',marginBottom:8}}/>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
            <span style={{fontSize:13,fontWeight:700}}>₹</span>
            <input type="number" value={newForm.base_price} onChange={e=>setNewForm(f=>({...f,base_price:Number(e.target.value)}))} style={{width:100,padding:'6px 10px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:13}}/>
          </div>
          <label style={{display:'flex',alignItems:'center',gap:6,fontSize:12,fontWeight:700,cursor:'pointer',marginBottom:10}}>
            <input type="checkbox" checked={newForm.is_physical} onChange={e=>setNewForm(f=>({...f,is_physical:e.target.checked}))}/> 📦 Physical (requires shipping via Shiprocket)
          </label>
          <Btn onClick={create} disabled={creating}>{creating?'Adding…':'Add'}</Btn>
        </Card>
      )}
      {list.map(t => (
        <Card key={t.id}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12}}>
            <div style={{flex:1}}>
              <input defaultValue={t.label} onBlur={e=>e.target.value!==t.label && update(t,'label',e.target.value)} style={{padding:'6px 10px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:13,fontWeight:700,width:'100%',marginBottom:6}}/>
              <input defaultValue={t.description||''} onBlur={e=>e.target.value!==t.description && update(t,'description',e.target.value)} style={{padding:'6px 10px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:12,width:'100%'}}/>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
              <span style={{fontSize:13,fontWeight:700}}>₹</span>
              <input type="number" defaultValue={t.base_price} onBlur={e=>Number(e.target.value)!==Number(t.base_price) && update(t,'base_price',Number(e.target.value))} style={{width:80,padding:'6px 10px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:13,fontWeight:700}}/>
            </div>
            <label style={{display:'flex',alignItems:'center',gap:6,fontSize:12,fontWeight:700,cursor:'pointer',flexShrink:0}}>
              <input type="checkbox" checked={!!t.is_physical} onChange={e=>update(t,'is_physical',e.target.checked)}/> 📦 Physical
            </label>
            <label style={{display:'flex',alignItems:'center',gap:6,fontSize:12,fontWeight:700,cursor:'pointer',flexShrink:0}}>
              <input type="checkbox" checked={t.is_active} onChange={e=>update(t,'is_active',e.target.checked)}/> Active
            </label>
            <button onClick={()=>remove(t)} style={{background:'none',border:'none',color:'#DC2626',cursor:'pointer',fontSize:12,fontWeight:700,flexShrink:0}}>Delete</button>
          </div>
        </Card>
      ))}
    </div>
  )
}

function GiftTemplatesTab() {
  const [list, setList] = useState([])
  const [styleKeys, setStyleKeys] = useState([])
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({ label: '', style_key: '' })
  const [creating, setCreating] = useState(false)
  const load = useCallback(() => { adminGetGiftTemplates().then(({data}) => { setList(data?.templates||[]); setStyleKeys(data?.styleKeys||[]) }) }, [])
  useEffect(() => { load() }, [load])

  const update = async (t, field, value) => {
    const { error } = await adminUpdateGiftTemplate(t.id, { [field]: value })
    if (error) return toast.error(error.message)
    load()
  }
  const create = async () => {
    if (!newForm.label.trim()) return toast.error('Label is required')
    if (!newForm.style_key) return toast.error('Choose an underlying visual style')
    setCreating(true)
    const { error } = await adminCreateGiftTemplate(newForm)
    setCreating(false)
    if (error) return toast.error(error.message)
    toast.success('Template added')
    setNewForm({ label: '', style_key: '' }); setShowNew(false); load()
  }
  const remove = async (t) => {
    if (!window.confirm(`Delete "${t.label}"?`)) return
    const { error } = await adminDeleteGiftTemplate(t.id)
    if (error) return toast.error(error.message)
    toast.success('Deleted'); load()
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
        <h3 style={{margin:0,fontSize:15,fontWeight:700}}>Design Templates</h3>
        <Btn onClick={()=>setShowNew(v=>!v)}>{showNew?'Cancel':'+ New Template'}</Btn>
      </div>
      <p style={{fontSize:12,color:'#8C7B6E',marginTop:0,marginBottom:16}}>
        Each template's visual design is one of {styleKeys.length} coded styles — admins catalogue entries
        (label, pricing tier, preview) and pick which coded style renders it. A brand-new visual design needs a developer.
      </p>
      {showNew && (
        <Card>
          <input value={newForm.label} onChange={e=>setNewForm(f=>({...f,label:e.target.value}))} placeholder="Label (e.g. 'Festive Gold Edition')" style={{padding:'6px 10px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:13,width:'100%',marginBottom:8}}/>
          <select value={newForm.style_key} onChange={e=>setNewForm(f=>({...f,style_key:e.target.value}))} style={{width:'100%',padding:'9px 12px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:13,fontFamily:'inherit',marginBottom:10}}>
            <option value="">Choose underlying visual style…</option>
            {styleKeys.map(k => <option key={k} value={k}>{k.replace(/_/g,' ')}</option>)}
          </select>
          <Btn onClick={create} disabled={creating}>{creating?'Adding…':'Add'}</Btn>
        </Card>
      )}
      {list.map(t => (
        <Card key={t.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{flex:1,marginRight:12}}>
            <input defaultValue={t.label} onBlur={e=>e.target.value!==t.label && update(t,'label',e.target.value)} style={{padding:'6px 10px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:13,fontWeight:600,width:'100%',marginBottom:6}}/>
            <select value={t.style_key} onChange={e=>update(t,'style_key',e.target.value)} style={{width:'100%',padding:'6px 10px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:12,fontFamily:'inherit'}}>
              {styleKeys.map(k => <option key={k} value={k}>{k.replace(/_/g,' ')}</option>)}
            </select>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:14,flexShrink:0}}>
            <label style={{display:'flex',alignItems:'center',gap:8,fontSize:12,fontWeight:700,cursor:'pointer'}}>
              <input type="checkbox" checked={t.is_active} onChange={e=>update(t,'is_active',e.target.checked)}/> {t.is_active?'Active':'Hidden'}
            </label>
            <button onClick={()=>remove(t)} style={{background:'none',border:'none',color:'#DC2626',cursor:'pointer',fontSize:12,fontWeight:700}}>Delete</button>
          </div>
        </Card>
      ))}
    </div>
  )
}

const GIFT_ORDER_STATUS_COLORS = {
  pending_payment:'#F59E0B', processing:'#2563EB', ready:'#059669', failed:'#DC2626',
  shipped:'#2563EB', in_transit:'#2563EB', out_for_delivery:'#2563EB',
  delivered:'#059669', delivery_failed:'#DC2626', returned:'#DC2626', cancelled:'#DC2626',
}

const GIFT_PAYMENT_STATUSES = ['pending', 'paid', 'free', 'refunded', 'failed']
const GIFT_ORDER_STATUSES = [
  'pending_payment', 'processing', 'ready', 'failed',
  'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'delivery_failed', 'returned', 'cancelled',
]

function GiftOrdersTab() {
  const [list, setList] = useState([])
  const [status, setStatus] = useState('')
  const [selected, setSelected] = useState(null)
  const [manualStatus, setManualStatus] = useState('')
  const [manualNotes, setManualNotes] = useState('')
  const [applying, setApplying] = useState(false)
  const [manualOrderStatus, setManualOrderStatus] = useState('')
  const [applyingOrderStatus, setApplyingOrderStatus] = useState(false)
  const [shippingForm, setShippingForm] = useState(null)
  const [busyShipment, setBusyShipment] = useState(false)
  const [showTracking, setShowTracking] = useState(false)

  const load = useCallback(() => { adminGetGiftOrders(status ? {status} : {}).then(({data}) => setList(data||[])) }, [status])
  useEffect(() => { load() }, [load])

  const openDetail = async (id) => {
    const { data } = await adminGetGiftOrder(id)
    setSelected(data)
    setManualStatus(data?.order?.payment_status || '')
    setManualNotes('')
    setManualOrderStatus(data?.order?.status || '')
    setShippingForm(data?.order?.is_physical ? {
      recipientPhone: data.order.recipient_phone || '', shippingAddressLine1: data.order.shipping_address_line1 || '',
      shippingAddressLine2: data.order.shipping_address_line2 || '', shippingCity: data.order.shipping_city || '',
      shippingState: data.order.shipping_state || '', shippingPincode: data.order.shipping_pincode || '',
      shippingCountry: data.order.shipping_country || 'IN',
    } : null)
    setShowTracking(false)
  }

  const refund = async (id) => {
    if (!window.confirm('Refund this gift order?')) return
    const { error } = await adminRefundGiftOrder(id)
    if (error) return toast.error(error.message)
    toast.success('Refunded')
    setSelected(null); load()
  }

  const confirmCod = async (id) => {
    if (!window.confirm('Confirm cash has been collected for this order?')) return
    const { error } = await adminConfirmGiftCod(id)
    if (error) return toast.error(error.message)
    toast.success('Confirmed — gift is being created')
    setSelected(null); load()
  }

  const generateClaimCertificate = async (id) => {
    if (!window.confirm('Generate the certificate for this wallet-claim gift now?')) return
    const { error } = await adminSetGiftPaymentStatus(id, 'free')
    if (error) return toast.error(error.message)
    toast.success('Generating — gift is being created')
    setSelected(null); load()
  }

  const applyManualStatus = async () => {
    if (manualStatus === selected.order.payment_status) return toast.error('Pick a different status to apply')
    setApplying(true)
    const { error } = await adminSetGiftPaymentStatus(selected.order.id, manualStatus, manualNotes)
    setApplying(false)
    if (error) return toast.error(error.message)
    toast.success(`Payment status set to "${manualStatus}"`)
    setSelected(null); load()
  }

  const shipOrder = async (id) => {
    if (!window.confirm('Create a Shiprocket shipment for this order?')) return
    setBusyShipment(true)
    const { error } = await adminShipGiftOrder(id)
    setBusyShipment(false)
    if (error) return toast.error(error.message)
    toast.success('Shipment created')
    openDetail(id); load()
  }

  const cancelShipmentForOrder = async (id) => {
    const reason = window.prompt('Reason for cancelling this shipment?', 'Cancelled by admin')
    if (reason === null) return
    setBusyShipment(true)
    const { error } = await adminCancelGiftShipment(id, reason)
    setBusyShipment(false)
    if (error) return toast.error(error.message)
    toast.success('Shipment cancelled')
    openDetail(id); load()
  }

  const applyManualOrderStatus = async () => {
    if (manualOrderStatus === selected.order.status) return toast.error('Pick a different status to apply')
    setApplyingOrderStatus(true)
    const { error } = await adminSetGiftOrderStatus(selected.order.id, manualOrderStatus)
    setApplyingOrderStatus(false)
    if (error) return toast.error(error.message)
    toast.success(`Order status set to "${manualOrderStatus}"`)
    setSelected(null); load()
  }

  const saveShippingAddress = async () => {
    const { error } = await adminUpdateGiftShippingAddress(selected.order.id, shippingForm)
    if (error) return toast.error(error.message)
    toast.success('Shipping address updated')
    openDetail(selected.order.id)
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <h3 style={{margin:0,fontSize:15,fontWeight:700}}>Gift Orders</h3>
        <select value={status} onChange={e=>setStatus(e.target.value)} style={{padding:'6px 12px',borderRadius:8,border:'1.5px solid #DDD3CA',fontSize:12}}>
          <option value="">All statuses</option>
          <option value="pending_payment">Pending Payment</option>
          <option value="processing">Processing</option>
          <option value="ready">Ready</option>
          <option value="failed">Failed</option>
        </select>
      </div>
      {list.map(o => (
        <Card key={o.id} style={{cursor:'pointer'}} onClick={()=>openDetail(o.id)}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontWeight:700,fontSize:13}}>
                {o.category_label} — {o.recipient_name}
                {o.payment_method === 'claim' && <span style={{marginLeft:8,fontSize:10,fontWeight:700,color:'#7C3AED',background:'rgba(124,58,237,.1)',padding:'2px 8px',borderRadius:100}}>🎁 WALLET CLAIM</span>}
                {o.is_physical && <span style={{marginLeft:8,fontSize:10,fontWeight:700,color:'#D4AF37',background:'rgba(212,175,55,.12)',padding:'2px 8px',borderRadius:100}}>📦 PHYSICAL</span>}
              </div>
              <div style={{fontSize:11.5,color:'#8C7B6E',marginTop:2}}>{o.story_title} · {o.gift_type_label} · from {o.sender_name}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:11,fontWeight:700,color:GIFT_ORDER_STATUS_COLORS[o.status]}}>{o.status}</div>
              <div style={{fontSize:12,fontWeight:700,marginTop:2}}>₹{Number(o.amount).toFixed(0)}</div>
            </div>
          </div>
        </Card>
      ))}
      {selected && (
        <Modal title="Gift Order Detail" onClose={()=>setSelected(null)}>
          <div style={{fontSize:13,lineHeight:1.8}}>
            <div><b>Recipient:</b> {selected.order.recipient_name} ({selected.order.recipient_email||'no email'})</div>
            <div><b>Sender:</b> {selected.order.sender_name} ({selected.order.sender_email})</div>
            <div><b>Story:</b> {selected.order.story_title}</div>
            <div><b>Category:</b> {selected.order.category_label}</div>
            <div><b>Gift Type:</b> {selected.order.gift_type_label}</div>
            <div><b>Template:</b> {selected.order.template_label}</div>
            <div><b>Amount:</b> ₹{Number(selected.order.amount).toFixed(0)} ({selected.order.payment_status})</div>
            <div><b>Payment Method:</b> {selected.order.payment_method}</div>
            <div><b>Status:</b> {selected.order.status}</div>
            <div><b>Message:</b> "{selected.order.message}"</div>
          </div>

          {selected.order.is_physical && (
            <div style={{marginTop:18,paddingTop:14,borderTop:'1px solid #F0EAE4'}}>
              <div style={{fontSize:12,fontWeight:700,color:'#8C7B6E',marginBottom:8}}>SHIPPING ADDRESS</div>
              {shippingForm && (
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  <input value={shippingForm.recipientPhone} onChange={e=>setShippingForm({...shippingForm,recipientPhone:e.target.value})} placeholder="Recipient phone" style={{padding:'8px 12px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:12}}/>
                  <input value={shippingForm.shippingAddressLine1} onChange={e=>setShippingForm({...shippingForm,shippingAddressLine1:e.target.value})} placeholder="Address line 1" style={{padding:'8px 12px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:12}}/>
                  <input value={shippingForm.shippingAddressLine2} onChange={e=>setShippingForm({...shippingForm,shippingAddressLine2:e.target.value})} placeholder="Address line 2 (optional)" style={{padding:'8px 12px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:12}}/>
                  <div style={{display:'flex',gap:6}}>
                    <input value={shippingForm.shippingCity} onChange={e=>setShippingForm({...shippingForm,shippingCity:e.target.value})} placeholder="City" style={{flex:1,padding:'8px 12px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:12}}/>
                    <input value={shippingForm.shippingState} onChange={e=>setShippingForm({...shippingForm,shippingState:e.target.value})} placeholder="State" style={{flex:1,padding:'8px 12px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:12}}/>
                    <input value={shippingForm.shippingPincode} onChange={e=>setShippingForm({...shippingForm,shippingPincode:e.target.value})} placeholder="Pincode" style={{flex:1,padding:'8px 12px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:12}}/>
                  </div>
                  <Btn onClick={saveShippingAddress} style={{alignSelf:'flex-start'}}>Save Address</Btn>
                </div>
              )}

              <div style={{display:'flex',gap:8,marginTop:12,flexWrap:'wrap'}}>
                {!selected.shipment || selected.shipment.status === 'cancelled' ? (
                  <Btn onClick={()=>shipOrder(selected.order.id)} disabled={busyShipment || !['paid','free'].includes(selected.order.payment_status)}>
                    {busyShipment ? 'Creating…' : '📦 Create Shipment'}
                  </Btn>
                ) : (
                  <>
                    {!['delivered','cancelled'].includes(selected.shipment.status) && (
                      <Btn v="danger" onClick={()=>cancelShipmentForOrder(selected.order.id)} disabled={busyShipment}>Cancel Shipment</Btn>
                    )}
                    <Btn onClick={()=>setShowTracking(s=>!s)}>{showTracking ? 'Hide Tracking' : 'View / Refresh Tracking'}</Btn>
                  </>
                )}
              </div>
              {selected.shipment && (
                <div style={{fontSize:11.5,color:'#8C7B6E',marginTop:8}}>
                  Shipment status: <b>{selected.shipment.status}</b>{selected.shipment.awb_code && ` · AWB ${selected.shipment.awb_code}`}
                </div>
              )}
              {showTracking && (
                <div style={{marginTop:10}}>
                  <GiftTrackingTimeline orderId={selected.order.id} fetcher={adminGetGiftTracking} />
                </div>
              )}
            </div>
          )}

          {selected.order.payment_method === 'cod' && selected.order.payment_status === 'pending' && (
            <Btn onClick={()=>confirmCod(selected.order.id)} style={{marginTop:14}}>✓ Confirm Cash Collected</Btn>
          )}
          {selected.order.payment_method === 'claim' && ['pending_payment','failed'].includes(selected.order.status) && (
            <Btn onClick={()=>generateClaimCertificate(selected.order.id)} style={{marginTop:14}}>
              🎁 {selected.order.status === 'failed' ? 'Retry Generate Certificate' : 'Generate Certificate'}
            </Btn>
          )}
          {selected.order.payment_status === 'paid' && (
            <Btn v="danger" onClick={()=>refund(selected.order.id)} style={{marginTop:14}}>Refund Payment</Btn>
          )}

          <div style={{marginTop:18,paddingTop:14,borderTop:'1px solid #F0EAE4'}}>
            <div style={{fontSize:12,fontWeight:700,color:'#8C7B6E',marginBottom:8}}>MANUALLY SET PAYMENT STATUS</div>
            <p style={{fontSize:11.5,color:'#8C7B6E',marginTop:0,marginBottom:8}}>Use this if an online payment succeeded but the order didn't update automatically — check Razorpay's dashboard first.</p>
            <select value={manualStatus} onChange={e=>setManualStatus(e.target.value)} style={{width:'100%',padding:'8px 12px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:13,fontFamily:'inherit',marginBottom:8}}>
              {GIFT_PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input value={manualNotes} onChange={e=>setManualNotes(e.target.value)} placeholder="Notes (optional, sent to the sender if refunded/failed)" style={{width:'100%',padding:'8px 12px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:12,marginBottom:8}}/>
            <Btn onClick={applyManualStatus} disabled={applying}>{applying?'Applying…':'Apply Status'}</Btn>
          </div>

          {selected.order.is_physical && (
            <div style={{marginTop:18,paddingTop:14,borderTop:'1px solid #F0EAE4'}}>
              <div style={{fontSize:12,fontWeight:700,color:'#8C7B6E',marginBottom:8}}>MANUALLY SET ORDER / SHIPPING STATUS</div>
              <p style={{fontSize:11.5,color:'#8C7B6E',marginTop:0,marginBottom:8}}>Use this to correct the status if Shiprocket's tracking webhook is delayed or missing.</p>
              <select value={manualOrderStatus} onChange={e=>setManualOrderStatus(e.target.value)} style={{width:'100%',padding:'8px 12px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:13,fontFamily:'inherit',marginBottom:8}}>
                {GIFT_ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <Btn onClick={applyManualOrderStatus} disabled={applyingOrderStatus}>{applyingOrderStatus?'Applying…':'Apply Status'}</Btn>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}

const CLAIM_STATUS_COLORS = { pending:'#F59E0B', fulfilled:'#059669', rejected:'#DC2626' }

function GiftClaimsTab() {
  const [list, setList] = useState([])
  const [status, setStatus] = useState('pending')
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(() => { adminGetWalletClaims(status ? {status} : {}).then(({data}) => setList(data||[])) }, [status])
  useEffect(() => { load() }, [load])

  const approve = async (claim) => {
    if (!window.confirm(`Approve "${claim.tier_label}" for ${claim.full_name||claim.username}? This deducts ${claim.tier_cost.toLocaleString()} coins from them.`)) return
    setBusyId(claim.id)
    const { error } = await adminApproveWalletClaim(claim.id)
    setBusyId(null)
    if (error) return toast.error(error.message)
    toast.success('Claim approved')
    load()
  }
  const reject = async (claim) => {
    const notes = window.prompt('Optional note to include in the rejection email:') || ''
    setBusyId(claim.id)
    const { error } = await adminRejectWalletClaim(claim.id, notes)
    setBusyId(null)
    if (error) return toast.error(error.message)
    toast.success('Claim rejected')
    load()
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <h3 style={{margin:0,fontSize:15,fontWeight:700}}>Wallet Claims</h3>
        <select value={status} onChange={e=>setStatus(e.target.value)} style={{padding:'6px 12px',borderRadius:8,border:'1.5px solid #DDD3CA',fontSize:12}}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="fulfilled">Fulfilled</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
      {list.length === 0 && <p style={{fontSize:13,color:'#8C7B6E'}}>No claims here.</p>}
      {list.map(c => (
        <Card key={c.id}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12}}>
            <div>
              <div style={{fontWeight:700,fontSize:13}}>{c.tier_label}</div>
              <div style={{fontSize:11.5,color:'#8C7B6E',marginTop:2}}>{c.full_name||c.username} ({c.email}) · {c.tier_cost.toLocaleString()} coins requested · has {(c.coins||0).toLocaleString()} now</div>
              {c.admin_notes && <div style={{fontSize:11.5,color:'#8C7B6E',marginTop:4}}>Note: {c.admin_notes}</div>}
            </div>
            <div style={{textAlign:'right',flexShrink:0}}>
              <div style={{fontSize:11,fontWeight:700,color:CLAIM_STATUS_COLORS[c.status]}}>{c.status}</div>
              {c.status === 'pending' && (
                <div style={{display:'flex',gap:6,marginTop:8}}>
                  <Btn onClick={()=>approve(c)} disabled={busyId===c.id}>Approve</Btn>
                  <Btn v="danger" onClick={()=>reject(c)} disabled={busyId===c.id}>Reject</Btn>
                </div>
              )}
              {c.status === 'fulfilled' && c.tier_kind === 'free_gift' && (
                <div style={{fontSize:10.5,color:c.gift_order_id?'#2563EB':'#8C7B6E',marginTop:6,maxWidth:160}}>
                  {c.gift_order_id ? 'Gift details submitted — see Orders tab' : 'Awaiting user to submit gift details'}
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

function GiftPaymentsTab() {
  const [list, setList] = useState([])
  useEffect(() => { adminGetGiftPayments().then(({data}) => setList(data||[])) }, [])
  return (
    <div>
      <h3 style={{margin:'0 0 16px',fontSize:15,fontWeight:700}}>Gift Payments</h3>
      {list.map(p => (
        <Card key={p.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontWeight:700,fontSize:13}}>{p.recipient_name} — {p.sender_name}</div>
            <div style={{fontSize:11.5,color:'#8C7B6E',marginTop:2}}>{p.method} · {new Date(p.created_at).toLocaleDateString()}</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontWeight:700,fontSize:13}}>₹{Number(p.amount).toFixed(0)}</div>
            <div style={{fontSize:11,color:'#8C7B6E'}}>{p.status}</div>
          </div>
        </Card>
      ))}
    </div>
  )
}

function GiftAnalyticsTab() {
  const [data, setData] = useState(null)
  useEffect(() => { adminGetGiftAnalytics().then(({data}) => setData(data)) }, [])
  if (!data) return <Card><p style={{color:'#8C7B6E',fontSize:13,margin:0}}>Loading…</p></Card>
  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:14,marginBottom:20}}>
        <Card style={{textAlign:'center'}}>
          <div style={{fontSize:24,marginBottom:6}}>🎁</div>
          <div style={{fontSize:20,fontWeight:800}}>{data.totals.total_gifts}</div>
          <div style={{fontSize:11,color:'#8C7B6E'}}>Total Gifts</div>
        </Card>
        <Card style={{textAlign:'center'}}>
          <div style={{fontSize:24,marginBottom:6}}>💰</div>
          <div style={{fontSize:20,fontWeight:800}}>₹{Number(data.totals.total_revenue).toFixed(0)}</div>
          <div style={{fontSize:11,color:'#8C7B6E'}}>Total Revenue</div>
        </Card>
      </div>
      <SH c="By Category"/>
      {data.byCategory.map(c => <div key={c.label} style={{display:'flex',justifyContent:'space-between',fontSize:13,padding:'6px 0',borderBottom:'1px solid #F8F3EC'}}><span>{c.label}</span><b>{c.count}</b></div>)}
      <div style={{marginTop:18}}><SH c="By Gift Type"/></div>
      {data.byType.map(c => <div key={c.label} style={{display:'flex',justifyContent:'space-between',fontSize:13,padding:'6px 0',borderBottom:'1px solid #F8F3EC'}}><span>{c.label}</span><b>{c.count}</b></div>)}
      <div style={{marginTop:18}}><SH c="By Template"/></div>
      {data.byTemplate.map(c => <div key={c.label} style={{display:'flex',justifyContent:'space-between',fontSize:13,padding:'6px 0',borderBottom:'1px solid #F8F3EC'}}><span>{c.label}</span><b>{c.count}</b></div>)}
    </div>
  )
}

function GiftModuleToggleCard({ initial, onSaved }) {
  const [enabled, setEnabled] = useState(initial !== false)
  const [saving, setSaving] = useState(false)
  const dirty = enabled !== (initial !== false)

  const save = async () => {
    setSaving(true)
    const { error } = await adminUpdateGiftSettings({ 'gift.module_enabled': enabled })
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success(`Module turned ${enabled ? 'ON' : 'OFF'}`)
    onSaved()
  }

  return (
    <Card style={{background: !enabled ? '#FFF5F5' : '#F0FFF6', border:`1px solid ${!enabled?'#FECACA':'#BBF7D0'}`}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <div>
          <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>Surprise A Friend Module</div>
          <p style={{fontSize:12,color:'#5C3D2E',margin:0}}>
            Master switch. When off, the 🎁 Surprise A Friend CTA is hidden everywhere across the app.
          </p>
        </div>
        <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,fontWeight:700,cursor:'pointer',flexShrink:0,marginLeft:16}}>
          <input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/>
          {enabled ? 'ON' : 'OFF'}
        </label>
      </div>
      <Btn onClick={save} disabled={saving || !dirty}>{saving ? 'Saving…' : 'Save'}</Btn>
    </Card>
  )
}

const AUDIENCE_LABELS = { member: 'Membership (active membership)', contributor: 'Contributors', admin: 'Admins', custom: 'Custom Users (hand-picked)' }

function CustomUserPicker({ selectedIds, onChange }) {
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')

  useEffect(() => { adminGetUsers().then(({data}) => setUsers(data||[])) }, [])

  const selected = users.filter(u => selectedIds.includes(u.id))
  const q = search.trim().toLowerCase()
  const matches = q ? users.filter(u =>
    !selectedIds.includes(u.id) &&
    (u.username?.toLowerCase().includes(q) || u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
  ).slice(0, 8) : []

  return (
    <div style={{marginTop:10,marginLeft:20}}>
      <input
        placeholder="Search by name, username, or email…" value={search} onChange={e=>setSearch(e.target.value)}
        style={{width:'100%',padding:'8px 12px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:12.5,fontFamily:'inherit',outline:'none',marginBottom:8}}
      />
      {matches.length > 0 && (
        <div style={{border:'1px solid #F0EAE4',borderRadius:8,marginBottom:10,maxHeight:160,overflowY:'auto'}}>
          {matches.map(u => (
            <div key={u.id} onClick={()=>{onChange([...selectedIds, u.id]); setSearch('')}}
              style={{padding:'7px 10px',fontSize:12.5,cursor:'pointer',borderBottom:'1px solid #F8F3EC'}}>
              {u.full_name} <span style={{color:'#8C7B6E'}}>@{u.username}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
        {selected.map(u => (
          <span key={u.id} style={{display:'flex',alignItems:'center',gap:6,background:'rgba(255,107,43,.1)',color:'#FF6B2B',borderRadius:100,padding:'4px 10px',fontSize:12,fontWeight:600}}>
            {u.full_name}
            <button onClick={()=>onChange(selectedIds.filter(id=>id!==u.id))} style={{background:'none',border:'none',cursor:'pointer',color:'#FF6B2B',fontSize:13,padding:0,lineHeight:1}}>×</button>
          </span>
        ))}
        {selected.length === 0 && <span style={{fontSize:12,color:'#8C7B6E'}}>No users picked yet.</span>}
      </div>
    </div>
  )
}

function GiftAudienceCard({ initial, initialCustomIds, onSaved }) {
  const initialAudiences = Array.isArray(initial) ? initial : []
  const initialCustom = Array.isArray(initialCustomIds) ? initialCustomIds : []
  const initialIsEveryone = initialAudiences.length === 0 || initialAudiences.includes('everyone')
  // `mode` is a UI-only toggle, separate from `audiences` — otherwise an
  // empty audiences array (the state right after switching to "Restricted"
  // but before checking any box) reads as "no restriction" again, and the
  // checkboxes — which are disabled while in "Everyone" mode — could never
  // be reached to actually pick an audience.
  const [mode, setMode] = useState(initialIsEveryone ? 'everyone' : 'restricted')
  const [audiences, setAudiences] = useState(initialAudiences.filter(a => a !== 'everyone'))
  const [customIds, setCustomIds] = useState(initialCustom)
  const [saving, setSaving] = useState(false)
  const isEveryone = mode === 'everyone'
  const dirty = mode !== (initialIsEveryone ? 'everyone' : 'restricted')
    || JSON.stringify([...audiences].sort()) !== JSON.stringify([...initialAudiences].filter(a=>a!=='everyone').sort())
    || JSON.stringify([...customIds].sort()) !== JSON.stringify([...initialCustom].sort())

  const toggle = (key) => {
    setAudiences(audiences.includes(key) ? audiences.filter(a => a !== key) : [...audiences, key])
  }

  const save = async () => {
    if (!isEveryone && audiences.length === 0) return toast.error('Check at least one audience, or choose "Everyone"')
    setSaving(true)
    const { error } = await adminUpdateGiftSettings({
      'gift.allowed_audiences': isEveryone ? ['everyone'] : audiences,
      'gift.custom_user_ids': customIds,
    })
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success(isEveryone ? 'Now open to everyone' : `Restricted to: ${audiences.map(a=>AUDIENCE_LABELS[a]||a).join(', ')}`)
    onSaved()
  }

  return (
    <Card>
      <SH c="Who Can Send Gifts"/>
      <p style={{fontSize:12,color:'#8C7B6E',marginTop:0,marginBottom:14}}>
        Choose "Everyone" for no restriction, or check specific audiences below — the CTA is hidden from
        (and the backend blocks) anyone outside the checked groups. Click Save below to apply.
      </p>
      <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:14}}>
        <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>
          <input type="radio" checked={isEveryone} onChange={()=>setMode('everyone')}/> Everyone (no restriction)
        </label>
        <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>
          <input type="radio" checked={!isEveryone} onChange={()=>setMode('restricted')}/> Restricted to specific audiences
        </label>
        {Object.keys(AUDIENCE_LABELS).map(key => (
          <div key={key}>
            <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,fontWeight:600,cursor:'pointer',marginLeft:20}}>
              <input type="checkbox" disabled={isEveryone} checked={!isEveryone && audiences.includes(key)} onChange={()=>toggle(key)}/>
              {AUDIENCE_LABELS[key]}
            </label>
            {key==='custom' && !isEveryone && audiences.includes('custom') && (
              <CustomUserPicker selectedIds={customIds} onChange={setCustomIds}/>
            )}
          </div>
        ))}
      </div>
      <Btn onClick={save} disabled={saving || !dirty}>{saving ? 'Saving…' : 'Save'}</Btn>
    </Card>
  )
}

function GiftSettingsTab() {
  const [settings, setSettings] = useState(null)
  const load = useCallback(() => { adminGetGiftSettings().then(({data}) => setSettings(data?.settings||{})) }, [])
  useEffect(() => { load() }, [load])

  if (!settings) return <Card><p style={{color:'#8C7B6E',fontSize:13,margin:0}}>Loading…</p></Card>

  return (
    <div>
      <h3 style={{margin:'0 0 16px',fontSize:15,fontWeight:700}}>Gifting Settings</h3>
      <GiftModuleToggleCard key={`module-${settings['gift.module_enabled']}`} initial={settings['gift.module_enabled']} onSaved={load}/>
      <GiftAudienceCard
        key={`audience-${JSON.stringify(settings['gift.allowed_audiences'])}-${JSON.stringify(settings['gift.custom_user_ids'])}`}
        initial={settings['gift.allowed_audiences']} initialCustomIds={settings['gift.custom_user_ids']} onSaved={load}
      />
    </div>
  )
}

/* ══ MEMBERSHIP ═════════════════════════════════════════════════ */
const MEMBERSHIP_SUB_TABS = [['dashboard','Dashboard'],['plans','Plans'],['formbuilder','Form Builder'],['applications','Applications'],['payments','Payments'],['access','Access Control'],['settings','Settings']]
const DURATION_TYPES = ['monthly','quarterly','annual','lifetime','custom']
const FIELD_TYPES = ['text','textarea','email','phone','number','dropdown','checkbox','radio','file','image','linkedin_url','company_name']
const RESET_FREQS = ['daily','weekly','monthly','yearly','never']
const RESET_FREQ_LABELS = { daily:'day', weekly:'week', monthly:'month', yearly:'year', never:'lifetime (no reset)' }

function limitMode(limit) {
  if (limit === -1) return 'unlimited'
  if (limit === 0) return 'disabled'
  return 'limited'
}

// Replaces raw "-1 / 0 / N" number inputs with a plain-language dropdown —
// "Unlimited" / "Not available" / "Limited to N per period" — for both the
// global Feature Access Control rule editor and the per-plan limit editor.
// hidePeriod=true skips its own reset-period select when the caller (e.g.
// AccessRuleCard) renders one shared period selector for multiple pickers.
function LimitPicker({ limit, resetFrequency, onChange, hidePeriod }) {
  const mode = limitMode(limit)
  const setMode = (m) => {
    if (m === 'unlimited') onChange({ limit: -1, reset_frequency: resetFrequency })
    else if (m === 'disabled') onChange({ limit: 0, reset_frequency: resetFrequency })
    else onChange({ limit: limit > 0 ? limit : 5, reset_frequency: resetFrequency || 'monthly' })
  }
  return (
    <div>
      <select value={mode} onChange={e=>setMode(e.target.value)} style={{width:'100%',padding:'8px 10px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:12.5,fontFamily:'inherit',background:'white',color:'#1A0800'}}>
        <option value="unlimited">♾️ Unlimited</option>
        <option value="disabled">🚫 Not available</option>
        <option value="limited">🔢 Limited to…</option>
      </select>
      {mode === 'limited' && (
        <div style={{display:'flex',gap:6,marginTop:6,alignItems:'center'}}>
          <input
            type="number" min="1" value={limit>0?limit:5}
            onChange={e=>onChange({ limit: Math.max(1, Number(e.target.value)||1), reset_frequency: resetFrequency || 'monthly' })}
            style={{width:64,padding:'7px 8px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:12.5,fontFamily:'inherit'}}
          />
          {!hidePeriod && (
            <select value={resetFrequency||'monthly'} onChange={e=>onChange({ limit, reset_frequency: e.target.value })}
              style={{padding:'7px 8px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:12.5,fontFamily:'inherit',background:'white'}}>
              {RESET_FREQS.map(f => <option key={f} value={f}>per {RESET_FREQ_LABELS[f]}</option>)}
            </select>
          )}
          {hidePeriod && <span style={{fontSize:12,color:'#8C7B6E'}}>per {RESET_FREQ_LABELS[resetFrequency]||'period'}</span>}
        </div>
      )}
    </div>
  )
}

function MembershipTab() {
  const [sub, setSub] = useState('dashboard')
  return (
    <div>
      <div style={{display:'flex',gap:8,marginBottom:18,flexWrap:'wrap'}}>
        {MEMBERSHIP_SUB_TABS.map(([k,l]) => (
          <button key={k} onClick={()=>setSub(k)} style={{padding:'6px 14px',borderRadius:100,border:`1.5px solid ${sub===k?'#FF6B2B':'#DDD3CA'}`,background:sub===k?'#FF6B2B':'white',color:sub===k?'white':'#5C3D2E',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{l}</button>
        ))}
      </div>
      {sub==='dashboard'    && <MembershipDashboardTab/>}
      {sub==='plans'        && <MembershipPlansTab/>}
      {sub==='formbuilder'  && <MembershipFormBuilderTab/>}
      {sub==='applications' && <MembershipApplicationsTab/>}
      {sub==='payments'     && <MembershipPaymentsTab/>}
      {sub==='access'       && <MembershipAccessControlTab/>}
      {sub==='settings'     && <MembershipSettingsTab/>}
    </div>
  )
}

function MembershipDashboardTab() {
  const [stats, setStats] = useState(null)
  const [planPerf, setPlanPerf] = useState([])
  useEffect(() => { adminGetMembershipStats().then(({data}) => { setStats(data?.stats||null); setPlanPerf(data?.planPerformance||[]) }) }, [])
  if (!stats) return <Card><p style={{color:'#8C7B6E',fontSize:13,margin:0}}>Loading…</p></Card>
  const cards = [
    ['Total Members', stats.total_members, '🎫'],
    ['Pending Approvals', stats.pending_approvals, '⏳'],
    ['Approved (all-time)', stats.approved_members, '✅'],
    ['Expired Members', stats.expired_members, '⌛'],
    ['Total Revenue', `₹${stats.total_revenue}`, '💰'],
    ['Monthly Revenue', `₹${stats.monthly_revenue}`, '📈'],
    ['Total Applications', stats.total_applications, '📝'],
    ['Rejected', stats.rejected_applications, '❌'],
  ]
  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
        {cards.map(([label,value,icon]) => (
          <Card key={label} style={{textAlign:'center'}}>
            <div style={{fontSize:24,marginBottom:6}}>{icon}</div>
            <div style={{fontSize:20,fontWeight:800,color:'#1A0800'}}>{value}</div>
            <div style={{fontSize:11,color:'#8C7B6E',marginTop:2}}>{label}</div>
          </Card>
        ))}
      </div>
      <SH c="Plan Performance"/>
      {planPerf.map(p => (
        <Card key={p.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontWeight:700,fontSize:13}}>{p.name}</div>
          <div style={{fontSize:12,color:'#5C3D2E'}}>{p.member_count} active members · ₹{p.revenue} revenue</div>
        </Card>
      ))}
    </div>
  )
}

function MembershipPlansTab() {
  const [list, setList] = useState([])
  const [rules, setRules] = useState([])
  const [form, setForm] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => { adminListMembershipPlans().then(({data}) => setList(data||[])) }, [])
  useEffect(() => { load() }, [load])
  useEffect(() => { adminListAccessRules().then(({data}) => setRules((data||[]).filter(r=>r.is_active))) }, [])

  const openNew = () => { setEditingId(null); setForm({ name:'', description:'', price:99, currency:'INR', duration_type:'monthly', duration_days:30, benefits:[], linked_features:[], badge_emoji:'⭐', badge_color:'#FF6B2B', priority_level:0 }) }
  // linked_features entries used to be plain feature_key strings (every
  // plan just inherited the global member_limit); normalize those to the
  // new { feature_key, limit, reset_frequency } shape so older saved plans
  // still open cleanly in this per-plan limit editor.
  const normalizeLinkedFeatures = (linked) => (linked||[]).map(entry => {
    if (entry && typeof entry === 'object') return entry
    const rule = rules.find(r => r.feature_key === entry)
    return { feature_key: entry, limit: rule?.member_limit ?? -1, reset_frequency: rule?.reset_frequency || 'monthly' }
  })
  const openEdit = (p) => { setEditingId(p.id); setForm({ ...p, benefits: p.benefits||[], linked_features: normalizeLinkedFeatures(p.linked_features) }) }
  const toggleFeature = (key) => setForm(f => {
    const exists = f.linked_features.find(x => x.feature_key === key)
    if (exists) return { ...f, linked_features: f.linked_features.filter(x => x.feature_key !== key) }
    const rule = rules.find(r => r.feature_key === key)
    return { ...f, linked_features: [...f.linked_features, { feature_key: key, limit: rule?.member_limit ?? -1, reset_frequency: rule?.reset_frequency || 'monthly' }] }
  })
  const updateFeatureLimit = (key, patch) => setForm(f => ({
    ...f, linked_features: f.linked_features.map(x => x.feature_key === key ? { ...x, ...patch } : x)
  }))

  const save = async () => {
    if (!form.name.trim()) return toast.error('Plan name is required')
    setSaving(true)
    const { error } = editingId ? await adminUpdateMembershipPlan(editingId, form) : await adminCreateMembershipPlan(form)
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success(editingId ? 'Plan updated' : 'Plan created')
    setForm(null); load()
  }
  const clone = async (id) => { const {error} = await adminCloneMembershipPlan(id); if(error) return toast.error(error.message); toast.success('Cloned'); load() }
  const setStatus = async (id, action) => { const {error} = await adminSetMembershipPlanStatus(id, action); if(error) return toast.error(error.message); toast.success('Updated'); load() }

  const benefitsText = (form?.benefits||[]).join('\n')
  const setBenefitsText = (text) => setForm(f => ({...f, benefits: text.split('\n').map(s=>s.trim()).filter(Boolean)}))

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <h3 style={{margin:0,fontSize:15,fontWeight:700}}>Membership Plans</h3>
        <Btn onClick={openNew}>+ New Plan</Btn>
      </div>
      {list.length===0 && <Card><p style={{color:'#8C7B6E',fontSize:13,margin:0,textAlign:'center'}}>No plans yet.</p></Card>}
      {list.map(p => (
        <Card key={p.id} style={{display:'flex',gap:14,alignItems:'center'}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
              <span style={{fontWeight:700,fontSize:14}}>{p.badge_emoji} {p.name}</span>
              <Badge color={STATUS_COLORS[p.status]}>{p.status.toUpperCase()}</Badge>
              <span style={{fontSize:12,color:'#8C7B6E'}}>{p.duration_type}</span>
            </div>
            <div style={{fontSize:13,color:'#4A2800'}}>{p.currency} {p.price}{p.duration_days ? ` / ${p.duration_days}d` : ''}</div>
          </div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'flex-end'}}>
            <Btn v='secondary' style={{fontSize:11,padding:'5px 12px'}} onClick={()=>openEdit(p)}>Edit</Btn>
            <Btn v='secondary' style={{fontSize:11,padding:'5px 12px'}} onClick={()=>clone(p.id)}>Clone</Btn>
            {p.status==='active'
              ? <Btn v='secondary' style={{fontSize:11,padding:'5px 12px'}} onClick={()=>setStatus(p.id,'deactivate')}>Deactivate</Btn>
              : <Btn v='green' style={{fontSize:11,padding:'5px 12px'}} onClick={()=>setStatus(p.id,'activate')}>Activate</Btn>}
            {p.status!=='archived' && <Btn v='danger' style={{fontSize:11,padding:'5px 12px'}} onClick={()=>setStatus(p.id,'archive')}>Archive</Btn>}
          </div>
        </Card>
      ))}

      {form && (
        <Modal title={editingId?'Edit Plan':'New Plan'} onClose={()=>setForm(null)}>
          <L c="Plan Name"/>
          <Inp value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Monthly Membership"/>
          <L c="Description"/>
          <TA value={form.description||''} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div><L c="Price"/><Inp type="number" value={form.price} onChange={e=>setForm(f=>({...f,price:Number(e.target.value)}))}/></div>
            <div><L c="Currency"/><Inp value={form.currency} onChange={e=>setForm(f=>({...f,currency:e.target.value}))}/></div>
          </div>
          <L c="Duration Type"/>
          <select value={form.duration_type} onChange={e=>setForm(f=>({...f,duration_type:e.target.value}))} style={{width:'100%',padding:'9px 12px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:13,fontFamily:'inherit',marginBottom:12}}>
            {DURATION_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          {form.duration_type!=='lifetime' && (<><L c="Duration (days)"/><Inp type="number" value={form.duration_days||''} onChange={e=>setForm(f=>({...f,duration_days:Number(e.target.value)}))}/></>)}
          <L c="Benefits (one per line) — freeform marketing copy"/>
          <TA value={benefitsText} onChange={e=>setBenefitsText(e.target.value)} placeholder={'Unlimited stories\nUnlimited habits\nFull community access'} style={{minHeight:90}}/>

          <L c="Linked Features — pick what this specific plan unlocks, and set its own limit per feature"/>
          <div style={{border:'1.5px solid #DDD3CA',borderRadius:8,padding:'10px 12px',marginBottom:12,maxHeight:280,overflowY:'auto'}}>
            {rules.length===0 && <p style={{fontSize:12,color:'#8C7B6E',margin:0}}>No feature access rules configured yet — add some in Membership → Access Control first.</p>}
            {rules.map(r => {
              const entry = form.linked_features.find(x => x.feature_key === r.feature_key)
              return (
                <div key={r.feature_key} style={{marginBottom:10,paddingBottom:10,borderBottom:'1px solid #F8F3EC'}}>
                  <label style={{display:'flex',alignItems:'center',gap:8,fontSize:12.5,fontWeight:600,cursor:'pointer'}}>
                    <input type="checkbox" checked={!!entry} onChange={()=>toggleFeature(r.feature_key)}/>
                    {r.label}
                    <span style={{fontSize:11,fontWeight:500,color:'#8C7B6E'}}>
                      (free users get: {r.free_limit===-1?'unlimited':r.free_limit===0?'nothing':`${r.free_limit} per ${RESET_FREQ_LABELS[r.reset_frequency]}`})
                    </span>
                  </label>
                  {entry && (
                    <div style={{marginLeft:26,marginTop:6,maxWidth:280}}>
                      <LimitPicker limit={entry.limit} resetFrequency={entry.reset_frequency} onChange={(v)=>updateFeatureLimit(r.feature_key, v)}/>
                      <div style={{fontSize:10.5,color:'#8C7B6E',marginTop:4}}>This plan's own limit for this feature — defaults to the global "Paid Members" setting, but you can override it just for this plan.</div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
            <div><L c="Badge Emoji"/><Inp value={form.badge_emoji} onChange={e=>setForm(f=>({...f,badge_emoji:e.target.value}))}/></div>
            <div><L c="Badge Color"/><Inp type="color" value={form.badge_color} onChange={e=>setForm(f=>({...f,badge_color:e.target.value}))} style={{padding:2,height:38}}/></div>
            <div><L c="Priority"/><Inp type="number" value={form.priority_level} onChange={e=>setForm(f=>({...f,priority_level:Number(e.target.value)}))}/></div>
          </div>
          <Btn onClick={save} disabled={saving} style={{width:'100%',padding:'11px'}}>{saving?'Saving…':editingId?'Save Changes':'Create Plan'}</Btn>
        </Modal>
      )}
    </div>
  )
}

function MembershipFormBuilderTab() {
  const [list, setList] = useState([])
  const [form, setForm] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => { adminListMembershipFormFields().then(({data}) => setList(data||[])) }, [])
  useEffect(() => { load() }, [load])

  const openNew = () => { setEditingId(null); setForm({ field_key:'', label:'', field_type:'text', is_required:false, options:[], sort_order:(list.length+1)*10 }) }
  const openEdit = (f) => { setEditingId(f.id); setForm({ ...f, options: f.options||[] }) }

  const save = async () => {
    if (!form.label.trim() || (!editingId && !form.field_key.trim())) return toast.error('Label and field key are required')
    setSaving(true)
    const { error } = editingId ? await adminUpdateMembershipFormField(editingId, form) : await adminCreateMembershipFormField(form)
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success(editingId ? 'Field updated' : 'Field added')
    setForm(null); load()
  }
  const remove = async (id) => { if(!window.confirm('Delete this field?')) return; await adminDeleteMembershipFormField(id); toast.success('Deleted'); load() }
  const toggleActive = async (f) => { await adminUpdateMembershipFormField(f.id, { ...f, is_active: !f.is_active }); load() }

  const optionsText = (form?.options||[]).join('\n')
  const setOptionsText = (text) => setForm(f => ({...f, options: text.split('\n').map(s=>s.trim()).filter(Boolean)}))

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <h3 style={{margin:0,fontSize:15,fontWeight:700}}>Application Form Builder</h3>
        <Btn onClick={openNew}>+ Add Field</Btn>
      </div>
      {list.map(f => (
        <Card key={f.id} style={{display:'flex',gap:14,alignItems:'center'}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
              <span style={{fontWeight:700,fontSize:14}}>{f.label}</span>
              <Badge color="#7C3AED">{f.field_type}</Badge>
              {f.is_required && <Badge color="#DC2626">REQUIRED</Badge>}
              <Badge color={f.is_active?'#059669':'#8C7B6E'}>{f.is_active?'ACTIVE':'INACTIVE'}</Badge>
            </div>
            <div style={{fontSize:11,color:'#8C7B6E',marginTop:2}}>key: {f.field_key} · order: {f.sort_order}</div>
          </div>
          <div style={{display:'flex',gap:6,flexShrink:0}}>
            <Btn v='secondary' style={{fontSize:11,padding:'5px 12px'}} onClick={()=>toggleActive(f)}>{f.is_active?'Disable':'Enable'}</Btn>
            <Btn v='secondary' style={{fontSize:11,padding:'5px 12px'}} onClick={()=>openEdit(f)}>Edit</Btn>
            <Btn v='danger' style={{fontSize:11,padding:'5px 12px'}} onClick={()=>remove(f.id)}>Delete</Btn>
          </div>
        </Card>
      ))}

      {form && (
        <Modal title={editingId?'Edit Field':'New Field'} onClose={()=>setForm(null)}>
          <L c="Field Key (snake_case, immutable)"/>
          <Inp value={form.field_key} disabled={!!editingId} onChange={e=>setForm(f=>({...f,field_key:e.target.value.replace(/\s+/g,'_').toLowerCase()}))} placeholder="e.g. portfolio_url"/>
          <L c="Label"/>
          <Inp value={form.label} onChange={e=>setForm(f=>({...f,label:e.target.value}))} placeholder="e.g. Portfolio URL"/>
          <L c="Field Type"/>
          <select value={form.field_type} onChange={e=>setForm(f=>({...f,field_type:e.target.value}))} style={{width:'100%',padding:'9px 12px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:13,fontFamily:'inherit',marginBottom:12}}>
            {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {(form.field_type==='dropdown' || form.field_type==='radio') && (
            <><L c="Options (one per line)"/><TA value={optionsText} onChange={e=>setOptionsText(e.target.value)}/></>
          )}
          <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,fontWeight:600,marginBottom:12,cursor:'pointer'}}>
            <input type="checkbox" checked={!!form.is_required} onChange={e=>setForm(f=>({...f,is_required:e.target.checked}))}/> Required
          </label>
          <L c="Sort Order"/>
          <Inp type="number" value={form.sort_order} onChange={e=>setForm(f=>({...f,sort_order:Number(e.target.value)}))}/>
          <Btn onClick={save} disabled={saving} style={{width:'100%',padding:'11px'}}>{saving?'Saving…':editingId?'Save Changes':'Add Field'}</Btn>
        </Modal>
      )}
    </div>
  )
}

function MembershipApplicationsTab() {
  const [list, setList] = useState([])
  const [filter, setFilter] = useState('')
  const [detail, setDetail] = useState(null)
  const [rejectNotes, setRejectNotes] = useState('')
  const [manualStatus, setManualStatus] = useState('')
  const [manualNotes, setManualNotes] = useState('')
  const [savingStatus, setSavingStatus] = useState(false)

  const load = useCallback(() => { adminListMembershipApplications(filter||undefined).then(({data}) => setList(data||[])) }, [filter])
  useEffect(() => { load() }, [load])

  const openDetail = async (id) => {
    const {data} = await adminGetMembershipApplication(id)
    setDetail(data); setRejectNotes('')
    setManualStatus(data?.application?.status || ''); setManualNotes('')
  }
  const approve = async (id) => {
    const { error } = await adminApproveMembershipApplication(id)
    if (error) return toast.error(error.message)
    toast.success('Approved — membership activated, card generating')
    setDetail(null); load()
  }
  const reject = async (id) => {
    const { error } = await adminRejectMembershipApplication(id, rejectNotes)
    if (error) return toast.error(error.message)
    toast.success('Rejected')
    setDetail(null); load()
  }
  const saveManualStatus = async (id) => {
    setSavingStatus(true)
    const { error } = await adminSetMembershipApplicationStatus(id, manualStatus, manualNotes)
    setSavingStatus(false)
    if (error) return toast.error(error.message)
    toast.success(`Status set to ${manualStatus}`)
    setDetail(null); load()
  }

  const STATUSES = ['','pending','under_review','approved','rejected','expired','cancelled','suspended','renewal_due']
  const MANUAL_STATUSES = STATUSES.filter(s => s)

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <h3 style={{margin:0,fontSize:15,fontWeight:700}}>Applications</h3>
        <select value={filter} onChange={e=>setFilter(e.target.value)} style={{padding:'7px 12px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:12,fontFamily:'inherit'}}>
          {STATUSES.map(s => <option key={s} value={s}>{s||'All statuses'}</option>)}
        </select>
      </div>
      {list.length===0 && <Card><p style={{color:'#8C7B6E',fontSize:13,margin:0,textAlign:'center'}}>No applications.</p></Card>}
      {list.map(a => (
        <Card key={a.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,cursor:'pointer'}} onClick={()=>openDetail(a.id)}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
              <span style={{fontWeight:700,fontSize:13}}>{a.profile?.full_name || a.profile?.username}</span>
              <Badge color={STATUS_COLORS[a.status]}>{a.status.toUpperCase()}</Badge>
              <span style={{fontSize:11,color:'#8C7B6E'}}>{a.plan_name}</span>
            </div>
            <div style={{fontSize:11,color:'#8C7B6E'}}>{a.profile?.email} · {new Date(a.created_at).toLocaleDateString('en-IN')}</div>
          </div>
          <div style={{fontSize:12,color:'#5C3D2E'}}>{a.payment_method}</div>
        </Card>
      ))}

      {detail && (
        <Modal title={`Application — ${detail.application.profile?.full_name||''}`} onClose={()=>setDetail(null)}>
          <div style={{marginBottom:14}}>
            <Badge color={STATUS_COLORS[detail.application.status]}>{detail.application.status.toUpperCase()}</Badge>
            <span style={{marginLeft:8,fontSize:12,color:'#8C7B6E'}}>{detail.application.plan_name} · {detail.application.payment_method}</span>
          </div>
          <div style={{background:'#F7F3EF',borderRadius:10,padding:12,marginBottom:14,fontSize:12}}>
            {Object.entries(detail.application.form_responses||{}).map(([k,v]) => (
              <div key={k} style={{marginBottom:6}}><b>{k}:</b> {String(v).startsWith('http') ? <a href={v} target="_blank" rel="noreferrer">View</a> : String(v)}</div>
            ))}
          </div>
          {detail.application.payment_proof_url && (
            <div style={{marginBottom:14}}>
              <L c="Payment Proof"/>
              <a href={detail.application.payment_proof_url} target="_blank" rel="noreferrer"><img src={detail.application.payment_proof_url} alt="proof" style={{maxWidth:'100%',borderRadius:8,border:'1px solid #F0EAE4'}} loading="lazy" /></a>
            </div>
          )}
          {detail.application.status==='pending' || detail.application.status==='under_review' ? (
            <>
              <L c="Rejection notes (optional, sent to applicant if rejecting)"/>
              <TA value={rejectNotes} onChange={e=>setRejectNotes(e.target.value)} style={{minHeight:60}}/>
              <div style={{display:'flex',gap:10}}>
                <Btn v='green' onClick={()=>approve(detail.application.id)} style={{flex:1,justifyContent:'center'}}>Approve</Btn>
                <Btn v='danger' onClick={()=>reject(detail.application.id)} style={{flex:1,justifyContent:'center'}}>Reject</Btn>
              </div>
            </>
          ) : detail.application.admin_notes && <p style={{fontSize:12,color:'#8C7B6E'}}>Admin notes: {detail.application.admin_notes}</p>}

          <div style={{marginTop:18,paddingTop:14,borderTop:'1px solid #F0EAE4'}}>
            <L c="Manually Change Status"/>
            <select value={manualStatus} onChange={e=>setManualStatus(e.target.value)} style={{width:'100%',padding:'9px 12px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:13,fontFamily:'inherit',marginBottom:10}}>
              {MANUAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <TA value={manualNotes} onChange={e=>setManualNotes(e.target.value)} placeholder="Optional note (kept in admin_notes)" style={{minHeight:50,marginBottom:10}}/>
            <Btn onClick={()=>saveManualStatus(detail.application.id)} disabled={savingStatus || manualStatus===detail.application.status} style={{width:'100%',justifyContent:'center'}}>
              {savingStatus ? 'Saving…' : `Set Status to "${manualStatus}"`}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

function MembershipPaymentsTab() {
  const [list, setList] = useState([])
  const [filter, setFilter] = useState('')

  const load = useCallback(() => { adminListMembershipPayments(filter||undefined).then(({data}) => setList(data||[])) }, [filter])
  useEffect(() => { load() }, [load])

  const verify = async (id) => { const {error} = await adminVerifyMembershipPayment(id); if(error) return toast.error(error.message); toast.success('Verified'); load() }
  const reject = async (id) => { const {error} = await adminRejectMembershipPayment(id); if(error) return toast.error(error.message); toast.success('Rejected'); load() }
  const refund = async (id, method) => {
    if (!window.confirm(method==='razorpay' ? 'Issue a real Razorpay refund for this payment?' : 'Mark this payment as refunded? (no gateway to call for this method — bookkeeping only)')) return
    const { error } = await adminRefundMembershipPayment(id)
    if (error) return toast.error(error.message)
    toast.success('Refunded')
    load()
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <h3 style={{margin:0,fontSize:15,fontWeight:700}}>Payments</h3>
        <select value={filter} onChange={e=>setFilter(e.target.value)} style={{padding:'7px 12px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:12,fontFamily:'inherit'}}>
          {['','pending','verified','rejected','refunded'].map(s => <option key={s} value={s}>{s||'All statuses'}</option>)}
        </select>
      </div>
      {list.length===0 && <Card><p style={{color:'#8C7B6E',fontSize:13,margin:0,textAlign:'center'}}>No payments.</p></Card>}
      {list.map(p => (
        <Card key={p.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
              <span style={{fontWeight:700,fontSize:13}}>{p.profile?.full_name||p.profile?.username}</span>
              <Badge color={STATUS_COLORS[p.status]}>{p.status.toUpperCase()}</Badge>
              <span style={{fontSize:11,color:'#8C7B6E'}}>{p.method}</span>
            </div>
            <div style={{fontSize:12,color:'#5C3D2E'}}>{p.currency} {p.amount} · {p.plan_name}</div>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            {p.proof_url && <a href={p.proof_url} target="_blank" rel="noreferrer" style={{fontSize:11,color:'#FF6B2B',fontWeight:600}}>View Proof</a>}
            {p.status==='pending' && (
              <>
                <Btn v='green' style={{fontSize:11,padding:'5px 12px'}} onClick={()=>verify(p.id)}>Verify</Btn>
                <Btn v='danger' style={{fontSize:11,padding:'5px 12px'}} onClick={()=>reject(p.id)}>Reject</Btn>
              </>
            )}
            {p.status==='verified' && (
              <Btn v='danger' style={{fontSize:11,padding:'5px 12px'}} onClick={()=>refund(p.id,p.method)}>Refund</Btn>
            )}
          </div>
        </Card>
      ))}
    </div>
  )
}

function AccessRuleCard({ rule, onSaved }) {
  const [form, setForm] = useState({ is_active: rule.is_active, free_limit: rule.free_limit, member_limit: rule.member_limit, reset_frequency: rule.reset_frequency })
  const [saving, setSaving] = useState(false)
  const dirty = form.is_active !== rule.is_active || form.free_limit !== rule.free_limit || form.member_limit !== rule.member_limit || form.reset_frequency !== rule.reset_frequency

  const save = async () => {
    setSaving(true)
    const { error } = await adminUpdateAccessRule(rule.id, { ...rule, ...form })
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success(`${rule.label} saved`)
    onSaved()
  }

  return (
    <Card>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,flexWrap:'wrap',gap:8}}>
        <span style={{fontWeight:700,fontSize:13}}>{rule.label}</span>
        <label style={{display:'flex',alignItems:'center',gap:8,fontSize:12,fontWeight:600,cursor:'pointer'}}>
          <input type="checkbox" checked={form.is_active} onChange={e=>setForm(f=>({...f,is_active:e.target.checked}))}/> Enforced
        </label>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:12}}>
        <div>
          <L c="Free Users (no membership)"/>
          <LimitPicker limit={form.free_limit} hidePeriod onChange={({limit})=>setForm(f=>({...f,free_limit:limit}))}/>
        </div>
        <div>
          <L c="Paid Members (default, unless a plan overrides it)"/>
          <LimitPicker limit={form.member_limit} hidePeriod onChange={({limit})=>setForm(f=>({...f,member_limit:limit}))}/>
        </div>
      </div>
      {(limitMode(form.free_limit)==='limited' || limitMode(form.member_limit)==='limited') && (
        <div style={{marginBottom:12}}>
          <L c="Reset Period — applies to any 'Limited to…' choice above"/>
          <select value={form.reset_frequency} onChange={e=>setForm(f=>({...f,reset_frequency:e.target.value}))} style={{width:'100%',padding:'9px 12px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:13,fontFamily:'inherit',background:'white'}}>
            {RESET_FREQS.map(f => <option key={f} value={f}>per {RESET_FREQ_LABELS[f]}</option>)}
          </select>
        </div>
      )}
      <p style={{fontSize:11,color:'#8C7B6E',marginTop:0,marginBottom:12}}>
        Individual membership plans can override the "Paid Members" limit for this feature — see Membership → Plans → Linked Features.
      </p>
      <Btn onClick={save} disabled={saving || !dirty}>{saving ? 'Saving…' : 'Save'}</Btn>
    </Card>
  )
}

function MembershipAccessControlTab() {
  const [list, setList] = useState([])
  const load = useCallback(() => { adminListAccessRules().then(({data}) => setList(data||[])) }, [])
  useEffect(() => { load() }, [load])

  return (
    <div>
      <h3 style={{margin:'0 0 6px',fontSize:15,fontWeight:700}}>Feature Access Control</h3>
      <p style={{fontSize:12,color:'#8C7B6E',marginTop:0,marginBottom:16}}>
        Set what Free Users vs. Paid Members can do with each feature, by default. Choose "Unlimited", "Not available", or "Limited to…" a number per day/week/month/year/lifetime.
      </p>
      {list.map(r => <AccessRuleCard key={r.id} rule={r} onSaved={load}/>)}
    </div>
  )
}

function MembershipSettingsTab() {
  const [settings, setSettings] = useState({})
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const load = useCallback(() => { adminGetMembershipSettings().then(({data}) => setSettings(data||{})) }, [])
  useEffect(() => { load() }, [load])

  const bank = settings['membership.bank_details'] || {}
  const setBank = (k,v) => setSettings(s => ({...s, 'membership.bank_details': {...bank, [k]:v}}))
  const methodsEnabled = settings['membership.payment_methods_enabled'] || ['manual','upi','bank_transfer']
  const toggleMethod = (m) => setSettings(s => ({...s, 'membership.payment_methods_enabled': methodsEnabled.includes(m) ? methodsEnabled.filter(x=>x!==m) : [...methodsEnabled,m]}))

  const save = async () => {
    setSaving(true)
    const { error } = await adminUpdateMembershipSettings(settings)
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success('Settings saved')
  }

  const handleQrUpload = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    const { data, error } = await adminUploadMembershipUpiQr(file)
    setUploading(false)
    if (error) return toast.error(error.message)
    setSettings(s => ({...s, 'membership.upi_qr_url': data}))
    toast.success('UPI QR uploaded')
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <h3 style={{margin:0,fontSize:15,fontWeight:700}}>Membership Settings</h3>
        <Btn onClick={save} disabled={saving}>{saving?'Saving…':'Save Changes'}</Btn>
      </div>

      <Card style={{background: settings['membership.module_enabled']===false ? '#FFF5F5' : '#F0FFF6', border:`1px solid ${settings['membership.module_enabled']===false?'#FECACA':'#BBF7D0'}`}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>Membership Module</div>
            <p style={{fontSize:12,color:'#5C3D2E',margin:0}}>
              Master switch. When off: the Membership nav link and page are hidden from users, free-tier
              feature limits stop being enforced (everyone gets unrestricted access), and existing members
              keep their active membership/card. Admin management here stays available either way.
            </p>
          </div>
          <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,fontWeight:700,cursor:'pointer',flexShrink:0,marginLeft:16}}>
            <input type="checkbox" checked={settings['membership.module_enabled']!==false} onChange={e=>setSettings(s=>({...s,'membership.module_enabled':e.target.checked}))}/>
            {settings['membership.module_enabled']===false ? 'OFF' : 'ON'}
          </label>
        </div>
      </Card>

      <Card>
        <SH c="Payment Methods Enabled"/>
        <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
          {['manual','upi','bank_transfer'].map(m => (
            <label key={m} style={{display:'flex',alignItems:'center',gap:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>
              <input type="checkbox" checked={methodsEnabled.includes(m)} onChange={()=>toggleMethod(m)}/> {m.replace('_',' ')}
            </label>
          ))}
          <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,fontWeight:600,cursor:settings.razorpayEnabled?'pointer':'not-allowed',opacity:settings.razorpayEnabled?1:.45}} title={settings.razorpayEnabled?'':'Set RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET in the backend env to enable this'}>
            <input type="checkbox" checked={methodsEnabled.includes('razorpay')} disabled={!settings.razorpayEnabled} onChange={()=>toggleMethod('razorpay')}/> razorpay (online payment){!settings.razorpayEnabled && ' — not configured'}
          </label>
        </div>
      </Card>

      <Card>
        <SH c="UPI QR Code"/>
        {settings['membership.upi_qr_url'] && <img src={settings['membership.upi_qr_url']} alt="UPI QR" style={{width:160,height:160,objectFit:'contain',border:'1px solid #F0EAE4',borderRadius:10,marginBottom:12,display:'block'}} loading="lazy" />}
        <label style={{padding:'8px 18px',borderRadius:100,fontSize:12,fontWeight:600,cursor:'pointer',background:'#FF6B2B',color:'white',border:'none',display:'inline-block'}}>
          {uploading?'Uploading…':'Upload QR Image'}
          <input type="file" accept="image/*" onChange={handleQrUpload} disabled={uploading} style={{display:'none'}}/>
        </label>
      </Card>

      <Card>
        <SH c="Bank Transfer Details"/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <div><L c="Bank Name"/><Inp value={bank.bank_name||''} onChange={e=>setBank('bank_name',e.target.value)}/></div>
          <div><L c="Account Name"/><Inp value={bank.account_name||''} onChange={e=>setBank('account_name',e.target.value)}/></div>
          <div><L c="Account Number"/><Inp value={bank.account_number||''} onChange={e=>setBank('account_number',e.target.value)}/></div>
          <div><L c="IFSC"/><Inp value={bank.ifsc||''} onChange={e=>setBank('ifsc',e.target.value)}/></div>
          <div><L c="Branch"/><Inp value={bank.branch||''} onChange={e=>setBank('branch',e.target.value)}/></div>
        </div>
      </Card>

      <Card>
        <SH c="Renewal & Grace Period"/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <div><L c="Grace Period (days)"/><Inp type="number" value={settings['membership.grace_period_days']||0} onChange={e=>setSettings(s=>({...s,'membership.grace_period_days':Number(e.target.value)}))}/></div>
          <div><L c="Renewal Reminder (days before expiry)"/><Inp type="number" value={settings['membership.renewal_reminder_days']||7} onChange={e=>setSettings(s=>({...s,'membership.renewal_reminder_days':Number(e.target.value)}))}/></div>
        </div>
      </Card>
    </div>
  )
}

/* ══ MARKETING ═════════════════════════════════════════════════ */
const AD_PLACEMENT_LABELS = { discover: '🌍 Discover Feed', story_detail: '📖 Story Detail', feed: '📰 My Feed', jobs: '💼 Job Feed', leaderboard: '🏆 Leaderboard', community: '🌐 Community', wallet: '🪙 Wallet' }

function AdCampaignsTab() {
  const [list, setList] = useState([])
  const [form, setForm] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [analyticsFor, setAnalyticsFor] = useState(null) // campaign object, or null

  const load = useCallback(() => { adminListAdCampaigns().then(({data}) => setList(data||[])) }, [])
  useEffect(() => { load() }, [load])

  const blankForm = { name:'', advertiser_name:'', ad_type:'image', creative_url:'', click_url:'', placements:['discover','story_detail','feed','jobs','leaderboard','community','wallet'], start_date:'', end_date:'', sort_order:0 }
  const openNew = () => { setEditingId(null); setFile(null); setForm({...blankForm}) }
  const openEdit = (c) => { setEditingId(c.id); setFile(null); setForm({ ...c, placements: c.placements||[] }) }

  const togglePlacement = (key) => setForm(f => ({ ...f, placements: f.placements.includes(key) ? f.placements.filter(p=>p!==key) : [...f.placements, key] }))

  const save = async () => {
    if (!form.name.trim()) return toast.error('Campaign name is required')
    if (!form.click_url.trim()) return toast.error('Click-through URL is required')
    if (!file && !form.creative_url.trim() && !editingId) return toast.error('Upload a creative file or provide a creative URL')
    if (!form.placements.length) return toast.error('Pick at least one placement')
    setSaving(true)
    const { error } = editingId
      ? await adminUpdateAdCampaign(editingId, form, file)
      : await adminCreateAdCampaign(form, file)
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success(editingId ? 'Campaign updated' : 'Campaign created')
    setForm(null); load()
  }
  const setStatus = async (id, status) => { const {error} = await adminSetAdCampaignStatus(id, status); if(error) return toast.error(error.message); toast.success('Updated'); load() }
  const remove = async (id) => { if(!window.confirm('Delete this campaign? This also removes its analytics history.')) return; const {error} = await adminDeleteAdCampaign(id); if(error) return toast.error(error.message); toast.success('Deleted'); load() }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div>
          <h3 style={{margin:0,fontSize:15,fontWeight:700}}>Ad Campaigns</h3>
          <p style={{margin:'4px 0 0',fontSize:12,color:'#8C7B6E'}}>Image or video ads shown inline on Discover and as a banner on Story Detail.</p>
        </div>
        <Btn onClick={openNew}>+ New Campaign</Btn>
      </div>

      {list.length===0 && <Card><p style={{color:'#8C7B6E',fontSize:13,margin:0,textAlign:'center'}}>No ad campaigns yet.</p></Card>}
      {list.map(c => {
        const impressions = Number(c.impressions)||0
        const clicks = Number(c.clicks)||0
        const ctr = impressions ? ((clicks/impressions)*100).toFixed(1) : '0.0'
        return (
          <Card key={c.id}>
            <div style={{display:'flex',gap:14,alignItems:'center',marginBottom:10}}>
              <div style={{width:64,height:48,borderRadius:8,overflow:'hidden',flexShrink:0,background:'#F0EAE4'}}>
                {c.ad_type==='video'
                  ? <video src={c.creative_url} style={{width:'100%',height:'100%',objectFit:'cover'}} muted/>
                  : <img src={c.creative_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} loading="lazy" />}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
                  <span style={{fontWeight:700,fontSize:14}}>{c.name}</span>
                  <Badge color={STATUS_COLORS[c.status]}>{c.status.toUpperCase()}</Badge>
                  <span style={{fontSize:11,padding:'2px 8px',borderRadius:100,background:'rgba(124,58,237,.1)',color:'#7C3AED',fontWeight:600}}>{c.ad_type}</span>
                </div>
                <div style={{fontSize:12,color:'#8C7B6E'}}>
                  {c.advertiser_name ? `${c.advertiser_name} · ` : ''}
                  {(c.placements||[]).map(p=>AD_PLACEMENT_LABELS[p]||p).join(', ')}
                </div>
              </div>
              <div style={{display:'flex',gap:14,fontSize:12,color:'#4A2800',flexShrink:0}}>
                <div style={{textAlign:'center'}}><div style={{fontWeight:700,fontSize:15}}>{impressions.toLocaleString()}</div><div style={{color:'#8C7B6E'}}>Views</div></div>
                <div style={{textAlign:'center'}}><div style={{fontWeight:700,fontSize:15}}>{clicks.toLocaleString()}</div><div style={{color:'#8C7B6E'}}>Clicks</div></div>
                <div style={{textAlign:'center'}}><div style={{fontWeight:700,fontSize:15}}>{ctr}%</div><div style={{color:'#8C7B6E'}}>CTR</div></div>
              </div>
            </div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              <Btn v='secondary' style={{fontSize:11,padding:'5px 12px'}} onClick={()=>openEdit(c)}>Edit</Btn>
              <Btn v='secondary' style={{fontSize:11,padding:'5px 12px'}} onClick={()=>setAnalyticsFor(c)}>Analytics</Btn>
              {c.status==='active'
                ? <Btn v='secondary' style={{fontSize:11,padding:'5px 12px'}} onClick={()=>setStatus(c.id,'paused')}>Pause</Btn>
                : <Btn v='green' style={{fontSize:11,padding:'5px 12px'}} onClick={()=>setStatus(c.id,'active')}>Activate</Btn>}
              {c.status!=='archived' && <Btn v='secondary' style={{fontSize:11,padding:'5px 12px'}} onClick={()=>setStatus(c.id,'archived')}>Archive</Btn>}
              <Btn v='danger' style={{fontSize:11,padding:'5px 12px'}} onClick={()=>remove(c.id)}>Delete</Btn>
            </div>
          </Card>
        )
      })}

      {form && (
        <Modal title={editingId?'Edit Campaign':'New Campaign'} onClose={()=>setForm(null)}>
          <L c="Campaign Name"/>
          <Inp value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Acme Q3 Launch"/>
          <L c="Advertiser Name"/>
          <Inp value={form.advertiser_name||''} onChange={e=>setForm(f=>({...f,advertiser_name:e.target.value}))} placeholder="e.g. Acme Inc."/>
          <L c="Ad Type"/>
          <select value={form.ad_type} onChange={e=>setForm(f=>({...f,ad_type:e.target.value}))} style={{width:'100%',padding:'9px 12px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:13,fontFamily:'inherit',marginBottom:12,background:'white'}}>
            <option value="image">Image</option>
            <option value="video">Video</option>
          </select>
          <L c={`Creative ${form.ad_type==='video'?'(video file, up to 50MB)':'(image file)'}`}/>
          <input type="file" accept={form.ad_type==='video'?'video/*':'image/*'} onChange={e=>setFile(e.target.files[0]||null)} style={{marginBottom:8,fontSize:13}}/>
          {editingId && form.creative_url && !file && (
            <div style={{fontSize:11,color:'#8C7B6E',marginBottom:8}}>Current creative is already uploaded — choose a file above only to replace it.</div>
          )}
          <L c="...or paste an already-hosted creative URL"/>
          <Inp value={form.creative_url||''} onChange={e=>setForm(f=>({...f,creative_url:e.target.value}))} placeholder="https://cdn.example.com/ad.mp4"/>
          <L c="Click-Through URL"/>
          <Inp value={form.click_url} onChange={e=>setForm(f=>({...f,click_url:e.target.value}))} placeholder="https://advertiser.com/landing-page"/>

          <L c="Placements"/>
          <div style={{display:'flex',gap:14,flexWrap:'wrap',marginBottom:12}}>
            {Object.entries(AD_PLACEMENT_LABELS).map(([key,label]) => (
              <label key={key} style={{display:'flex',alignItems:'center',gap:6,fontSize:13,fontWeight:600,cursor:'pointer'}}>
                <input type="checkbox" checked={form.placements.includes(key)} onChange={()=>togglePlacement(key)}/>{label}
              </label>
            ))}
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div><L c="Start Date (optional)"/><Inp type="date" value={form.start_date||''} onChange={e=>setForm(f=>({...f,start_date:e.target.value}))}/></div>
            <div><L c="End Date (optional)"/><Inp type="date" value={form.end_date||''} onChange={e=>setForm(f=>({...f,end_date:e.target.value}))}/></div>
          </div>
          <L c="Sort Order (lower shows first when multiple ads are active)"/>
          <Inp type="number" value={form.sort_order||0} onChange={e=>setForm(f=>({...f,sort_order:Number(e.target.value)}))}/>

          <Btn onClick={save} disabled={saving} style={{width:'100%',padding:'11px',marginTop:6}}>{saving?'Saving…':editingId?'Save Changes':'Create Campaign'}</Btn>
        </Modal>
      )}

      {analyticsFor && <AdAnalyticsModal campaign={analyticsFor} onClose={()=>setAnalyticsFor(null)}/>}
    </div>
  )
}

function AdAnalyticsModal({ campaign, onClose }) {
  const [data, setData] = useState(null)
  useEffect(() => { adminGetAdAnalytics(campaign.id).then(({data}) => setData(data)) }, [campaign.id])

  return (
    <Modal title={`Analytics — ${campaign.name}`} onClose={onClose}>
      {!data ? <p style={{fontSize:13,color:'#8C7B6E'}}>Loading…</p> : (
        Object.entries(AD_PLACEMENT_LABELS).map(([key,label]) => {
          const stats = data[key] || { impressions:0, clicks:0 }
          const ctr = stats.impressions ? ((stats.clicks/stats.impressions)*100).toFixed(1) : '0.0'
          return (
            <div key={key} style={{marginBottom:16,paddingBottom:16,borderBottom:'1px solid #F0EAE4'}}>
              <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>{label}</div>
              <div style={{display:'flex',gap:24}}>
                <div><div style={{fontWeight:700,fontSize:18}}>{stats.impressions.toLocaleString()}</div><div style={{fontSize:11,color:'#8C7B6E'}}>Views</div></div>
                <div><div style={{fontWeight:700,fontSize:18}}>{stats.clicks.toLocaleString()}</div><div style={{fontSize:11,color:'#8C7B6E'}}>Clicks</div></div>
                <div><div style={{fontWeight:700,fontSize:18}}>{ctr}%</div><div style={{fontSize:11,color:'#8C7B6E'}}>CTR</div></div>
              </div>
            </div>
          )
        })
      )}
    </Modal>
  )
}

function AdModuleToggleCard({ initial, onSaved }) {
  const [enabled, setEnabled] = useState(initial !== false)
  const [saving, setSaving] = useState(false)
  const dirty = enabled !== (initial !== false)

  const save = async () => {
    setSaving(true)
    const { error } = await adminUpdateMarketingSettings({ 'marketing.module_enabled': enabled })
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success(`Module turned ${enabled ? 'ON' : 'OFF'}`)
    onSaved()
  }

  return (
    <Card style={{background: !enabled ? '#FFF5F5' : '#F0FFF6', border:`1px solid ${!enabled?'#FECACA':'#BBF7D0'}`}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <div>
          <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>Marketing / Ads Module</div>
          <p style={{fontSize:12,color:'#5C3D2E',margin:0}}>
            Master switch. When off, no ads render anywhere across the app — Discover, Story Detail, My Feed, Jobs, Leaderboard, Community, Wallet.
          </p>
        </div>
        <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,fontWeight:700,cursor:'pointer',flexShrink:0,marginLeft:16}}>
          <input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/>
          {enabled ? 'ON' : 'OFF'}
        </label>
      </div>
      <Btn onClick={save} disabled={saving || !dirty}>{saving ? 'Saving…' : 'Save'}</Btn>
    </Card>
  )
}

const AD_AUDIENCE_LABELS = { member: 'Paid Members', free: 'Non-Paid (Free) Users', contributor: 'Contributors', custom: 'Custom Users (hand-picked)' }

function AdAudienceCard({ initial, initialCustomIds, onSaved }) {
  const initialAudiences = Array.isArray(initial) ? initial : []
  const initialCustom = Array.isArray(initialCustomIds) ? initialCustomIds : []
  const initialIsEveryone = initialAudiences.length === 0 || initialAudiences.includes('everyone')
  // `mode` is a UI-only toggle, separate from `audiences` — otherwise an
  // empty audiences array (the state right after switching to "Restricted"
  // but before checking any box) reads as "no restriction" again, and the
  // checkboxes — which are disabled while in "Everyone" mode — could never
  // be reached to actually pick an audience.
  const [mode, setMode] = useState(initialIsEveryone ? 'everyone' : 'restricted')
  const [audiences, setAudiences] = useState(initialAudiences.filter(a => a !== 'everyone'))
  const [customIds, setCustomIds] = useState(initialCustom)
  const [saving, setSaving] = useState(false)
  const isEveryone = mode === 'everyone'
  const dirty = mode !== (initialIsEveryone ? 'everyone' : 'restricted')
    || JSON.stringify([...audiences].sort()) !== JSON.stringify([...initialAudiences].filter(a=>a!=='everyone').sort())
    || JSON.stringify([...customIds].sort()) !== JSON.stringify([...initialCustom].sort())

  const toggle = (key) => {
    setAudiences(audiences.includes(key) ? audiences.filter(a => a !== key) : [...audiences, key])
  }

  const save = async () => {
    if (!isEveryone && audiences.length === 0) return toast.error('Check at least one audience, or choose "Everyone"')
    setSaving(true)
    const { error } = await adminUpdateMarketingSettings({
      'marketing.allowed_audiences': isEveryone ? ['everyone'] : audiences,
      'marketing.custom_user_ids': customIds,
    })
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success(isEveryone ? 'Ads now shown to everyone' : `Ads restricted to: ${audiences.map(a=>AD_AUDIENCE_LABELS[a]||a).join(', ')}`)
    onSaved()
  }

  return (
    <Card>
      <SH c="Show Ads To"/>
      <p style={{fontSize:12,color:'#8C7B6E',marginTop:0,marginBottom:14}}>
        Choose "Everyone" for no restriction, or check specific audiences below — ads are hidden from
        anyone outside the checked groups. Click Save below to apply.
      </p>
      <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:14}}>
        <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>
          <input type="radio" checked={isEveryone} onChange={()=>setMode('everyone')}/> Everyone (no restriction)
        </label>
        <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>
          <input type="radio" checked={!isEveryone} onChange={()=>setMode('restricted')}/> Restricted to specific audiences
        </label>
        {Object.keys(AD_AUDIENCE_LABELS).map(key => (
          <div key={key}>
            <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,fontWeight:600,cursor:'pointer',marginLeft:20}}>
              <input type="checkbox" disabled={isEveryone} checked={!isEveryone && audiences.includes(key)} onChange={()=>toggle(key)}/>
              {AD_AUDIENCE_LABELS[key]}
            </label>
            {key==='custom' && !isEveryone && audiences.includes('custom') && (
              <CustomUserPicker selectedIds={customIds} onChange={setCustomIds}/>
            )}
          </div>
        ))}
      </div>
      <Btn onClick={save} disabled={saving || !dirty}>{saving ? 'Saving…' : 'Save'}</Btn>
    </Card>
  )
}

function MarketingSettingsTab() {
  const [settings, setSettings] = useState(null)
  const load = useCallback(() => { adminGetMarketingSettings().then(({data}) => setSettings(data||{})) }, [])
  useEffect(() => { load() }, [load])

  if (!settings) return <Card><p style={{color:'#8C7B6E',fontSize:13,margin:0}}>Loading…</p></Card>

  return (
    <div>
      <h3 style={{margin:'0 0 16px',fontSize:15,fontWeight:700}}>Marketing Settings</h3>
      <AdModuleToggleCard key={`module-${settings['marketing.module_enabled']}`} initial={settings['marketing.module_enabled']} onSaved={load}/>
      <AdAudienceCard
        key={`audience-${JSON.stringify(settings['marketing.allowed_audiences'])}-${JSON.stringify(settings['marketing.custom_user_ids'])}`}
        initial={settings['marketing.allowed_audiences']} initialCustomIds={settings['marketing.custom_user_ids']} onSaved={load}
      />
    </div>
  )
}

const MARKETING_SUB_TABS = [['campaigns','Campaigns'],['settings','Settings']]

function MarketingTab() {
  const [sub, setSub] = useState('campaigns')
  return (
    <div>
      <div style={{display:'flex',gap:8,marginBottom:18,flexWrap:'wrap'}}>
        {MARKETING_SUB_TABS.map(([k,l]) => (
          <button key={k} onClick={()=>setSub(k)} style={{padding:'6px 14px',borderRadius:100,border:`1.5px solid ${sub===k?'#FF6B2B':'#DDD3CA'}`,background:sub===k?'#FF6B2B':'white',color:sub===k?'white':'#5C3D2E',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{l}</button>
        ))}
      </div>
      {sub==='campaigns' && <AdCampaignsTab/>}
      {sub==='settings'  && <MarketingSettingsTab/>}
    </div>
  )
}

/* ══ SEO ════════════════════════════════════════════════════════ */
function SeoTab() {
  const [settings, setSettings] = useState({})
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const load = useCallback(() => { adminGetSeoSettings().then(({data}) => setSettings(data||{})) }, [])
  useEffect(() => { load() }, [load])

  const save = async () => {
    setSaving(true)
    const { error } = await adminUpdateSeoSettings(settings)
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success('SEO settings saved')
  }

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return toast.error('Please choose an image file')
    if (file.size > 5 * 1024 * 1024) return toast.error('Image must be under 5MB')
    setUploading(true)
    const { data, error } = await adminUploadSeoOgImage(file)
    setUploading(false)
    if (error) return toast.error(error.message)
    setSettings(s => ({ ...s, 'seo.default_og_image': data }))
    toast.success('OG image uploaded! ✓')
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <h3 style={{margin:0,fontSize:15,fontWeight:700}}>SEO Settings</h3>
        <Btn onClick={save} disabled={saving}>{saving?'Saving…':'Save Changes'}</Btn>
      </div>

      <Card>
        <SH c="Default Meta Tags"/>
        <p style={{fontSize:12,color:'#8C7B6E',marginTop:0,marginBottom:14}}>
          Used on the homepage and as a fallback wherever a more specific title/description isn't set (e.g. a story with no cover image falls back to this OG image).
        </p>
        <L c="Default Title"/>
        <Inp value={settings['seo.default_title']||''} onChange={e=>setSettings(s=>({...s,'seo.default_title':e.target.value}))} placeholder="Day1 Diaries — Share Your First Day Story"/>
        <L c="Default Meta Description"/>
        <TA value={settings['seo.default_description']||''} onChange={e=>setSettings(s=>({...s,'seo.default_description':e.target.value}))} placeholder="Day1 Diaries — Share your first day at work story..."/>
        <L c="Google Site Verification"/>
        <Inp value={settings['seo.google_site_verification']||''} onChange={e=>setSettings(s=>({...s,'seo.google_site_verification':e.target.value}))} placeholder="Paste just the content value from Google's verification meta tag"/>
      </Card>

      <Card>
        <SH c="Default OG Image"/>
        <p style={{fontSize:12,color:'#8C7B6E',marginTop:0,marginBottom:14}}>Shown when a story/page has no cover image of its own. Recommended: 1200×630.</p>
        {settings['seo.default_og_image'] && <img src={settings['seo.default_og_image']} alt="Default OG" style={{width:'100%',maxWidth:320,borderRadius:10,border:'1px solid #F0EAE4',marginBottom:12,display:'block'}} loading="lazy" />}
        <label style={{padding:'8px 18px',borderRadius:100,fontSize:12,fontWeight:600,cursor:'pointer',background:'#FF6B2B',color:'white',border:'none',display:'inline-block'}}>
          {uploading?'Uploading…':'Upload Image'}
          <input type="file" accept="image/*" onChange={handleImageSelect} disabled={uploading} style={{display:'none'}}/>
        </label>
      </Card>

      <Card>
        <SH c="Sitemap & Robots"/>
        <p style={{fontSize:12,color:'#8C7B6E',marginTop:0,marginBottom:10}}>
          The sitemap is generated live from published stories/posts/jobs — nothing to configure here.
        </p>
        <div style={{fontSize:13,marginBottom:6}}><a href="https://api.day1diaries.com/sitemap.xml" target="_blank" rel="noreferrer">https://api.day1diaries.com/sitemap.xml</a></div>
        <div style={{fontSize:13,marginBottom:10}}><a href="https://www.day1diaries.com/robots.txt" target="_blank" rel="noreferrer">https://www.day1diaries.com/robots.txt</a></div>
        <p style={{fontSize:12,color:'#8C7B6E',margin:0}}>
          To submit the sitemap in Google Search Console: verify <b>day1diaries.com</b> using <b>domain-level verification</b> (DNS TXT record), not a single-subdomain property — domain verification covers <code>api.day1diaries.com</code> too, so the sitemap there is accepted.
        </p>
      </Card>
    </div>
  )
}

/* ══ ROLES & PERMISSIONS (true admin only) ══════════════════════ */
function RolesPermissionsTab() {
  const [data, setData] = useState(null) // { roles, permissions, grants }
  const [drafts, setDrafts] = useState({}) // role -> string[] (working copy per role)
  const [savingRole, setSavingRole] = useState(null)

  const load = useCallback(() => {
    adminGetRbacMatrix().then(({data, error}) => {
      if (error) return toast.error(error.message)
      setData(data)
      setDrafts(data.grants)
    })
  }, [])
  useEffect(() => { load() }, [load])

  if (!data) return <Card><p style={{color:'#8C7B6E',fontSize:13,margin:0}}>Loading…</p></Card>

  const adminRole = data.roles.find(r => r.key === 'admin')
  const editableRoles = data.roles.filter(r => r.key !== 'admin')
  const categories = [...new Set(data.permissions.map(p => p.category))]
  const allKeys = data.permissions.map(p => p.key)

  const toggle = (role, key) => setDrafts(d => {
    const current = d[role] || []
    return { ...d, [role]: current.includes(key) ? current.filter(k=>k!==key) : [...current, key] }
  })
  const selectAll = (role) => setDrafts(d => ({ ...d, [role]: [...allKeys] }))
  const clearAll = (role) => setDrafts(d => ({ ...d, [role]: [] }))
  const isDirty = (role) => JSON.stringify([...(drafts[role]||[])].sort()) !== JSON.stringify([...(data.grants[role]||[])].sort())

  const save = async (role) => {
    setSavingRole(role)
    const { error } = await adminSetRolePermissions(role, drafts[role]||[])
    setSavingRole(null)
    if (error) return toast.error(error.message)
    toast.success(`${data.roles.find(r=>r.key===role)?.label || role} permissions saved`)
    load()
  }

  return (
    <div>
      <h3 style={{margin:'0 0 6px',fontSize:15,fontWeight:700}}>Roles &amp; Permissions</h3>
      <p style={{fontSize:12,color:'#8C7B6E',marginTop:0,marginBottom:18}}>
        Tick which permissions each role has, or use Select All / Clear All to move faster. "Admin" is a superuser — it always has every permission shown below, read-only, and can't be restricted.
      </p>

      {adminRole && (
        <Card style={{background:'#FFF9F0',border:'1px solid #FFE3B0'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14,gap:12,flexWrap:'wrap'}}>
            <div>
              <div style={{fontWeight:700,fontSize:14}}>👑 {adminRole.label} <span style={{fontSize:11,fontWeight:700,color:'#B45309',background:'rgba(180,83,9,.1)',padding:'2px 8px',borderRadius:100,marginLeft:6}}>SUPERUSER</span></div>
              <div style={{fontSize:12,color:'#8C7B6E',marginTop:2}}>{adminRole.description}</div>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:'4px 20px',opacity:.75}}>
            {categories.map(cat => (
              <div key={cat} style={{marginBottom:10}}>
                <div style={{fontSize:11,fontWeight:700,letterSpacing:'.04em',textTransform:'uppercase',color:'#B45309',marginBottom:6}}>{cat}</div>
                {data.permissions.filter(p=>p.category===cat).map(p => (
                  <label key={p.key} style={{display:'flex',alignItems:'center',gap:8,fontSize:12.5,fontWeight:500,cursor:'default',padding:'3px 0'}}>
                    <input type="checkbox" checked disabled/>
                    {p.label}
                  </label>
                ))}
              </div>
            ))}
          </div>
        </Card>
      )}

      {editableRoles.map(role => (
        <Card key={role.key}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14,gap:12,flexWrap:'wrap'}}>
            <div>
              <div style={{fontWeight:700,fontSize:14}}>{role.label}</div>
              <div style={{fontSize:12,color:'#8C7B6E',marginTop:2}}>{role.description}</div>
            </div>
            <div style={{display:'flex',gap:6,flexShrink:0,flexWrap:'wrap'}}>
              <Btn v='secondary' onClick={()=>selectAll(role.key)} style={{fontSize:11,padding:'6px 12px'}}>Select All</Btn>
              <Btn v='secondary' onClick={()=>clearAll(role.key)} style={{fontSize:11,padding:'6px 12px'}}>Clear All</Btn>
              <Btn onClick={()=>save(role.key)} disabled={savingRole===role.key || !isDirty(role.key)}>
                {savingRole===role.key ? 'Saving…' : 'Save'}
              </Btn>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:'4px 20px'}}>
            {categories.map(cat => (
              <div key={cat} style={{marginBottom:10}}>
                <div style={{fontSize:11,fontWeight:700,letterSpacing:'.04em',textTransform:'uppercase',color:'#FF6B2B',marginBottom:6}}>{cat}</div>
                {data.permissions.filter(p=>p.category===cat).map(p => (
                  <label key={p.key} style={{display:'flex',alignItems:'center',gap:8,fontSize:12.5,fontWeight:500,cursor:'pointer',padding:'3px 0'}}>
                    <input type="checkbox" checked={(drafts[role.key]||[]).includes(p.key)} onChange={()=>toggle(role.key, p.key)}/>
                    {p.label}
                  </label>
                ))}
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}
