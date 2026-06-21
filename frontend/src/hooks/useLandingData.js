import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getLandingData, getSeoDefaults } from '../lib/api'

// Shared data-fetching for every landing page template — same API calls
// Landing.js (the "classic" template) already makes, so template2/3
// stay visually distinct but never drift on data shape or content source.
// Re-fetches whenever the active language changes, so admin-entered
// translations (hero/categories/testimonials) switch along with the UI.
export default function useLandingData() {
  const { i18n } = useTranslation()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [seo, setSeo] = useState(null)

  useEffect(() => {
    setLoading(true)
    getLandingData(i18n.language).then(({ data: d, error }) => {
      if (!error && d) setData(d)
      setLoading(false)
    })
    getSeoDefaults().then(({ data: d }) => { if (d) setSeo(d) })
  }, [i18n.language])

  return { data, loading, seo }
}

export function useCountUp(target, suffix, run) {
  const [val, setVal] = useState('0' + suffix)
  const done = useRef(false)
  useEffect(() => {
    if (!run || done.current || !target) return
    done.current = true
    let cur = 0
    const step = target / 80
    const t = setInterval(() => {
      cur += step
      if (cur >= target) { cur = target; clearInterval(t) }
      setVal(Number.isInteger(target) ? Math.floor(cur).toLocaleString() + suffix : Math.floor(cur) + suffix)
    }, 16)
    return () => clearInterval(t)
  }, [run, target, suffix])
  return val
}

export const LEVEL_ICONS = { Beginner: '🥉', Explorer: '🥈', Achiever: '🥇', Hero: '🏆', 'Super Hero': '🔥', Legend: '👑' }
export const getAvatarColor = n => ['#FF6B2B', '#7C3AED', '#059669', '#2563EB', '#EC4899', '#0EA5E9', '#F59E0B', '#DC2626'][(n || '').charCodeAt(0) % 8]
export const getInitials = n => (n || '?').split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2)
