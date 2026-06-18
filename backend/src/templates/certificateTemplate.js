const COLORS = {
  primary: '#FF6B2B',
  navy: '#0B1E3D',
  gold: '#D4AF37',
  goldDark: '#B8860B',
  cream: '#FBF6EC',
  background: '#FAF7F2',
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
    return `<img src="${escapeHtml(avatarUrl)}" alt="" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;border:5px solid ${COLORS.gold};box-shadow:0 4px 16px rgba(11,30,61,.18);" />`
  }
  const initials = escapeHtml((fullName || '?').trim().slice(0, 1).toUpperCase())
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;border:5px solid ${COLORS.gold};
    background:${COLORS.primary};color:white;display:flex;align-items:center;justify-content:center;
    font-size:${size * 0.4}px;font-weight:700;font-family:'Playfair Display',Georgia,serif;box-shadow:0 4px 16px rgba(11,30,61,.18);">${initials}</div>`
}

// Metadata for the rule-based AI insight tags — mirrors the keyword
// categories in certificateInsights.js so any combination renders nicely.
const INSIGHT_META = {
  'Confidence Building': { icon: '📈', color: '#059669', desc: 'Shows courage to step out of comfort zone' },
  'Team Collaboration':  { icon: '👥', color: '#2563EB', desc: 'Eager to connect and learn from others' },
  'Communication':       { icon: '💬', color: '#0EA5E9', desc: 'Speaks up and shares ideas clearly' },
  'Learning Mindset':    { icon: '📚', color: '#7C3AED', desc: 'Values curiosity and continuous learning' },
  'Leadership':          { icon: '🧭', color: '#B45309', desc: 'Takes initiative and guides others' },
  'Adaptability':        { icon: '🔄', color: '#0D9488', desc: 'Thrives in new and changing environments' },
  'Problem Solving':     { icon: '🧩', color: '#DB2777', desc: 'Finds solutions through persistence' },
  'Growth Potential':    { icon: '📈', color: COLORS.primary, desc: 'Strong foundation for long-term success' },
  'Ownership':           { icon: '🎯', color: '#475569', desc: 'Takes responsibility and follows through' },
  'Innovation':          { icon: '💡', color: '#CA8A04', desc: 'Brings creative ideas and new approaches' },
}
const MAX_INSIGHT_ROWS = 4

function insightRowsHtml(tags) {
  return (tags || []).slice(0, MAX_INSIGHT_ROWS).map(tag => {
    const meta = INSIGHT_META[tag] || { icon: '✨', color: COLORS.primary, desc: 'A standout quality from this story' }
    return `
      <div style="display:flex;gap:10px;align-items:flex-start;">
        <div style="width:26px;height:26px;border-radius:50%;background:${meta.color}1A;color:${meta.color};
          display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;">${meta.icon}</div>
        <div>
          <div style="font-size:12.5px;font-weight:700;color:${meta.color};">${escapeHtml(tag).toUpperCase()}</div>
          <div style="font-size:11px;color:#6B5347;margin-top:1px;">${escapeHtml(meta.desc)}</div>
        </div>
      </div>
    `
  }).join('')
}

function snapshotRowHtml(icon, label, value, isLast) {
  return `
    <div style="display:flex;gap:10px;align-items:flex-start;padding:9px 0;${isLast ? '' : `border-bottom:1px solid #EFE5D8;`}">
      <div style="width:26px;height:26px;border-radius:50%;background:${COLORS.navy};color:white;
        display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;">${icon}</div>
      <div style="min-width:0;">
        <div style="font-size:9.5px;font-weight:700;color:#8C7B6E;letter-spacing:.04em;">${label}</div>
        <div style="font-size:13px;font-weight:700;color:${COLORS.navy};margin-top:1px;">${value}</div>
      </div>
    </div>
  `
}

function starsHtml() {
  const colors = [COLORS.navy, COLORS.navy, COLORS.navy, COLORS.primary, COLORS.primary]
  return colors.map(c => `<span style="color:${c};font-size:16px;font-family:'DejaVu Sans',sans-serif;">★</span>`).join('')
}

const COMMUNITY_STATS = [
  ['🔥', '1000+', 'New Stories Daily'],
  ['🎓', '100+', 'Freshers Joined'],
  ['💼', '50+', 'Freshers Got Jobs'],
]

function communityStatsRowHtml() {
  return `
    <div style="display:flex;justify-content:space-around;align-items:center;margin-top:26px;
      padding:18px 10px;background:white;border:1px solid #EADFCF;border-radius:12px;">
      ${COMMUNITY_STATS.map(([icon, value, label]) => `
        <div style="text-align:center;">
          <div style="font-size:24px;">${icon}</div>
          <div class="heading" style="font-size:24px;font-weight:900;color:${COLORS.navy};margin-top:3px;">${value}</div>
          <div style="font-size:11px;color:#6B5347;font-weight:600;">${label}</div>
        </div>
      `).join('')}
    </div>
  `
}

// Full certificate — rendered at 1200x980 viewport (portrait).
function renderCertificateHtml(data, fontCss) {
  const {
    fullName, avatarUrl, storyTitle, highlight,
    companyName, jobTitle, joiningDate, companyLogoUrl,
    insightTags, impactLevel, impactIcon,
    certificateNumber, issuedAt, qrCodeDataUri, websiteUrl,
    communityManagerName, coFounderName,
  } = data

  return `<!DOCTYPE html>
  <html><head><meta charset="utf-8" />
  <style>${baseStyles(fontCss)}
    body { width: 1600px; }
    .frame { width: 1600px; background: ${COLORS.navy}; padding: 18px; }
    .sheet {
      width: 100%; padding: 56px 70px 40px;
      background: linear-gradient(160deg, ${COLORS.background} 0%, #FFFFFF 55%, ${COLORS.background} 100%);
      display: flex; flex-direction: column;
    }
  </style></head>
  <body>
    <div class="frame"><div class="sheet">

      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div style="display:flex;gap:10px;align-items:flex-start;">
          <div style="width:42px;height:42px;border-radius:10px;background:${COLORS.primary};color:white;
            display:flex;align-items:center;justify-content:center;font-weight:900;font-size:20px;flex-shrink:0;">1</div>
          <div>
            <div class="heading" style="font-size:18px;font-weight:900;line-height:1.1;">
              <span style="color:${COLORS.navy};">DAY 1</span><br/><span style="color:${COLORS.navy};">DIARIES</span>
            </div>
            <div style="font-size:9.5px;color:#6B5347;font-weight:600;max-width:150px;margin-top:3px;line-height:1.3;">
              India's First AI-Powered Freshers Community
            </div>
          </div>
        </div>

        <div style="text-align:center;flex-shrink:0;">
          <div style="margin-bottom:6px;">${starsHtml()}</div>
          <div class="heading" style="font-size:46px;font-weight:900;color:${COLORS.navy};letter-spacing:2px;">CERTIFICATE</div>
          <div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-top:2px;">
            <span style="height:1px;width:50px;background:${COLORS.primary};"></span>
            <span style="color:${COLORS.primary};font-weight:800;font-size:14px;letter-spacing:.15em;">OF STORY CONTRIBUTION</span>
            <span style="height:1px;width:50px;background:${COLORS.primary};"></span>
          </div>
          <div style="margin-top:8px;font-size:12px;color:#6B5347;">This certificate is proudly awarded to</div>
        </div>

        <div style="width:118px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;">
          <div style="width:100px;height:100px;border-radius:50%;
            background:radial-gradient(circle at 35% 30%,#F7E27A,${COLORS.gold} 60%,${COLORS.goldDark});
            border:3px solid ${COLORS.goldDark};display:flex;align-items:center;justify-content:center;text-align:center;
            color:#241A00;font-weight:800;font-size:9.5px;line-height:1.3;padding:8px;">VERIFIED<br/>STORY<br/>CONTRIBUTOR</div>
          <div style="display:flex;margin-top:-4px;">
            <div style="width:0;height:0;border-left:18px solid transparent;border-top:38px solid ${COLORS.gold};"></div>
            <div style="width:0;height:0;border-right:18px solid transparent;border-top:38px solid ${COLORS.goldDark};"></div>
          </div>
        </div>
      </div>

      <!-- Awardee: photo + name + snapshot -->
      <div style="display:flex;gap:30px;margin-top:26px;align-items:flex-start;">
        <div style="width:230px;flex-shrink:0;text-align:center;">
          <div style="display:flex;align-items:center;justify-content:center;gap:4px;">
            <span style="font-size:30px;opacity:.65;">🌿</span>
            ${avatarHtml(avatarUrl, fullName, 160)}
            <span style="font-size:30px;opacity:.65;transform:scaleX(-1);display:inline-block;">🌿</span>
          </div>
          <div style="width:30px;height:30px;border-radius:50%;background:${COLORS.primary};color:white;
            display:flex;align-items:center;justify-content:center;margin:-15px auto 0;border:3px solid white;font-size:14px;font-family:'DejaVu Sans',sans-serif;">★</div>
        </div>

        <div style="flex:1;min-width:0;padding-top:10px;">
          <div class="heading" style="font-size:36px;font-weight:900;color:${COLORS.navy};letter-spacing:.5px;">
            ${escapeHtml((fullName || '').toUpperCase())}
          </div>
          <div style="width:64px;height:3px;background:linear-gradient(90deg,${COLORS.gold},${COLORS.primary});margin:12px 0 16px;"></div>
          <div style="font-size:14px;color:#3A2E22;line-height:1.75;">
            for sharing their valuable <span style="color:${COLORS.primary};font-weight:700;">Day 1</span> Professional Journey
            and helping <span style="color:${COLORS.primary};font-weight:700;">future freshers</span> learn from real-world experiences.
          </div>
          <div style="font-size:14px;color:#3A2E22;line-height:1.75;margin-top:12px;">
            Your story has become part of a growing knowledge base that
            <span style="color:${COLORS.primary};font-weight:700;">inspires</span>,
            <span style="color:${COLORS.primary};font-weight:700;">guides</span>, and
            <span style="color:${COLORS.primary};font-weight:700;">empowers</span> the next generation of professionals.
          </div>
        </div>

        <div style="width:380px;flex-shrink:0;">
          <div style="background:${COLORS.navy};color:white;border-radius:10px 10px 0 0;padding:11px 18px;
            font-weight:700;font-size:13px;display:flex;align-items:center;gap:8px;">📖 STORY SNAPSHOT</div>
          <div style="background:white;border:1px solid #EADFCF;border-top:none;border-radius:0 0 12px 12px;padding:5px 18px;">
            ${snapshotRowHtml('✎', 'STORY TITLE', `“${escapeHtml(storyTitle)}”`)}
            ${snapshotRowHtml('🏢', 'COMPANY', `${escapeHtml(companyName)}${companyLogoUrl ? ` <img src="${escapeHtml(companyLogoUrl)}" style="height:14px;vertical-align:middle;object-fit:contain;" />` : ''}`)}
            ${snapshotRowHtml('💼', 'ROLE', escapeHtml(jobTitle))}
            ${snapshotRowHtml('📅', 'JOINED ON', escapeHtml(formatDate(joiningDate) || '—'), true)}
          </div>
        </div>
      </div>

      <!-- Highlight + AI insights + impact level -->
      <div style="display:flex;gap:24px;margin-top:28px;align-items:stretch;">
        <div style="flex:1;display:flex;flex-direction:column;">
          <div style="background:${COLORS.navy};color:white;border-radius:10px 10px 0 0;padding:11px 18px;
            font-weight:700;font-size:13px;display:flex;align-items:center;gap:8px;">❝ STORY HIGHLIGHT</div>
          <div style="background:${COLORS.cream};border:1px solid #EADFCF;border-top:none;border-radius:0 0 12px 12px;
            padding:22px;flex:1;display:flex;align-items:center;">
            <div style="font-style:italic;font-size:14px;color:#3A2E22;line-height:1.65;">“${escapeHtml(highlight)}”</div>
          </div>
        </div>

        <div style="flex:1.25;display:flex;flex-direction:column;">
          <div style="background:${COLORS.navy};color:white;border-radius:10px 10px 0 0;padding:11px 18px;
            font-weight:700;font-size:13px;display:flex;align-items:center;gap:8px;">🤖 AI INSIGHTS GENERATED</div>
          <div style="background:white;border:1px solid #EADFCF;border-top:none;border-radius:0 0 12px 12px;
            padding:18px 20px;flex:1;display:flex;flex-direction:column;justify-content:center;gap:14px;">
            ${insightRowsHtml(insightTags)}
          </div>
        </div>

        <div style="width:200px;flex-shrink:0;border:1px solid #EADFCF;border-radius:12px;padding:20px 12px;
          text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;background:white;">
          <div style="font-size:10.5px;font-weight:700;color:#8C7B6E;letter-spacing:.05em;margin-bottom:10px;">IMPACT LEVEL</div>
          <div style="width:70px;height:70px;border-radius:50%;background:${COLORS.cream};border:2px solid ${COLORS.gold};
            display:flex;align-items:center;justify-content:center;font-size:30px;">${impactIcon || '🚀'}</div>
          <div style="margin-top:12px;font-weight:800;font-size:14px;color:${COLORS.primary};line-height:1.3;">
            ${escapeHtml(impactLevel || '').toUpperCase()}
          </div>
        </div>
      </div>

      <!-- Footer: community impact / QR / signatures / cert id / seal -->
      <div style="display:flex;gap:24px;margin-top:28px;align-items:flex-start;">
        <div style="width:260px;flex-shrink:0;display:flex;flex-direction:column;gap:12px;">
          <div style="background:${COLORS.navy};color:white;border-radius:12px;padding:12px 14px;display:flex;gap:9px;align-items:flex-start;">
            <div style="width:26px;height:26px;border-radius:50%;background:${COLORS.primary};display:flex;align-items:center;
              justify-content:center;flex-shrink:0;font-size:12px;">👥</div>
            <div>
              <div style="font-weight:700;font-size:11px;">COMMUNITY IMPACT</div>
              <div style="font-size:9.5px;opacity:.8;margin-top:3px;line-height:1.35;">Shared with the Day1 Diaries community — helping freshers learn from real experiences.</div>
            </div>
          </div>
          ${qrCodeDataUri ? `
          <div style="display:flex;gap:8px;align-items:center;border:1px solid #EADFCF;border-radius:12px;padding:8px;background:white;">
            <img src="${qrCodeDataUri}" alt="" style="width:54px;height:54px;flex-shrink:0;" />
            <div style="font-size:9px;font-weight:700;color:${COLORS.navy};line-height:1.3;">SCAN TO READ<br/>THE FULL STORY →</div>
          </div>` : ''}
        </div>

        <div style="flex:1;display:flex;justify-content:center;align-items:center;gap:34px;padding-top:14px;">
          <div style="text-align:center;">
            <div class="sig" style="font-size:19px;color:${COLORS.navy};">${escapeHtml(communityManagerName || 'Community Manager')}</div>
            <div style="width:110px;height:1px;background:#D8CDBF;margin:6px auto;"></div>
            <div style="font-size:10px;font-weight:700;color:${COLORS.primary};">${escapeHtml(communityManagerName || '—')}</div>
            <div style="font-size:9px;color:#8C7B6E;">Community Manager</div>
          </div>
          <div style="text-align:center;">
            <div style="width:30px;height:30px;border-radius:8px;background:${COLORS.primary};color:white;
              display:flex;align-items:center;justify-content:center;font-weight:900;font-size:14px;margin:0 auto;">1</div>
            <div class="heading" style="font-size:11px;font-weight:900;color:${COLORS.navy};margin-top:4px;">DAY 1 DIARIES</div>
            <div style="font-size:8px;color:#8C7B6E;max-width:120px;margin-top:2px;line-height:1.3;">Where every first day becomes experience for the next generation.</div>
          </div>
          <div style="text-align:center;">
            <div class="sig" style="font-size:19px;color:${COLORS.navy};">${escapeHtml(coFounderName || 'Co-Founder')}</div>
            <div style="width:110px;height:1px;background:#D8CDBF;margin:6px auto;"></div>
            <div style="font-size:10px;font-weight:700;color:${COLORS.primary};">${escapeHtml(coFounderName || '—')}</div>
            <div style="font-size:9px;color:#8C7B6E;">Co-Founder</div>
          </div>
        </div>

        <div style="width:270px;flex-shrink:0;display:flex;gap:14px;align-items:flex-start;">
          <div style="flex:1;border:1px solid #EADFCF;border-radius:10px;padding:13px 16px;background:${COLORS.cream};">
            <div style="font-size:10px;color:#8C7B6E;font-weight:700;letter-spacing:.04em;">CERTIFICATE ID</div>
            <div style="font-size:13.5px;font-weight:800;color:${COLORS.navy};margin-bottom:10px;">${escapeHtml(certificateNumber)}</div>
            <div style="font-size:10px;color:#8C7B6E;font-weight:700;letter-spacing:.04em;">ISSUED ON</div>
            <div style="font-size:12.5px;font-weight:700;color:${COLORS.navy};">${escapeHtml(formatDate(issuedAt))}</div>
          </div>
          <div style="width:76px;height:76px;border-radius:50%;border:2px dashed #B0A8A0;flex-shrink:0;
            display:flex;align-items:center;justify-content:center;text-align:center;font-size:7px;color:#9C8F82;
            font-weight:700;line-height:1.25;padding:7px;">DAY 1 DIARIES · AI-POWERED FRESHERS COMMUNITY</div>
        </div>
      </div>

      ${communityStatsRowHtml()}

      <!-- Bottom bar -->
      <div style="margin:30px -70px 0;background:${COLORS.navy};color:white;padding:18px 70px;
        display:flex;justify-content:space-between;align-items:center;font-size:13px;">
        <div style="font-weight:800;line-height:1.4;">
          EVERY FRESHER STORY IS A MEMORY.<br/>
          <span style="color:${COLORS.primary};">FOR SOMEONE ELSE, IT'S A ROADMAP.</span>
        </div>
        <div style="font-size:12px;opacity:.85;">${escapeHtml(websiteUrl)}</div>
      </div>

    </div></div>
  </body></html>`
}

// Square 1200x1200 social-share preview — shares the same data object,
// laid out for Instagram/LinkedIn/Facebook square previews.
function renderSocialPreviewHtml(data, fontCss) {
  const { fullName, avatarUrl, companyName, storyTitle } = data

  return `<!DOCTYPE html>
  <html><head><meta charset="utf-8" />
  <style>${baseStyles(fontCss)}
    body { width: 1200px; height: 1200px; }
    .sheet {
      width: 1200px; height: 1200px; padding: 80px;
      background: linear-gradient(160deg, ${COLORS.navy} 0%, #1E293B 100%);
      color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;
    }
  </style></head>
  <body>
    <div class="sheet">
      <div class="heading" style="font-size:26px;font-weight:900;color:${COLORS.gold};margin-bottom:36px;">Day1 Diaries</div>
      ${avatarHtml(avatarUrl, fullName, 180)}
      <div class="heading" style="font-size:36px;font-weight:700;margin-top:28px;">${escapeHtml(fullName)}</div>
      <div style="font-size:18px;color:#CBD5E1;margin-top:6px;">${escapeHtml(companyName)}</div>
      <div class="heading" style="font-size:26px;font-weight:700;margin-top:36px;max-width:900px;line-height:1.4;">${escapeHtml(storyTitle)}</div>
      <div style="display:inline-flex;align-items:center;gap:6px;padding:10px 22px;border-radius:100px;font-size:15px;font-weight:600;background:${COLORS.primary};color:white;margin-top:40px;">✓ Verified Story Contributor</div>
    </div>
  </body></html>`
}

module.exports = { renderCertificateHtml, renderSocialPreviewHtml, COLORS }
