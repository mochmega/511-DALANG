import { useState, useEffect, useRef } from 'react'
import { useAlert } from '../context/AlertContext'
import { useAuth } from '../context/AuthContext'

export default function Registrasi() {
  const [activeTab, setActiveTab] = useState('satuan')
  
  // ==========================================
  // STATE & LOGIKA: REGISTRASI SATUAN
  // ==========================================
  const [formData, setFormData] = useState({
    no_berkas: '', nama: '', npwp: '', npwp_16: '', nitku: ''
  })
  const [isDaurUlang, setIsDaurUlang] = useState(false)
  const [isLoadingSatuan, setIsLoadingSatuan] = useState(false)
  
  const { showAlert } = useAlert()
  const { auth } = useAuth()
  const token = auth?.token

  const fetchSaranNomor = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/registrasi/saran-nomor`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setFormData(prev => ({ ...prev, no_berkas: data.saran_nomor }))
      setIsDaurUlang(data.is_daur_ulang)
    } catch (error) {
      console.error("Gagal mendapat saran nomor", error)
    }
  }

  useEffect(() => {
    if (activeTab === 'satuan') fetchSaranNomor()
  }, [activeTab])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleSubmitSatuan = async (e) => {
    e.preventDefault()
    if (!formData.no_berkas.trim() || !formData.nama.trim()) {
      showAlert("Nomor berkas dan nama wajib diisi", "error")
      return
    }
    setIsLoadingSatuan(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/registrasi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData)
      })
      const data = await res.json()
      if (data.status === 'success') {
        showAlert(`SUCCESS: ${data.message}`, "success")
        setFormData({ no_berkas: '', nama: '', npwp: '', npwp_16: '', nitku: '' })
        fetchSaranNomor()
      } else {
        showAlert(`Gagal: ${data.message}`, "error")
      }
    } catch (error) {
      showAlert("Terjadi kesalahan jaringan.", "error")
    } finally {
      setIsLoadingSatuan(false)
    }
  }

  // ==========================================
  // STATE & LOGIKA: REGISTRASI MASSAL
  // ==========================================
  const [fileMassal, setFileMassal] = useState(null)
  const [isLoadingMassal, setIsLoadingMassal] = useState(false)
  const fileInputRef = useRef(null)

  const handleDownloadTemplate = () => {
    // Generate CSV template langsung dari Frontend
    const csvContent = "data:text/csv;charset=utf-8,NAMA_WP,NPWP_15,NPWP_16,NITKU\nPT MAJU BERSAMA,01.234.567.8-901.000,1234567890123456,1234567890123456789012\nCV JAYA ABADI,02.345.678.9-012.000,2345678901234567,";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Template_Registrasi_Massal.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const handleSubmitMassal = async (e) => {
    e.preventDefault()
    if (!fileMassal) return showAlert("Pilih file Excel/CSV terlebih dahulu!", "error")
    
    setIsLoadingMassal(true)
    const formDataUpload = new FormData()
    formDataUpload.append('file', fileMassal)

    try {
      // Endpoint ini harus dibuat di Flask backend nanti
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/registrasi/massal`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formDataUpload
      })
      const data = await res.json()
      
      if (data.status === 'success') {
        showAlert(`SUCCESS:\n${data.message}`, "success")
        setFileMassal(null)
        if(fileInputRef.current) fileInputRef.current.value = ""
      } else {
        showAlert(`Gagal: ${data.message}`, "error")
      }
    } catch (error) {
      showAlert("Terjadi kesalahan jaringan. Pastikan backend sudah siap menerima file massal.", "error")
    } finally {
      setIsLoadingMassal(false)
    }
  }

  return (
    <div className="pb-10 animate-fade-in max-w-4xl mx-auto mt-4">
      
      {/* HEADER & TAB NAVIGATION */}
      <div className="mb-6 border-b border-slate-800 pb-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <span className="text-emerald-400">📥</span> Registrasi Wajib Pajak Baru
        </h2>
        <p className="text-slate-400 mt-1">Sistem Pintar Penempatan Arsip Fisik & Sinkronisasi Database.</p>
      </div>

      <div className="flex space-x-2 bg-[#0f172a] p-1.5 rounded-xl w-full md:w-max mb-8 border border-slate-800 shadow-sm">
        <button 
          className={`px-8 py-2.5 rounded-lg font-bold text-sm transition-all flex-1 md:flex-none ${activeTab === 'satuan' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`} 
          onClick={() => setActiveTab('satuan')}
        >
          👤 Registrasi Satuan
        </button>
        <button 
          className={`px-8 py-2.5 rounded-lg font-bold text-sm transition-all flex-1 md:flex-none ${activeTab === 'massal' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`} 
          onClick={() => setActiveTab('massal')}
        >
          📂 Registrasi Massal
        </button>
      </div>

      {/* ================================================================= */}
      {/* TAB 1: REGISTRASI SATUAN */}
      {/* ================================================================= */}
      {activeTab === 'satuan' && (
        <div className="bg-[#0f172a] rounded-2xl border border-slate-800 overflow-hidden shadow-2xl animate-fade-in max-w-3xl">
          <div className="p-8">
            <form onSubmit={handleSubmitSatuan} className="space-y-6">
              
              {/* Indikator AI Nomor */}
              <div className={`p-6 rounded-xl text-center border-2 border-dashed transition-all ${
                isDaurUlang 
                  ? 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]' 
                  : 'bg-slate-800/30 border-slate-600'
              }`}>
                <label className="block text-sm font-bold text-slate-400 mb-4 uppercase tracking-wider">
                  Rekomendasi Rumah Berkas Berkas Fisik
                </label>
                <div className="flex justify-center items-center gap-4">
                  <input 
                    type="text" 
                    className="bg-slate-950 border border-slate-700 text-center font-black text-4xl text-white rounded-xl w-40 py-3 focus:outline-none focus:border-emerald-500 shadow-inner" 
                    name="no_berkas"
                    value={formData.no_berkas} 
                    onChange={handleChange} 
                    required
                  />
                  {isDaurUlang ? (
                    <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
                      <span className="text-lg">♻️</span> Daur Ulang (Gigi Bolong)
                    </span>
                  ) : (
                    <span className="bg-slate-700 text-slate-300 border border-slate-600 font-bold px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
                      <span className="text-lg">🆕</span> Nomor Ekstensi Baru
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-4 font-medium">Nomor ini dideteksi otomatis oleh sistem. Dapat diubah manual.</p>
              </div>

              <hr className="border-slate-800 my-8" />

              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Nama Wajib Pajak (Pusat/Induk) *</label>
                <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-lg font-bold text-white uppercase focus:outline-none focus:border-emerald-500 transition-all placeholder-slate-600 shadow-inner" name="nama" value={formData.nama} onChange={handleChange} placeholder="CONTOH: PT MAJU MUNDUR SEJAHTERA" required autoFocus />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">NPWP 15 Digit</label>
                  <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-all placeholder-slate-600 shadow-inner" name="npwp" value={formData.npwp} onChange={handleChange} placeholder="00.000.000.0-000.000" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">NPWP 16 Digit (NIK)</label>
                  <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-all placeholder-slate-600 shadow-inner" name="npwp_16" value={formData.npwp_16} onChange={handleChange} placeholder="0000000000000000" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">NITKU Induk (Opsional)</label>
                <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-all placeholder-slate-600 shadow-inner" name="nitku" value={formData.nitku} onChange={handleChange} placeholder="0000000000000000000000" />
              </div>

              <div className="pt-4">
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-lg font-bold py-4 rounded-xl transition-all shadow-[0_4px_15px_rgba(16,185,129,0.3)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.4)] flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed" disabled={isLoadingSatuan}>
                  {isLoadingSatuan ? '⏳ Menyimpan Data...' : '💾 REGISTRASI WP BARU'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 2: REGISTRASI MASSAL */}
      {/* ================================================================= */}
      {activeTab === 'massal' && (
        <div className="bg-[#0f172a] rounded-2xl border border-slate-800 overflow-hidden shadow-2xl animate-fade-in">
          <div className="p-8">
            
            <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-6 py-5 rounded-xl shadow-sm flex items-start gap-4 mb-8">
              <span className="text-3xl mt-1">🤖</span>
              <div>
                <strong className="block mb-1 text-lg text-indigo-300">Autopilot AI Penempatan Rumah Berkas</strong>
                <span className="text-sm leading-relaxed block text-slate-300">
                  Unggah file Excel/CSV berisi ratusan data WP sekaligus. Sistem AI secara otomatis akan menempatkan mereka ke nomor rumah berkas yang teratur, termasuk memprioritaskan mengisi slot-slot kosong (Gigi Bolong) di rak gudang Anda.
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmitMassal} className="space-y-6">
              
              <div className="border-2 border-dashed border-slate-600 bg-slate-800/30 hover:bg-slate-800/50 hover:border-indigo-500 transition-colors rounded-2xl p-10 text-center">
                <span className="text-6xl mb-4 block">📄</span>
                <label className="block text-lg font-bold text-slate-200 mb-2">Upload File Database (.csv / .xlsx)</label>
                <p className="text-slate-400 text-sm mb-6">Pastikan format kolom sesuai dengan template standar.</p>
                
                <input 
                  type="file" 
                  ref={fileInputRef}
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  className="block w-full text-sm text-slate-400 file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-indigo-500/20 file:text-indigo-400 hover:file:bg-indigo-500/30 cursor-pointer max-w-md mx-auto"
                  onChange={(e) => setFileMassal(e.target.files[0])}
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
                <button 
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <span>📥</span> Download Template CSV
                </button>
                
                <button 
                  type="submit" 
                  className="w-full sm:flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-lg font-bold py-3 px-6 rounded-xl transition-all shadow-[0_4px_15px_rgba(79,70,229,0.3)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.4)] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed" 
                  disabled={isLoadingMassal || !fileMassal}
                >
                  {isLoadingMassal ? '⏳ Sedang Memproses Massal...' : '🚀 MULAI MIGRASI DATA'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  )
}