import React, { createContext, useContext, useState, useEffect } from 'react'
import { incrementVisitCount } from '../lib/api'

const VisitorCountContext = createContext(null)

/* ── Mounted once at the app root — increments the global page-visit
   counter exactly once per browser load/refresh, and shares the result
   with any component that wants to display it (e.g. TopBar). ── */
export function VisitorCountProvider({ children }) {
  const [count, setCount] = useState(null)

  useEffect(() => {
    incrementVisitCount().then(({ data, error }) => { if (!error) setCount(data) })
  }, [])

  return <VisitorCountContext.Provider value={count}>{children}</VisitorCountContext.Provider>
}

export const useVisitorCount = () => useContext(VisitorCountContext)
