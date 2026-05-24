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
import { useAlert } from './context/AlertContext'

// ==========================================
// KOMPONEN SATPAM (PRIVATE ROUTE)
// ==========================================
// Tugasnya ngecek: "Punya tiket (token) nggak? Kalau nggak, lempar ke /login!"
const PrivateRoute = ({ children }) => {
  const hasToken = localStorage.getItem('token') !== null
  return hasToken ? children : <Navigate to="/login" />
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
          ? 'bg-theme-500/10 text-theme-400 border border-theme-500/30 shadow-[0_0_15px_rgba(14,165,233,0.15)]' 
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

  // Fungsi Logout Tanpa Konfirmasi
  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('username')
    navigate('/login')
  }

  // AUTO-LOGOUT & IDLE TIMEOUT LOGIC
  const idleTimeoutRef = useRef(null)

  const resetIdleTimer = () => {
    if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current)
    // 10 menit = 600000 ms
    idleTimeoutRef.current = setTimeout(() => {
      showAlert("Sesi Anda telah berakhir karena tidak ada aktivitas selama 10 menit.", "error")
      handleLogout()
    }, 600000)
  }

  useEffect(() => {
    // 1. Verifikasi token ke backend saat pertama kali load
    const token = localStorage.getItem('token')
    if (token) {
      fetch(`${import.meta.env.VITE_API_URL}/api/validate-token`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => {
        if (!res.ok) throw new Error("Token Invalid")
      })
      .catch(() => {
        handleLogout()
      })
    }

    // 2. Setup event listener untuk aktivitas user
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll']
    const activityHandler = () => resetIdleTimer()

    events.forEach(evt => window.addEventListener(evt, activityHandler))
    resetIdleTimer() // start initial timer

    return () => {
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current)
      events.forEach(evt => window.removeEventListener(evt, activityHandler))
    }
  }, [])

  return (
    <div className="flex h-screen bg-[#060b14] text-slate-200 font-sans overflow-hidden">
      
      <aside className={`${isSidebarOpen ? 'w-72' : 'w-24'} bg-[#0f172a] border-r border-slate-800/50 flex flex-col transition-all duration-300 shadow-2xl z-20 flex-shrink-0`}>
        
        <div className={`h-20 flex items-center ${isSidebarOpen ? 'justify-start px-6' : 'justify-center px-0'} border-b border-slate-800/50 flex-shrink-0 transition-all duration-300`}>
          <div className="flex-shrink-0">
            <img src="/logo.png" alt="Logo 511 Dalang" className="w-12 h-12 object-contain drop-shadow-[0_0_12px_rgba(14,165,233,0.6)]" />
          </div>
          <div className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'ml-4 w-auto opacity-100' : 'w-0 opacity-0 m-0'}`}>
            <h1 className="text-xl font-black text-white leading-tight m-0 tracking-widest drop-shadow-md">511 DALANG</h1>
          </div>
        </div>

        <nav className="flex-1 py-4 flex flex-col overflow-y-auto overflow-x-hidden">
          <NavItem to="/" label="Dashboard" isOpen={isSidebarOpen} icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>} />
          <NavItem to="/pencarian" label="Pencarian" isOpen={isSidebarOpen} icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>} />
          <NavItem to="/sirkulasi" label="Sirkulasi" isOpen={isSidebarOpen} icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>} />
          
          {localStorage.getItem('role') !== 'user' && (
            <>
              <NavItem to="/mutasi" label="Mutasi" isOpen={isSidebarOpen} icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>} />
              <NavItem to="/registrasi" label="Registrasi" isOpen={isSidebarOpen} icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="12" x2="12" y1="12" y2="18"/><line x1="9" x2="15" y1="15" y2="15"/></svg>} />
            </>
          )}
          <NavItem to="/log" label="Log Aktivitas" isOpen={isSidebarOpen} icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>} />
		  <NavItem to="/pengaturan" label="Pengaturan" isOpen={isSidebarOpen} icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>} />
        </nav>

        {/* ======================================================= */}
        {/* PROFIL & LOGOUT (Di pojok kiri bawah) */}
        {/* ======================================================= */}
        <div className={`mt-auto border-t border-slate-800/50 p-4 transition-all duration-300 ${isSidebarOpen ? 'px-4' : 'px-2 flex flex-col items-center'}`}>
          <div className={`bg-slate-800/30 rounded-xl p-3 border border-slate-700/50 flex items-center gap-3 ${!isSidebarOpen && 'justify-center'}`}>
            <div className="w-10 h-10 rounded-full bg-theme-500/20 text-theme-400 border border-theme-500/30 flex items-center justify-center font-bold flex-shrink-0 uppercase">
              {(localStorage.getItem('username') || 'SU').substring(0, 2)}
            </div>
            {isSidebarOpen && (
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-bold text-white truncate capitalize">{localStorage.getItem('username') || 'Superuser'}</p>
                <p className="text-[10px] text-theme-400 font-semibold tracking-wider uppercase">{localStorage.getItem('role') || 'ADMINISTRATOR'}</p>
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

        <header className="h-20 bg-[#0f172a]/80 backdrop-blur-md border-b border-slate-800/50 flex items-center px-6 shadow-sm z-10 flex-shrink-0 justify-between">
          <div className="flex items-center gap-5">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2.5 rounded-xl text-theme-400 bg-theme-500/10 border border-theme-500/30 hover:bg-theme-500/20 hover:border-theme-400/50 transition-all focus:outline-none">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={isSidebarOpen ? "M4 6h16M4 12h16M4 18h16" : "M4 6h16M4 12h8m-8 6h16"} /></svg>
            </button>
            <div className="text-white font-black tracking-wide text-lg truncate drop-shadow-md uppercase">
              APLIKASI GUDANG BELAKANG
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 relative z-10">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pencarian" element={<Pencarian />} />
            <Route path="/sirkulasi" element={<Sirkulasi />} />
            <Route path="/mutasi" element={<Mutasi />} />
            <Route path="/registrasi" element={<Registrasi />} />
			<Route path="/log" element={<LogAktivitas />} />
			<Route path="/pengaturan" element={<Pengaturan />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

// ==========================================
// PUSAT PENGATURAN ROUTING (PINTU UTAMA)
// ==========================================

export default function App() {
  useEffect(() => {
    const color = localStorage.getItem('themeColor') || 'sky'
    document.documentElement.setAttribute('data-theme', color)
  }, [])

  return (
    <Router>
      <Routes>
        {/* JALUR PUBLIK: Halaman Login berdiri sendiri tanpa Sidebar */}
        <Route path="/login" element={<Login />} />
        
        {/* JALUR PRIVAT: Semua rute di dalam AppLayout dijaga oleh Satpam (PrivateRoute) */}
        <Route path="/*" element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        } />
      </Routes>
    </Router>
  )
}