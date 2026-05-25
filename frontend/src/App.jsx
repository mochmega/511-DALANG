import { useState, useEffect, useRef } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Pencarian from './pages/Pencarian'
import Sirkulasi from './pages/Sirkulasi'
import Mutasi from './pages/Mutasi'
import Pengaturan from './pages/Pengaturan'
import Registrasi from './pages/Registrasi'
import Login from './pages/Login'
import LogAktivitas from './pages/LogAktivitas'
import CariDokumen from './pages/CariDokumen'
import { useAlert } from './context/AlertContext'
import { useAuth } from './context/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'

// ==========================================
// KOMPONEN SATPAM (PRIVATE ROUTE) — Versi Aman
// ==========================================
// auth = null  → masih loading (validasi token ke backend)
// auth = false → tidak login → redirect /login
// auth = {...} → valid → tampilkan konten
const PrivateRoute = ({ children }) => {
  const { auth } = useAuth()

  if (auth === null) {
    // Tampilkan layar loading elegan selama validasi token berlangsung
    return (
      <div className="flex h-screen bg-slate-950 items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <img src="/logo.png" alt="Logo" className="w-16 h-16 object-contain opacity-60 drop-shadow-lg" />
          <p className="text-slate-500 font-semibold tracking-widest text-sm uppercase">Memverifikasi Sesi...</p>
        </div>
      </div>
    )
  }

  return auth ? children : <Navigate to="/login" replace />
}

const RoleRoute = ({ children, allowedRoles }) => {
  const { auth } = useAuth()
  if (auth === null) return null // Tunggu, jangan redirect dulu
  if (!allowedRoles.includes(auth?.role)) return (
    <div className="flex flex-col items-center justify-center h-full text-center py-20">
      <div className="bg-rose-500/10 text-rose-400 p-6 rounded-2xl border border-rose-500/30 max-w-md shadow-lg shadow-rose-500/5">
        <svg className="w-16 h-16 mx-auto mb-4 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        <h2 className="text-2xl font-black mb-2 uppercase tracking-wide">Akses Ditolak</h2>
        <p className="font-medium opacity-80 mb-6">Maaf, tingkat akses akun Anda tidak memiliki izin untuk halaman ini.</p>
        <Link to="/" className="px-6 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold rounded-lg transition-all border border-rose-500/40">Kembali ke Beranda</Link>
      </div>
    </div>
  )
  return children
}

const NavItem = ({ to, icon, label, isOpen }) => {
  const location = useLocation()
  const isActive = location.pathname === to

  return (
    <Link 
      to={to} 
      title={!isOpen ? label : ""} 
      className={`flex items-center ${isOpen ? 'justify-start px-4' : 'justify-center px-0'} py-3 mx-3 my-1 rounded-xl font-bold transition-all duration-300 relative group overflow-hidden ${
        isActive 
          ? 'bg-theme-500/10 text-theme-400 border border-theme-500/30 shadow-lg shadow-theme-500/15' 
          : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
      }`}
      style={{ textDecoration: 'none' }}
    >
      {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-theme-400 rounded-l-xl shadow-[0_0_10px_var(--color-theme-400)]"></div>}

      <span className="flex-shrink-0 relative z-10 flex items-center justify-center">
        {icon}
      </span>
      
      <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 relative z-10 ${
        isOpen ? 'ml-3 w-32 opacity-100' : 'w-0 opacity-0 m-0'
      }`}>
        {label}
      </span>
    </Link>
  )
}

// INI ADALAH LAYOUT UTAMA (YANG ADA SIDEBARNYA)
function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const navigate = useNavigate()
  const { showAlert } = useAlert()
  const { auth, clearAuth, updatePreferences } = useAuth()

  // Pakai auth dari context — bukan localStorage langsung
  const role = auth?.role || 'user'
  const username = auth?.username || ''

  const handleLogout = () => {
    clearAuth()
    navigate('/login')
  }

  // AUTO-LOGOUT & IDLE TIMEOUT LOGIC
  const idleTimeoutRef = useRef(null)

  const resetIdleTimer = () => {
    if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current)
    idleTimeoutRef.current = setTimeout(() => {
      showAlert("Sesi Anda telah berakhir karena tidak ada aktivitas selama 10 menit.", "error")
      handleLogout()
    }, 600000) // 10 menit
  }

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll']
    const activityHandler = () => resetIdleTimer()

    events.forEach(evt => window.addEventListener(evt, activityHandler))
    resetIdleTimer()

    return () => {
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current)
      events.forEach(evt => window.removeEventListener(evt, activityHandler))
    }
  }, [])

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
      
      <aside className={`${isSidebarOpen ? 'w-72' : 'w-24'} bg-slate-900 border-r border-slate-800/50 flex flex-col transition-all duration-300 shadow-2xl z-20 flex-shrink-0`}>
        
        <div className={`h-20 flex items-center ${isSidebarOpen ? 'justify-start px-6' : 'justify-center px-0'} border-b border-slate-800/50 flex-shrink-0 transition-all duration-300`}>
          <div className="flex-shrink-0">
            <img src="/logo.png" alt="Logo 511 Dalang" className="w-12 h-12 object-contain drop-shadow-xl" />
          </div>
          <div className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'ml-4 w-auto opacity-100' : 'w-0 opacity-0 m-0'}`}>
            <h1 className="text-xl font-black text-white leading-tight m-0 tracking-widest drop-shadow-md">511 DALANG</h1>
          </div>
        </div>

        <nav className="flex-1 py-4 flex flex-col overflow-y-auto overflow-x-hidden">
          <NavItem to="/" label="Dashboard" isOpen={isSidebarOpen} icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>} />
          <NavItem to="/pencarian" label="Pencarian Berkas" isOpen={isSidebarOpen} icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>} />
          <NavItem to="/cari-dokumen" label="Cari Dokumen" isOpen={isSidebarOpen} icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>} />
          <NavItem to="/sirkulasi" label="Sirkulasi" isOpen={isSidebarOpen} icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>} />
          
          {/* Fix #6: Role dari AuthContext — bukan dari localStorage mentah */}
          {role !== 'user' && (
            <>
              <NavItem to="/mutasi" label="Mutasi" isOpen={isSidebarOpen} icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>} />
              <NavItem to="/registrasi" label="Registrasi" isOpen={isSidebarOpen} icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="12" x2="12" y1="12" y2="18"/><line x1="9" x2="15" y1="15" y2="15"/></svg>} />
            </>
          )}
          <NavItem to="/log" label="Log Aktivitas" isOpen={isSidebarOpen} icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>} />
		  <NavItem to="/pengaturan" label="Pengaturan" isOpen={isSidebarOpen} icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>} />
        </nav>

        {/* PROFIL & LOGOUT */}
        <div className={`mt-auto border-t border-slate-800/50 p-4 transition-all duration-300 ${isSidebarOpen ? 'px-4' : 'px-2 flex flex-col items-center'}`}>
          <div className={`bg-slate-800/30 rounded-xl p-3 border border-slate-700/50 flex items-center gap-3 ${!isSidebarOpen && 'justify-center'}`}>
            <div className="w-10 h-10 rounded-full bg-theme-500/20 text-theme-400 border border-theme-500/30 flex items-center justify-center font-bold flex-shrink-0 uppercase">
              {(username || 'SU').substring(0, 2)}
            </div>
            {isSidebarOpen && (
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-bold text-white truncate capitalize">{username || 'Superuser'}</p>
                <p className="text-[10px] text-theme-400 font-semibold tracking-wider uppercase">{role || 'ADMINISTRATOR'}</p>
              </div>
            )}
            <button onClick={handleLogout} title="Keluar" className={`text-slate-400 hover:text-rose-400 transition-colors p-2 rounded-lg hover:bg-rose-500/10 ${!isSidebarOpen && 'mt-2'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </div>

      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-theme-500/5 rounded-full blur-[120px] pointer-events-none z-0"></div>

        <header className="h-20 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/50 flex items-center px-6 shadow-sm z-10 flex-shrink-0 justify-between">
          <div className="flex items-center gap-5">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2.5 rounded-xl text-theme-400 bg-theme-500/10 border border-theme-500/30 hover:bg-theme-500/20 hover:border-theme-400/50 transition-all focus:outline-none">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={isSidebarOpen ? "M4 6h16M4 12h16M4 18h16" : "M4 6h16M4 12h8m-8 6h16"} /></svg>
            </button>
            <div className="text-white font-black tracking-wide text-lg truncate drop-shadow-md uppercase">
              APLIKASI GUDANG BELAKANG
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                const currentMode = auth?.mode || 'dark'
                updatePreferences(null, currentMode === 'light' ? 'dark' : 'light')
              }}
              title="Toggle Terang/Gelap"
              className="p-2.5 rounded-xl text-theme-400 bg-theme-500/10 border border-theme-500/30 hover:bg-theme-500/20 hover:border-theme-400/50 transition-all focus:outline-none flex items-center justify-center"
            >
              {auth?.mode === 'light' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 relative z-10">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Navigate to="/" replace />} />
              <Route path="/pencarian" element={<Pencarian />} />
              <Route path="/cari-dokumen" element={<CariDokumen />} />
              <Route path="/sirkulasi" element={<Sirkulasi />} />
              <Route path="/mutasi" element={<RoleRoute allowedRoles={['superuser','petugas']}><Mutasi /></RoleRoute>} />
              <Route path="/registrasi" element={<RoleRoute allowedRoles={['superuser','petugas']}><Registrasi /></RoleRoute>} />
              <Route path="/log" element={<LogAktivitas />} />
              <Route path="/pengaturan" element={<Pengaturan />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}

// ==========================================
// PUSAT PENGATURAN ROUTING (PINTU UTAMA)
// ==========================================

export default function App() {

  return (
    <Router>
      <Routes>
        {/* JALUR PUBLIK: Halaman Login berdiri sendiri tanpa Sidebar */}
        <Route path="/login" element={<Login />} />
        
        {/* JALUR PRIVAT: Fix #7 — PrivateRoute kini menunggu validasi token selesai */}
        <Route path="/*" element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        } />
      </Routes>
    </Router>
  )
}