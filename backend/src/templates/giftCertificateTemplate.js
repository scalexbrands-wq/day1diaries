// Gift / tribute certificate templates for the "Surprise A Friend" module.
// Deliberately separate from templates/certificateTemplate.js (the
// story-author certificate) because gifts must NEVER show gamification
// metrics (impact score, likes, comments, views, shares, bookmarks) —
// this is about emotion and recognition, not engagement stats.

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

function truncate(str, n) {
  const s = String(str || '').trim()
  if (s.length <= n) return s
  const cut = s.slice(0, n)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > n * 0.6 ? cut.slice(0, lastSpace) : cut).trim()}…`
}

function formatMonthYear(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

// No real Startup India / StartupTN / AWS Partner logo assets exist in
// this repo — these are text-pill placeholders in the same visual slot,
// swappable for real logo images later via an admin-uploadable field.
function partnerBadgesHtml(textColor, borderColor) {
  const badges = ['STARTUP INDIA RECOGNIZED', 'STARTUPTN', 'AWS PARTNER']
  return `
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      ${badges.map(b => `
        <div style="font-size:7.5px;font-weight:800;letter-spacing:.03em;color:${textColor};
          border:1px solid ${borderColor};border-radius:100px;padding:4px 9px;white-space:nowrap;">${b}</div>
      `).join('')}
    </div>
  `
}

function avatarHtml(avatarUrl, fullName, size, ringColor, fallbackBg) {
  if (avatarUrl) {
    return `<img src="${escapeHtml(avatarUrl)}" alt="" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;border:4px solid ${ringColor};box-shadow:0 8px 22px rgba(0,0,0,.3);" />`
  }
  const initials = escapeHtml((fullName || '?').trim().slice(0, 1).toUpperCase())
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;border:4px solid ${ringColor};
    background:${fallbackBg};color:white;display:flex;align-items:center;justify-content:center;
    font-size:${size * 0.4}px;font-weight:700;font-family:'Playfair Display',Georgia,serif;box-shadow:0 8px 22px rgba(0,0,0,.3);">${initials}</div>`
}

function baseStyles(fontCss) {
  return `
    ${fontCss}
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', Arial, sans-serif; }
    .heading { font-family: 'Playfair Display', Georgia, serif; }
    .sig { font-family: 'Playfair Display', Georgia, serif; font-style: italic; }
  `
}

// ── shared content block: photo + name/role/company + story + message + tribute ──
function contentBlockHtml(data, theme) {
  const {
    fullName, avatarUrl, storyTitle, storyExcerpt, companyName, jobTitle, joiningDate,
    friendMessage, senderName, aiTributeText,
  } = data

  return `
    <div style="display:flex;gap:40px;align-items:flex-start;margin-top:26px;">
      <div style="flex-shrink:0;text-align:center;width:220px;">
        ${avatarHtml(avatarUrl, fullName, 200, theme.ring, theme.avatarBg)}
        <div class="heading" style="font-size:28px;font-weight:900;color:${theme.heading};margin-top:18px;line-height:1.2;">
          ${escapeHtml((fullName || '').toUpperCase())}
        </div>
        <div style="font-size:15px;color:${theme.accent};font-weight:700;margin-top:5px;">${escapeHtml(jobTitle || '')}</div>
        <div style="font-size:13.5px;color:${theme.muted};margin-top:3px;">${escapeHtml(companyName || '')}</div>
        ${joiningDate ? `<div style="font-size:12px;color:${theme.muted};margin-top:2px;">Joined ${escapeHtml(formatMonthYear(joiningDate))}</div>` : ''}
      </div>

      <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:18px;">
        <div style="background:${theme.panelBg};border:1px solid ${theme.panelBorder};border-radius:14px;padding:22px 26px;">
          <div style="font-size:11.5px;font-weight:800;color:${theme.accent};letter-spacing:.06em;margin-bottom:8px;">STORY</div>
          <div style="font-size:18px;font-weight:800;color:${theme.heading};margin-bottom:9px;">${escapeHtml(storyTitle)}</div>
          <div style="font-size:14.5px;color:${theme.body};line-height:1.6;font-style:italic;">“${escapeHtml((storyExcerpt || '').slice(0, 200))}${(storyExcerpt || '').length > 200 ? '…' : ''}”</div>
        </div>

        <div style="background:${theme.panelBg};border:1px solid ${theme.panelBorder};border-radius:14px;padding:22px 26px;">
          <div style="font-size:11.5px;font-weight:800;color:${theme.accent};letter-spacing:.06em;margin-bottom:8px;">FROM ${escapeHtml((senderName || 'A FRIEND').toUpperCase())}</div>
          <div style="font-size:16px;color:${theme.body};line-height:1.6;">“${escapeHtml(friendMessage || '')}”</div>
        </div>

        ${aiTributeText ? `
        <div style="background:${theme.tributeBg};border-radius:14px;padding:22px 26px;">
          <div style="font-size:11.5px;font-weight:800;color:${theme.tributeAccent};letter-spacing:.06em;margin-bottom:8px;">✨ TRIBUTE</div>
          <div style="font-size:16px;color:${theme.tributeText};line-height:1.6;">${escapeHtml(aiTributeText)}</div>
        </div>` : ''}
      </div>
    </div>
  `
}

function ribbonHtml(data, theme) {
  return `
    <div style="display:flex;justify-content:center;margin-top:30px;">
      <div style="display:flex;align-items:center;gap:16px;background:${theme.ribbonBg};border:1.5px solid ${theme.ribbonBorder};
        border-radius:14px;padding:18px 50px;text-align:center;">
        <span style="font-size:26px;">${escapeHtml(data.categoryEmoji || '🎁')}</span>
        <div>
          <div class="heading" style="font-size:20px;font-weight:900;color:${theme.ribbonText};letter-spacing:.03em;">A SURPRISE, JUST FOR YOU</div>
          <div style="font-size:12.5px;color:${theme.ribbonSub};margin-top:2px;">Built from a story worth remembering.</div>
        </div>
        <span style="font-size:26px;">${escapeHtml(data.categoryEmoji || '🎁')}</span>
      </div>
    </div>
  `
}

function footerHtml(data, theme) {
  const { certificateNumber, issuedAt, qrCodeDataUri } = data
  return `
    <div style="display:flex;align-items:center;gap:30px;margin-top:30px;padding-top:24px;border-top:1px solid ${theme.panelBorder};">
      <div style="flex-shrink:0;display:flex;gap:30px;">
        <div>
          <div style="font-size:10.5px;color:${theme.accent};font-weight:800;letter-spacing:.06em;">CERTIFICATE ID</div>
          <div style="font-size:16px;font-weight:800;color:${theme.heading};margin-top:2px;">${escapeHtml(certificateNumber)}</div>
        </div>
        <div>
          <div style="font-size:10.5px;color:${theme.accent};font-weight:800;letter-spacing:.06em;">ISSUE DATE</div>
          <div style="font-size:16px;font-weight:800;color:${theme.heading};margin-top:2px;">${escapeHtml(formatDate(issuedAt))}</div>
        </div>
      </div>
      <div style="flex:1;text-align:center;">
        <div class="sig" style="font-size:15px;color:${theme.heading};">Day1 Diaries</div>
        <div style="font-size:8px;color:${theme.muted};">Presented via the Surprise A Friend gifting program</div>
      </div>
      <div style="flex-shrink:0;display:flex;align-items:center;gap:8px;">
        ${qrCodeDataUri ? `<img src="${qrCodeDataUri}" alt="" style="width:48px;height:48px;border-radius:5px;background:white;padding:3px;" />` : ''}
        <div style="font-size:8px;font-weight:700;color:${theme.muted};line-height:1.3;">SCAN TO VIEW<br/>FULL TRIBUTE</div>
      </div>
    </div>
  `
}

// ── 1. Luxury Gold — dark navy, gold accents, premium border ──
function renderLuxuryGold(data, fontCss) {
  const theme = {
    heading: 'white', accent: '#D4AF37', muted: '#A8B3C9', body: '#D8DEE9',
    panelBg: 'rgba(255,255,255,.05)', panelBorder: 'rgba(212,175,55,.3)',
    tributeBg: 'rgba(212,175,55,.12)', tributeAccent: '#D4AF37', tributeText: '#F0E6C8',
    ring: '#D4AF37', avatarBg: '#FF6B2B',
    ribbonBg: 'rgba(212,175,55,.1)', ribbonBorder: 'rgba(212,175,55,.4)', ribbonText: '#D4AF37', ribbonSub: '#A8B3C9',
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><style>${baseStyles(fontCss)}
    body { width:1600px; background:#0B1E3D; }
    .frame { padding:14px; background:linear-gradient(135deg,#D4AF37,#9C7A1E,#D4AF37); }
    .sheet { background:linear-gradient(150deg,#071529 0%,#0B1E3D 55%,#16294F 100%); padding:54px 70px;
      min-height:1080px; display:flex; flex-direction:column; justify-content:space-between; }
  </style></head><body>
    <div class="frame"><div class="sheet">
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="display:flex;gap:10px;align-items:center;">
            <div style="width:42px;height:42px;border-radius:9px;background:#FF6B2B;display:flex;align-items:center;justify-content:center;font-weight:900;color:white;font-size:18px;">1</div>
            <div class="heading" style="font-size:19px;font-weight:900;color:white;">DAY 1 <span style="color:#FF6B2B;">DIARIES</span></div>
          </div>
          ${partnerBadgesHtml('#D4AF37', 'rgba(212,175,55,.4)')}
        </div>
        <div style="text-align:center;margin-top:18px;">
          <div class="heading" style="font-size:16px;letter-spacing:.3em;color:#A8B3C9;">CERTIFICATE OF</div>
          <div class="heading" style="font-size:58px;font-weight:900;letter-spacing:3px;
            background:linear-gradient(180deg,#F4E5A8,#D4AF37 55%,#9C7A1E);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;">
            ${escapeHtml((data.categoryLabel || 'RECOGNITION').toUpperCase())}
          </div>
          <div style="display:flex;align-items:center;justify-content:center;gap:14px;margin-top:16px;">
            <div style="width:72px;height:72px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#F4E5A8,#D4AF37 60%,#9C7A1E);
              display:flex;align-items:center;justify-content:center;font-size:30px;flex-shrink:0;">${escapeHtml(data.categoryEmoji || '🎁')}</div>
          </div>
        </div>
        ${contentBlockHtml(data, theme)}
        ${ribbonHtml(data, theme)}
      </div>
      ${footerHtml(data, theme)}
    </div></div>
  </body></html>`
}

// ── 2. Modern Glassmorphism — orange gradient, frosted panels ──
function renderGlassmorphismOrange(data, fontCss) {
  const theme = {
    heading: '#1A0800', accent: '#C2410C', muted: '#8C5A3A', body: '#3A2410',
    panelBg: 'rgba(255,255,255,.55)', panelBorder: 'rgba(255,255,255,.7)',
    tributeBg: 'rgba(255,255,255,.4)', tributeAccent: '#C2410C', tributeText: '#3A2410',
    ring: 'white', avatarBg: '#FF6B2B',
    ribbonBg: 'rgba(255,255,255,.5)', ribbonBorder: 'rgba(255,255,255,.8)', ribbonText: '#1A0800', ribbonSub: '#7A3A10',
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><style>${baseStyles(fontCss)}
    body { width:1600px; }
    .sheet { padding:54px 70px; min-height:1080px; display:flex; flex-direction:column; justify-content:space-between;
      background-image: radial-gradient(circle at 15% 15%, rgba(255,255,255,.5), transparent 45%), linear-gradient(135deg,#FF6B2B 0%,#FF9558 45%,#FFC58A 100%); }
  </style></head><body>
    <div class="sheet">
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="display:flex;gap:10px;align-items:center;background:rgba(255,255,255,.5);border-radius:100px;padding:9px 18px;">
            <div style="width:34px;height:34px;border-radius:8px;background:white;display:flex;align-items:center;justify-content:center;font-weight:900;color:#FF6B2B;">1</div>
            <div class="heading" style="font-size:17px;font-weight:900;color:#1A0800;">DAY 1 DIARIES</div>
          </div>
          ${partnerBadgesHtml('#1A0800', 'rgba(255,255,255,.8)')}
        </div>
        <div style="text-align:center;margin-top:22px;">
          <div class="heading" style="font-size:16px;letter-spacing:.3em;color:#7A3A10;">CERTIFICATE OF</div>
          <div class="heading" style="font-size:58px;font-weight:900;letter-spacing:2px;color:white;text-shadow:0 4px 18px rgba(0,0,0,.15);">
            ${escapeHtml((data.categoryLabel || 'RECOGNITION').toUpperCase())}
          </div>
          <div style="display:inline-flex;align-items:center;gap:6px;margin-top:14px;background:rgba(255,255,255,.55);
            border-radius:100px;padding:8px 22px;font-size:30px;">${escapeHtml(data.categoryEmoji || '🎁')}</div>
        </div>
        ${contentBlockHtml(data, theme)}
        ${ribbonHtml(data, theme)}
      </div>
      ${footerHtml(data, theme)}
    </div>
  </body></html>`
}

// ── 3. Memory Scrapbook — warm cream, photo-memory styling ──
function renderScrapbookWarm(data, fontCss) {
  const theme = {
    heading: '#5C3A1E', accent: '#B5651D', muted: '#9C8268', body: '#5C3A1E',
    panelBg: 'rgba(255,255,255,.7)', panelBorder: '#E8D4B8',
    tributeBg: '#FBE8C8', tributeAccent: '#B5651D', tributeText: '#5C3A1E',
    ring: '#FFFFFF', avatarBg: '#D97B3E',
    ribbonBg: '#FBE8C8', ribbonBorder: '#E8D4B8', ribbonText: '#B5651D', ribbonSub: '#9C8268',
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><style>${baseStyles(fontCss)}
    body { width:1600px; }
    .sheet { padding:54px 70px; background:#FBF1E0; min-height:1060px; display:flex; flex-direction:column; justify-content:space-between;
      background-image: repeating-linear-gradient(45deg, rgba(181,101,29,.03) 0 2px, transparent 2px 14px); }
  </style></head><body>
    <div class="sheet" style="border:10px solid #FBE8C8;">
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="display:flex;gap:10px;align-items:center;">
            <div style="width:38px;height:38px;border-radius:50%;background:#D97B3E;display:flex;align-items:center;justify-content:center;font-weight:900;color:white;">1</div>
            <div class="heading" style="font-size:17px;font-weight:900;color:#5C3A1E;">Day 1 Diaries</div>
          </div>
          ${partnerBadgesHtml('#5C3A1E', '#E8D4B8')}
        </div>
        <div style="text-align:center;margin-top:22px;">
          <div class="heading" style="font-size:15px;letter-spacing:.25em;color:#9C8268;">A MEMORY CALLED</div>
          <div class="heading" style="font-size:54px;font-weight:900;color:#B5651D;font-style:italic;">
            ${escapeHtml(data.categoryLabel || 'Sweet Memories')}
          </div>
          <div style="margin-top:10px;font-size:32px;">${escapeHtml(data.categoryEmoji || '📷')}</div>
        </div>
        ${contentBlockHtml(data, theme)}
        ${ribbonHtml(data, theme)}
      </div>
      ${footerHtml(data, theme)}
    </div>
  </body></html>`
}

// ── 4. Executive Recognition — black + gold, minimal award style ──
function renderExecutiveBlackGold(data, fontCss) {
  const theme = {
    heading: '#F2E6C2', accent: '#D4AF37', muted: '#8C8478', body: '#D8D0C2',
    panelBg: 'rgba(212,175,55,.06)', panelBorder: 'rgba(212,175,55,.25)',
    tributeBg: 'rgba(212,175,55,.1)', tributeAccent: '#D4AF37', tributeText: '#F2E6C2',
    ring: '#D4AF37', avatarBg: '#1A1A1A',
    ribbonBg: 'rgba(212,175,55,.08)', ribbonBorder: 'rgba(212,175,55,.3)', ribbonText: '#D4AF37', ribbonSub: '#8C8478',
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><style>${baseStyles(fontCss)}
    body { width:1600px; background:#0A0A0A; }
    .frame { padding:10px; background:#D4AF37; }
    .sheet { background:#0A0A0A; padding:58px 76px; min-height:1060px; display:flex; flex-direction:column; justify-content:space-between; }
  </style></head><body>
    <div class="frame"><div class="sheet">
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(212,175,55,.25);padding-bottom:20px;">
          <div class="heading" style="font-size:18px;font-weight:900;color:#F2E6C2;letter-spacing:.1em;">DAY 1 DIARIES</div>
          ${partnerBadgesHtml('#D4AF37', 'rgba(212,175,55,.3)')}
        </div>
        <div style="text-align:center;margin-top:34px;">
          <div class="heading" style="font-size:14px;letter-spacing:.4em;color:#8C8478;">CERTIFICATE OF</div>
          <div class="heading" style="font-size:60px;font-weight:900;letter-spacing:4px;color:#D4AF37;margin-top:6px;">
            ${escapeHtml((data.categoryLabel || 'RECOGNITION').toUpperCase())}
          </div>
          <div style="width:110px;height:2px;background:#D4AF37;margin:18px auto 0;"></div>
        </div>
        ${contentBlockHtml(data, theme)}
        ${ribbonHtml(data, theme)}
      </div>
      ${footerHtml(data, theme)}
    </div></div>
  </body></html>`
}

// ── 5. Magazine Cover — tall poster, Day1-branded recognition cover ──
// Unlike the other 4 (landscape A4 certificates), this renders as an
// A4-portrait poster — see certificateRender.js's styleKey === 'magazine_cover'
// branch for the matching output dimensions.
function magazineBulletHtml(emoji, ringColor, title, desc) {
  return `
    <div style="display:flex;gap:14px;align-items:flex-start;">
      <div style="width:34px;height:34px;border-radius:10px;background:${ringColor};flex-shrink:0;
        display:flex;align-items:center;justify-content:center;font-size:16px;">${emoji}</div>
      <div style="min-width:0;">
        <div class="heading" style="font-size:14px;font-weight:800;color:white;line-height:1.25;">${title}</div>
        <div style="font-size:11px;color:rgba(255,255,255,.55);margin-top:3px;line-height:1.4;">${desc}</div>
      </div>
    </div>
  `
}

function renderMagazineCover(data, fontCss) {
  const {
    fullName, heroImageUrl, avatarUrl, storyTitle, storyExcerpt, categoryLabel, categoryEmoji,
    friendMessage, senderName, senderAvatarUrl, aiTributeText, certificateNumber, qrCodeDataUri, websiteUrl,
  } = data
  const photoUrl = heroImageUrl || avatarUrl
  const caption = escapeHtml(truncate(storyExcerpt, 64)) || `${escapeHtml(fullName || 'This')}'s story changed everything.`
  const aiInsight = truncate(aiTributeText || storyExcerpt || 'A story worth celebrating.', 90)
  const pullQuote = truncate(friendMessage || storyExcerpt || 'A surprise, just for you.', 110)
  const catLabel = escapeHtml((categoryLabel || 'Special Recognition').replace(/ Certificate$/i, ''))

  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><style>${baseStyles(fontCss)}
    body { width:1240px; height:1754px; background:#0A0E1A; overflow:hidden; }
    .sheet { width:1240px; height:1754px; padding:34px 46px 26px; display:flex; flex-direction:column; overflow:hidden; box-sizing:border-box;
      background: radial-gradient(circle at 85% 0%, rgba(255,107,43,.18), transparent 50%), linear-gradient(165deg,#0A0E1A 0%,#10162A 60%,#0A0E1A 100%); }
  </style></head><body>
    <div class="sheet">
      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <div style="display:flex;gap:8px;align-items:center;">
            <div style="width:30px;height:30px;border-radius:7px;background:#FF6B2B;display:flex;align-items:center;justify-content:center;font-weight:900;color:white;font-size:14px;">1</div>
            <div class="heading" style="font-size:14px;font-weight:900;color:white;letter-spacing:.04em;">DAY 1 <span style="color:#F2B705;">DIARIES</span></div>
          </div>
          <div class="sig" style="font-size:13px;color:rgba(255,255,255,.6);margin-top:6px;">Special Edition</div>
        </div>
        <div style="background:#D6336C;padding:8px 16px 12px;border-radius:0 0 10px 10px;text-align:center;">
          <div style="font-size:8px;font-weight:800;letter-spacing:.05em;color:#FFE8EF;">★★★★★</div>
          <div style="font-size:10px;font-weight:800;color:white;letter-spacing:.02em;margin-top:2px;">COMMUNITY<br/>FAVORITE</div>
        </div>
      </div>

      <!-- Title -->
      <div style="margin-top:18px;display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <div class="heading" style="font-size:54px;font-weight:900;color:white;line-height:.95;letter-spacing:-1px;">DAY 1</div>
          <div class="heading" style="font-size:54px;font-weight:900;color:#F2B705;line-height:.95;letter-spacing:-1px;">DIARIES</div>
        </div>
        <div style="flex-shrink:0;width:96px;height:96px;border-radius:50%;border:2px solid #F2B705;display:flex;flex-direction:column;
          align-items:center;justify-content:center;text-align:center;margin-top:6px;">
          <div style="font-size:16px;">👑</div>
          <div style="font-size:7px;font-weight:800;color:#F2B705;line-height:1.2;margin-top:2px;">TOP STORY<br/>OF THE WEEK</div>
        </div>
      </div>

      <!-- Bullets + Photo -->
      <div style="display:flex;gap:24px;margin-top:24px;flex:1;min-height:0;">
        <div style="width:280px;flex-shrink:0;display:flex;flex-direction:column;gap:18px;padding-top:6px;">
          ${magazineBulletHtml('⭐', 'rgba(242,183,5,.18)', catLabel, escapeHtml(truncate(storyExcerpt, 60)) || 'A heartfelt surprise.')}
          ${magazineBulletHtml('📖', 'rgba(45,212,191,.18)', escapeHtml(truncate(storyTitle, 34)), 'The story behind this tribute.')}
          ${magazineBulletHtml('💌', 'rgba(214,51,108,.18)', 'A PERSONAL MESSAGE', escapeHtml(truncate(friendMessage, 60)) || 'From the heart.')}
          ${magazineBulletHtml('❤️', 'rgba(255,107,43,.18)', `GIFTED BY ${escapeHtml((senderName || 'A Friend').toUpperCase())}`, 'A surprise, just for you.')}
        </div>
        <div style="flex:1;min-width:0;position:relative;border-radius:18px;overflow:hidden;background:#1A2238;">
          ${photoUrl
            ? `<img src="${escapeHtml(photoUrl)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;" />`
            : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:64px;">${escapeHtml(categoryEmoji || '🎁')}</div>`}
          <div style="position:absolute;left:0;right:0;bottom:0;padding:24px 22px;
            background:linear-gradient(180deg,transparent,rgba(0,0,0,.85) 70%);">
            <div class="heading" style="font-size:21px;font-weight:900;color:white;line-height:1.25;">${caption}</div>
          </div>
          <div style="position:absolute;top:14px;right:14px;width:150px;background:rgba(10,14,26,.85);border:1px solid rgba(45,212,191,.4);
            border-radius:12px;padding:12px;backdrop-filter:blur(4px);">
            <div style="font-size:18px;">🤖</div>
            <div style="font-size:9px;font-weight:800;color:#2DD4BF;letter-spacing:.05em;margin-top:4px;">AI KEY INSIGHT</div>
            <div style="font-size:10.5px;color:rgba(255,255,255,.85);line-height:1.4;margin-top:4px;">${escapeHtml(aiInsight)}</div>
          </div>
        </div>
      </div>

      <!-- Featured On -->
      <div style="text-align:center;margin-top:22px;display:flex;align-items:center;justify-content:center;gap:10px;">
        <span style="color:#2DD4BF;font-size:13px;">🌿</span>
        <span style="font-size:9px;font-weight:800;letter-spacing:.15em;color:rgba(255,255,255,.5);">FEATURED ON DAY 1 DIARIES</span>
        <span style="color:#2DD4BF;font-size:13px;">🌿</span>
      </div>

      <!-- Gifted by + Quote -->
      <div style="display:flex;gap:16px;margin-top:18px;align-items:stretch;">
        <div style="flex:1;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:16px;display:flex;gap:12px;align-items:center;">
          ${avatarHtml(senderAvatarUrl, senderName, 46, '#F2B705', '#FF6B2B')}
          <div style="min-width:0;">
            <div style="font-size:9px;font-weight:800;color:rgba(255,255,255,.5);letter-spacing:.05em;">GIFTED BY</div>
            <div class="sig" style="font-size:16px;color:#F2B705;margin-top:2px;">${escapeHtml(senderName || 'A Friend')}</div>
          </div>
        </div>
        <div style="flex:1.3;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:16px;">
          <div style="font-size:24px;color:#2DD4BF;line-height:.6;">"</div>
          <div style="font-size:12px;color:white;font-style:italic;line-height:1.45;margin-top:2px;">${escapeHtml(pullQuote)}</div>
        </div>
      </div>

      <!-- QR -->
      <div style="display:flex;align-items:center;gap:14px;margin-top:18px;border:1.5px dashed rgba(255,255,255,.25);border-radius:14px;padding:14px 18px;">
        <div>
          <div style="font-size:11px;font-weight:800;color:white;">READ FULL STORY</div>
          <div style="font-size:9.5px;color:rgba(255,255,255,.5);margin-top:2px;">Scan to explore this inspiring journey.</div>
          <div style="font-size:8.5px;color:rgba(255,255,255,.35);margin-top:8px;">Certificate ${escapeHtml(certificateNumber)} · ${escapeHtml((websiteUrl || '').replace(/^https?:\/\//, ''))}</div>
        </div>
        <div style="flex-shrink:0;margin-left:auto;">
          ${qrCodeDataUri ? `<img src="${qrCodeDataUri}" alt="" style="width:64px;height:64px;border-radius:6px;background:white;padding:4px;" />` : ''}
        </div>
      </div>

      <!-- Bottom bar -->
      <div style="margin-top:18px;background:#F2B705;border-radius:14px;padding:14px 20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <div style="display:flex;gap:18px;font-size:9.5px;font-weight:800;color:#1A1206;">
          <span>📤 SHARE YOUR STORY</span>
          <span>👥 LEARN FROM OTHERS</span>
          <span>🌱 GROW TOGETHER</span>
        </div>
        <div class="sig" style="font-size:11px;color:#1A1206;">Join the movement · day1diaries.com</div>
      </div>
    </div>
  </body></html>`
}

const RENDERERS = {
  luxury_gold: renderLuxuryGold,
  glassmorphism_orange: renderGlassmorphismOrange,
  scrapbook_warm: renderScrapbookWarm,
  executive_black_gold: renderExecutiveBlackGold,
  magazine_cover: renderMagazineCover,
}

function renderGiftCertificateHtml(data, fontCss, styleKey) {
  const renderer = RENDERERS[styleKey] || renderLuxuryGold
  return renderer(data, fontCss)
}

module.exports = { renderGiftCertificateHtml }
