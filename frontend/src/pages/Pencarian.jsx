import { useState, useEffect, useCallback } from 'react'
import { debounce } from 'lodash'
import { useAlert } from '../context/AlertContext'
import { useAuth } from '../context/AuthContext'
import UniversalSearch from '../components/UniversalSearch'
import Pagination from '../components/Pagination'
import { highlightText } from '../utils/highlight'

// KOMPONEN INPUT STYLING KHUSUS (Biar nggak nulis class berulang kali di form modal)
  const InputLabel = ({ children }) => <label className="block text-sm font-semibold text-slate-300 mb-1">{children}</label>
  const InputField = (props) => <input className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all" {...props} />

export default function Pencarian() {
  const [query, setQuery] = useState('')
  const [searchBy, setSearchBy] = useState('all')
  const [limit, setLimit] = useState('50')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalItems, setTotalItems] = useState(0)

  const [hasil, setHasil] = useState([])
  const [sudahCari, setSudahCari] = useState(false)
  
  const [modalMode, setModalMode] = useState(null)
  const [selectedMap, setSelectedMap] = useState(null)
  const [searchDoc, setSearchDoc] = useState('')
  
  const [selectedFile, setSelectedFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)

  const [newDoc, setNewDoc] = useState({ nama: '', nomor: '', jenis: '', tahun: '', tanggal: '', pemilik: '', wadah: '', status: 'Di Gudang', file_scan: '' })
  const [editDocData, setEditDocData] = useState(null)
  const [editDocIndex, setEditDocIndex] = useState(null)

  const [expandedCabang, setExpandedCabang] = useState({})
  
  const { showAlert, showConfirm } = useAlert()
  const { auth } = useAuth()
  const role = auth?.role || 'user'

  const parseIsiBerkas = (isi) => {
    if (!isi || isi === 'Belum diupdate') return []
    try { return JSON.parse(isi) } catch (e) { return [] }
  }

  const handleCari = async (currentPage = page, currentLimit = limit) => {
    try {
      const token = auth?.token
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/berkas?search=${encodeURIComponent(query)}&by=${encodeURIComponent(searchBy)}&page=${currentPage}&limit=${currentLimit}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const rawResponse = await res.json()
      
      const rawData = Array.isArray(rawResponse) ? rawResponse : (rawResponse.data || [])
      setTotalPages(rawResponse.total_pages || 1)
      setTotalItems(rawResponse.total_items || rawData.length)
      setPage(rawResponse.current_page || 1)

      const groupedData = rawData.reduce((acc, curr) => {
        const currentDocs = parseIsiBerkas(curr.isi_berkas)
        if (!acc[curr.no_berkas]) {
          acc[curr.no_berkas] = { ...curr, cabang: [], dokumenList: currentDocs }
        } else {
          acc[curr.no_berkas].cabang.push(curr)
          acc[curr.no_berkas].dokumenList = [...acc[curr.no_berkas].dokumenList, ...currentDocs]
        }
        return acc
      }, {})

      const groupedWithId = {}
      Object.entries(groupedData).forEach(([key, val]) => {
        groupedWithId[key] = {
          ...val,
          dokumenList: val.dokumenList.map((doc, i) => ({
            ...doc,
            _id: doc._id || `${key}_${i}_${Date.now()}`
          }))
        }
      })

      setHasil(Object.values(groupedWithId))
      setSudahCari(true)
      setExpandedCabang({})
    } catch (error) {
      console.error("Gagal mencari data:", error)
    }
  } 

  useEffect(() => {
    setPage(1)
    const timer = setTimeout(() => {
      handleCari(1, limit)
    }, 500)
    return () => clearTimeout(timer)
  }, [query, searchBy, limit])

  const handlePageChange = (newPage) => {
    setPage(newPage)
    handleCari(newPage, limit)
  }

  const toggleCabang = (noBerkas) => {
    setExpandedCabang(prev => ({ ...prev, [noBerkas]: !prev[noBerkas] }))
  }

  const getPilihanPemilik = (mapData) => {
    if (!mapData) return []
    const options = [{ label: `[Pusat] ${mapData.nama}`, value: `[Pusat] ${mapData.nama}` }]
    mapData.cabang.forEach(cab => {
      options.push({ label: `[Cabang] ${cab.nama} (NITKU: ${cab.nitku.slice(-6)})`, value: `[Cabang] ${cab.nama} (NITKU: ${cab.nitku})` })
    })
    return options
  }

  // Desain Badge Sirkulasi Baru (Ala SaaS)
  const renderInfoSirkulasi = (dokumenList) => {
    if (!dokumenList || dokumenList.length === 0) return <span className="text-slate-500 italic text-sm">📭 Belum ada dokumen</span>
    const total = dokumenList.length
    const diRak = dokumenList.filter(d => d.status === 'Di Gudang').length
    const dipinjam = total - diRak

    if (dipinjam === 0) return <span className="inline-block bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm">🟩 {total} Dokumen di Rak</span>
    if (diRak === 0) return <span className="inline-block bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm">🟥 {total} Dokumen di Luar/Proses</span>
    return <span className="inline-block bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm">🟧 {diRak} Rak | ⚠️ {dipinjam} Diproses/Dipinjam</span>
  }

  const renderBadgeStatus = (status) => {
    if (status === 'Di Gudang') return <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded-md font-bold">Di Rak</span>
    if (status === 'Menunggu Verifikasi' || status === 'Menunggu Pengembalian') return <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-1 rounded-md font-bold">Menunggu</span>
    return <span className="bg-rose-500/20 text-rose-400 text-xs px-2 py-1 rounded-md font-bold">Dipinjam</span>
  }

  const bukaModalLihat = (mapData) => {
    setSelectedMap(mapData)
    setSearchDoc('')
    setModalMode('lihat')
  }

  const bukaModalTambah = () => {
    setNewDoc({ nama: '', nomor: '', jenis: '', tahun: '', tanggal: '', pemilik: `[Pusat] ${selectedMap.nama}`, wadah: selectedMap.no_berkas, status: 'Di Gudang', file_scan: '' })
    setSelectedFile(null)
    setModalMode('tambah')
  }

  const bukaModalEditSatu = (doc, index) => {
    if (index === -1) {
      showAlert("Terjadi kesalahan: dokumen tidak ditemukan. Coba refresh halaman.", "error")
      return
    }
    setEditDocIndex(index)
    setEditDocData({ ...doc })
    setSelectedFile(null)
    setModalMode('edit_satu')
  }

  const tutupModal = () => {
    setModalMode(null)
    setSelectedMap(null)
    setSelectedFile(null)
  }

  const uploadFileKeServer = async () => {
    if (!selectedFile) return null
    const formData = new FormData()
    formData.append('file', selectedFile)
    try {
      const token = auth?.token
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/upload`, { 
        method: 'POST', 
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData 
      })
      const data = await res.json()
      if (data.status === 'success') return data.filename
      return null
    } catch (error) { return null }
  }

  const simpanKeDB = async (noBerkas, newList, log_action = null, log_desc = null) => {
    try {
      const username = auth?.username || 'Sistem'
      const token = auth?.token
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/berkas/update-isi`, {
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }, 
        body: JSON.stringify({ no_berkas: noBerkas, isi_berkas: newList, log_action, log_desc, username })
      })
      const data = await res.json()
      return data.status === 'success'
    } catch (error) { return false }
  }

  const hapusDokumenPermanen = async (realIndex) => {
    if (realIndex === -1) {
      showAlert("Terjadi kesalahan: dokumen tidak ditemukan. Coba refresh halaman.", "error")
      return
    }
    const isConfirmed = await showConfirm("Yakin ingin menghapus dokumen ini dari berkas?")
    if(!isConfirmed) return;
    const docToHapus = selectedMap.dokumenList[realIndex]
    const newList = selectedMap.dokumenList.filter((_, i) => i !== realIndex)
    
    const logDesc = `Dokumen ${docToHapus.nama} dihapus dari rumah berkas ${selectedMap.no_berkas}`
    const success = await simpanKeDB(selectedMap.no_berkas, newList, 'Mutasi', logDesc)
    if(success) { setSelectedMap({ ...selectedMap, dokumenList: newList }); handleCari(); }
  }

  const simpanEditSatu = async () => {
    if(!editDocData.nama.trim() || !editDocData.pemilik || !editDocData.wadah) return showAlert("Wajib diisi!", "error")
    setIsUploading(true)
    let namaFileFinal = editDocData.file_scan || ''
    if (selectedFile) {
      const uploadedName = await uploadFileKeServer()
      if (uploadedName) namaFileFinal = uploadedName
    }
    const newList = [...selectedMap.dokumenList]
    newList[editDocIndex] = { ...editDocData, file_scan: namaFileFinal }
    
    const logDesc = `Dokumen ${editDocData.nama} diedit dalam rumah berkas ${selectedMap.no_berkas}`
    const success = await simpanKeDB(selectedMap.no_berkas, newList, 'Mutasi', logDesc)
    if(success) { setSelectedMap({ ...selectedMap, dokumenList: newList }); setModalMode('lihat'); handleCari(); }
    setIsUploading(false)
  }

  const simpanTambahBaru = async () => {
    if(!newDoc.nama.trim() || !newDoc.pemilik || !newDoc.wadah) return showAlert("Wajib diisi!", "error")
    setIsUploading(true)
    let namaFileFinal = ''
    if (selectedFile) {
      const uploadedName = await uploadFileKeServer()
      if (uploadedName) namaFileFinal = uploadedName
    }
    const dataSiapKirim = { ...newDoc, file_scan: namaFileFinal, status: newDoc.status || 'Di Gudang' }
    const newList = [...selectedMap.dokumenList, dataSiapKirim]
    
    const logDesc = `Dokumen ${newDoc.nama} ditambahkan ke rumah berkas ${selectedMap.no_berkas}`
    const success = await simpanKeDB(selectedMap.no_berkas, newList, 'Registrasi', logDesc)
    if(success) { setSelectedMap({ ...selectedMap, dokumenList: newList }); setModalMode('lihat'); handleCari(); }
    setIsUploading(false)
  }

  const filteredDocs = selectedMap ? selectedMap.dokumenList.filter(doc => {
    const term = searchDoc.toLowerCase()
    return (
      (doc.nama && doc.nama.toLowerCase().includes(term)) || (doc.jenis && doc.jenis.toLowerCase().includes(term)) ||
      (doc.tahun && doc.tahun.toLowerCase().includes(term)) || (doc.wadah && doc.wadah.toLowerCase().includes(term)) ||
      (doc.pemilik && doc.pemilik.toLowerCase().includes(term))
    )
  }) : []


  return (
    <div className="pb-10 animate-fade-in">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <span>🔍</span> Temukan Rumah Berkas
        </h2>
        <p className="text-slate-400 mt-1">Cari berdasarkan No Berkas, Nama Wajib Pajak, atau NPWP/NITKU.</p>
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
        />
      </div>

      {/* TABEL HASIL PENCARIAN */}
      {sudahCari && hasil.length > 0 && (
        <div className="bg-[#0f172a] rounded-2xl border border-slate-800 overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-800/80 border-b border-slate-700 text-slate-300 text-sm tracking-wide">
                <tr>
                  <th className="py-4 px-6 text-center font-semibold w-24">Rumah Berkas</th>
                  <th className="py-4 px-6 font-semibold">Identitas Wajib Pajak</th>
                  <th className="py-4 px-6 text-center font-semibold">Info Sirkulasi</th>
                  <th className="py-4 px-6 text-center font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {hasil.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="py-4 px-6 text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-slate-800 border border-slate-700 text-emerald-400 font-black text-2xl shadow-inner group-hover:border-emerald-500/50 transition-colors">
                        {highlightText(item.no_berkas, query)}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <h5 className="font-bold text-white text-lg mb-1">{highlightText(item.nama, query)}</h5>
                      <div className="text-slate-400 text-sm flex gap-4">
                        <span><strong className="text-slate-500">NPWP:</strong> {highlightText(item.npwp_16, query)}</span>
                        <span><strong className="text-slate-500">NITKU:</strong> {highlightText(item.nitku, query)}</span>
                      </div>
                      {item.cabang.length > 0 && (
                        <div className="mt-3">
                          <button className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors border border-slate-700" onClick={() => toggleCabang(item.no_berkas)}>
                            {expandedCabang[item.no_berkas] ? '− Sembunyikan Cabang' : `+ ${item.cabang.length} Cabang Lainnya`}
                          </button>
                          {expandedCabang[item.no_berkas] && (
                            <div className="mt-3 pl-4 border-l-2 border-slate-700 space-y-2">
                              {item.cabang.map((cab, idx) => (
                                <div key={idx} className="bg-slate-900/50 p-2 rounded-lg border border-slate-800">
                                  <div className="font-bold text-slate-200 text-sm">{cab.nama}</div>
                                  <div className="text-slate-500 text-xs">NPWP: {cab.npwp_16} | NITKU: {cab.nitku}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center align-middle">
                      {renderInfoSirkulasi(item.dokumenList)}
                    </td>
                    <td className="py-4 px-6 text-center align-middle">
                      <button className="bg-slate-700 hover:bg-emerald-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors border border-slate-600 hover:border-emerald-500 shadow-sm" onClick={() => bukaModalLihat(item)}>
                        📦 Lihat Isi ({item.dokumenList.length})
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {sudahCari && (
        <Pagination 
          currentPage={page} 
          totalPages={totalPages} 
          totalItems={totalItems} 
          onPageChange={handlePageChange} 
        />
      )}

      {/* ========================================= */}
      {/* MODAL 1: LIHAT ISI DOKUMEN (GLASSMORPHISM) */}
      {/* ========================================= */}
      {modalMode === 'lihat' && selectedMap && (
        <div className="fixed inset-0 bg-[#060b14]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
            
            {/* Header Modal */}
            <div className="p-5 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
              <h5 className="font-bold text-lg text-white flex items-center gap-2">
                📦 <span>Daftar Dokumen - Berkas No. <span className="text-emerald-400">{selectedMap.no_berkas}</span></span>
              </h5>
              <div className="flex-1 max-w-md mx-6">
                <input type="text" className="w-full bg-slate-950 border border-slate-700 text-white rounded-full px-4 py-1.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder-slate-500" placeholder="🔍 Cari nama, tahun, atau rumah berkas..." value={searchDoc} onChange={(e) => setSearchDoc(e.target.value)} />
              </div>
              <button className="text-slate-400 hover:text-white text-2xl font-bold px-2" onClick={tutupModal}>×</button>
            </div>

            {/* Body Modal */}
            <div className="overflow-y-auto flex-1 bg-[#060b14]/50">
              {selectedMap.dokumenList.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                  <span className="text-5xl mb-3 block">📭</span>
                  <h5 className="text-lg font-semibold text-slate-400">Belum ada dokumen di rumah berkas ini.</h5>
                </div>
              ) : filteredDocs.length === 0 ? (
                 <div className="text-center py-20 text-slate-500"><h5 className="text-lg">Pencarian "{searchDoc}" tidak ditemukan.</h5></div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-800 text-slate-300 sticky top-0 z-10 shadow-md">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Pemilik</th>
                      <th className="py-3 px-4 font-semibold text-center">Rumah Berkas</th>
                      <th className="py-3 px-4 font-semibold">Nama Dokumen</th>
                      <th className="py-3 px-4 font-semibold">Nomor</th>
                      <th className="py-3 px-4 font-semibold">Tahun</th>
                      <th className="py-3 px-4 font-semibold text-center">Status</th>
                      <th className="py-3 px-4 font-semibold text-center">Scan</th>
                      {role !== 'user' && <th className="py-3 px-4 font-semibold text-center">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-slate-300">
                     {filteredDocs.map((doc, index) => {
                        const realIndex = selectedMap.dokumenList.findIndex(d => d._id === doc._id)
                        return (
                        <tr key={index} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4 font-semibold text-theme-400">{highlightText(doc.pemilik || '-', searchDoc)}</td>
                          <td className="py-3 px-4 text-center font-bold text-white">{highlightText(doc.wadah || selectedMap.no_berkas, searchDoc)}</td>
                          <td className="py-3 px-4 font-bold text-white">{highlightText(doc.nama, searchDoc)}</td>
                          <td className="py-3 px-4">{highlightText(doc.nomor || '-', searchDoc)}</td>
                          <td className="py-3 px-4">{highlightText(doc.tahun || '-', searchDoc)}</td>
                          <td className="py-3 px-4 text-center">
                            {renderBadgeStatus(doc.status)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {doc.file_scan ? (
                              <a href={`${import.meta.env.VITE_API_URL}/api/files/${doc.file_scan}`} target="_blank" rel="noreferrer" className="text-emerald-400 hover:text-emerald-300 font-semibold text-xs border border-emerald-500/30 px-2 py-1 rounded bg-emerald-500/10">👁️ Lihat</a>
                            ) : <span className="text-slate-600">-</span>}
                          </td>
                          {role !== 'user' && (
                            <td className="py-3 px-4 text-center">
                              <div className="inline-flex rounded-lg border border-slate-700 bg-slate-800 overflow-hidden">
                                <button className="px-3 py-1.5 hover:bg-slate-700 text-theme-400 transition-colors border-r border-slate-700" onClick={() => bukaModalEditSatu(doc, realIndex)} title="Edit">✏️</button>
                                <button className="px-3 py-1.5 hover:bg-rose-900/50 text-rose-400 transition-colors" onClick={() => hapusDokumenPermanen(realIndex)} title="Hapus">❌</button>
                              </div>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer Modal */}
            <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-between">
              <div>
                {role !== 'user' && (
                  <button className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-6 rounded-lg transition-colors shadow-lg" onClick={bukaModalTambah}>➕ Tambah Dokumen</button>
                )}
              </div>
              <button className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors" onClick={tutupModal}>Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* MODAL 2: TAMBAH DOKUMEN BARU */}
      {/* ========================================= */}
      {modalMode === 'tambah' && selectedMap && (
        <div className="fixed inset-0 bg-[#060b14]/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 bg-emerald-900/20 text-emerald-400 font-bold text-lg flex items-center gap-2">
              ➕ <span>Tambah Dokumen Baru</span>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <InputLabel>Milik Wajib Pajak (Pusat/Cabang) *</InputLabel>
                  <select className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500" value={newDoc.pemilik} onChange={(e) => setNewDoc({...newDoc, pemilik: e.target.value})}>
                    {getPilihanPemilik(selectedMap).map((opt, i) => <option key={i} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                <div className="col-span-1">
                  <InputLabel>No Berkas *</InputLabel>
                  <InputField type="text" value={newDoc.wadah} onChange={(e) => setNewDoc({...newDoc, wadah: e.target.value.toUpperCase()})} />
                </div>
              </div>
              
              <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-4 border-dashed">
                <InputLabel>📎 Upload File Scan (PDF/JPG) - Opsional</InputLabel>
                <input type="file" className="text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-500/10 file:text-emerald-400 hover:file:bg-emerald-500/20 cursor-pointer w-full mt-2" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => {
                  const file = e.target.files[0]
                  if (file && file.size > 20 * 1024 * 1024) {
                    showAlert("File maksimal 20MB", "error")
                    e.target.value = ""
                    return
                  }
                  setSelectedFile(file)
                }} />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                <div className="col-span-2 md:col-span-1">
                  <InputLabel>Nama / Keterangan Dokumen *</InputLabel>
                  <InputField type="text" placeholder="Cth: Akta Pendirian" value={newDoc.nama} onChange={(e) => setNewDoc({...newDoc, nama: e.target.value})} autoFocus />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <InputLabel>Nomor Dokumen</InputLabel>
                  <InputField type="text" placeholder="Cth: 123/IX/2023" value={newDoc.nomor} onChange={(e) => setNewDoc({...newDoc, nomor: e.target.value})} />
                </div>
                <div>
                  <InputLabel>Jenis Dokumen</InputLabel>
                   <InputField type="text" placeholder="Cth: Akta, SPT..." value={newDoc.jenis} onChange={(e) => setNewDoc({...newDoc, jenis: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <InputLabel>Tahun</InputLabel>
                    <InputField type="text" placeholder="2023" value={newDoc.tahun} onChange={(e) => setNewDoc({...newDoc, tahun: e.target.value})} />
                  </div>
                  <div>
                    <InputLabel>Tanggal</InputLabel>
                    <InputField type="date" value={newDoc.tanggal} onClick={(e) => e.target.showPicker && e.target.showPicker()} onChange={(e) => setNewDoc({...newDoc, tanggal: e.target.value})} />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end gap-3">
              <button className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors" onClick={() => setModalMode('lihat')} disabled={isUploading}>Batal</button>
              <button className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-6 rounded-lg transition-colors shadow-lg" onClick={simpanTambahBaru} disabled={isUploading}>
                {isUploading ? '⏳ Mengunggah...' : '💾 Simpan Dokumen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* MODAL 3: EDIT DOKUMEN */}
      {/* ========================================= */}
      {modalMode === 'edit_satu' && editDocData && (
        <div className="fixed inset-0 bg-[#060b14]/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 bg-[#0f172a]/20 text-theme-400 font-bold text-lg flex items-center gap-2">
              ✏️ <span>Edit Dokumen</span>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <InputLabel>Milik Wajib Pajak *</InputLabel>
                  <select className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500" value={editDocData.pemilik} onChange={(e) => setEditDocData({...editDocData, pemilik: e.target.value})}>
                    {getPilihanPemilik(selectedMap).map((opt, i) => <option key={i} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                <div className="col-span-1">
                  <InputLabel>No Berkas *</InputLabel>
                  <InputField type="text" value={editDocData.wadah} onChange={(e) => setEditDocData({...editDocData, wadah: e.target.value.toUpperCase()})} />
                </div>
              </div>

              <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-4 border-dashed">
                <InputLabel>📎 Timpa/Ganti File Scan (Opsional)</InputLabel>
                {editDocData.file_scan && <div className="text-xs text-emerald-400 mb-2 font-semibold">File saat ini: {editDocData.file_scan}</div>}
                <input type="file" className="text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-theme-500/10 file:text-theme-400 hover:file:bg-theme-500/20 cursor-pointer w-full" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => {
                  const file = e.target.files[0]
                  if (file && file.size > 20 * 1024 * 1024) {
                    showAlert("File maksimal 20MB", "error")
                    e.target.value = ""
                    return
                  }
                  setSelectedFile(file)
                }} />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                <div className="col-span-2 md:col-span-1">
                  <InputLabel>Nama / Keterangan Dokumen *</InputLabel>
                  <InputField type="text" value={editDocData.nama} onChange={(e) => setEditDocData({...editDocData, nama: e.target.value})} />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <InputLabel>Nomor Dokumen</InputLabel>
                  <InputField type="text" value={editDocData.nomor} onChange={(e) => setEditDocData({...editDocData, nomor: e.target.value})} />
                </div>
                <div>
                  <InputLabel>Jenis Dokumen</InputLabel>
                  <InputField type="text" value={editDocData.jenis} onChange={(e) => setEditDocData({...editDocData, jenis: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <InputLabel>Tahun</InputLabel>
                    <InputField type="text" value={editDocData.tahun} onChange={(e) => setEditDocData({...editDocData, tahun: e.target.value})} />
                  </div>
                  <div>
                    <InputLabel>Tanggal</InputLabel>
                    <InputField type="date" value={editDocData.tanggal} onClick={(e) => e.target.showPicker && e.target.showPicker()} onChange={(e) => setEditDocData({...editDocData, tanggal: e.target.value})} />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end gap-3">
              <button className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors" onClick={() => setModalMode('lihat')} disabled={isUploading}>Batal</button>
              <button className="bg-theme-600 hover:bg-theme-500 text-white font-bold py-2 px-6 rounded-lg transition-colors shadow-lg" onClick={simpanEditSatu} disabled={isUploading}>
                {isUploading ? '⏳ Mengunggah...' : '💾 Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}