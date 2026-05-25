export const simpanKeDB = async (importMetaEnvUrl, auth, noBerkas, newList, log_action = null, log_desc = null) => {
  try {
    const username = auth?.username || 'Sistem'
    const token = auth?.token
    const res = await fetch(`${importMetaEnvUrl}/api/berkas/update-isi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        no_berkas: noBerkas,
        isi_berkas: newList,
        log_action: log_action,
        log_desc: log_desc,
        username: username
      })
    })
    const data = await res.json()
    return data.status === 'success'
  } catch (error) {
    console.error("Gagal update DB:", error)
    return false
  }
}
