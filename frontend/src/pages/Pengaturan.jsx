import { useState, useEffect } from 'react'
import { useAlert } from '../context/AlertContext'

export default function Pengaturan() {
  const [activeTab, setActiveTab] = useState('profil')
  const [selectedColor, setSelectedColor] = useState(localStorage.getItem('themeColor') || 'sky')
  const role = localStorage.getItem('role')
  const { showAlert, showConfirm } = useAlert()

  // State Manajemen User
  const [users, setUsers] = useState([])
  const [isAdding, setIsAdding] = useState(false)
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'petugas' })
  const [csvFile, setCsvFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)

  // State Ganti Password
  const [passwordLama, setPasswordLama] = useState("")
  const [passwordBaru, setPasswordBaru] = useState("")
  const [isChangingPass, setIsChangingPass] = useState(false)

  const handleGantiPassword = async (e) => {
    e.preventDefault()
    if (!passwordBaru || passwordBaru.length < 6) {
      return showAlert("Password baru minimal 6 karakter!", "error")
    }
    setIsChangingPass(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/user/ganti-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ password_lama: passwordLama, password_baru: passwordBaru })
      })
      const data = await res.json()
      if (data.status === "success") {
        showAlert(data.message, "success")
        setPasswordLama("")
        setPasswordBaru("")
      } else {
        showAlert(data.message, "error")
      }
    } catch {
      showAlert("Gagal terhubung ke server.", "error")
    } finally {
      setIsChangingPass(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'user' && role === 'superuser') {
      fetchUsers()
    }
  }, [activeTab, role])

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Failed to fetch users', error)
    }
  }

  const handleThemeChange = async (color) => {
    setSelectedColor(color)
    localStorage.setItem('themeColor', color)
    document.documentElement.setAttribute('data-theme', color)
    
    // Save to backend
    const username = localStorage.getItem('username')
    if (username) {
      try {
        await fetch(`${import.meta.env.VITE_API_URL}/api/user/theme`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, theme: color })
        })
      } catch (err) {
        console.error("Failed to save theme to backend", err)
      }
    }
  }

  const handleAddUser = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/register`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newUser)
      })
      const data = await res.json()
      if (data.status === 'success') {
        fetchUsers()
        setNewUser({ username: '', password: '', role: 'petugas' })
        setIsAdding(false)
        showAlert(data.message, "success")
      } else {
        showAlert(data.message, "error")
      }
    } catch (error) {
      showAlert("Error adding user", "error")
    }
  }

  const handleCsvUpload = async (e) => {
    e.preventDefault()
    if (!csvFile) return showAlert("Pilih file CSV dulu!", "error")
    
    const formData = new FormData()
    formData.append('file', csvFile)

    setIsUploading(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/register/bulk`, {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (data.status === 'success') {
        showAlert(data.message, "success")
        fetchUsers()
        setCsvFile(null)
      } else {
        showAlert(data.message, "error")
      }
    } catch (error) {
      showAlert("Error upload CSV", "error")
    }
    setIsUploading(false)
  }

  const deleteUser = async (username) => {
    if (username === 'admin123') return showAlert("Superuser utama tidak bisa dihapus!", "error")
    const isConfirmed = await showConfirm(`Yakin hapus user ${username}?`)
    if (!isConfirmed) return

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/users/${username}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.status === 'success') {
        fetchUsers()
      } else {
        showAlert(data.message, "error")
      }
    } catch (error) {
      showAlert("Error deleting user", "error")
    }
  }

  return (
    <div className="pb-10 animate-fade-in max-w-4xl mx-auto">
      <div className="mb-8 border-b border-slate-800 pb-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <span className="text-theme-400">⚙️</span> Pengaturan Sistem
        </h2>
      </div>

      <div className="flex space-x-2 bg-[#0f172a] p-1.5 rounded-xl w-full md:w-max mb-8 border border-slate-800">
        <button className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'profil' ? 'bg-theme-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`} onClick={() => setActiveTab('profil')}>Profil & Keamanan</button>
        <button className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'tema' ? 'bg-theme-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`} onClick={() => setActiveTab('tema')}>Tampilan</button>
        {role === 'superuser' && (
          <button className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'user' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`} onClick={() => setActiveTab('user')}>Manajemen User</button>
        )}
      </div>

      <div className="bg-[#0f172a] rounded-2xl border border-slate-800 p-8 shadow-xl">
        
        {/* TAB 1: PROFIL */}
        {activeTab === 'profil' && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-lg font-bold text-white">Akun & Keamanan</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><label className="block text-sm text-slate-400 mb-2">Username</label><input disabled value={localStorage.getItem('username') || 'admin123'} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white" /></div>
              <div><label className="block text-sm text-slate-400 mb-2">Role</label><input disabled value={localStorage.getItem('role') || 'Superuser'} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white capitalize" /></div>
            </div>
            <hr className="border-slate-800" />
            <form onSubmit={handleGantiPassword} className="space-y-4 max-w-sm">
              <h4 className="font-bold text-white">Ganti Password</h4>
              <input
                type="password"
                placeholder="Password Lama"
                value={passwordLama}
                onChange={(e) => setPasswordLama(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white"
                required
              />
              <input
                type="password"
                placeholder="Password Baru (min. 6 karakter)"
                value={passwordBaru}
                onChange={(e) => setPasswordBaru(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white"
                required
              />
              <button
                type="submit"
                disabled={isChangingPass}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-bold transition-all w-full disabled:opacity-70"
              >
                {isChangingPass ? "Menyimpan..." : "Simpan Password"}
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: TEMA */}
        {activeTab === 'tema' && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-lg font-bold text-white">Preferensi Tampilan</h3>
            <div className="flex gap-4">
              {['sky', 'emerald', 'rose', 'violet', 'amber'].map((color) => (
                <button 
                  key={color}
                  onClick={() => handleThemeChange(color)}
                  className={`w-12 h-12 rounded-full transition-all border-4 ${
                    selectedColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60'
                  }`}
                  style={{ backgroundColor: `var(--color-${color}-500, ${color === 'sky' ? '#0ea5e9' : color === 'emerald' ? '#10b981' : color === 'rose' ? '#f43f5e' : color === 'violet' ? '#8b5cf6' : '#f59e0b'})` }}
                ></button>
              ))}
            </div>
            <p className="text-slate-400 text-sm">Pilih warna aksen (saat ini sudah terpilih: {selectedColor}).</p>
            
            {role === 'superuser' && (
              <div className="mt-8 pt-8 border-t border-slate-800">
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5 text-theme-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                  Backup & Export Database
                </h3>
                <p className="text-slate-400 text-sm mb-4">
                  Unduh seluruh data (database utama dan data user) dalam format .zip untuk keperluan backup lokal.
                </p>
                <button 
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem('token');
                      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/export-db`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                      });
                      
                      if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || 'Gagal export database');
                      }
                      
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'backup_database_lengkap.zip';
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      window.URL.revokeObjectURL(url);
                    } catch(err) {
                      showAlert(`Gagal: ${err.message}`, "error");
                    }
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2 border border-slate-600 hover:border-slate-500 w-max"
                >
                  <svg className="w-4 h-4 text-theme-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Unduh Backup (.zip)
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MANAJEMEN USER */}
        {activeTab === 'user' && role === 'superuser' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Manajemen User</h3>
              <div className="flex gap-2">
                <a href={`${import.meta.env.VITE_API_URL}/api/register/template`} download className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-bold transition-all text-sm flex items-center">
                  ⬇️ Template CSV
                </a>
                <button onClick={() => setIsAdding(!isAdding)} className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-lg font-bold transition-all">
                  {isAdding ? 'Batal' : '+ Tambah User'}
                </button>
              </div>
            </div>

            {isAdding && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900/50 p-6 rounded-xl border border-slate-700">
                {/* Manual Add Form */}
                <form onSubmit={handleAddUser} className="space-y-4 border-b md:border-b-0 md:border-r border-slate-700 pb-6 md:pb-0 md:pr-6">
                  <h4 className="font-bold text-white text-sm">Tambah Satu User</h4>
                  <div><label className="block text-xs text-slate-400 mb-1">Username</label><input required className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} /></div>
                  <div><label className="block text-xs text-slate-400 mb-1">Password</label><input required type="password" className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} /></div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Role</label>
                    <select className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                      <option value="petugas">Petugas</option>
                      <option value="user">User Biasa</option>
                      <option value="superuser">Superuser</option>
                    </select>
                  </div>
                  <button type="submit" className="bg-emerald-600 px-4 py-2 rounded font-bold text-white w-full">Simpan User</button>
                </form>

                {/* CSV Upload Form */}
                <form onSubmit={handleCsvUpload} className="space-y-4">
                  <h4 className="font-bold text-white text-sm">Upload Massal via CSV</h4>
                  <p className="text-xs text-slate-400">Pastikan format CSV sesuai dengan template (username, password, role).</p>
                  <input type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files[0])} className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-800 file:text-white hover:file:bg-slate-700 cursor-pointer" />
                  <button type="submit" disabled={isUploading} className="bg-theme-600 hover:bg-theme-500 disabled:opacity-50 px-4 py-2 rounded font-bold text-white w-full">
                    {isUploading ? 'Mengupload...' : 'Upload CSV'}
                  </button>
                </form>
              </div>
            )}

            <table className="w-full text-left text-slate-300">
              <thead><tr className="border-b border-slate-700"><th className="pb-3">Username</th><th className="pb-3">Role</th><th className="pb-3">Aksi</th></tr></thead>
              <tbody>
                {users.map((user, i) => (
                  <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/20">
                    <td className="py-4">{user.username}</td>
                    <td className="py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${user.role === 'superuser' ? 'bg-rose-900/50 text-rose-300' : 'bg-blue-900/50 text-blue-300'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-4 text-rose-400 cursor-pointer hover:text-rose-300" onClick={() => deleteUser(user.username)}>Hapus</td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan="3" className="text-center py-4 text-slate-500">Belum ada user.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}