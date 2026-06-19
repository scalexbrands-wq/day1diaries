// Landscape membership card — see utils/certificateRender.js renderMembershipCard
// for the 1050x660 viewport this is laid out against.

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function avatarHtml(avatarUrl, fullName, size) {
  if (avatarUrl) {
    return `<img src="${escapeHtml(avatarUrl)}" alt="" style="width:${size}px;height:${size}px;border-radius:16px;object-fit:cover;border:3px solid rgba(255,255,255,.6);" />`
  }
  const initials = escapeHtml((fullName || '?').trim().slice(0, 1).toUpperCase())
  return `<div style="width:${size}px;height:${size}px;border-radius:16px;border:3px solid rgba(255,255,255,.6);
    background:rgba(255,255,255,.15);color:white;display:flex;align-items:center;justify-content:center;
    font-size:${size * 0.4}px;font-weight:700;font-family:'Playfair Display',Georgia,serif;">${initials}</div>`
}

// data: { fullName, avatarUrl, membershipNumber, planName, badgeEmoji, badgeColor,
//         startDate, endDate, qrCodeDataUri, websiteUrl }
function renderMembershipCardHtml(data, fontCss) {
  const {
    fullName, avatarUrl, membershipNumber, planName, badgeEmoji, badgeColor,
    startDate, endDate, qrCodeDataUri,
  } = data
  const accent = badgeColor || '#FF6B2B'

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    ${fontCss}
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Inter', Arial, sans-serif; }
    .heading { font-family:'Playfair Display', Georgia, serif; }
  </style></head>
  <body>
    <div style="width:1050px;height:660px;position:relative;overflow:hidden;
      background:linear-gradient(135deg,${accent} 0%,#1A0800 100%);color:white;">
      <div style="position:absolute;top:-100px;right:-100px;width:400px;height:400px;border-radius:50%;background:rgba(255,255,255,.08);"></div>
      <div style="position:absolute;bottom:-140px;left:-80px;width:340px;height:340px;border-radius:50%;background:rgba(255,255,255,.06);"></div>

      <div style="position:relative;z-index:2;padding:44px 48px;display:flex;flex-direction:column;height:100%;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <div style="font-size:13px;letter-spacing:.14em;text-transform:uppercase;opacity:.85;">Day1 Diaries</div>
            <div class="heading" style="font-size:30px;font-weight:800;margin-top:4px;">Membership Card</div>
          </div>
          <div style="background:rgba(255,255,255,.15);border-radius:100px;padding:8px 18px;font-size:14px;font-weight:700;white-space:nowrap;">
            ${escapeHtml(badgeEmoji || '⭐')} ${escapeHtml(planName)}
          </div>
        </div>

        <div style="display:flex;align-items:center;gap:24px;margin-top:36px;">
          ${avatarHtml(avatarUrl, fullName, 110)}
          <div>
            <div class="heading" style="font-size:32px;font-weight:800;">${escapeHtml(fullName)}</div>
            <div style="font-size:14px;opacity:.85;margin-top:6px;letter-spacing:.05em;">${escapeHtml(membershipNumber)}</div>
          </div>
        </div>

        <div style="display:flex;gap:48px;margin-top:auto;align-items:flex-end;">
          <div style="display:flex;gap:36px;">
            <div>
              <div style="font-size:11px;opacity:.7;text-transform:uppercase;letter-spacing:.08em;">Member Since</div>
              <div style="font-size:16px;font-weight:700;margin-top:4px;">${formatDate(startDate)}</div>
            </div>
            <div>
              <div style="font-size:11px;opacity:.7;text-transform:uppercase;letter-spacing:.08em;">Valid Until</div>
              <div style="font-size:16px;font-weight:700;margin-top:4px;">${endDate ? formatDate(endDate) : 'Lifetime'}</div>
            </div>
          </div>
          <div style="margin-left:auto;background:white;border-radius:12px;padding:8px;">
            <img src="${qrCodeDataUri}" alt="" style="width:90px;height:90px;display:block;" />
          </div>
        </div>
      </div>
    </div>
  </body></html>`
}

module.exports = { renderMembershipCardHtml }
