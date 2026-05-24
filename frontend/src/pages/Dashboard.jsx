import { useState, useEffect } from 'react'

export default function Dashboard() {
  const [stats, setStats] = useState({ total_rumah: "...", dipinjam: "...", activities: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    fetch(`${import.meta.env.VITE_API_URL}/api/dashboard`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error("Server bermasalah")
        return res.json()
      })
      .then(data => {
        setStats(data)
        setLoading(false)
      })
      .catch(err => {
        console.error("Gagal memuat dari backend:", err)
        setLoading(false)
        setStats({ total_rumah: "ERROR", dipinjam: "ERROR", activities: [] })
      })
  }, [])

  return (
    <div className="animate-fade-in pb-10">
      <div className="mb-8 border-b border-slate-800 pb-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <span>🏛️</span> Dashboard 511 DALANG
        </h2>
        <p className="text-slate-400 mt-1">Ringkasan status penyimpanan berkas di gudang saat ini.</p>
      </div>

      {/* GRID ATAS: KARTU STATISTIK */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        
        {/* KARTU 1: TOTAL RUMAH BERKAS (TEMA HIJAU) */}
        <div className="relative bg-[#0f172a] rounded-2xl p-6 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)] overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>
          
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <span className="text-2xl">📦</span>
            <h3 className="text-lg font-semibold text-slate-300">Total Rumah Berkas</h3>
          </div>
          
          <div className="flex flex-col items-center justify-center py-4 relative z-10">
            <div className="text-6xl font-black text-emerald-400 tracking-tight drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">
              {loading ? "..." : stats.total_rumah}
            </div>
            <div className="mt-4 px-4 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold">
              🟢 Rumah Berkas Aktif di Rak
            </div>
          </div>
        </div>

        {/* KARTU 2: SEDANG DIPINJAM (TEMA MERAH) */}
        <div className="relative bg-[#0f172a] rounded-2xl p-6 border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.1)] overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl"></div>

          <div className="flex items-center gap-3 mb-4 relative z-10">
            <span className="text-2xl">🚨</span>
            <h3 className="text-lg font-semibold text-slate-300">Sedang Dipinjam</h3>
          </div>
          
          <div className="flex flex-col items-center justify-center py-4 relative z-10">
            <div className="text-6xl font-black text-rose-500 tracking-tight drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]">
              {loading ? "..." : stats.dipinjam}
            </div>
            <div className="mt-4 px-4 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-semibold">
              🔴 Dokumen di Luar Gudang
            </div>
          </div>
        </div>
      </div>

      {/* PANEL BAWAH: AKTIVITAS TERKINI */}
      <div>
        <h3 className="text-xl font-bold text-slate-200 mb-4 flex items-center gap-2">
          <span>⚡</span> Aktivitas Terkini
        </h3>
        
        <div className="flex flex-col gap-3">
          
          {stats.activities && stats.activities.length > 0 ? (
            stats.activities.map((log, index) => {
              // Determine styles based on action_type
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
                <div key={index} className={`flex items-center justify-between bg-[#0f172a] border border-slate-800 p-4 rounded-xl shadow-sm hover:border-slate-700 transition-colors group cursor-default`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg bg-${color}-500/10 text-${color}-400 flex items-center justify-center text-2xl group-hover:bg-${color}-500/20 transition-colors`}>
                      {icon}
                    </div>
                    <div>
                      <h4 className="text-slate-200 font-semibold">{log.description}</h4>
                      <p className="text-sm text-slate-500">Oleh {log.username} • <span className="text-slate-600 text-xs">{new Date(log.created_at).toLocaleString('id-ID')}</span></p>
                    </div>
                  </div>
                  <div className={`text-${color}-500 text-sm font-bold bg-${color}-500/10 px-3 py-1 rounded-full`}>
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
  )
}