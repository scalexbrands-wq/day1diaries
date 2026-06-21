// ============================================================
// Day1 Diaries — AuthContext (AWS / Cognito version)
// Replaces the Supabase-based AuthContext.
// Reads session state from src/lib/api.js (Cognito tokens
// stored in localStorage + /auth/me for the profile row).
// ============================================================
import React, { createContext, useContext, useEffect, useState } from 'react'
import { getSession, getStoredTokens, getMyRoleCheck } from '../lib/api'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)       // profile row (from /auth/me) acts as "user"
  const [profile, setProfile] = useState(null) // kept separate for parity with old component code
  const [permissions, setPermissions] = useState([]) // RBAC — resolved permission keys for profile.role
  const [loading, setLoading] = useState(true)

  const loadSession = async () => {
    const tokens = getStoredTokens()
    if (!tokens) {
      setUser(null)
      setProfile(null)
      setPermissions([])
      setLoading(false)
      return
    }

    const { data, error } = await getSession()
    if (error || !data?.session) {
      setUser(null)
      setProfile(null)
      setPermissions([])
    } else {
      setUser(data.session.user)
      setProfile(data.session.user)
      // Awaited (not fire-and-forget) — otherwise `loading` would flip to
      // false before permissions resolve, and AdminRoute could bounce a
      // legitimately-permitted role (Moderator, Finance, etc.) to /feed
      // on first paint before this request comes back.
      const { data: rc } = await getMyRoleCheck()
      setPermissions(rc?.role === 'admin' ? ['*'] : (rc?.permissions || []))
    }
    setLoading(false)
  }

  useEffect(() => {
    loadSession()

    // Re-check session when the tab regains focus (covers token refresh edge cases)
    const onFocus = () => loadSession()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  const refreshProfile = () => loadSession()
  const hasPermission = (...keys) => permissions.includes('*') || keys.some(k => permissions.includes(k))

  return (
    <AuthContext.Provider value={{ user, profile, permissions, hasPermission, loading, refreshProfile, reloadSession: loadSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
