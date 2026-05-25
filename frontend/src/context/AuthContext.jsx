// File: src/context/AuthContext.jsx
// Satu sumber kebenaran untuk auth state (token, role, username).
// Menggantikan pembacaan langsung dari localStorage di seluruh komponen.

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // null  = belum diverifikasi (loading)
  // false = token tidak valid / belum login
  // { token, role, username, theme, mode } = valid dan terautentikasi
  const [auth, setAuthState] = useState(null)

  // Terapkan ke DOM
  const applyDOM = (theme, mode) => {
    if (theme) document.documentElement.setAttribute('data-theme', theme)
    if (mode) document.documentElement.setAttribute('data-mode', mode)
  }

  // Fungsi validasi ke backend — dipanggil sekali saat mount
  const validateToken = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      applyDOM(localStorage.getItem('guestTheme') || 'sky', localStorage.getItem('guestMode') || 'dark')
      setAuthState(false)
      return
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/validate-token`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        applyDOM(data.theme, data.mode)
        setAuthState({
          token,
          role: data.role,
          username: data.username,
          theme: data.theme,
          mode: data.mode
        })
      } else {
        clearAuth()
      }
    } catch (error) {
      console.error("Server tidak dapat diakses:", error)
      if (token) {
        // Fallback offline: validasi username di localStorage dengan payload JWT (BUG #3 fix)
        try {
          const payloadBase64 = token.split('.')[1]
          const payload = JSON.parse(atob(payloadBase64))
          const storedUsername = localStorage.getItem('username')
          
          if (payload.sub !== storedUsername) {
            clearAuth()
            return
          }
        } catch (e) {
          clearAuth()
          return
        }

        const cachedTheme = localStorage.getItem('cachedTheme') || 'sky'
        const cachedMode = localStorage.getItem('cachedMode') || 'dark'
        applyDOM(cachedTheme, cachedMode)
        setAuthState({
          token,
          role: localStorage.getItem('role') || 'user',
          username: localStorage.getItem('username') || '',
          theme: cachedTheme,
          mode: cachedMode
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
  const login = (token, role, username, theme, mode) => {
    localStorage.setItem('token', token)
    localStorage.setItem('role', role)
    localStorage.setItem('username', username)
    localStorage.setItem('cachedTheme', theme)
    localStorage.setItem('cachedMode', mode)
    
    applyDOM(theme, mode)
    setAuthState({ token, role, username, theme, mode })
  }

  // Dipanggil saat logout atau token invalid
  const clearAuth = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('username')
    localStorage.removeItem('cachedTheme')
    localStorage.removeItem('cachedMode')
    
    applyDOM(localStorage.getItem('guestTheme') || 'sky', localStorage.getItem('guestMode') || 'dark')
    setAuthState(false)
  }

  // Fungsi untuk update theme/mode langsung tanpa reload
  const updatePreferences = async (newTheme, newMode) => {
    const currentTheme = newTheme || auth?.theme || localStorage.getItem('guestTheme') || 'sky'
    const currentMode = newMode || auth?.mode || localStorage.getItem('guestMode') || 'dark'

    applyDOM(currentTheme, currentMode)

    if (auth && auth.token) {
      setAuthState({ ...auth, theme: currentTheme, mode: currentMode })
      localStorage.setItem('cachedTheme', currentTheme)
      localStorage.setItem('cachedMode', currentMode)
      
      try {
        await fetch(`${import.meta.env.VITE_API_URL}/api/user/theme`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${auth.token}`
          },
          body: JSON.stringify({ theme: currentTheme, mode: currentMode })
        })
      } catch (err) {
        console.error("Gagal simpan preferensi:", err)
      }
    } else {
      localStorage.setItem('guestTheme', currentTheme)
      localStorage.setItem('guestMode', currentMode)
    }
  }

  return (
    <AuthContext.Provider value={{ auth, login, clearAuth, validateToken, updatePreferences }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth harus digunakan di dalam AuthProvider')
  return ctx
}
