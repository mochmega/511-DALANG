import { useState, useEffect } from 'react'
import { useAlert } from '../context/AlertContext'
import { useAuth } from '../context/AuthContext'
import UniversalSearch from '../components/UniversalSearch'
import Pagination from '../components/Pagination'
import { highlightText } from '../utils/highlight'

export default function Mutasi() {
  const [activeTab, setActiveTab] = useState('proses')
  const [query, setQuery] = useState('')
  const [searchBy, setSearchBy] = useState('all')
  const [limit, setLimit] = useState('50')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalItems, setTotalItems] = useState(0)

  const [hasilCari, setHasilCari] = useState([])
  const [sudahCari, setSudahCari] = useState(false)
  const [riwayat, setRiwayat] = useState([])
  
  const { showAlert } = useAlert()
  const { auth } = useAuth()
  const token = auth?.token || localStorage.getItem('token')
  
  // Keranjang Belanja untuk Mutasi Massal
  const [selectedBerkas, setSelectedBerkas] = useState([])

  // State untuk Pop-up Modal Kustom
  const [modalMutasi, setModalMutasi] = useState({ isOpen: false, isMassal: false, targetId: null })
  const [alasanMutasi, setAlasanMutasi] = useState('')
  const [isMutasiLoading, setIsMutasiLoading] = useState(false)

  const parseIsiBerkas = (isi) => {
    if (!isi || isi === 'Belum diupdate') return []
    try { return JSON.parse(isi) } catch (e) { return [] }
  }

  const fetchData = async (searchQuery, isRiwayat = false, currentPage = page, currentLimit = limit) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/berkas?search=${searchQuery}&by=${searchBy}&page=${currentPage}&limit=${currentLimit}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const rawResponse = await res.json()
      
      const rawData = Array.isArray(rawResponse) ? rawResponse : (rawResponse.data || [])
      
      if (!isRiwayat) {
        setTotalPages(rawResponse.total_pages || 1)
        setTotalItems(rawResponse.total_items || rawData.length)
        setPage(rawResponse.current_page || 1)
      }
      
      const groupedData = rawData.reduce((acc, curr) => {
        const currentDocs = parseIsiBerkas(curr.isi_berkas)
        if (!acc[curr.no_berkas]) {
          acc[curr.no_berkas] = { ...curr, nama: curr.nama, npwp_16: curr.npwp_16, dokumenList: currentDocs, cabangCount: 0 }
        } else {
          acc[curr.no_berkas].dokumenList = [...acc[curr.no_berkas].dokumenList, ...currentDocs]
          acc[curr.no_berkas].cabangCount += 1
        }
        return acc
      }, {})
      
      const arrayData = Object.values(groupedData)
      
      if (isRiwayat) {
        setRiwayat(arrayData.filter(d => String(d.no_berkas).startsWith('EKS-')))
      } else {
        setHasilCari(arrayData.filter(d => !String(d.no_berkas).startsWith('EKS-')))
        setSudahCari(true)
      }
    } catch (error) {
      console.error("Gagal mengambil data:", error)
    }
  }

  useEffect(() => {
    if (activeTab === 'proses') {
      setPage(1)
      const timer = setTimeout(() => {
        if (query.trim() !== '') fetchData(query, false, 1, limit)
        else { setHasilCari([]); setSudahCari(false); }
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [query, searchBy, limit, activeTab])

  useEffect(() => {
    if (activeTab === 'riwayat') {
      fetchData('EKS-', true, 1, 'semua') 
    }
  }, [activeTab])

  const handlePageChange = (newPage) => {
    setPage(newPage)
    fetchData(query, false, newPage, limit)
  }

  const handleCari = (e) => {
    if (e) e.preventDefault()
    fetchData(query, false, page, limit)
  }

  const handleToggleSelect = (noBerkas) => {
    if (selectedBerkas.includes(noBerkas)) {
      setSelectedBerkas(selectedBerkas.filter(id => id !== noBerkas))
    } else {
      setSelectedBerkas([...selectedBerkas, noBerkas])
    }
  }

  const visibleIds = hasilCari.map(item => item.no_berkas)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedBerkas.includes(id))

  const handleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedBerkas(selectedBerkas.filter(id => !visibleIds.includes(id)))
    } else {
      const newSelection = new Set([...selectedBerkas, ...visibleIds])
      setSelectedBerkas(Array.from(newSelection))
    }
  }

  // --- PEMICU POP-UP MODAL KUSTOM ---
  const triggerMutasiMassal = () => {
    if (selectedBerkas.length === 0) return
    setAlasanMutasi('')
    setModalMutasi({ isOpen: true, isMassal: true, targetId: null })
  }

  const triggerMutasiSatuan = (noBerkas) => {
    setAlasanMutasi('')
    setModalMutasi({ isOpen: true, isMassal: false, targetId: noBerkas })
  }

  const tutupModal = () => {
    setModalMutasi({ isOpen: false, isMassal: false, targetId: null })
    setAlasanMutasi('')
  }

  // --- EKSEKUSI MUTASI FINAL (DARI DALAM MODAL) ---
  const konfirmasiMutasiFinal = async () => {
    if (!alasanMutasi.trim()) return

    setIsMutasiLoading(true)

    try {
      if (modalMutasi.isMassal) {
        // Logika Massal
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/mutasi/bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ no_berkas_list: selectedBerkas, alasan: alasanMutasi })
        })
        const data = await res.json()
        if (data.status === 'success') {
          showAlert(`SUCCESS:\n${data.message}`, "success")
          setHasilCari(hasilCari.filter(d => !selectedBerkas.includes(d.no_berkas)))
          setSelectedBerkas([])
        } else showAlert("Gagal melakukan mutasi massal.", "error")

      } else {
        // Logika Satuan
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/mutasi`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ no_berkas: modalMutasi.targetId, alasan: alasanMutasi })
        })
        const data = await res.json()
        if (data.status === 'success') {
          showAlert(`SUCCESS:\n${data.message}`, "success")
          setHasilCari(hasilCari.filter(d => d.no_berkas !== modalMutasi.targetId))
          setSelectedBerkas(selectedBerkas.filter(id => id !== modalMutasi.targetId))
        } else showAlert("Gagal melakukan mutasi.", "error")
      }
    } catch (error) {
      showAlert("Terjadi kesalahan server saat mutasi.", "error")
    }

    setIsMutasiLoading(false)
    tutupModal()
  }

  return (
    <div className="pb-10 animate-fade-in relative">
      <div className="mb-6 border-b border-slate-800 pb-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <span className="text-rose-500">🔥</span> Mutasi Keluar Berkas
        </h2>
        <p className="text-slate-400 mt-1">Sistem pembekuan dan mutasi permanen dokumen (EKS) ke KPP lain.</p>
      </div>
      
      <div className="flex space-x-2 bg-[#0f172a] p-1.5 rounded-xl w-full md:w-max mb-8 border border-slate-800 shadow-sm">
        <button 
          className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all flex-1 md:flex-none ${activeTab === 'proses' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`} 
          onClick={() => setActiveTab('proses')}
        >
          Proses Mutasi
        </button>
        <button 
          className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all flex-1 md:flex-none ${activeTab === 'riwayat' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`} 
          onClick={() => setActiveTab('riwayat')}
        >
          Riwayat Dimutasi
        </button>
      </div>

      {activeTab === 'proses' && (
        <div className="animate-fade-in space-y-6">
          
          <div className="bg-theme-500/10 border border-theme-500/20 text-theme-400 px-5 py-4 rounded-xl shadow-sm flex items-start gap-3">
            <span className="text-xl">ℹ️</span>
            <div>
              <strong className="block mb-1">Petunjuk Penggunaan Keranjang Mutasi:</strong>
              <span className="text-sm">Cari WP, centang kotaknya, lalu cari WP lain lagi. Centangan Anda tidak akan hilang dan tersimpan di keranjang sampai Anda mengeksekusinya secara massal.</span>
            </div>
          </div>

          <div className="mb-6">
            <UniversalSearch 
              searchTerm={query}
              onSearchChange={setQuery}
              searchBy={searchBy}
              onSearchByChange={setSearchBy}
              limit={limit}
              onLimitChange={setLimit}
              placeholder="Cari WP untuk dimutasi..."
            />
          </div>

          {sudahCari && hasilCari.length === 0 && (
            <div className="text-center py-12 text-slate-500 bg-[#0f172a] border border-slate-800 rounded-xl">
              <span className="text-4xl block mb-2">🔍</span>
              Tidak ditemukan Wajib Pajak aktif dengan kata kunci tersebut.
            </div>
          )}

          {((sudahCari && hasilCari.length > 0) || selectedBerkas.length > 0) && (
            <div className="bg-slate-800/40 border border-slate-700 p-4 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4 shadow-lg sticky top-4 z-10 backdrop-blur-md">
              
              <div className="flex items-center gap-3 w-full md:w-auto">
                <input 
                  type="checkbox" 
                  id="selectAll"
                  className="w-6 h-6 rounded border-slate-600 text-rose-600 focus:ring-rose-500 bg-slate-900 cursor-pointer"
                  checked={allVisibleSelected} 
                  onChange={handleSelectAll} 
                  disabled={hasilCari.length === 0}
                />
                <label htmlFor="selectAll" className="font-bold text-slate-300 cursor-pointer select-none">
                  Pilih Semua di Layar Ini
                </label>
              </div>
              
              <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                {selectedBerkas.length > 0 && (
                  <>
                    <button 
                      className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition-colors border border-slate-600 w-full md:w-auto"
                      onClick={() => setSelectedBerkas([])}
                    >
                      🗑️ Kosongkan Pilihan
                    </button>
                    <div className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-4 py-2.5 rounded-lg font-bold text-sm w-full md:w-auto text-center">
                      🛒 Keranjang: {selectedBerkas.length} WP
                    </div>
                  </>
                )}
                
                <button 
                  className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all shadow-lg w-full md:w-auto ${
                    selectedBerkas.length > 0 
                      ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse' 
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                  onClick={triggerMutasiMassal}
                  disabled={selectedBerkas.length === 0}
                >
                  🔥 MUTASI SEMUA ({selectedBerkas.length})
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {sudahCari && hasilCari.map((mapData, i) => {
              const isChecked = selectedBerkas.includes(mapData.no_berkas)
              return (
                <div key={i} className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group cursor-pointer ${
                  isChecked 
                    ? 'bg-rose-500/10 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.1)]' 
                    : 'bg-[#0f172a] border-slate-800 hover:border-slate-600'
                }`} onClick={() => handleToggleSelect(mapData.no_berkas)}>
                  
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <input 
                      type="checkbox" 
                      className="w-6 h-6 rounded border-slate-600 text-rose-600 focus:ring-rose-500 bg-slate-900 cursor-pointer pointer-events-none"
                      checked={isChecked}
                      readOnly
                    />
                    <div>
                      <h5 className={`font-bold text-lg mb-1 transition-colors ${isChecked ? 'text-white' : 'text-slate-200 group-hover:text-white'}`}>
                        {highlightText(mapData.nama, query)}
                      </h5>
                      <div className="text-slate-400 text-sm">
                        Rumah Berkas: <strong className={isChecked ? 'text-rose-400' : 'text-white'}>{highlightText(mapData.no_berkas, query)}</strong> • NPWP: {highlightText(mapData.npwp_16, query)}
                      </div>
                      <div className="mt-2 text-xs font-semibold text-slate-500">
                        📦 {mapData.dokumenList.length} Dokumen terdaftar | {mapData.cabangCount} Cabang
                      </div>
                    </div>
                  </div>

                  <div className="w-full md:w-auto flex justify-end">
                    <button 
                      className="border border-rose-500/50 text-rose-400 hover:bg-rose-600 hover:text-white font-bold py-2 px-5 rounded-lg transition-colors text-sm w-full md:w-auto" 
                      onClick={(e) => { e.stopPropagation(); triggerMutasiSatuan(mapData.no_berkas); }}
                    >
                      Mutasi Satuan
                    </button>
                  </div>

                </div>
              )
            })}
          </div>

          {sudahCari && query.trim() !== '' && (
            <Pagination 
              currentPage={page} 
              totalPages={totalPages} 
              totalItems={totalItems} 
              onPageChange={handlePageChange} 
            />
          )}
        </div>
      )}

      {activeTab === 'riwayat' && (
        <div className="animate-fade-in bg-[#0f172a] rounded-2xl border border-slate-800 overflow-hidden shadow-lg">
          <div className="p-5 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
            <h5 className="font-bold text-lg text-white">📖 Wajib Pajak yang Telah Pindah KPP ({riwayat.length})</h5>
          </div>
          
          <div className="overflow-x-auto">
            {riwayat.length === 0 ? (
              <div className="text-center py-12 text-slate-500">Belum ada riwayat mutasi / dokumen beku.</div>
            ) : (
              <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-slate-800/80 border-b border-slate-700 text-slate-300">
                  <tr>
                    <th className="py-4 px-6 text-center font-semibold w-32">No Arsip (Lama)</th>
                    <th className="py-4 px-6 font-semibold">Identitas Historis WP</th>
                    <th className="py-4 px-6 text-center font-semibold">Jumlah Dokumen</th>
                    <th className="py-4 px-6 text-center font-semibold">Status Akhir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {riwayat.map((item, i) => (
                    <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-6 text-center">
                        <span className="font-black text-rose-500 bg-rose-500/10 px-3 py-1.5 rounded border border-rose-500/20">{item.no_berkas}</span>
                      </td>
                      <td className="py-4 px-6">
                        <h6 className="font-bold text-white text-base mb-1">{item.nama}</h6>
                        <span className="text-slate-500 text-xs">NPWP: {item.npwp_16}</span>
                      </td>
                      <td className="py-4 px-6 text-center font-semibold text-slate-400">
                        {item.dokumenList.length} Lembar
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="bg-slate-700 text-slate-300 px-3 py-1 rounded-full text-xs font-bold shadow-sm border border-slate-600">
                          ❄️ Beku (Dimutasi)
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POP-UP MODAL KUSTOM: PERINGATAN MUTASI (SATUAN & MASSAL) */}
      {/* ========================================================================= */}
      {modalMutasi.isOpen && (
        <div className="fixed inset-0 bg-[#060b14]/85 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0f172a] border border-rose-500/40 rounded-2xl shadow-[0_0_40px_rgba(244,63,94,0.15)] w-full max-w-lg overflow-hidden transform transition-all scale-100">
            
            {/* Header Modal */}
            <div className="bg-rose-950/40 p-5 border-b border-rose-500/30 text-rose-400 font-bold text-lg flex items-center gap-3">
              <span className="text-2xl">⚠️</span> 
              <span>PERINGATAN KERAS</span>
            </div>

            {/* Body Modal */}
            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-white font-bold text-xl leading-tight mb-2">
                  {modalMutasi.isMassal 
                    ? `🔥 Anda akan memutasi ${selectedBerkas.length} WP SECARA MASSAL.` 
                    : `🔥 Anda akan memutasi Berkas No. ${modalMutasi.targetId}.`}
                </h4>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Semua nomor berkas akan secara otomatis diubah menjadi prefix <strong className="text-rose-400">EKS-</strong> dan seluruh dokumen di dalamnya akan dibekukan secara permanen dari sistem rak aktif.
                </p>
              </div>

              <div className="border-t border-slate-800 pt-5">
                <label className="block text-sm font-bold text-amber-500 mb-2">
                  ALASAN MUTASI (Wajib Diisi):
                </label>
                <input 
                  type="text" 
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all placeholder-slate-600" 
                  placeholder="Cth: Pindah KPP X atau Pemecahan KPP Y..." 
                  value={alasanMutasi} 
                  onChange={(e) => setAlasanMutasi(e.target.value)} 
                  autoFocus 
                />
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex justify-end gap-3">
              <button 
                className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold py-2 px-6 rounded-lg transition-colors" 
                onClick={tutupModal}
                disabled={isMutasiLoading}
              >
                Batal
              </button>
              <button 
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 px-6 rounded-lg transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2" 
                onClick={konfirmasiMutasiFinal}
                disabled={!alasanMutasi.trim() || isMutasiLoading}
              >
                {isMutasiLoading ? '⏳ Memproses...' : '🔥 MUTASI SEKARANG'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}