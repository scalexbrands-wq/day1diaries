import React, { createContext, useContext, useState, useEffect } from 'react'
import { sendPresenceHeartbeat } from '../lib/api'

const VisitorCountContext = createContext(null)

const SESSION_KEY = 'day1diaries_session_id'
const HEARTBEAT_MS = 25000 // server treats a session as "online" for 90s — comfortably more than one missed beat

function getSessionId() {
  let id = localStorage.getItem(SESSION_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(SESSION_KEY, id)
  }
  return id
}

/* ── Mounted once at the app root — sends a heartbeat every ~25s with a
   persistent per-browser session id (so multiple tabs count as one
   visitor) and shares the live "online now" count it gets back with any
   component that wants to display it (e.g. TopBar's VisitorCounter).
   This is a real-time presence count, separate from the admin-editable
   lifetime site_visit_counter shown in Admin > Settings. ── */
export function VisitorCountProvider({ children }) {
  const [count, setCount] = useState(null)

  useEffect(() => {
    const sessionId = getSessionId()
    const beat = () => sendPresenceHeartbeat(sessionId).then(({ data, error }) => { if (!error) setCount(data) })
    beat()
    const interval = setInterval(beat, HEARTBEAT_MS)
    return () => clearInterval(interval)
  }, [])

  return <VisitorCountContext.Provider value={count}>{children}</VisitorCountContext.Provider>
}

export const useVisitorCount = () => useContext(VisitorCountContext)
