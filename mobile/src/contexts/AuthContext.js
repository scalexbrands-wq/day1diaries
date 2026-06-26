import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getStoredTokens, getCurrentProfile, signIn as apiSignIn, signOut as apiSignOut } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const p = await getCurrentProfile()
    setProfile(p)
    return p
  }, [])

  useEffect(() => {
    (async () => {
      const tokens = await getStoredTokens()
      if (tokens) await refresh()
      setLoading(false)
    })()
  }, [refresh])

  const signIn = async (email, password) => {
    const { data, error } = await apiSignIn(email, password)
    if (error) return { error }
    const p = await refresh()
    return { data: p, error: null }
  }

  const signOut = async () => {
    await apiSignOut()
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ profile, loading, signIn, signOut, refreshProfile: refresh, setProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
