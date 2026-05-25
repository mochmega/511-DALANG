import { useState, useEffect, useCallback } from 'react'
import UniversalSearch from '../components/UniversalSearch'
import Pagination from '../components/Pagination'
import { highlightText } from '../utils/highlight'
import { useAlert } from '../context/AlertContext'
import { useAuth } from '../context/AuthContext'
import { simpanKeDB } from '../utils/api'

export default function Sirkulasi() {
  const [query, setQuery] = useState('')
  const [searchBy, setSearchBy] = useState('all')
  const [limit, setLimit] = useState('50')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalItems, setTotalItems] = useState(0)

  const [hasil, setHasil] = useState([])
  const [sudahCari, setSudahCari] = useState(false)
  const [selectedMap, setSelectedMap] = useState(null)
  
  const { showAlert } = useAlert()
  const { auth } = useAuth()
  
  // State Operasional Sirkulasi
  const [peminjam, setPeminjam] = useState('')
  useEffect(() => {
    if (auth?.username) setPeminjam(auth.username)
  }, [auth])
  const [tanggalPinjam, setTanggalPinjam] = useState(new Date().toISOString().split('T')[0])
  const [batasKembali, setBatasKembali] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d.toISOString().split('T')[0] // Default +7 hari dari hari ini
  })
  const [keperluan, setKeperluan] = useState('')
  const role = auth?.role || 'user'
  
  const parseIsiBerkas = (isi) => {
    if (!isi || isi === 'Belum diupdate') return []
    try { return JSON.parse(isi) } catch (e) { return [] }
  }

  // Membersihkan duplikat jika ada struktur cabang
  const getUniqueDocs = (docs) => {
    const seen = new Set()
    return docs.filter(doc => {
      const key = `${doc.nama}-${doc.nomor}-${doc.tahun}-${doc.pemilik}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  // FUNGSI PENCARIAN
  const handleCari = useCallback(async (currentPage = page, currentLimit = limit) => {
    try {
      const token = auth?.token
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/berkas?search=${encodeURIComponent(query)}&by=${encodeURIComponent(searchBy)}&page=${currentPage}&limit=${currentLimit}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const rawResponse = await res.json()
      
      const rawData = Array.isArray(rawResponse.data) ? rawResponse.data : []
      setTotalPages(rawResponse.total_pages || 1)
      setTotalItems(rawResponse.total_items || rawData.length)
      setPage(rawResponse.current_page || 1)
      
      const groupedData = rawData.reduce((acc, curr) => {
        const currentDocs = parseIsiBerkas(curr.isi_berkas)
        if (!acc[curr.no_berkas]) {
          acc[curr.no_berkas] = { ...curr, nama: curr.nama, dokumenList: currentDocs }
        } else {
          acc[curr.no_berkas].dokumenList = getUniqueDocs([
            ...acc[curr.no_berkas].dokumenList, 
            ...currentDocs
          ])
        }
        return acc
      }, {})
      
      setHasil(Object.values(groupedData))
      setSudahCari(true)
    } catch (error) {
      console.error("Gagal mencari data:", error)
      showAlert("Gagal memuat data. Periksa koneksi ke server.", "error")
    }
  }, [auth?.token, query, searchBy, showAlert, page, limit])

  // --- ROBOT LIVE SEARCH AUTOMATIC ---
  useEffect(() => {
    setPage(1)
    const timer = setTimeout(() => {
      handleCari(1, limit)
    }, 500)
    return () => clearTimeout(timer)
  }, [handleCari, limit])

  const handlePageChange = (newPage) => {
    setPage(newPage)
    handleCari(newPage, limit)
  }

  // LOGIKA PROSES PINJAM
  const prosesPinjamDokumen = async (docIndex) => {
    if (!peminjam.trim()) return showAlert("Nama Peminjam wajib diisi di form atas!", "error")
    
    const newList = [...selectedMap.dokumenList]
    newList[docIndex] = {
      ...newList[docIndex],
      status: role === 'user' ? 'Menunggu Verifikasi' : 'Dipinjam',
      peminjam: peminjam,
      tanggal_pinjam: tanggalPinjam,
      batas_kembali: batasKembali,
      keperluan: keperluan
    }

    const logDesc = `Dokumen ${newList[docIndex].nama} diajukan pinjam oleh ${peminjam}`
    const success = await simpanKeDB(import.meta.env.VITE_API_URL, auth, selectedMap.no_berkas, newList, 'Pinjam', logDesc)
    if (success) {
      setSelectedMap({ ...selectedMap, dokumenList: newList })
      handleCari()
    }
  }

  // LOGIKA PROSES KEMBALI (DI RAK)
  const prosesKembaliDokumen = async (docIndex) => {
    const newList = [...selectedMap.dokumenList]
    newList[docIndex] = {
      ...newList[docIndex],
      status: 'Di Gudang',
      peminjam: '',
      tanggal_pinjam: '',
      keperluan: '',
      tanggal_kembali: new Date().toISOString().split('T')[0]
    }

    const logDesc = `Dokumen ${newList[docIndex].nama} dikembalikan ke rak`
    const success = await simpanKeDB(import.meta.env.VITE_API_URL, auth, selectedMap.no_berkas, newList, 'Kembali', logDesc)
    if (success) {
      setSelectedMap({ ...selectedMap, dokumenList: newList })
      handleCari()
    }
  }

  // LOGIKA PROSES VERIFIKASI (PETUGAS/SU)
  const prosesVerifikasi = async (docIndex) => {
    const newList = [...selectedMap.dokumenList]
    newList[docIndex] = {
      ...newList[docIndex],
      status: 'Dipinjam'
    }
    const logDesc = `Pengajuan pinjam dokumen ${newList[docIndex].nama} diverifikasi petugas`
    const success = await simpanKeDB(
      import.meta.env.VITE_API_URL,
      auth,
      selectedMap.no_berkas, 
      newList, 'Pinjam', logDesc
    )
    if (success) {
      setSelectedMap({ ...selectedMap, dokumenList: newList })
      handleCari()
    }
  }

  // LOGIKA AJUKAN KEMBALI (USER)
  const prosesAjukanKembali = async (docIndex) => {
    const newList = [...selectedMap.dokumenList]
    newList[docIndex] = {
      ...newList[docIndex],
      status: 'Menunggu Pengembalian'
    }
    const logDesc = `Dokumen ${newList[docIndex].nama} diajukan kembali oleh ${newList[docIndex].peminjam}`
    const success = await simpanKeDB(
      import.meta.env.VITE_API_URL,
      auth,
      selectedMap.no_berkas, 
      newList, 'Kembali', logDesc
    )
    if (success) {
      setSelectedMap({ ...selectedMap, dokumenList: newList })
      handleCari()
    }
  }

  // LOGIKA TOLAK KEMBALI (PETUGAS/SU)
  const prosesTolakKembali = async (docIndex) => {
    const newList = [...selectedMap.dokumenList]
    newList[docIndex] = {
      ...newList[docIndex],
      status: 'Dipinjam'
    }
    const logDesc = `Pengembalian dokumen ${newList[docIndex].nama} ditolak petugas`
    const success = await simpanKeDB(
      import.meta.env.VITE_API_URL,
      auth,
      selectedMap.no_berkas, 
      newList, 'Kembali', logDesc
    )
    if (success) {
      setSelectedMap({ ...selectedMap, dokumenList: newList })
      handleCari()
    }
  }

  const renderBadgeStatus = (status) => {
    if (status === 'Di Gudang') {
      return <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2.5 py-1 rounded-md font-bold border border-emerald-500/30">🟢 Di Rak</span>
    }
    if (status === 'Menunggu Verifikasi' || status === 'Menunggu Pengembalian') {
      return <span className="bg-amber-500/20 text-amber-400 text-xs px-2.5 py-1 rounded-md font-bold border border-amber-500/30">⏳ Menunggu</span>
    }
    return <span className="bg-rose-500/20 text-rose-400 text-xs px-2.5 py-1 rounded-md font-bold border border-rose-500/30">⚠️ Dipinjam</span>
  }

  return (
    <div className="pb-10 animate-fade-in">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <span>🔄</span> Sirkulasi & Logistik Berkas
        </h2>
        <p className="text-slate-400 mt-1">Kelola peminjaman dan pengembalian dokumen fisik secara *real-time*.</p>
      </div>

      {/* FORM PENCARIAN MODERN */}
      <div className="mb-8">
        <UniversalSearch 
          searchTerm={query}
          onSearchChange={setQuery}
          searchBy={searchBy}
          onSearchByChange={setSearchBy}
          limit={limit}
          onLimitChange={setLimit}
          placeholder="Cari untuk sirkulasi..."
        />
      </div>

      {/* DUA PANEL LAYOUT (KIRI: DATA RUMAH BERKAS, KANAN: OPERASIONAL SIRKULASI) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* PANEL KIRI: HASIL PENCARIAN RUMAH BERKAS (SPAN 1) */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">📦 Berkas Ditemukan</h3>
          
          {sudahCari && hasil.length === 0 && (
            <div className="p-6 bg-slate-900 rounded-xl border border-slate-800 text-center text-slate-500">
              Data tidak ditemukan
            </div>
          )}

          {hasil.map((item, index) => {
            const isSelected = selectedMap?.no_berkas === item.no_berkas
            const totalDocs = item.dokumenList.length
            const dipinjam = item.dokumenList.filter(d => d.status !== 'Di Gudang').length

            return (
              <div 
                key={index}
                onClick={() => setSelectedMap(item)}
                className={`p-4 bg-slate-900 border rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-between group ${
                  isSelected 
                    ? 'border-emerald-500 ring-1 ring-emerald-500 bg-slate-800/40' 
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-black text-xl transition-colors ${
                    isSelected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-300 group-hover:text-emerald-400'
                  }`}>
                    {highlightText(item.no_berkas, query)}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base leading-tight group-hover:text-emerald-400 transition-colors">{highlightText(item.nama, query)}</h4>
                    <p className="text-xs text-slate-500 mt-1">NPWP: {highlightText(item.npwp_16 || '-', query)}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <span className="text-sm font-bold text-slate-300 block">{totalDocs} Doc</span>
                  {dipinjam > 0 && <span className="text-[10px] bg-rose-500/10 text-rose-400 px-1.5 py-0.5 rounded font-bold border border-rose-500/20">⚠️ {dipinjam} Pinjam</span>}
                </div>
              </div>
            )
          })}

          {sudahCari && (
            <Pagination 
              currentPage={page} 
              totalPages={totalPages} 
              totalItems={totalItems} 
              onPageChange={handlePageChange} 
            />
          )}
        </div>

        {/* PANEL KANAN: MEJA KERJA OPERASIONAL SIRKULASI (SPAN 2) */}
        <div className="lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">📋 Meja Kerja Sirkulasi</h3>
          
          {!selectedMap ? (
            <div className="h-64 bg-slate-900/50 border border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-500 p-6 border-dashed">
              <span className="text-4xl mb-2">👈</span>
              <p className="font-medium text-slate-400">Silakan pilih salah satu rumah berkas di panel kiri</p>
              <p className="text-xs text-slate-600 mt-1">Untuk memulai proses izin pinjam atau pengembalian dokumen.</p>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              
              {/* Identitas Ringkas Berkas Aktif */}
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Berkas Aktif</span>
                  <h4 className="text-xl font-black text-white mt-1.5">{selectedMap.nama} (Rumah Berkas: {selectedMap.no_berkas})</h4>
                </div>
                <button className="text-slate-500 hover:text-slate-300 text-sm" onClick={() => setSelectedMap(null)}>Tutup ×</button>
              </div>

              {/* FORM IDENTITAS PEMINJAM (DIGITAL LOGBOOK) */}
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 space-y-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide block">📝 Buku Log Peminjaman (Wajib diisi jika ingin meminjam)</span>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Nama Peminjam *</label>
                    <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder-slate-600" placeholder="Cth: Andi Setiawan" value={peminjam} onChange={(e) => setPeminjam(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Tanggal Pinjam</label>
                    <input type="date" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" value={tanggalPinjam} onChange={(e) => setTanggalPinjam(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Keperluan / Alasan</label>
                    <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder-slate-600" placeholder="Cth: Pemeriksaan Lapangan" value={keperluan} onChange={(e) => setKeperluan(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Batas Kembali</label>
                    <input
                      type="date"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                      value={batasKembali}
                      min={tanggalPinjam}
                      onChange={(e) => setBatasKembali(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* DAFTAR DOKUMEN DI DALAM RUMAH BERKAS TERSEBUT */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide block">📄 Pilih Dokumen Fisik</span>
                
                {selectedMap.dokumenList.length === 0 ? (
                  <p className="text-sm text-slate-500 italic p-4 text-center">Rumah Berkas ini kosong, belum ada dokumen terdaftar.</p>
                ) : (
                  <div className="border border-slate-800/80 rounded-xl overflow-hidden divide-y divide-slate-800/50">
                    {selectedMap.dokumenList.map((doc, idx) => {
                      const isGudang = doc.status === 'Di Gudang'
                      return (
                        <div key={idx} className="p-4 bg-slate-900/20 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/20 transition-colors">
                          <div className="flex-1">
                            <div className="font-bold text-white text-sm">{doc.nama}</div>
                            <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-4">
                              <span><strong>No:</strong> {doc.nomor || '-'}</span>
                              <span><strong>Tahun:</strong> {doc.tahun || '-'}</span>
                              <span><strong>Milik:</strong> <span className="text-theme-400">{doc.pemilik ? doc.pemilik.split(')')[0] + ')' : '-'}</span></span>
                            </div>
                            
                            {/* Keterangan Riwayat jika sedang dipinjam atau menunggu */}
                            {!isGudang && (
                              <div className="mt-2 text-xs bg-rose-500/5 border border-rose-500/10 p-2 rounded-lg text-rose-400/90 flex flex-col gap-1">
                                <span>🧑‍💻 {doc.status === 'Menunggu Verifikasi' ? 'Diajukan oleh' : 'Dipinjam oleh'} <strong className="text-rose-400">{doc.peminjam}</strong> pada {doc.tanggal_pinjam} ({doc.keperluan || 'Tanpa keterangan'})</span>
                                
                                {/* Opsional: tampilkan batas kembali di info dokumen yang sedang dipinjam */}
                                {doc.batas_kembali && (
                                  <span className={`font-semibold ${
                                    new Date(doc.batas_kembali) < new Date() 
                                      ? 'text-rose-400' 
                                      : 'text-amber-500'
                                  }`}>
                                    {new Date(doc.batas_kembali) < new Date() 
                                      ? `⚠️ Terlambat! Batas: ${doc.batas_kembali}` 
                                      : `📅 Batas: ${doc.batas_kembali}`
                                    }
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-4 justify-between md:justify-end">
                            <div>{renderBadgeStatus(doc.status)}</div>
                            
                            {isGudang && (
                              <button 
                                onClick={() => prosesPinjamDokumen(idx)}
                                className={`${role === 'user' ? 'bg-amber-600/20 hover:bg-amber-600 text-amber-400' : 'bg-rose-600/20 hover:bg-rose-600 text-rose-400'} hover:text-white font-bold text-xs py-2 px-4 rounded-lg transition-all border ${role === 'user' ? 'border-amber-500/30' : 'border-rose-500/30'} shadow-sm`}
                              >
                                {role === 'user' ? '⏳ Ajukan Pinjam' : '🛫 Pinjamkan'}
                              </button>
                            )}

                            {doc.status === 'Menunggu Verifikasi' && role !== 'user' && (
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => prosesVerifikasi(idx)}
                                  className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white font-bold text-xs py-2 px-3 rounded-lg transition-all border border-emerald-500/30 shadow-sm"
                                >
                                  ✅ Setujui
                                </button>
                                <button 
                                  onClick={() => prosesKembaliDokumen(idx)}
                                  className="bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white font-bold text-xs py-2 px-3 rounded-lg transition-all border border-rose-500/30 shadow-sm"
                                >
                                  ❌ Tolak
                                </button>
                              </div>
                            )}

                            {doc.status === 'Dipinjam' && role !== 'user' && (
                              <button 
                                onClick={() => prosesKembaliDokumen(idx)}
                                className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white font-bold text-xs py-2 px-4 rounded-lg transition-all border border-emerald-500/30 shadow-sm"
                              >
                                🛬 Kembalikan (Rak)
                              </button>
                            )}

                            {doc.status === 'Dipinjam' && role === 'user' && (
                              <button 
                                onClick={() => prosesAjukanKembali(idx)}
                                className="bg-amber-600/20 hover:bg-amber-600 text-amber-400 hover:text-white font-bold text-xs py-2 px-4 rounded-lg transition-all border border-amber-500/30 shadow-sm"
                              >
                                ⏳ Ajukan Pengembalian
                              </button>
                            )}

                            {doc.status === 'Menunggu Pengembalian' && role !== 'user' && (
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => prosesKembaliDokumen(idx)}
                                  className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white font-bold text-xs py-2 px-3 rounded-lg transition-all border border-emerald-500/30 shadow-sm"
                                >
                                  ✅ Terima Pengembalian
                                </button>
                                <button 
                                  onClick={() => prosesTolakKembali(idx)}
                                  className="bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white font-bold text-xs py-2 px-3 rounded-lg transition-all border border-rose-500/30 shadow-sm"
                                >
                                  ❌ Tolak
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  )
}