export const simpanKeDB = async (importMetaEnvUrl, auth, noBerkas, newList, log_action = null, log_desc = null) => {
  try {

    const token = auth?.token
    const res = await fetch(`${importMetaEnvUrl}/api/berkas/update-isi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        no_berkas: noBerkas,
        isi_berkas: newList,
        log_action: log_action,
        log_desc: log_desc
      })
    })
    const data = await res.json()
    return data.status === 'success'
  } catch (error) {
    console.error("Gagal update DB:", error)
    return false
  }
}

export const viewFileWithAuth = async (importMetaEnvUrl, auth, filepath, showAlert) => {
  try {
    const filename = filepath.split('/').pop()
    const res = await fetch(`${importMetaEnvUrl}/api/files/${filepath}`, {
      headers: {
        'Authorization': `Bearer ${auth?.token}`
      }
    })
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        if (showAlert) showAlert('Akses ditolak. Silakan login kembali.', 'error')
      } else {
        if (showAlert) showAlert('File tidak ditemukan atau terjadi kesalahan server.', 'error')
      }
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    // We can't revoke it immediately if opened in a new tab because it needs time to load.
  } catch (error) {
    console.error('Gagal membuka file:', error)
    if (showAlert) showAlert('Gagal membuka file, koneksi bermasalah.', 'error')
  }
}

