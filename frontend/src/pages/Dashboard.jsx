import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

// Palet warna chart konsisten dengan tema
const PIE_COLORS = [
  '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e',
  '#8b5cf6', '#06b6d4', '#84cc16', '#ec4899'
]

const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '12px'
  }
}

export default function Dashboard() {
  const { auth } = useAuth()
  const [stats, setStats] = useState({ total_rumah: '...', dipinjam: '...', terlambat: 0, activities: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [statistik, setStatistik] = useState(null)
  const [loadingChart, setLoadingChart] = useState(true)

  // Fetch stats utama
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/dashboard`, {
      headers: { 'Authorization': `Bearer ${auth.token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Server bermasalah')
        return res.json()
      })
      .then(data => { setStats(data); setLoading(false) })
      .catch(err => {
        console.error('Gagal memuat dari backend:', err)
        setLoading(false)
        setError(true)
        setStats({ total_rumah: 'ERROR', dipinjam: 'ERROR', terlambat: 0, activities: [] })
      })
  }, [])

  // Fetch statistik chart — terpisah agar tidak blokir stats utama
  useEffect(() => {
    if (!auth?.token) return
    fetch(`${import.meta.env.VITE_API_URL}/api/statistik`, {
      headers: { 'Authorization': `Bearer ${auth.token}` }
    })
      .then(res => res.json())
      .then(data => { setStatistik(data); setLoadingChart(false) })
      .catch(() => setLoadingChart(false))
  }, [auth?.token])

  return (
    <div className="animate-fade-in pb-10">
      {/* Header */}
      <div className="mb-8 border-b border-slate-800 pb-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <span>🏛️</span> Dashboard 511 DALANG
        </h2>
        <p className="text-slate-400 mt-1">Ringkasan status penyimpanan berkas di gudang saat ini.</p>
      </div>

      {/* Banner Error */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl mb-8 flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="font-bold">Koneksi Terputus</h3>
            <p className="text-sm">Gagal memuat data statistik dari server. Periksa koneksi internet atau status backend Anda.</p>
          </div>
        </div>
      )}

      {/* GRID KARTU STATISTIK */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">

        {/* KARTU 1: TOTAL RUMAH BERKAS */}
        <div className="relative bg-[#0f172a] rounded-2xl p-6 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.08)] overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <span className="text-2xl">📦</span>
            <h3 className="text-lg font-semibold text-slate-300">Total Rumah Berkas</h3>
          </div>
          <div className="text-6xl font-black text-emerald-400 tracking-tight text-center py-4 relative z-10">
            {loading ? '...' : stats.total_rumah}
          </div>
          <p className="text-slate-500 text-xs text-center relative z-10">🟢 Rumah Berkas Aktif di Rak</p>
        </div>

        {/* KARTU 2: SEDANG DIPINJAM */}
        <div className="relative bg-[#0f172a] rounded-2xl p-6 border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.08)] overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl" />
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <span className="text-2xl">🚨</span>
            <h3 className="text-lg font-semibold text-slate-300">Sedang Dipinjam</h3>
          </div>
          <div className="text-6xl font-black text-rose-400 tracking-tight text-center py-4 relative z-10">
            {loading ? '...' : stats.dipinjam}
          </div>
          <p className="text-slate-500 text-xs text-center relative z-10">🔴 Dokumen di Luar Gudang</p>
        </div>

        {/* KARTU 3: TERLAMBAT KEMBALI */}
        <div className={`relative bg-[#0f172a] rounded-2xl p-6 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.08)] overflow-hidden ${stats.terlambat > 0 ? 'animate-pulse' : ''}`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <span className="text-2xl">⚠️</span>
            <h3 className="text-lg font-semibold text-slate-300">Terlambat Kembali</h3>
          </div>
          <div className="text-6xl font-black text-amber-400 tracking-tight text-center py-4 relative z-10">
            {loading ? '...' : (stats.terlambat ?? 0)}
          </div>
          {stats.terlambat > 0 && (
            <div className="mt-2 px-4 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold text-center relative z-10">
              ⚠ Perlu Tindakan Segera
            </div>
          )}
        </div>
      </div>

      {/* SECTION CHART ANALITIK */}
      {loadingChart ? (
        <div className="flex items-center gap-2 text-slate-600 text-sm py-6">
          <div className="w-4 h-4 border-2 border-theme-400 border-t-transparent rounded-full animate-spin" />
          Memuat analitik...
        </div>
      ) : statistik && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

          {/* LINE CHART: Tren Peminjaman 6 Bulan */}
          <div className="bg-[#0f172a] rounded-2xl p-6 border border-slate-800">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <span>📈</span> Tren Peminjaman 6 Bulan Terakhir
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={statistik.tren_peminjaman}>
                <XAxis
                  dataKey="label"
                  stroke="#475569"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                />
                <YAxis
                  stroke="#475569"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  allowDecimals={false}
                />
                <Tooltip {...TOOLTIP_STYLE} />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#0ea5e9"
                  strokeWidth={2.5}
                  dot={{ fill: '#0ea5e9', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* PIE CHART: Distribusi Jenis Dokumen */}
          <div className="bg-[#0f172a] rounded-2xl p-6 border border-slate-800">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <span>📊</span> Distribusi Jenis Dokumen (Top 8)
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statistik.distribusi_jenis}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="total"
                  nameKey="jenis"
                >
                  {statistik.distribusi_jenis.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
        </div>
      )}

      {/* SECTION BAWAH: Top WP dan Aktivitas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* TOP WP */}
        <div className="lg:col-span-1">
          <h3 className="text-xl font-bold text-slate-200 mb-4 flex items-center gap-2">
            <span>🏆</span> Top 5 WP (Dipinjam)
          </h3>
          <div className="flex flex-col gap-3">
            {statistik?.top_wp && statistik.top_wp.length > 0 ? (
              statistik.top_wp.map((wp, i) => (
                <div key={i} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                  <div className="truncate pr-2">
                    <div className="text-white font-semibold text-sm truncate">{wp.nama}</div>
                  </div>
                  <div className="text-theme-400 font-bold bg-theme-500/10 px-3 py-1 rounded-full text-xs whitespace-nowrap">
                    {wp.total} Dok.
                  </div>
                </div>
              ))
            ) : (
              <div className="text-slate-500 text-center py-6">Belum ada data WP terkait.</div>
            )}
          </div>
        </div>

        {/* AKTIVITAS TERKINI (Existing code preserved) */}
        <div className="lg:col-span-2">
          <h3 className="text-xl font-bold text-slate-200 mb-4 flex items-center gap-2">
            <span>⚡</span> Aktivitas Terkini
          </h3>
          <div className="flex flex-col gap-3">
            {stats.activities && stats.activities.length > 0 ? (
              stats.activities.map((log, index) => {
                let icon = '📝'
                let color = 'slate'
                let badgeText = log.action_type
                
                if (log.action_type === 'Registrasi') {
                  icon = '📦'
                  color = 'emerald'
                  badgeText = '+ Baru'
                } else if (log.action_type === 'Pinjam' || log.action_type === 'Kembali') {
                  icon = '🔄'
                  color = log.action_type === 'Pinjam' ? 'rose' : 'emerald'
                  badgeText = log.action_type === 'Pinjam' ? '- Keluar' : '+ Kembali'
                } else if (log.action_type === 'Mutasi') {
                  icon = '🛒'
                  color = 'amber'
                  badgeText = '⇄ Mutasi'
                }

                return (
                  <div key={index} className={`flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm hover:border-slate-700 transition-colors group cursor-default`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-lg bg-${color}-500/10 text-${color}-400 flex items-center justify-center text-2xl group-hover:bg-${color}-500/20 transition-colors`}>
                        {icon}
                      </div>
                      <div>
                        <h4 className="text-slate-200 font-semibold">{log.description}</h4>
                        <p className="text-sm text-slate-500">Oleh {log.username} • <span className="text-slate-600 text-xs">{new Date(log.created_at).toLocaleString('id-ID')}</span></p>
                      </div>
                    </div>
                    <div className={`text-${color}-500 text-sm font-bold bg-${color}-500/10 px-3 py-1 rounded-full whitespace-nowrap`}>
                      {badgeText}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-slate-500 text-center py-6">Belum ada aktivitas tercatat.</div>
            )}
          </div>
        </div>

      </div>

    </div>
  )
}