const COLORS = {
  primary: '#FF6B2B',
  navy: '#0B1E3D',
  navyDeep: '#071529',
  gold: '#D4AF37',
  goldLight: '#F4E5A8',
  goldDark: '#9C7A1E',
  cream: '#FBF6EC',
  background: '#F4ECDC',
}

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

function baseStyles(fontCss) {
  return `
    ${fontCss}
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', Arial, sans-serif;
      background: ${COLORS.background};
      color: ${COLORS.navy};
    }
    .heading { font-family: 'Playfair Display', Georgia, serif; }
    .sig { font-family: 'Playfair Display', Georgia, serif; font-style: italic; }
  `
}

function avatarHtml(avatarUrl, fullName, size) {
  if (avatarUrl) {
    return `<img src="${escapeHtml(avatarUrl)}" alt="" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;border:5px solid ${COLORS.gold};box-shadow:0 8px 24px rgba(0,0,0,.35);" />`
  }
  const initials = escapeHtml((fullName || '?').trim().slice(0, 1).toUpperCase())
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;border:5px solid ${COLORS.gold};
    background:${COLORS.primary};color:white;display:flex;align-items:center;justify-content:center;
    font-size:${size * 0.4}px;font-weight:700;font-family:'Playfair Display',Georgia,serif;box-shadow:0 8px 24px rgba(0,0,0,.35);">${initials}</div>`
}

// AI Career Analysis pill metadata — mirrors the keyword categories in
// certificateInsights.js so any combination of tags renders nicely.
const INSIGHT_META = {
  'Confidence Building': { icon: '💪', color: '#059669', label: 'Confidence Building' },
  'Team Collaboration':  { icon: '👥', color: '#2563EB', label: 'Team Collaboration' },
  'Communication':       { icon: '💬', color: '#0EA5E9', label: 'Communication' },
  'Learning Mindset':    { icon: '🧠', color: '#7C3AED', label: 'Learning Mindset' },
  'Leadership':          { icon: '👑', color: '#B45309', label: 'Leadership Traits' },
  'Adaptability':        { icon: '🔄', color: '#0D9488', label: 'Adaptability' },
  'Problem Solving':     { icon: '🧩', color: '#DB2777', label: 'Problem Solving' },
  'Growth Potential':    { icon: '📈', color: COLORS.primary, label: 'Growth Potential' },
  'Ownership':           { icon: '🎯', color: '#475569', label: 'Ownership' },
  'Innovation':          { icon: '💡', color: '#CA8A04', label: 'Innovation' },
}
const MAX_PILLS = 6

function pillsHtml(tags) {
  const list = (tags || []).slice(0, MAX_PILLS)
  return list.map(tag => {
    const meta = INSIGHT_META[tag] || { icon: '✨', color: COLORS.primary, label: tag }
    return `
      <div style="display:flex;align-items:center;gap:8px;background:white;border:1.5px solid ${meta.color}33;
        border-radius:10px;padding:9px 12px;">
        <div style="width:24px;height:24px;border-radius:50%;background:${meta.color}1A;color:${meta.color};
          display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;">${meta.icon}</div>
        <div style="font-size:11.5px;font-weight:700;color:${meta.color};line-height:1.2;">${escapeHtml(meta.label)}</div>
      </div>
    `
  }).join('')
}

function starsHtml(size, color) {
  return Array.from({ length: 5 }).map(() =>
    `<span style="color:${color};font-size:${size}px;font-family:'DejaVu Sans',sans-serif;">★</span>`
  ).join('')
}

const SCORE_CRITERIA = ['Story Quality', 'Engagement', 'Community Value', 'Learning Contribution']

function scoreGaugeHtml(score, scoreLabel) {
  const pct = Math.max(0, Math.min(100, score || 0))
  return `
    <div style="position:relative;width:128px;height:128px;flex-shrink:0;">
      <div style="position:absolute;inset:0;border-radius:50%;
        background:conic-gradient(${COLORS.gold} ${pct * 3.6}deg, #EADFCF ${pct * 3.6}deg);"></div>
      <div style="position:absolute;inset:11px;border-radius:50%;background:white;
        display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:inset 0 0 0 1px #EADFCF;">
        <div class="heading" style="font-size:34px;font-weight:900;color:${COLORS.navy};line-height:1;">${pct}</div>
        <div style="font-size:10px;color:#8C7B6E;font-weight:700;letter-spacing:.04em;">/100</div>
      </div>
    </div>
    <div style="margin-top:10px;font-size:12px;font-weight:800;color:${COLORS.primary};text-align:center;letter-spacing:.02em;">
      ${escapeHtml((scoreLabel || '').toUpperCase())}
    </div>
  `
}

function scoreChecklistHtml() {
  return `
    <div style="margin-top:14px;display:flex;flex-direction:column;gap:6px;width:100%;">
      ${SCORE_CRITERIA.map(item => `
        <div style="display:flex;align-items:center;gap:6px;font-size:10.5px;color:#3A2E22;">
          <span style="color:#059669;font-weight:900;">✓</span>${escapeHtml(item)}
        </div>
      `).join('')}
    </div>
  `
}

function statBoxHtml(icon, value, label) {
  return `
    <div style="text-align:center;flex:1;min-width:0;">
      <div style="width:34px;height:34px;border-radius:50%;background:${COLORS.cream};border:1px solid #EADFCF;
        display:flex;align-items:center;justify-content:center;font-size:14px;margin:0 auto;">${icon}</div>
      <div class="heading" style="font-size:15px;font-weight:900;color:${COLORS.navy};margin-top:5px;">${value}</div>
      <div style="font-size:8.5px;color:#8C7B6E;font-weight:600;">${label}</div>
    </div>
  `
}

function darkInsightBoxHtml(title, text) {
  return `
    <div style="background:${COLORS.navy};border-radius:10px;padding:11px 13px;color:white;">
      <div style="font-size:9.5px;font-weight:800;color:${COLORS.gold};letter-spacing:.04em;margin-bottom:4px;">${escapeHtml(title)}</div>
      <div style="font-size:10.5px;line-height:1.4;color:#E8E2D8;">${escapeHtml(text)}</div>
    </div>
  `
}

function colHeaderHtml(icon, label) {
  return `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
      <div style="width:28px;height:28px;border-radius:50%;background:${COLORS.navy};color:white;
        display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;">${icon}</div>
      <div style="font-size:12px;font-weight:800;color:${COLORS.navy};letter-spacing:.02em;">${label}</div>
    </div>
  `
}

function cornerBracketsHtml() {
  const styleFor = (pos) => {
    const base = 'position:absolute;width:34px;height:34px;'
    const map = {
      tl: `top:16px;left:16px;border-top:2px solid ${COLORS.gold};border-left:2px solid ${COLORS.gold};border-radius:6px 0 0 0;`,
      tr: `top:16px;right:16px;border-top:2px solid ${COLORS.gold};border-right:2px solid ${COLORS.gold};border-radius:0 6px 0 0;`,
      bl: `bottom:16px;left:16px;border-bottom:2px solid ${COLORS.gold};border-left:2px solid ${COLORS.gold};border-radius:0 0 0 6px;`,
      br: `bottom:16px;right:16px;border-bottom:2px solid ${COLORS.gold};border-right:2px solid ${COLORS.gold};border-radius:0 0 6px 0;`,
    }
    return base + map[pos]
  }
  return ['tl', 'tr', 'bl', 'br'].map(p => `<div style="${styleFor(p)}"></div>`).join('')
}

// Full certificate — rendered at 1600px CSS width (~1132px tall, A4-landscape ratio).
function renderCertificateHtml(data, fontCss) {
  const {
    fullName, avatarUrl, storyTitle, highlight,
    companyName, jobTitle, joiningDate, companyLogoUrl,
    insightTags, impactLevel, impactScore, impactScoreLabel,
    keyLesson, careerInsight, snapshot,
    certificateNumber, issuedAt, qrCodeDataUri, websiteUrl,
    communityManagerName, coFounderName,
  } = data

  const stats = snapshot || {}

  return `<!DOCTYPE html>
  <html><head><meta charset="utf-8" />
  <style>${baseStyles(fontCss)}
    body { width: 1600px; }
    .frame {
      width: 1600px; padding: 12px;
      background: linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDark}, ${COLORS.gold});
    }
    .sheet { width: 100%; background: ${COLORS.cream}; overflow: hidden; }
  </style></head>
  <body>
    <div class="frame"><div class="sheet">

      <!-- ══ HEADER (navy) ══ -->
      <div style="position:relative;
        background-image: radial-gradient(circle, rgba(255,255,255,.05) 1px, transparent 1.6px), linear-gradient(150deg, ${COLORS.navyDeep} 0%, ${COLORS.navy} 55%, #16294F 100%);
        background-size: 24px 24px, cover;
        padding:30px 56px 34px;color:white;">
        ${cornerBracketsHtml()}

        <!-- top row: logo / certificate title / seal -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div style="display:flex;gap:10px;align-items:flex-start;width:230px;flex-shrink:0;">
            <div style="width:38px;height:38px;border-radius:9px;background:${COLORS.primary};color:white;
              display:flex;align-items:center;justify-content:center;font-weight:900;font-size:18px;flex-shrink:0;">1</div>
            <div>
              <div class="heading" style="font-size:18px;font-weight:900;line-height:1.15;color:white;">
                DAY 1 <span style="color:${COLORS.primary};">DIARIES</span>
              </div>
              <div style="font-size:9px;color:#B9C2D6;font-weight:600;max-width:160px;margin-top:3px;line-height:1.3;">
                India's First AI-Powered<br/>Freshers Community
              </div>
            </div>
          </div>

          <div style="text-align:center;flex:1;">
            <div class="heading" style="font-size:18px;font-weight:700;letter-spacing:.25em;color:#CBD5E8;">CERTIFICATE OF</div>
            <div class="heading" style="font-size:64px;font-weight:900;letter-spacing:4px;line-height:1;margin-top:2px;
              background:linear-gradient(180deg, ${COLORS.goldLight}, ${COLORS.gold} 55%, ${COLORS.goldDark});
              -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;">IMPACT</div>
            <div style="font-size:12px;color:#CBD5E8;font-weight:600;letter-spacing:.05em;margin-top:6px;">PROUDLY PRESENTED TO</div>
          </div>

          <div style="width:230px;flex-shrink:0;display:flex;justify-content:flex-end;">
            <div style="width:118px;height:118px;border-radius:50%;flex-shrink:0;
              background:radial-gradient(circle at 35% 30%, ${COLORS.goldLight}, ${COLORS.gold} 60%, ${COLORS.goldDark});
              border:3px solid ${COLORS.goldLight};display:flex;flex-direction:column;align-items:center;justify-content:center;
              text-align:center;color:#241A00;font-weight:800;font-size:10px;line-height:1.35;padding:10px;
              box-shadow:0 6px 18px rgba(0,0,0,.35);">
              <div style="margin-bottom:3px;">${starsHtml(8, '#241A00')}</div>
              VERIFIED<br/>STORY<br/>CONTRIBUTOR
            </div>
          </div>
        </div>

        <!-- awardee row: photo / name block / awarded text -->
        <div style="display:flex;gap:30px;align-items:center;margin-top:18px;">
          <div style="flex-shrink:0;text-align:center;width:170px;">
            <div style="display:flex;align-items:center;justify-content:center;gap:2px;">
              <span style="font-size:24px;opacity:.6;">🌿</span>
              ${avatarHtml(avatarUrl, fullName, 132)}
              <span style="font-size:24px;opacity:.6;transform:scaleX(-1);display:inline-block;">🌿</span>
            </div>
          </div>

          <div style="flex:1.1;min-width:0;">
            <div class="heading" style="font-size:38px;font-weight:900;color:white;letter-spacing:.5px;">
              ${escapeHtml((fullName || '').toUpperCase())}
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:16px;margin-top:10px;align-items:center;">
              <div style="font-size:15px;color:${COLORS.gold};font-weight:700;">${escapeHtml(jobTitle || '')}</div>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:18px;margin-top:8px;align-items:center;">
              <div style="display:flex;align-items:center;gap:7px;">
                ${companyLogoUrl
                  ? `<img src="${escapeHtml(companyLogoUrl)}" style="width:20px;height:20px;border-radius:4px;object-fit:contain;background:white;" />`
                  : `<div style="width:20px;height:20px;border-radius:4px;background:${COLORS.primary};display:flex;align-items:center;justify-content:center;font-size:11px;">🏢</div>`}
                <div style="font-size:13.5px;color:#E8E2D8;font-weight:600;">${escapeHtml(companyName || '')}</div>
              </div>
              <div style="display:flex;align-items:center;gap:7px;">
                <div style="width:20px;height:20px;border-radius:4px;background:rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;font-size:11px;">📅</div>
                <div style="font-size:13.5px;color:#E8E2D8;font-weight:600;">Joined: ${escapeHtml(formatMonthYear(joiningDate) || '—')}</div>
              </div>
            </div>
          </div>

          <div style="width:1px;align-self:stretch;background:rgba(255,255,255,.15);flex-shrink:0;"></div>

          <div style="flex:1;min-width:0;padding-left:6px;">
            <div style="font-size:13px;color:#C9D2E6;line-height:1.65;">
              Awarded for sharing an authentic <span style="color:${COLORS.gold};font-weight:700;">first-day professional experience</span>
              and contributing valuable insights that help future professionals
              <span style="color:${COLORS.gold};font-weight:700;">begin their careers with confidence</span>.
            </div>
          </div>
        </div>
      </div>

      <!-- gold divider -->
      <div style="height:5px;background:linear-gradient(90deg, ${COLORS.goldDark}, ${COLORS.gold}, ${COLORS.goldLight}, ${COLORS.gold}, ${COLORS.goldDark});"></div>

      <!-- ══ BODY (cream, 4 columns) ══ -->
      <div style="display:flex;gap:22px;padding:26px 40px;background:${COLORS.cream};">

        <!-- STORY HIGHLIGHT -->
        <div style="flex:1;min-width:0;display:flex;flex-direction:column;">
          ${colHeaderHtml('📖', 'STORY HIGHLIGHT')}
          <div style="font-size:11.5px;color:${COLORS.primary};font-weight:700;margin-bottom:6px;">
            Story Title<br/>
            <span style="color:${COLORS.navy};font-weight:800;font-size:13px;">${escapeHtml(storyTitle)}</span>
          </div>
          <div style="background:white;border:1px solid #EADFCF;border-radius:10px;padding:14px;flex:1;
            font-style:italic;font-size:11.5px;color:#3A2E22;line-height:1.6;">
            “${escapeHtml(highlight)}”
          </div>
        </div>

        <div style="width:1px;background:#E2D5BD;flex-shrink:0;"></div>

        <!-- AI CAREER ANALYSIS -->
        <div style="flex:1.15;min-width:0;display:flex;flex-direction:column;">
          ${colHeaderHtml('🤖', 'AI CAREER ANALYSIS')}
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            ${pillsHtml(insightTags)}
          </div>
          <div style="margin-top:auto;padding-top:10px;font-size:9px;color:#8C7B6E;text-align:center;">
            Insights generated by Day 1 Diaries AI
          </div>
        </div>

        <div style="width:1px;background:#E2D5BD;flex-shrink:0;"></div>

        <!-- IMPACT SCORE -->
        <div style="flex:0.9;min-width:0;display:flex;flex-direction:column;align-items:center;">
          ${colHeaderHtml('🎯', 'IMPACT SCORE')}
          ${scoreGaugeHtml(impactScore, impactScoreLabel)}
          <div style="font-size:9px;color:#8C7B6E;margin-top:10px;text-align:center;">Score generated by AI based on</div>
          ${scoreChecklistHtml()}
        </div>

        <div style="width:1px;background:#E2D5BD;flex-shrink:0;"></div>

        <!-- COMMUNITY IMPACT -->
        <div style="flex:1.2;min-width:0;display:flex;flex-direction:column;">
          ${colHeaderHtml('👥', 'COMMUNITY IMPACT')}
          <div style="display:flex;gap:4px;margin-bottom:14px;">
            ${statBoxHtml('👁', stats.viewsCount ?? 0, 'Readers')}
            ${statBoxHtml('❤️', stats.likesCount ?? 0, 'Likes')}
            ${statBoxHtml('💬', stats.commentsCount ?? 0, 'Comments')}
            ${statBoxHtml('🔖', stats.savesCount ?? 0, 'Saves')}
            ${statBoxHtml('📤', stats.sharesCount ?? 0, 'Shares')}
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${darkInsightBoxHtml('AI KEY LESSON', keyLesson)}
            ${darkInsightBoxHtml('CAREER INSIGHT', careerInsight)}
          </div>
        </div>
      </div>

      <!-- ══ RIBBON BANNER ══ -->
      <div style="position:relative;display:flex;justify-content:center;margin:0 40px;">
        <div style="background:linear-gradient(135deg, ${COLORS.navyDeep}, ${COLORS.navy});
          border:1.5px solid ${COLORS.gold};border-radius:10px;padding:12px 40px;text-align:center;
          display:flex;align-items:center;gap:12px;">
          <span style="font-size:20px;">🏆</span>
          <div>
            <div class="heading" style="font-size:16px;font-weight:900;color:${COLORS.gold};letter-spacing:.05em;">
              ${escapeHtml((impactLevel || 'FUTURE INSPIRER').toUpperCase())}
            </div>
            <div style="font-size:10px;color:#C9D2E6;margin-top:1px;">Thank you for inspiring the next generation!</div>
          </div>
          <span style="font-size:20px;">🏆</span>
        </div>
      </div>

      <!-- ══ FOOTER BAR (navy) ══ -->
      <div style="background:${COLORS.navy};color:white;padding:18px 40px;display:flex;align-items:center;gap:24px;margin-top:18px;">
        <div style="flex-shrink:0;display:flex;gap:22px;">
          <div>
            <div style="font-size:9px;color:${COLORS.gold};font-weight:700;letter-spacing:.05em;">CERTIFICATE ID</div>
            <div style="font-size:13px;font-weight:800;margin-top:2px;">${escapeHtml(certificateNumber)}</div>
          </div>
          <div>
            <div style="font-size:9px;color:${COLORS.gold};font-weight:700;letter-spacing:.05em;">ISSUE DATE</div>
            <div style="font-size:13px;font-weight:800;margin-top:2px;">${escapeHtml(formatDate(issuedAt))}</div>
          </div>
        </div>

        <div style="flex:1;display:flex;justify-content:center;align-items:center;gap:30px;">
          <div style="text-align:center;">
            <div class="sig" style="font-size:18px;color:white;">${escapeHtml(communityManagerName || 'Community Manager')}</div>
            <div style="width:110px;height:1px;background:rgba(255,255,255,.3);margin:5px auto;"></div>
            <div style="font-size:9.5px;font-weight:700;color:${COLORS.gold};">${escapeHtml(communityManagerName || '—')}</div>
            <div style="font-size:8.5px;color:#B9C2D6;">Community Manager</div>
          </div>
          <div style="width:46px;height:46px;border-radius:50%;border:2px dashed ${COLORS.gold};flex-shrink:0;
            display:flex;align-items:center;justify-content:center;text-align:center;font-size:7px;color:${COLORS.gold};
            font-weight:800;line-height:1.2;padding:5px;">AI<br/>POWERED</div>
          <div style="text-align:center;">
            <div class="sig" style="font-size:18px;color:white;">${escapeHtml(coFounderName || 'Co-Founder')}</div>
            <div style="width:110px;height:1px;background:rgba(255,255,255,.3);margin:5px auto;"></div>
            <div style="font-size:9.5px;font-weight:700;color:${COLORS.gold};">${escapeHtml(coFounderName || '—')}</div>
            <div style="font-size:8.5px;color:#B9C2D6;">Co-Founder</div>
          </div>
        </div>

        <div style="flex-shrink:0;display:flex;align-items:center;gap:10px;">
          ${qrCodeDataUri ? `<img src="${qrCodeDataUri}" alt="" style="width:60px;height:60px;border-radius:6px;background:white;padding:4px;" />` : ''}
          <div style="font-size:9.5px;font-weight:700;line-height:1.3;">SCAN TO READ<br/>FULL STORY</div>
        </div>
      </div>

    </div></div>
  </body></html>`
}

// Square 1200x1200 social-share preview — shares the same data object,
// laid out for Instagram/LinkedIn/Facebook square previews.
function renderSocialPreviewHtml(data, fontCss) {
  const { fullName, avatarUrl, companyName, storyTitle, impactScore } = data

  return `<!DOCTYPE html>
  <html><head><meta charset="utf-8" />
  <style>${baseStyles(fontCss)}
    body { width: 1200px; height: 1200px; }
    .sheet {
      width: 1200px; height: 1200px; padding: 80px;
      background-image: radial-gradient(circle, rgba(255,255,255,.05) 1px, transparent 1.6px), linear-gradient(150deg, ${COLORS.navyDeep} 0%, ${COLORS.navy} 60%, #16294F 100%);
      background-size: 26px 26px, cover;
      color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;
    }
  </style></head>
  <body>
    <div class="sheet">
      <div class="heading" style="font-size:22px;font-weight:700;letter-spacing:.25em;color:#CBD5E8;">CERTIFICATE OF</div>
      <div class="heading" style="font-size:64px;font-weight:900;letter-spacing:4px;margin-top:4px;
        background:linear-gradient(180deg, ${COLORS.goldLight}, ${COLORS.gold} 55%, ${COLORS.goldDark});
        -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;">IMPACT</div>
      <div style="margin-top:40px;">${avatarHtml(avatarUrl, fullName, 170)}</div>
      <div class="heading" style="font-size:34px;font-weight:700;margin-top:26px;">${escapeHtml(fullName)}</div>
      <div style="font-size:16px;color:#C9D2E6;margin-top:6px;">${escapeHtml(companyName)}</div>
      <div class="heading" style="font-size:22px;font-weight:700;margin-top:32px;max-width:900px;line-height:1.4;color:${COLORS.gold};">${escapeHtml(storyTitle)}</div>
      ${impactScore ? `<div style="margin-top:30px;font-size:15px;font-weight:700;color:white;">Impact Score: <span style="color:${COLORS.gold};">${impactScore}/100</span></div>` : ''}
      <div style="display:inline-flex;align-items:center;gap:6px;padding:10px 22px;border-radius:100px;font-size:14px;font-weight:600;background:${COLORS.primary};color:white;margin-top:28px;">✓ Verified Story Contributor</div>
    </div>
  </body></html>`
}

module.exports = { renderCertificateHtml, renderSocialPreviewHtml, COLORS }
