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

// ── 5. Magazine Cover — Forbes-inspired masthead, glossy recognition ──
function renderMagazineCover(data, fontCss) {
  const theme = {
    heading: '#1A1A1A', accent: '#C0152F', muted: '#6B6358', body: '#2A2A2A',
    panelBg: '#F7F5F0', panelBorder: '#E5E0D5',
    tributeBg: '#FCEAEA', tributeAccent: '#C0152F', tributeText: '#2A2A2A',
    ring: 'white', avatarBg: '#1A1A1A',
    ribbonBg: '#F7F5F0', ribbonBorder: '#E5E0D5', ribbonText: '#C0152F', ribbonSub: '#6B6358',
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><style>${baseStyles(fontCss)}
    body { width:1600px; background:white; }
    .sheet { padding:0; min-height:1100px; display:flex; flex-direction:column; }
    .masthead { background:#C0152F; padding:26px 70px; display:flex; justify-content:space-between; align-items:center; flex-shrink:0; }
  </style></head><body>
    <div class="sheet">
      <div class="masthead">
        <div class="heading" style="font-size:34px;font-weight:900;color:white;letter-spacing:1px;">DAY1 DIARIES</div>
        ${partnerBadgesHtml('white', 'rgba(255,255,255,.5)')}
      </div>
      <div style="padding:46px 70px 36px;flex:1;display:flex;flex-direction:column;justify-content:space-between;">
        <div>
          <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div>
              <div class="heading" style="font-size:13px;letter-spacing:.3em;color:#C0152F;font-weight:800;">PROFESSIONAL RECOGNITION</div>
              <div class="heading" style="font-size:48px;font-weight:900;color:#1A1A1A;line-height:1.05;margin-top:6px;max-width:900px;">
                ${escapeHtml((data.categoryLabel || 'Recognition').toUpperCase())}: ${escapeHtml(data.fullName || '')}
              </div>
              <div style="width:60px;height:4px;background:#C0152F;margin-top:16px;"></div>
            </div>
            <div style="font-size:38px;">${escapeHtml(data.categoryEmoji || '⭐')}</div>
          </div>
          ${contentBlockHtml(data, theme)}
          ${ribbonHtml(data, theme)}
        </div>
        ${footerHtml(data, theme)}
      </div>
      <div style="height:34px;background:#C0152F;flex-shrink:0;"></div>
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
