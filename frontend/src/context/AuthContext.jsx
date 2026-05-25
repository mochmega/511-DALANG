// File: src/context/AuthContext.jsx
// Satu sumber kebenaran untuk auth state (token, role, username).
// Menggantikan pembacaan langsung dari localStorage di seluruh komponen.

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // null  = belum diverifikasi (loading)
  // false = token tidak valid / belum login
  // { token, role, username } = valid dan terautentikasi
  const [auth, setAuthState] = useState(null)

  // Fungsi validasi ke backend — dipanggil sekali saat mount
  const validateToken = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      setAuthState(false)
      return
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/validate-token`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setAuthState({
          token,
          role: data.role,
          username: data.username
        })
      } else {
        // Token kadaluarsa atau dipalsukan — bersihkan semua
        clearAuth()
      }
    } catch (error) {
      // Jangan clearAuth saat network error — token mungkin masih valid
      // Biarkan user masuk, biarkan request berikutnya yang memvalidasi
      console.error("Server tidak dapat diakses:", error)
      if (token) {
        setAuthState({
          token,
          role: localStorage.getItem('role') || 'user',
          username: localStorage.getItem('username') || ''
        })
      } else {
        setAuthState(false)
      }
    }
  }, [])

  useEffect(() => {
    validateToken()
  }, [validateToken])

  // Dipanggil saat login berhasil
  const login = (token, role, username, theme) => {
    localStorage.setItem('token', token)
    localStorage.setItem('role', role)
    localStorage.setItem('username', username)
    if (theme) {
      localStorage.setItem('themeColor', theme)
      document.documentElement.setAttribute('data-theme', theme)
    }
    setAuthState({ token, role, username })
  }

  // Dipanggil saat logout atau token invalid
  const clearAuth = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('username')
    setAuthState(false)
  }

  return (
    <AuthContext.Provider value={{ auth, login, clearAuth, validateToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth harus digunakan di dalam AuthProvider')
  return ctx
}
