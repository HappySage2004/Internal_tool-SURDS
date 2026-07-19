import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import * as api from '../api'

// The signed-in user, as returned by /auth/me (camelCased raw shape).
export interface CurrentUser {
  id: string
  name: string
  email: string
  isAdmin: boolean
}

interface AuthState {
  currentUser: CurrentUser | null
  userId: string | null
  loading: boolean          // true while we resolve an existing token on mount
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  changePassword: (current: string, next: string) => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  // On mount: if a token is stored, resolve it to a user. An invalid/expired
  // token throws 401 (client clears it) and we fall back to the login screen.
  useEffect(() => {
    let cancelled = false
    async function resolve() {
      if (!api.getToken()) { setLoading(false); return }
      try {
        const u = await api.getMe()
        if (!cancelled) setCurrentUser(u as CurrentUser)
      } catch {
        if (!cancelled) setCurrentUser(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    resolve()
    return () => { cancelled = true }
  }, [])

  // A 401 on any request means the session died — drop back to login.
  useEffect(() => {
    const onUnauthorized = () => setCurrentUser(null)
    window.addEventListener('surds:unauthorized', onUnauthorized)
    return () => window.removeEventListener('surds:unauthorized', onUnauthorized)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const u = await api.login(email, password)
    setCurrentUser(u as CurrentUser)
  }, [])

  const logout = useCallback(() => {
    api.logout()
    setCurrentUser(null)
  }, [])

  const changePassword = useCallback(async (current: string, next: string) => {
    await api.changePassword(current, next)
  }, [])

  const value: AuthState = {
    currentUser,
    userId: currentUser?.id ?? null,
    loading,
    login,
    logout,
    changePassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
