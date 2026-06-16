import React, { useState, useEffect, useCallback } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  getAdminStats, adminGetUsers, adminFlaggedStories, adminModerateStory,
  adminGetHabits, adminUpsertHabit, adminDeleteHabit,
  getChallenges, adminUpsertChallenge, adminDeleteChallenge,
  getCommunityUpdates, adminUpsertCommunityUpdate, adminDeleteCommunityUpdate,
  getHabits, adminGetSettings, adminUpdateSettings,
  adminGetAboutSections, adminUpsertAboutSection, adminDeleteAboutSection,
  adminGetBlogPosts, adminUpsertBlogPost, adminDeleteBlogPost,
  adminGetCareersJobs, adminUpsertCareersJob, adminDeleteCareersJob,
  adminGetAllApplications, adminGetCareersStats, adminUpdateApplicationStatus,
  adminGetContactMessages, adminUpdateContactStatus,
  adminGetCategories, adminUpsertCategory, adminDeleteCategory
} from '../lib/api'
import AdminLandingContent from './AdminLandingContent'
import { toast } from '../components/Toast'

const L = ({c}) => <label style={{display:'block',fontSize:12,fontWeight:600,color:'#5C3D2E',marginBottom:5}}>{c}</label>
const Inp = (p) => <input {...p} style={{width:'100%',padding:'9px 12px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',marginBottom:12,...p.style}} onFocus={e=>e.target.style.borderColor='#FF6B2B'} onBlur={e=>e.target.style.borderColor='#DDD3CA'}/>
const TA  = (p) => <textarea {...p} style={{width:'100%',padding:'9px 12px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',resize:'vertical',minHeight:72,marginBottom:12,...p.style}} onFocus={e=>e.target.style.borderColor='#FF6B2B'} onBlur={e=>e.target.style.borderColor='#DDD3CA'}/>
const Btn = ({children,v='primary',...p}) => {
  const m={primary:{bg:'#FF6B2B',co:'white',bd:'#FF6B2B'},secondary:{bg:'transparent',co:'#FF6B2B',bd:'#FF6B2B'},danger:{bg:'transparent',co:'#DC2626',bd:'#DC2626'},green:{bg:'#059669',co:'white',bd:'#059669'}}[v]
  return <button {...p} style={{padding:'8px 18px',borderRadius:100,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',transition:'all .2s',background:m.bg,color:m.co,border:`1.5px solid ${m.bd}`,...p.style}}>{children}</button>
}
const Card = ({children,style}) => <div style={{background:'white',border:'1px solid #F0EAE4',borderRadius:16,padding:20,marginBottom:16,...style}}>{children}</div>
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

const TABS = [
  ['overview','📊 Overview'],
  ['habits','💪 Habits'],
  ['challenges','🏆 Challenges'],
  ['events','📅 Events'],
  ['users','👥 Users'],
  ['content','🛡️ Moderation'],
  ['landing','🎯 Landing'],
  ['sitepages','🌐 Site Pages'],
  ['categories','📂 Categories'],
  ['settings','⚙️ Settings'],
]

export default function AdminDashboard() {
  const [tab, setTab] = useState('overview')
  return (
    <div style={{padding:'24px 32px',maxWidth:1100}}>
      <div style={{display:'flex',gap:0,borderBottom:'2px solid #F0EAE4',marginBottom:24,flexWrap:'wrap'}}>
        {TABS.map(([k,l]) => (
          <button key={k} onClick={()=>setTab(k)} style={{padding:'8px 14px',background:'none',border:'none',cursor:'pointer',fontSize:12,fontWeight:600,fontFamily:'inherit',color:tab===k?'#FF6B2B':'#8C7B6E',borderBottom:tab===k?'2px solid #FF6B2B':'2px solid transparent',marginBottom:'-2px',whiteSpace:'nowrap'}}>{l}</button>
        ))}
      </div>
      {tab==='overview'   && <OverviewTab/>}
      {tab==='habits'     && <HabitsTab/>}
      {tab==='challenges' && <ChallengesTab/>}
      {tab==='events'     && <EventsTab/>}
      {tab==='users'      && <UsersTab/>}
      {tab==='content'    && <ModerationTab/>}
      {tab==='landing'    && <AdminLandingContent/>}
      {tab==='sitepages'  && <SitePagesTab/>}
      {tab==='categories' && <CategoriesTab/>}
      {tab==='settings'   && <SettingsTab/>}
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
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:24}}>
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
  const [users,setUsers]=useState([])
  const [search,setSearch]=useState('')
  const [loading,setLoading]=useState(true)
  useEffect(()=>{adminGetUsers().then(({data})=>{setUsers(data||[]);setLoading(false)})},[])
  const COLORS=['#FF6B2B','#7C3AED','#059669','#2563EB','#EC4899']
  const getColor=n=>COLORS[(n||'').charCodeAt(0)%COLORS.length]
  const getInit=n=>(n||'?').split(' ').map(x=>x[0]).join('').toUpperCase().slice(0,2)
  const filtered=users.filter(u=>(u.full_name||u.username||'').toLowerCase().includes(search.toLowerCase()))
  return (
    <div>
      <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:16}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search users..." style={{flex:1,padding:'9px 14px',border:'1.5px solid #DDD3CA',borderRadius:100,fontSize:13,fontFamily:'inherit',outline:'none'}}/>
        <div style={{fontSize:13,color:'#8C7B6E'}}>{filtered.length} users</div>
      </div>
      {loading&&<div style={{textAlign:'center',padding:40,color:'#8C7B6E'}}>Loading...</div>}
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {filtered.map(u=>(
          <div key={u.id} style={{background:'white',border:'1px solid #F0EAE4',borderRadius:12,padding:'12px 16px',display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:36,height:36,borderRadius:'50%',background:getColor(u.full_name||u.username),color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,flexShrink:0}}>
              {u.avatar_url?<img src={u.avatar_url} alt="" style={{width:'100%',height:'100%',borderRadius:'50%',objectFit:'cover'}}/>:getInit(u.full_name||u.username||'?')}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                {u.full_name||u.username}
                {u.role==='admin'&&<span style={{fontSize:9,padding:'1px 7px',borderRadius:100,background:'rgba(124,58,237,.1)',color:'#7C3AED',fontWeight:700}}>ADMIN</span>}
                {u.role==='contributor'&&<span style={{fontSize:9,padding:'1px 7px',borderRadius:100,background:'rgba(5,150,105,.1)',color:'#059669',fontWeight:700}}>CONTRIBUTOR</span>}
              </div>
              <div style={{fontSize:11,color:'#8C7B6E'}}>@{u.username} · {u.location||'—'} · {u.stories_count||0} stories · {(u.score||0).toLocaleString()} pts</div>
            </div>
            <span style={{fontSize:11,padding:'2px 9px',borderRadius:100,background:'#F5EDE4',color:'#8C7B6E',flexShrink:0}}>{u.level}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ══ MODERATION ════════════════════════════════════════════════ */
function ModerationTab() {
  const [flagged,setFlagged]=useState([])
  const [loading,setLoading]=useState(true)
  useEffect(()=>{adminFlaggedStories().then(({data})=>{setFlagged(data||[]);setLoading(false)})},[])
  const handle=async(id,status)=>{await adminModerateStory(id,status);setFlagged(f=>f.filter(s=>s.id!==id));toast.success(status==='published'?'Approved':'Removed')}
  return (
    <div>
      <div style={{fontSize:15,fontWeight:700,marginBottom:16}}>Flagged Content ({flagged.length})</div>
      {loading&&<div style={{textAlign:'center',padding:40,color:'#8C7B6E'}}>Loading...</div>}
      {flagged.length===0&&!loading&&<div style={{textAlign:'center',padding:'60px 20px',color:'#8C7B6E'}}><div style={{fontSize:32,marginBottom:8}}>✅</div><div style={{fontWeight:600}}>All clear — no flagged content</div></div>}
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {flagged.map(s=>(
          <Card key={s.id}>
            <div style={{fontWeight:600,marginBottom:4}}>{s.title}</div>
            <div style={{fontSize:12,color:'#8C7B6E',marginBottom:10}}>by {s.profiles?.username} · {s.category}</div>
            <div style={{fontSize:13,color:'#4A2800',marginBottom:12,lineHeight:1.6}}>{s.content?.slice(0,200)}...</div>
            <div style={{display:'flex',gap:8}}>
              <Btn v="green" onClick={()=>handle(s.id,'published')} style={{fontSize:12}}>✓ Approve</Btn>
              <Btn v="danger" onClick={()=>handle(s.id,'removed')} style={{fontSize:12}}>Remove</Btn>
            </div>
          </Card>
        ))}
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
