import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useAlert } from '../context/AlertContext'
import { highlightText } from '../utils/highlight'
import Pagination from '../components/Pagination'
import UniversalSearch from '../components/UniversalSearch'

export default function CariDokumen() {
  const { auth } = useAuth()
  const { showAlert } = useAlert()
  const navigate = useNavigate()
  const role = auth?.role || 'user'

  // State Pencarian
  const [query, setQuery] = useState('')
  const [searchBy, setSearchBy] = useState('all')
  const [limit, setLimit] = useState('50')
  const [jenisFilter, setJenisFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [tahunFilter, setTahunFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalItems, setTotalItems] = useState(0)

  // State Hasil
  const [hasil, setHasil] = useState([])
  const [loading, setLoading] = useState(false)
  const [sudahCari, setSudahCari] = useState(false)

  // State Modal Detail
  const [modalDoc, setModalDoc] = useState(null)

  // Generate tahun pilihan: 5 tahun ke belakang sampai tahun ini
  const tahunOptions = Array.from({ length: 10 }, (_, i) =>
    String(new Date().getFullYear() - i)
  )

  const handleCari = useCallback(async (currentPage = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        q: query,
        by: searchBy,
        limit: limit,
        jenis: jenisFilter,
        status: statusFilter,
        tahun: tahunFilter,
        page: currentPage,
      })
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/dokumen/cari?${params}`,
        { headers: { Authorization: `Bearer ${auth?.token}` } }
      )
      const data = await res.json()
      setHasil(data.data || [])
      setTotalPages(data.total_pages || 0)
      setTotalItems(data.total || 0)
      setPage(currentPage)
      setSudahCari(true)
    } catch (err) {
      showAlert('Gagal memuat data. Periksa koneksi ke server.', 'error')
    } finally {
      setLoading(false)
    }
  }, [query, searchBy, limit, jenisFilter, statusFilter, tahunFilter, auth?.token, showAlert])

  // Live search dengan debounce 500ms
  useEffect(() => {
    setPage(1)
    const timer = setTimeout(() => handleCari(1), 500)
    return () => clearTimeout(timer)
  }, [query, searchBy, limit, jenisFilter, statusFilter, tahunFilter])

  const handlePageChange = (newPage) => {
    setPage(newPage)
    handleCari(newPage)
  }

  // Badge status
  const renderBadge = (status, batasKembali) => {
    const terlambat = batasKembali && new Date(batasKembali) < new Date()
    if (status === 'Di Gudang') {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          🟢 Di Rak
        </span>
      )
    }
    if (status === 'Dipinjam' && terlambat) {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
          🔴 Terlambat
        </span>
      )
    }
    if (status === 'Dipinjam') {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
          ⚠️ Dipinjam
        </span>
      )
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-500/20 text-slate-400 border border-slate-500/30">
        ⏳ {status}
      </span>
    )
  }

  return (
    <div className="animate-fade-in pb-10">
      {/* Header */}
      <div className="mb-6 border-b border-slate-800 pb-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <span>🔍</span> Pencarian Dokumen
        </h2>
        <p className="text-slate-400 mt-1 text-sm">
          Cari dokumen fisik lintas seluruh rumah berkas secara langsung.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-4 mb-6">
        <UniversalSearch 
          searchTerm={query}
          onSearchChange={setQuery}
          searchBy={searchBy}
          onSearchByChange={setSearchBy}
          limit={limit}
          onLimitChange={setLimit}
          placeholder="Cari dokumen fisik..."
        />

        <div className="flex flex-wrap gap-3">
          {/* Filter Jenis */}
          <input
            type="text"
            placeholder="Ketik Jenis (Opsional)"
            value={jenisFilter}
            onChange={(e) => setJenisFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-theme-400 transition-all w-48"
          />

          {/* Filter Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-theme-400 transition-all"
          >
            <option value="">Semua Status</option>
            <option value="Di Gudang">Di Gudang</option>
            <option value="Dipinjam">Dipinjam</option>
            <option value="Menunggu Verifikasi">Menunggu Verifikasi</option>
            <option value="Menunggu Pengembalian">Menunggu Pengembalian</option>
          </select>

          {/* Filter Tahun */}
          <select
            value={tahunFilter}
            onChange={(e) => setTahunFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-theme-400 transition-all"
          >
            <option value="">Semua Tahun</option>
            {tahunOptions.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Info Hasil */}
      {sudahCari && (
        <p className="text-xs text-slate-500 mb-3">
          {loading ? 'Memuat...' : `Ditemukan ${totalItems} dokumen`}
          {(query || statusFilter || tahunFilter) && (
            <button
              onClick={() => { setQuery(''); setStatusFilter(''); setTahunFilter('') }}
              className="ml-3 text-theme-400 hover:underline"
            >
              Reset filter
            </button>
          )}
        </p>
      )}

      {/* Tabel Hasil */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-900 text-slate-400 text-xs uppercase tracking-wider">
              <th className="px-4 py-3 text-left">Nama Dokumen</th>
              <th className="px-4 py-3 text-left">Nomor</th>
              <th className="px-4 py-3 text-left">Tahun</th>
              <th className="px-4 py-3 text-left">Pemilik / WP</th>
              <th className="px-4 py-3 text-left">Rumah Berkas</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Peminjam</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="text-center text-slate-500 py-12">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-theme-400 border-t-transparent rounded-full animate-spin" />
                    Mencari dokumen...
                  </div>
                </td>
              </tr>
            )}
            {!loading && sudahCari && hasil.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-slate-500 py-12">
                  Tidak ada dokumen yang cocok dengan filter.
                </td>
              </tr>
            )}
            {!loading && !sudahCari && (
              <tr>
                <td colSpan={8} className="text-center text-slate-600 py-12">
                  Ketik untuk mulai mencari dokumen.
                </td>
              </tr>
            )}
            {!loading && hasil.map((doc, i) => (
              <tr
                key={`${doc.no_berkas}-${doc.doc_index}-${i}`}
                onClick={() => setModalDoc(doc)}
                className="border-t border-slate-800 hover:bg-slate-800/50 cursor-pointer transition-colors group"
              >
                <td className="px-4 py-3 text-white font-medium max-w-[200px] truncate group-hover:text-theme-300">
                  {highlightText(doc.nama, query)}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {highlightText(doc.nomor, query)}
                </td>
                <td className="px-4 py-3 text-slate-400">{doc.tahun}</td>
                <td className="px-4 py-3 text-slate-300 max-w-[250px] truncate">
                  <div className="font-semibold text-theme-300 text-xs mb-1">{doc.nama_wp}</div>
                  <div className="text-xs text-slate-400">{highlightText(doc.pemilik, query)}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-theme-400 font-mono text-xs font-bold">{doc.wadah || doc.no_berkas}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">{renderBadge(doc.status, doc.batas_kembali)}</td>
                <td className="px-4 py-3 text-slate-300">{doc.peminjam || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {sudahCari && totalPages > 1 && (
        <div className="mt-6">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalItems}
            itemName="Dokumen"
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* Modal Detail Dokumen */}
      {modalDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-900/50">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-theme-400">📄</span> Detail Dokumen
              </h3>
              <button 
                onClick={() => setModalDoc(null)}
                className="text-slate-400 hover:text-rose-400 transition-colors p-2 rounded-lg hover:bg-rose-500/10"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Nama Dokumen</label>
                  <div className="text-white font-medium bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">{modalDoc.nama}</div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Nomor Dokumen</label>
                  <div className="text-white font-medium bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">{modalDoc.nomor}</div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Jenis</label>
                  <div className="text-white font-medium bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">{modalDoc.jenis}</div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Tahun</label>
                  <div className="text-white font-medium bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">{modalDoc.tahun}</div>
                </div>
                
                <div className="md:col-span-2 border-t border-slate-800 pt-4 mt-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Lokasi Berkas Utama</label>
                  <div className="text-white font-medium bg-theme-500/10 p-4 rounded-xl border border-theme-500/20 flex flex-col gap-1">
                    <span className="text-theme-400 font-mono text-lg">{modalDoc.no_berkas}</span>
                    <span className="text-slate-300">Wajib Pajak: {modalDoc.nama_wp}</span>
                    <span className="text-slate-400 text-sm">NPWP: {modalDoc.npwp_16}</span>
                  </div>
                </div>

                <div className="md:col-span-2 border-t border-slate-800 pt-4">
                  <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Status & Peminjaman</label>
                  <div className="flex items-center gap-3 mb-3">
                    {renderBadge(modalDoc.status, modalDoc.batas_kembali)}
                  </div>
                  {modalDoc.status === 'Dipinjam' && (
                    <div className="grid grid-cols-2 gap-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                      <div>
                        <span className="block text-xs text-slate-500">Peminjam</span>
                        <span className="text-sm text-white">{modalDoc.peminjam || '-'}</span>
                      </div>
                      <div>
                        <span className="block text-xs text-slate-500">Keperluan</span>
                        <span className="text-sm text-white">{modalDoc.keperluan || '-'}</span>
                      </div>
                      <div>
                        <span className="block text-xs text-slate-500">Tanggal Pinjam</span>
                        <span className="text-sm text-white">{modalDoc.tanggal_pinjam || '-'}</span>
                      </div>
                      <div>
                        <span className="block text-xs text-slate-500">Batas Kembali</span>
                        <span className="text-sm text-rose-400 font-semibold">{modalDoc.batas_kembali || '-'}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* ACTION HUB */}
              <div className="p-4 md:p-6 bg-slate-800/80 border-t border-slate-700 flex flex-wrap gap-3 justify-end items-center">
                <button 
                  onClick={() => setModalDoc(null)}
                  className="px-5 py-2.5 rounded-xl font-bold text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                >
                  Tutup
                </button>
                
                {modalDoc.file_scan ? (
                  <a 
                    href={`${import.meta.env.VITE_API_URL}/api/download/${modalDoc.file_scan.split('/').pop()}`}
                    target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-md"
                  >
                    👁️ Lihat File Scan
                  </a>
                ) : (
                  <button 
                    disabled
                    className="inline-flex items-center gap-2 bg-slate-800 text-slate-500 cursor-not-allowed px-5 py-2.5 rounded-xl font-bold border border-slate-700"
                  >
                    🚫 Tidak Ada Scan
                  </button>
                )}
                
                {modalDoc.status === 'Di Gudang' && (
                  <button 
                    onClick={() => {
                      setModalDoc(null);
                      navigate(`/sirkulasi?no_berkas=${modalDoc.no_berkas}`);
                    }}
                    className={`inline-flex items-center gap-2 ${role === 'user' ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/30' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/30'} text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl`}
                  >
                    {role === 'user' ? '⏳ Ajukan Pinjam' : '📤 Pinjam Dokumen'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
