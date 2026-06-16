// ============================================================
// Day1 Diaries — AuthContext (AWS / Cognito version)
// Replaces the Supabase-based AuthContext.
// Reads session state from src/lib/api.js (Cognito tokens
// stored in localStorage + /auth/me for the profile row).
// ============================================================
import React, { createContext, useContext, useEffect, useState } from 'react'
import { getSession, getStoredTokens } from '../lib/api'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)       // profile row (from /auth/me) acts as "user"
  const [profile, setProfile] = useState(null) // kept separate for parity with old component code
  const [loading, setLoading] = useState(true)

  const loadSession = async () => {
    const tokens = getStoredTokens()
    if (!tokens) {
      setUser(null)
      setProfile(null)
      setLoading(false)
      return
    }

    const { data, error } = await getSession()
    if (error || !data?.session) {
      setUser(null)
      setProfile(null)
    } else {
      setUser(data.session.user)
      setProfile(data.session.user)
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

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile, reloadSession: loadSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
