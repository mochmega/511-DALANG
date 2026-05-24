import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAlert } from '../context/AlertContext'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { showAlert } = useAlert()
  const { login } = useAuth()
  
  const navigate = useNavigate()

  useEffect(() => {
    // Reset tema ke warna default (sky) saat berada di halaman login
    document.documentElement.setAttribute('data-theme', 'sky')
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      
      const data = await res.json()
      
      if (res.ok && data.status === 'success') {
        // Gunakan AuthContext login() — satu sumber kebenaran, bukan manipulasi localStorage langsung
        login(data.token, data.role, username, data.theme)
        navigate('/')
      } else {
        showAlert(`Akses Ditolak: ${data.message || 'Username atau Password salah!'}`, "error")
      }
    } catch (error) {
      showAlert('Akses Ditolak: Gagal terhubung ke server.', "error")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060b14] relative overflow-hidden font-sans">
      
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-96 bg-theme-500/10 rounded-full blur-[150px] pointer-events-none z-0"></div>

      <div className="w-full max-w-md p-6 relative z-10 animate-fade-in">
        
        <div className="bg-[#0f172a]/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden pb-4">
          
          <div className="px-8 pt-12 pb-8 text-center">
            <img 
              src="/logo.png" 
              alt="511 Dalang Logo" 
              className="w-24 h-24 mx-auto object-contain drop-shadow-[0_0_15px_rgba(14,165,233,0.4)] mb-6"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2338bdf8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='20' height='8' x='2' y='3' rx='2'/%3E%3Crect width='20' height='8' x='2' y='13' rx='2'/%3E%3Cline x1='10' x2='14' y1='7' y2='7'/%3E%3Cline x1='10' x2='14' y1='17' y2='17'/%3E%3C/svg%3E";
              }}
            />
            <h1 className="text-3xl font-black text-white tracking-widest uppercase drop-shadow-md">
              511 DALANG
            </h1>
            <p className="text-theme-400 text-sm font-bold tracking-[0.2em] mt-2">
              APLIKASI GUDANG BELAKANG
            </p>
          </div>

          <div className="px-8 pb-8 pt-2">
            <form onSubmit={handleLogin} className="space-y-6">
              
              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2">Username / NIP</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-theme-400 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                  </div>
                  <input 
                    type="text" 
                    className="w-full bg-[#060b14] border border-slate-700/80 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-theme-500 focus:ring-1 focus:ring-theme-500 transition-all placeholder-slate-600 shadow-inner"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2">Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-theme-400 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                  </div>
                  <input 
                    type="password" 
                    className="w-full bg-[#060b14] border border-slate-700/80 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-theme-500 focus:ring-1 focus:ring-theme-500 transition-all placeholder-slate-600 shadow-inner"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full bg-theme-500 hover:bg-theme-400 text-[#060b14] text-lg font-black tracking-wide py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(14,165,233,0.2)] hover:shadow-[0_0_30px_rgba(14,165,233,0.5)] disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                  {isLoading ? 'VERIFYING...' : 'SECURE LOGIN'}
                </button>
              </div>

            </form>
          </div>

        </div>
      </div>
    </div>
  )
}