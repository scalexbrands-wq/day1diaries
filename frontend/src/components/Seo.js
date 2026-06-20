import { useEffect } from 'react'

// www, not bare apex — day1diaries.com only redirects "/" to www and
// 404s on every other path.
const SITE_URL = 'https://www.day1diaries.com'

function upsertMeta(attr, key, content) {
  if (!content) return
  let el = document.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertCanonical(href) {
  let el = document.querySelector('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

// Sets document.title + meta/OG/Twitter tags for the current page.
// Purely a <head> side effect — renders nothing. Mainly benefits
// JS-executing crawlers (Google) and the browser tab title; rich
// social-link previews come from the server-rendered /share/* routes
// (see backend/src/routes/seo.js) since most social bots don't run JS.
export default function Seo({ title, description, image, path }) {
  useEffect(() => {
    if (title) document.title = title
    upsertMeta('name', 'description', description)
    upsertMeta('property', 'og:title', title)
    upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:image', image)
    upsertMeta('name', 'twitter:title', title)
    upsertMeta('name', 'twitter:description', description)
    upsertMeta('name', 'twitter:image', image)
    if (path) upsertCanonical(`${SITE_URL}${path}`)
  }, [title, description, image, path])

  return null
}
