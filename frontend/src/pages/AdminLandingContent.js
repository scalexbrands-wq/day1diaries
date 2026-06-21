import React, { useState, useEffect } from 'react'
import {
  adminGetLandingHero, adminUpsertLandingHero, adminAddHeroImage, adminRemoveHeroImage,
  adminGetLandingBottomSection, adminUpsertLandingBottomSection, adminAddBottomSectionImage, adminRemoveBottomSectionImage,
  adminGetCategories, adminUpsertCategory, adminDeleteCategory,
  adminGetTestimonials, adminUpsertTestimonial, adminDeleteTestimonial,
  adminGetFeaturedStories, adminToggleFeatureStory,
  getLandingTemplate, adminSetLandingTemplate,
} from '../lib/api'
import { toast } from '../components/Toast'

/* ── tiny shared UI ── */
const Label = ({children}) => <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#5C3D2E', marginBottom:5 }}>{children}</label>
const Input = ({...p}) => <input {...p} style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #DDD3CA', borderRadius:8, fontSize:13, fontFamily:"'DM Sans',sans-serif", outline:'none', marginBottom:12, ...p.style }} onFocus={e=>e.target.style.borderColor='#FF6B2B'} onBlur={e=>e.target.style.borderColor='#DDD3CA'}/>
const TextArea = ({...p}) => <textarea {...p} style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #DDD3CA', borderRadius:8, fontSize:13, fontFamily:"'DM Sans',sans-serif", outline:'none', resize:'vertical', minHeight:72, marginBottom:12, ...p.style }} onFocus={e=>e.target.style.borderColor='#FF6B2B'} onBlur={e=>e.target.style.borderColor='#DDD3CA'}/>
const Btn = ({children, variant='primary', ...p}) => {
  const styles = {
    primary: { background:'#FF6B2B', color:'white', border:'none' },
    secondary: { background:'transparent', color:'#FF6B2B', border:'1.5px solid #FF6B2B' },
    danger: { background:'transparent', color:'#DC2626', border:'1.5px solid #DC2626' },
  }
  return <button {...p} style={{ padding:'8px 18px', borderRadius:100, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", transition:'all .2s', ...styles[variant], ...p.style }}>{children}</button>
}
const Card = ({children, ...p}) => <div style={{ background:'white', border:'1px solid #F0EAE4', borderRadius:16, padding:20, marginBottom:16, ...p.style }}>{children}</div>
const SectionHead = ({children}) => <div style={{ fontSize:14, fontWeight:700, color:'#1A0800', marginBottom:14, paddingBottom:10, borderBottom:'1px solid #F0EAE4' }}>{children}</div>

const GRADIENT_OPTIONS = [
  'linear-gradient(135deg,#FF6B2B,#FFD166)',
  'linear-gradient(135deg,#7C3AED,#A78BFA)',
  'linear-gradient(135deg,#059669,#34D399)',
  'linear-gradient(135deg,#2563EB,#60A5FA)',
  'linear-gradient(135deg,#EC4899,#F9A8D4)',
  'linear-gradient(135deg,#0EA5E9,#38BDF8)',
  'linear-gradient(135deg,#F59E0B,#FCD34D)',
  'linear-gradient(135deg,#DC2626,#FCA5A5)',
]

export default function AdminLandingContent() {
  const [tab, setTab] = useState('hero')

  return (
    <div style={{ padding:'24px 32px', maxWidth:960 }}>
      <div style={{ display:'flex', gap:0, borderBottom:'2px solid #F0EAE4', marginBottom:24 }}>
        {[['template','🎨 Template'],['hero','🎯 Hero'],['bottom','🏁 Bottom Section'],['categories','📂 Categories'],['testimonials','💬 Testimonials'],['stories','⭐ Featured Stories']].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{ padding:'8px 20px', background:'none', border:'none', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:"'DM Sans',sans-serif", color: tab===k?'#FF6B2B':'#8C7B6E', borderBottom: tab===k?'2px solid #FF6B2B':'2px solid transparent', marginBottom:'-2px', transition:'all .15s' }}>{l}</button>
        ))}
      </div>
      {tab === 'template'     && <TemplateEditor/>}
      {tab === 'hero'         && <HeroEditor/>}
      {tab === 'bottom'       && <BottomSectionEditor/>}
      {tab === 'categories'   && <CategoriesEditor/>}
      {tab === 'testimonials' && <TestimonialsEditor/>}
      {tab === 'stories'      && <FeaturedStoriesEditor/>}
    </div>
  )
}

/* ── TEMPLATE EDITOR ─────────────────────────────────────── */
const TEMPLATE_OPTIONS = [
  { key:'classic',   label:'Classic',          desc:'The original design — animated AI section, neon dark sections, bold proof stats.' },
  { key:'editorial', label:'Editorial',        desc:'Magazine-style minimalism — single-column reading flow, serif type, restrained color.' },
  { key:'bento',     label:'Bento / Vibrant',  desc:'Bold bento-grid layout — saturated gradients, glassmorphism cards, playful and maximalist.' },
  { key:'kinetic',   label:'Kinetic',          desc:'Motion-first design — custom cursor, parallax hero, magnetic buttons, tilt cards, sticky scroll-storytelling, scroll-snap carousels.' },
]
function TemplateEditor() {
  const [active, setActive] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getLandingTemplate().then(({ data }) => { setActive(data || 'classic'); setLoading(false) })
  }, [])

  const select = async (key) => {
    if (key === active) return
    setSaving(true)
    const { data, error } = await adminSetLandingTemplate(key)
    setSaving(false)
    if (error) { toast.error(error.message); return }
    setActive(data)
    toast.success('Landing page template updated — live now on "/"')
  }

  if (loading) return <Card>Loading…</Card>

  return (
    <Card>
      <SectionHead>Landing Page Design</SectionHead>
      <p style={{ fontSize:12.5, color:'#8C7B6E', marginBottom:18 }}>Pick which design shows on the public homepage. All three pull the same hero/categories/testimonials/jobs content you manage in the other tabs — only the layout and visual style changes.</p>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:14 }}>
        {TEMPLATE_OPTIONS.map(opt => (
          <div key={opt.key} onClick={() => !saving && select(opt.key)}
            style={{ border:`2px solid ${active===opt.key?'#FF6B2B':'#F0EAE4'}`, borderRadius:14, padding:16, cursor: saving?'wait':'pointer', background: active===opt.key?'rgba(255,107,43,.05)':'white', transition:'all .15s' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ fontSize:13.5, fontWeight:700, color:'#1A0800' }}>{opt.label}</span>
              {active===opt.key && <span style={{ fontSize:10, fontWeight:700, color:'#FF6B2B', background:'rgba(255,107,43,.12)', padding:'2px 8px', borderRadius:100 }}>LIVE</span>}
            </div>
            <p style={{ fontSize:11.5, color:'#8C7B6E', lineHeight:1.6, margin:0 }}>{opt.desc}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}

/* ── HERO EDITOR ─────────────────────────────────────────── */
function HeroEditor() {
  const [form, setForm] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const set = k => e => setForm(f=>({...f,[k]:e.target.value}))

  useEffect(()=>{
    adminGetLandingHero().then(({data})=>{ if(data) setForm(data); setLoading(false) })
  },[])

  const save = async () => {
    setSaving(true)
    const {error} = await adminUpsertLandingHero(form)
    setSaving(false)
    if(error) toast.error(error.message)
    else toast.success('Hero content saved! ✓')
  }

  const heroImages = form.hero_image_urls || []

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return
    if (!file.type.startsWith('image/')) return toast.error('Please choose an image file')
    if (file.size > 5 * 1024 * 1024) return toast.error('Image must be under 5MB')
    if (heroImages.length >= 3) return toast.error('Maximum 3 images — remove one first')

    setUploading(true)
    const { data, error } = await adminAddHeroImage(file)
    setUploading(false)
    if (error) return toast.error(error.message)
    setForm(f => ({ ...f, hero_image_urls: data.hero_image_urls }))
    toast.success('Image added! ✓')
  }

  const removeImage = async (index) => {
    if (!window.confirm('Remove this image?')) return
    const { data, error } = await adminRemoveHeroImage(index)
    if (error) return toast.error(error.message)
    setForm(f => ({ ...f, hero_image_urls: data.hero_image_urls }))
    toast.success('Image removed')
  }

  if(loading) return <div style={{ padding:40, textAlign:'center', color:'#8C7B6E' }}>Loading...</div>

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div style={{ fontSize:15, fontWeight:700 }}>Hero Section</div>
        <Btn onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Btn>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        <div>
        <Card>
          <SectionHead>Hero Image Slideshow ({heroImages.length}/3)</SectionHead>
          <p style={{ fontSize:12, color:'#8C7B6E', marginTop:0, marginBottom:14 }}>
            Shown on the right side of the landing page hero, auto-rotating through up to 3 images. Displays on both desktop and mobile. Recommended: a wide image (e.g. 1200×700), under 5MB.
          </p>
          {heroImages.length > 0 && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:14 }}>
              {heroImages.map((url, i) => (
                <div key={url} style={{ position:'relative' }}>
                  <img src={url} alt={`Hero slide ${i+1}`} style={{ width:'100%', height:90, objectFit:'cover', borderRadius:10, border:'1px solid #F0EAE4', display:'block' }} loading="lazy" />
                  <button onClick={()=>removeImage(i)} disabled={uploading} title="Remove" style={{ position:'absolute', top:-8, right:-8, width:22, height:22, borderRadius:'50%', background:'#DC2626', color:'white', border:'2px solid white', cursor:'pointer', fontSize:12, lineHeight:1, fontWeight:700 }}>×</button>
                </div>
              ))}
            </div>
          )}
          {heroImages.length < 3 && (
            <label style={{ padding:'8px 18px', borderRadius:100, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", background:'#FF6B2B', color:'white', border:'none', display:'inline-block' }}>
              {uploading ? 'Uploading...' : 'Add Image'}
              <input type="file" accept="image/*" onChange={handleImageSelect} disabled={uploading} style={{ display:'none' }}/>
            </label>
          )}
        </Card>

        <Card>
          <SectionHead>Headlines & Copy</SectionHead>
          <Label>Eyebrow Tag</Label>
          <Input value={form.eyebrow||''} onChange={set('eyebrow')} placeholder="For Every Fresher, Everywhere"/>
          <Label>Main Headline</Label>
          <Input value={form.headline||''} onChange={set('headline')} placeholder="Your first day at work is a story only you lived."/>
          <Label>Highlighted Word/Phrase (must exist in headline)</Label>
          <Input value={form.headline_highlight||''} onChange={set('headline_highlight')} placeholder="only you"/>
          <Label>Sub-headline</Label>
          <TextArea value={form.subheadline||''} onChange={set('subheadline')} placeholder="Now the world can read it..."/>
          <Label>Primary CTA Button</Label>
          <Input value={form.cta_primary_text||''} onChange={set('cta_primary_text')} placeholder="Share My Day 1 ✍️"/>
          <Label>Secondary CTA Button</Label>
          <Input value={form.cta_secondary_text||''} onChange={set('cta_secondary_text')} placeholder="See How It Works →"/>
        </Card>
        </div>

        <div>
          <Card>
            <SectionHead>Floating Diary Card</SectionHead>
            <Label>Date Label</Label>
            <Input value={form.diary_date||''} onChange={set('diary_date')} placeholder="Day 1 — June 4, 2026"/>
            <Label>Story Title (use quotes)</Label>
            <Input value={form.diary_title||''} onChange={set('diary_title')} placeholder='"I accidentally replied-all..."'/>
            <Label>Story Preview</Label>
            <TextArea value={form.diary_content||''} onChange={set('diary_content')} style={{ minHeight:60 }}/>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div><Label>Author Name</Label><Input value={form.diary_author_name||''} onChange={set('diary_author_name')}/></div>
              <div><Label>Author Role</Label><Input value={form.diary_author_role||''} onChange={set('diary_author_role')}/></div>
              <div><Label>Likes Count</Label><Input value={form.diary_likes||''} onChange={set('diary_likes')} placeholder="3.1K"/></div>
              <div><Label>Comments Count</Label><Input value={form.diary_comments||''} onChange={set('diary_comments')} placeholder="284"/></div>
            </div>
          </Card>
          <Card>
            <SectionHead>Floating Badges</SectionHead>
            <Label>Badge 1 (top right)</Label>
            <Input value={form.badge_1_text||''} onChange={set('badge_1_text')} placeholder="🎉 Just published!"/>
            <Label>Badge 2 (bottom left)</Label>
            <Input value={form.badge_2_text||''} onChange={set('badge_2_text')} placeholder="👀 842 reading now"/>
          </Card>
          <Card>
            <SectionHead>Ticker Strip</SectionHead>
            <Label>Items (pipe-separated: Title — description|Title2 — desc2)</Label>
            <TextArea value={form.ticker_items||''} onChange={set('ticker_items')} style={{ minHeight:80 }} placeholder="First Day at Job — real stories|Habit Tracking — Day 1 to Day 100"/>
          </Card>
        </div>
      </div>

      {/* Live preview strip */}
      <div style={{ marginTop:16, background:'#1A0800', borderRadius:12, padding:'12px 20px', overflow:'hidden' }}>
        <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', marginBottom:8 }}>Ticker preview:</div>
        <div style={{ fontSize:13, color:'rgba(255,255,255,.7)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {(form.ticker_items||'').split('|').map((item,i)=>(
            <span key={i} style={{ marginRight:20 }}>✦ <span style={{color:'#FFD166'}}>{item.split('—')[0]?.trim()}</span>{item.includes('—')?' — '+item.split('—')[1]?.trim():''} ◆</span>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── BOTTOM SECTION EDITOR ───────────────────────────────── */
function BottomSectionEditor() {
  const [form, setForm] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const set = k => e => setForm(f=>({...f,[k]:e.target.value}))

  useEffect(()=>{
    adminGetLandingBottomSection().then(({data})=>{ if(data) setForm(data); setLoading(false) })
  },[])

  const save = async () => {
    setSaving(true)
    const {error} = await adminUpsertLandingBottomSection(form)
    setSaving(false)
    if(error) toast.error(error.message)
    else toast.success('Bottom section saved! ✓')
  }

  const images = form.image_urls || []

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return toast.error('Please choose an image file')
    if (file.size > 5 * 1024 * 1024) return toast.error('Image must be under 5MB')
    if (images.length >= 3) return toast.error('Maximum 3 images — remove one first')

    setUploading(true)
    const { data, error } = await adminAddBottomSectionImage(file)
    setUploading(false)
    if (error) return toast.error(error.message)
    setForm(f => ({ ...f, image_urls: data.image_urls }))
    toast.success('Image uploaded! ✓')
  }

  const removeImage = async (index) => {
    if (!window.confirm('Remove this image?')) return
    const { data, error } = await adminRemoveBottomSectionImage(index)
    if (error) return toast.error(error.message)
    setForm(f => ({ ...f, image_urls: data.image_urls }))
    toast.success('Image removed')
  }

  if(loading) return <div style={{ padding:40, textAlign:'center', color:'#8C7B6E' }}>Loading...</div>

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div style={{ fontSize:15, fontWeight:700 }}>Bottom Section</div>
        <Btn onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Btn>
      </div>
      <p style={{ fontSize:12, color:'#8C7B6E', marginTop:0, marginBottom:20 }}>
        A fully customizable section shown just before the footer — heading, copy, up to 3 images, and a call-to-action button.
      </p>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        <Card>
          <SectionHead>Images ({images.length}/3)</SectionHead>
          {images.length > 0 && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:14 }}>
              {images.map((url, i) => (
                <div key={url} style={{ position:'relative' }}>
                  <img src={url} alt={`Slide ${i+1}`} style={{ width:'100%', height:90, objectFit:'cover', borderRadius:10, border:'1px solid #F0EAE4', display:'block' }} loading="lazy" />
                  <button onClick={()=>removeImage(i)} disabled={uploading} title="Remove" style={{ position:'absolute', top:-8, right:-8, width:22, height:22, borderRadius:'50%', background:'#DC2626', color:'white', border:'2px solid white', cursor:'pointer', fontSize:12, lineHeight:1, fontWeight:700 }}>×</button>
                </div>
              ))}
            </div>
          )}
          {images.length < 3 && (
            <label style={{ padding:'8px 18px', borderRadius:100, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", background:'#FF6B2B', color:'white', border:'none', display:'inline-block' }}>
              {uploading ? 'Uploading...' : 'Add Image'}
              <input type="file" accept="image/*" onChange={handleImageSelect} disabled={uploading} style={{ display:'none' }}/>
            </label>
          )}
        </Card>

        <Card>
          <SectionHead>Content</SectionHead>
          <Label>Heading</Label>
          <Input value={form.heading||''} onChange={set('heading')} placeholder="Ready to start your story?"/>
          <Label>Subheadline</Label>
          <Input value={form.subheadline||''} onChange={set('subheadline')} placeholder="A short supporting line"/>
          <Label>Body Text</Label>
          <TextArea value={form.body_text||''} onChange={set('body_text')} placeholder="Longer description or copy for this section..."/>
          <Label>CTA Button Text</Label>
          <Input value={form.cta_text||''} onChange={set('cta_text')} placeholder="Get Started →"/>
          <Label>CTA Link</Label>
          <Input value={form.cta_link||''} onChange={set('cta_link')} placeholder="/register"/>
          <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, fontWeight:600, color:'#1A0800', cursor:'pointer', marginTop:4 }}>
            <input type="checkbox" checked={form.is_active!==false} onChange={e=>setForm(f=>({...f,is_active:e.target.checked}))}/> Show this section on the landing page
          </label>
        </Card>
      </div>
    </div>
  )
}

/* ── CATEGORIES EDITOR ───────────────────────────────────── */
function CategoriesEditor() {
  const [cats, setCats] = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ icon:'📝', name:'', is_active:true, is_cta:false, story_count_override:'', sort_order:0 })
  const [loading, setLoading] = useState(true)
  const set = k => e => setForm(f=>({...f,[k]: e.target.type==='checkbox' ? e.target.checked : e.target.value}))

  const load = () => adminGetCategories().then(({data})=>{ setCats(data||[]); setLoading(false) })
  useEffect(()=>{ load() },[])

  const startEdit = (c=null) => {
    setEditing(c?.id || 'new')
    setForm(c ? { icon:c.icon, name:c.name, is_active:c.is_active, is_cta:c.is_cta, sort_order:c.sort_order, story_count_override:c.story_count_override??'' } : { icon:'📝', name:'', is_active:true, is_cta:false, sort_order:cats.length+1, story_count_override:'' })
  }

  const save = async () => {
    const payload = { ...form, story_count_override: form.story_count_override===''||form.story_count_override===null ? null : Number(form.story_count_override), sort_order:Number(form.sort_order)||0 }
    if(editing !== 'new') payload.id = editing
    const {error} = await adminUpsertCategory(payload)
    if(error) { toast.error(error.message); return }
    toast.success(editing === 'new' ? 'Category added!' : 'Category updated!')
    setEditing(null); load()
  }

  const remove = async (id) => {
    if(!window.confirm('Delete this category?')) return
    await adminDeleteCategory(id); toast.success('Deleted'); load()
  }

  if(loading) return <div style={{ padding:40, textAlign:'center', color:'#8C7B6E' }}>Loading...</div>

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div style={{ fontSize:15, fontWeight:700 }}>Story Categories ({cats.length})</div>
        <Btn onClick={()=>startEdit()}>+ Add Category</Btn>
      </div>
      <p style={{ fontSize:13, color:'#8C7B6E', marginBottom:20 }}>These appear as clickable cards on the landing page. Story counts are auto-calculated from real stories unless you override them.</p>

      {/* Category list */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:12, marginBottom:20 }}>
        {cats.map(c=>(
          <div key={c.id} style={{ background:'white', border:'1px solid #F0EAE4', borderRadius:12, padding:'14px 16px', display:'flex', alignItems:'center', gap:10, opacity: c.is_active ? 1 : .5 }}>
            <div style={{ fontSize:22, width:36, textAlign:'center', flexShrink:0 }}>{c.icon}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:600 }}>{c.name}</div>
              <div style={{ fontSize:11, color:'#8C7B6E' }}>
                Order: {c.sort_order} · {c.story_count_override != null ? `Override: ${c.story_count_override}` : 'Auto count'}
                {c.is_cta && ' · CTA card'} {!c.is_active && ' · Hidden'}
              </div>
            </div>
            <div style={{ display:'flex', gap:6 }}>
              <Btn variant="secondary" onClick={()=>startEdit(c)} style={{ padding:'5px 12px', fontSize:11 }}>Edit</Btn>
              <Btn variant="danger" onClick={()=>remove(c.id)} style={{ padding:'5px 12px', fontSize:11 }}>Del</Btn>
            </div>
          </div>
        ))}
      </div>

      {/* Edit modal */}
      {editing && (
        <div style={{ position:'fixed', inset:0, background:'rgba(26,8,0,.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'white', borderRadius:20, padding:28, width:'100%', maxWidth:480, boxShadow:'0 24px 60px rgba(26,8,0,.15)' }}>
            <div style={{ fontSize:15, fontWeight:700, marginBottom:18 }}>{editing==='new'?'Add Category':'Edit Category'}</div>
            <div style={{ display:'grid', gridTemplateColumns:'80px 1fr', gap:10 }}>
              <div><Label>Icon (emoji)</Label><Input value={form.icon} onChange={set('icon')} style={{ textAlign:'center', fontSize:20 }}/></div>
              <div><Label>Category Name</Label><Input value={form.name} onChange={set('name')} placeholder="First Day at Job"/></div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div><Label>Story Count Override (leave blank for auto)</Label><Input type="number" value={form.story_count_override} onChange={set('story_count_override')} placeholder="Auto"/></div>
              <div><Label>Sort Order</Label><Input type="number" value={form.sort_order} onChange={set('sort_order')}/></div>
            </div>
            <div style={{ display:'flex', gap:16, marginBottom:16 }}>
              <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, cursor:'pointer' }}>
                <input type="checkbox" checked={form.is_active} onChange={set('is_active')}/> Active (show on landing)
              </label>
              <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, cursor:'pointer' }}>
                <input type="checkbox" checked={form.is_cta} onChange={set('is_cta')}/> CTA card style
              </label>
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <Btn variant="secondary" onClick={()=>setEditing(null)}>Cancel</Btn>
              <Btn onClick={save}>Save Category</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── TESTIMONIALS EDITOR ─────────────────────────────────── */
function TestimonialsEditor() {
  const [items, setItems] = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ quote:'', author_name:'', author_role:'', author_initials:'', avatar_gradient:'linear-gradient(135deg,#FF6B2B,#FFD166)', rating:5, is_active:true, sort_order:0 })
  const [loading, setLoading] = useState(true)
  const set = k => e => setForm(f=>({...f,[k]: e.target.type==='checkbox'?e.target.checked:e.target.value}))

  const load = () => adminGetTestimonials().then(({data})=>{ setItems(data||[]); setLoading(false) })
  useEffect(()=>{ load() },[])

  const startEdit = (t=null) => {
    setEditing(t?.id || 'new')
    setForm(t ? { quote:t.quote, author_name:t.author_name, author_role:t.author_role, author_initials:t.author_initials, avatar_gradient:t.avatar_gradient, rating:t.rating, is_active:t.is_active, sort_order:t.sort_order } : { quote:'', author_name:'', author_role:'', author_initials:'', avatar_gradient:GRADIENT_OPTIONS[0], rating:5, is_active:true, sort_order:items.length+1 })
  }

  const save = async () => {
    if(!form.quote.trim() || !form.author_name.trim()) { toast.error('Quote and author name are required'); return }
    const payload = { ...form, sort_order:Number(form.sort_order)||0, rating:Number(form.rating)||5 }
    if(editing !== 'new') payload.id = editing
    const {error} = await adminUpsertTestimonial(payload)
    if(error) { toast.error(error.message); return }
    toast.success(editing==='new'?'Testimonial added!':'Testimonial updated!')
    setEditing(null); load()
  }

  const remove = async (id) => {
    if(!window.confirm('Delete testimonial?')) return
const {error} = await adminDeleteTestimonial(id)
    if(!error) { toast.success('Deleted'); load() }
  }

  if(loading) return <div style={{ padding:40, textAlign:'center', color:'#8C7B6E' }}>Loading...</div>

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div style={{ fontSize:15, fontWeight:700 }}>Testimonials ({items.length})</div>
        <Btn onClick={()=>startEdit()}>+ Add Testimonial</Btn>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:20 }}>
        {items.map(t=>(
          <div key={t.id} style={{ background:'white', border:'1px solid #F0EAE4', borderRadius:14, padding:'16px 18px', display:'flex', alignItems:'flex-start', gap:14, opacity:t.is_active?1:.5 }}>
            <div style={{ width:40, height:40, borderRadius:'50%', background:t.avatar_gradient, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'white', flexShrink:0 }}>{t.author_initials}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontStyle:'italic', color:'#4A2800', marginBottom:5, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>"{t.quote}"</div>
              <div style={{ fontSize:12, fontWeight:600 }}>{t.author_name} <span style={{ fontWeight:400, color:'#8C7B6E' }}>· {t.author_role}</span></div>
              <div style={{ fontSize:11, color:'#8C7B6E', marginTop:2 }}>{'★'.repeat(t.rating||5)} · Order: {t.sort_order} {!t.is_active && '· Hidden'}</div>
            </div>
            <div style={{ display:'flex', gap:6, flexShrink:0 }}>
              <Btn variant="secondary" onClick={()=>startEdit(t)} style={{ padding:'5px 12px', fontSize:11 }}>Edit</Btn>
              <Btn variant="danger" onClick={()=>remove(t.id)} style={{ padding:'5px 12px', fontSize:11 }}>Del</Btn>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div style={{ position:'fixed', inset:0, background:'rgba(26,8,0,.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20, overflowY:'auto' }}>
          <div style={{ background:'white', borderRadius:20, padding:28, width:'100%', maxWidth:520, boxShadow:'0 24px 60px rgba(26,8,0,.15)', margin:'auto' }}>
            <div style={{ fontSize:15, fontWeight:700, marginBottom:18 }}>{editing==='new'?'Add Testimonial':'Edit Testimonial'}</div>
            <Label>Quote</Label>
            <TextArea value={form.quote} onChange={set('quote')} placeholder="What the user said about Day1 Diaries..." style={{ minHeight:90 }}/>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div><Label>Author Name</Label><Input value={form.author_name} onChange={set('author_name')}/></div>
              <div><Label>Author Role / Location</Label><Input value={form.author_role} onChange={set('author_role')} placeholder="IT Fresher · Bangalore"/></div>
              <div><Label>Initials (2 chars)</Label><Input value={form.author_initials} onChange={set('author_initials')} maxLength={2} style={{ textAlign:'center', fontSize:16, fontWeight:700 }}/></div>
              <div><Label>Rating (1-5)</Label><Input type="number" min={1} max={5} value={form.rating} onChange={set('rating')}/></div>
            </div>
            <Label>Avatar Gradient</Label>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
              {GRADIENT_OPTIONS.map(g=>(
                <div key={g} onClick={()=>setForm(f=>({...f, avatar_gradient:g}))}
                  style={{ width:32, height:32, borderRadius:'50%', background:g, cursor:'pointer', border: form.avatar_gradient===g ? '3px solid #FF6B2B' : '2px solid white', boxShadow:'0 2px 6px rgba(0,0,0,.15)', flexShrink:0 }}/>
              ))}
            </div>
            <div style={{ display:'flex', gap:16, marginBottom:16 }}>
              <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, cursor:'pointer' }}>
                <input type="checkbox" checked={form.is_active} onChange={set('is_active')}/> Active (show on landing)
              </label>
              <div><Label>Sort Order</Label><Input type="number" value={form.sort_order} onChange={set('sort_order')} style={{ maxWidth:80 }}/></div>
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <Btn variant="secondary" onClick={()=>setEditing(null)}>Cancel</Btn>
              <Btn onClick={save}>Save Testimonial</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── FEATURED STORIES EDITOR ─────────────────────────────── */
function FeaturedStoriesEditor() {
  const [stories, setStories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = () => adminGetFeaturedStories().then(({data})=>{ setStories(data||[]); setLoading(false) })
  useEffect(()=>{ load() },[])

  const toggle = async (id, current) => {
    const {error} = await adminToggleFeatureStory(id, !current)
    if(error) toast.error(error.message)
    else { toast.success(!current ? '⭐ Story featured!' : 'Story unfeatured'); load() }
  }

  const featured = stories.filter(s=>s.is_featured)
  const filtered = stories.filter(s=>!s.is_featured && s.title.toLowerCase().includes(search.toLowerCase()))

  if(loading) return <div style={{ padding:40, textAlign:'center', color:'#8C7B6E' }}>Loading...</div>

  return (
    <div>
      <div style={{ fontSize:15, fontWeight:700, marginBottom:8 }}>Featured Stories</div>
      <p style={{ fontSize:13, color:'#8C7B6E', marginBottom:20 }}>Featured stories appear as a special section on the landing page, hand-picked by you.</p>

      {featured.length > 0 && (
        <div style={{ marginBottom:24 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#FF6B2B', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:10 }}>⭐ Currently Featured ({featured.length})</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {featured.map(s=>(
              <div key={s.id} style={{ background:'rgba(255,107,43,.05)', border:'1px solid rgba(255,107,43,.2)', borderRadius:12, padding:'12px 16px', display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600 }}>{s.title}</div>
                  <div style={{ fontSize:11, color:'#8C7B6E' }}>{s.category} · by {s.profiles?.full_name||s.profiles?.username}</div>
                </div>
                <button onClick={()=>toggle(s.id, true)} style={{ fontSize:11, padding:'5px 12px', borderRadius:100, border:'1px solid rgba(255,107,43,.3)', background:'transparent', color:'#FF6B2B', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>Remove ×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ fontSize:12, fontWeight:700, color:'#8C7B6E', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:10 }}>All Published Stories</div>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by title..." style={{ width:'100%', padding:'9px 14px', border:'1.5px solid #DDD3CA', borderRadius:100, fontSize:13, fontFamily:"'DM Sans',sans-serif", outline:'none', marginBottom:14 }}/>
      <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:400, overflowY:'auto' }}>
        {filtered.slice(0,30).map(s=>(
          <div key={s.id} style={{ background:'white', border:'1px solid #F0EAE4', borderRadius:12, padding:'12px 16px', display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.title}</div>
              <div style={{ fontSize:11, color:'#8C7B6E' }}>{s.category} · by {s.profiles?.full_name||s.profiles?.username}</div>
            </div>
            <button onClick={()=>toggle(s.id, false)} style={{ fontSize:11, padding:'5px 14px', borderRadius:100, border:'1.5px solid #FF6B2B', background:'transparent', color:'#FF6B2B', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", flexShrink:0, transition:'all .2s' }}
              onMouseEnter={e=>{e.currentTarget.style.background='#FF6B2B';e.currentTarget.style.color='white'}}
              onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='#FF6B2B'}}>
              ⭐ Feature
            </button>
          </div>
        ))}
        {filtered.length === 0 && <div style={{ textAlign:'center', color:'#8C7B6E', fontSize:13, padding:'24px 0' }}>No stories match your search.</div>}
      </div>
    </div>
  )
}
