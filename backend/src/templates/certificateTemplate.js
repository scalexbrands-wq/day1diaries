const COLORS = {
  primary: '#FF6B35',
  secondary: '#0F172A',
  gold: '#D4AF37',
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
      color: ${COLORS.secondary};
    }
    .heading { font-family: 'Playfair Display', Georgia, serif; }
    .badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 14px; border-radius: 100px; font-size: 12px; font-weight: 600;
    }
  `
}

function avatarHtml(avatarUrl, fullName, size) {
  if (avatarUrl) {
    return `<img src="${escapeHtml(avatarUrl)}" alt="" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;border:4px solid ${COLORS.gold};" />`
  }
  const initials = escapeHtml((fullName || '?').trim().slice(0, 1).toUpperCase())
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;border:4px solid ${COLORS.gold};
    background:${COLORS.primary};color:white;display:flex;align-items:center;justify-content:center;
    font-size:${size * 0.4}px;font-weight:700;font-family:'Playfair Display',Georgia,serif;">${initials}</div>`
}

function insightBadgesHtml(tags) {
  const palette = [COLORS.primary, COLORS.secondary, COLORS.gold]
  return (tags || []).map((tag, i) => `
    <span class="badge" style="background:${palette[i % palette.length]}1A;color:${palette[i % palette.length]};border:1px solid ${palette[i % palette.length]}40;">
      ${escapeHtml(tag)}
    </span>
  `).join('')
}

function communityStatsHtml(snapshot) {
  const stats = [
    ['Views', snapshot.viewsCount],
    ['Likes', snapshot.likesCount],
    ['Comments', snapshot.commentsCount],
    ['Shares', snapshot.sharesCount],
    ['Bookmarks', snapshot.savesCount],
  ]
  return stats.map(([label, value]) => `
    <div style="text-align:center;">
      <div class="heading" style="font-size:20px;font-weight:700;color:${COLORS.primary};">${(value || 0).toLocaleString()}</div>
      <div style="font-size:11px;color:#6B5347;text-transform:uppercase;letter-spacing:.04em;">${label}</div>
    </div>
  `).join('')
}

// Full landscape certificate — rendered at 1600x1131 viewport.
function renderCertificateHtml(data, fontCss) {
  const {
    fullName, avatarUrl, storyTitle, storyExcerpt, highlight,
    companyName, jobTitle, joiningDate, industry, location, companyLogoUrl,
    insightTags, impactLevel, impactIcon, snapshot,
    certificateNumber, issuedAt, qrCodeDataUri, websiteUrl,
  } = data

  return `<!DOCTYPE html>
  <html><head><meta charset="utf-8" />
  <style>${baseStyles(fontCss)}
    body { width: 1600px; height: 1131px; }
    .sheet {
      width: 1600px; height: 1131px; padding: 56px 72px;
      background: linear-gradient(135deg, ${COLORS.background} 0%, #FFFFFF 60%, ${COLORS.background} 100%);
      border: 10px solid ${COLORS.secondary};
      position: relative; display: flex; flex-direction: column;
    }
    .gold-rule { height: 3px; background: linear-gradient(90deg, transparent, ${COLORS.gold}, transparent); }
  </style></head>
  <body>
    <div class="sheet">
      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div class="heading" style="font-size:26px;font-weight:900;color:${COLORS.primary};">Day1 Diaries</div>
        <div style="text-align:center;flex:1;">
          <div style="font-size:13px;color:#6B5347;font-weight:600;">India's First AI-Powered Freshers Community</div>
        </div>
        <div class="badge" style="background:${COLORS.secondary};color:white;">✓ Verified Story Contributor</div>
      </div>
      <div class="gold-rule" style="margin:18px 0;"></div>

      <!-- Main -->
      <div style="display:flex;flex-direction:column;align-items:center;text-align:center;padding:8px 0 18px;">
        ${avatarHtml(avatarUrl, fullName, 110)}
        <div class="heading" style="font-size:24px;font-weight:700;margin-top:14px;">${escapeHtml(fullName)}</div>
        <div class="heading" style="font-size:34px;font-weight:900;color:${COLORS.secondary};margin-top:10px;letter-spacing:.03em;">
          CERTIFICATE OF STORY CONTRIBUTION
        </div>
        <div style="font-size:14px;color:#6B5347;max-width:880px;margin-top:10px;line-height:1.5;">
          This certificate is proudly awarded to <strong>${escapeHtml(fullName)}</strong> for sharing their valuable
          Day 1 professional journey and helping future freshers learn from real-world experiences.
        </div>
      </div>

      <!-- Body: snapshot + highlight/insights -->
      <div style="display:flex;gap:24px;flex:1;">
        <div style="flex:1;background:white;border:1px solid #EADFCF;border-radius:16px;padding:20px 24px;">
          <div class="heading" style="font-size:15px;font-weight:700;color:${COLORS.primary};margin-bottom:10px;">Story Snapshot</div>
          <div style="font-size:16px;font-weight:700;margin-bottom:8px;">${escapeHtml(storyTitle)}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 16px;font-size:12.5px;color:#3A2E22;">
            <div><strong>Company:</strong> ${escapeHtml(companyName)}</div>
            <div><strong>Role:</strong> ${escapeHtml(jobTitle)}</div>
            <div><strong>Joined:</strong> ${escapeHtml(formatDate(joiningDate))}</div>
            <div><strong>Industry:</strong> ${escapeHtml(industry || '—')}</div>
            <div><strong>Location:</strong> ${escapeHtml(location || '—')}</div>
          </div>
          ${companyLogoUrl ? `<img src="${escapeHtml(companyLogoUrl)}" alt="" style="height:32px;margin-top:10px;object-fit:contain;" />` : ''}

          <div class="heading" style="font-size:15px;font-weight:700;color:${COLORS.primary};margin-top:18px;margin-bottom:8px;">Story Highlight</div>
          <div style="font-size:13.5px;font-style:italic;color:#3A2E22;line-height:1.5;">“${escapeHtml(highlight || storyExcerpt)}”</div>

          <div class="heading" style="font-size:15px;font-weight:700;color:${COLORS.primary};margin-top:18px;margin-bottom:8px;">AI Insights</div>
          <div>${insightBadgesHtml(insightTags)}</div>
        </div>

        <div style="width:340px;display:flex;flex-direction:column;gap:16px;">
          <div style="background:${COLORS.secondary};color:white;border-radius:16px;padding:18px;text-align:center;">
            <div style="font-size:30px;">${impactIcon}</div>
            <div class="heading" style="font-size:16px;font-weight:700;margin-top:4px;">${escapeHtml(impactLevel)}</div>
            <div style="font-size:11px;opacity:.75;margin-top:2px;">Impact Level</div>
          </div>

          <div style="background:white;border:1px solid #EADFCF;border-radius:16px;padding:16px;flex:1;">
            <div class="heading" style="font-size:13px;font-weight:700;color:${COLORS.primary};margin-bottom:4px;">Community Impact</div>
            <div style="font-size:11px;color:#6B5347;margin-bottom:12px;">Your story is helping future freshers learn from real experiences.</div>
            <div style="display:flex;justify-content:space-between;">${communityStatsHtml(snapshot || {})}</div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="gold-rule" style="margin:16px 0 12px;"></div>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div style="font-size:11px;color:#6B5347;">
          <div><strong>Certificate ID:</strong> ${escapeHtml(certificateNumber)}</div>
          <div><strong>Issued:</strong> ${escapeHtml(formatDate(issuedAt))}</div>
          <div>${escapeHtml(websiteUrl)}</div>
        </div>
        <div style="font-size:12px;font-weight:600;color:${COLORS.secondary};text-align:center;max-width:520px;">
          "Every Fresher Story Is A Memory. For Someone Else, It's A Roadmap."
        </div>
        ${qrCodeDataUri ? `<img src="${qrCodeDataUri}" alt="" style="width:78px;height:78px;" />` : '<div style="width:78px;"></div>'}
      </div>
    </div>
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
      background: linear-gradient(160deg, ${COLORS.secondary} 0%, #1E293B 100%);
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
      <div class="badge" style="background:${COLORS.primary};color:white;margin-top:40px;font-size:15px;padding:10px 22px;">✓ Verified Story Contributor</div>
    </div>
  </body></html>`
}

module.exports = { renderCertificateHtml, renderSocialPreviewHtml, COLORS }
