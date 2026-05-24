import { useState, useEffect } from "react";
import Pagination from "../components/Pagination";
import { useAuth } from "../context/AuthContext";

const ACTION_COLORS = {
  "Registrasi": "emerald",
  "Pinjam": "rose",
  "Kembali": "emerald",
  "Mutasi": "amber",
  "Approve": "sky", // Tambahan khusus aksi Approve
  "default": "slate"
};

export default function LogAktivitas() {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [filterAction, setFilterAction] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [loading, setLoading] = useState(true);

  const { auth } = useAuth();
  const role = auth?.role || 'user'; // Ambil role dari AuthContext (aman, tidak bisa dimanipulasi)

  const fetchLogs = async (currentPage = page) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        page: currentPage,
        limit: 50,
        ...(filterAction && { action: filterAction }),
        ...(filterUser && { user: filterUser })
      });
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/log?${params}`,
        { headers: { "Authorization": `Bearer ${token}` } }
      );
      const data = await res.json();
      setLogs(data.data);
      setTotalPages(data.total_pages);
      setTotalItems(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchLogs(1), 400);
    return () => clearTimeout(timer);
  }, [filterAction, filterUser]);

  const handlePageChange = (newPage) => {
    setPage(newPage);
    fetchLogs(newPage);
  };

  return (
    <div className="pb-10 animate-fade-in max-w-6xl mx-auto mt-4">
      <div className="mb-8 border-b border-slate-800 pb-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <span className="text-theme-400">📋</span> Log Aktivitas Sistem
        </h2>
        <p className="text-slate-400 mt-1">Riwayat lengkap semua aksi yang dilakukan dalam sistem.</p>
      </div>

      {/* Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-theme-500 shadow-inner"
        >
          <option value="">Semua Aksi</option>
          {role !== 'user' && <option value="Registrasi">Registrasi</option>}
          <option value="Pinjam">Pinjam</option>
          <option value="Kembali">Kembali</option>
          <option value="Approve">Approve</option>
          {role !== 'user' && <option value="Mutasi">Mutasi</option>}
        </select>
        <input
          type="text"
          placeholder="Filter berdasarkan username..."
          value={filterUser}
          onChange={(e) => setFilterUser(e.target.value)}
          className="bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-theme-500 flex-1 shadow-inner"
        />
      </div>

      {/* Tabel */}
      <div className="bg-[#0f172a] rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-800/80 border-b border-slate-700 text-slate-300">
              <tr>
                <th className="py-4 px-6 font-semibold w-32">Aksi</th>
                <th className="py-4 px-6 font-semibold">Deskripsi</th>
                <th className="py-4 px-6 font-semibold w-32">Oleh</th>
                <th className="py-4 px-6 font-semibold w-48">Waktu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-slate-300">
              {loading ? (
                <tr><td colSpan={4} className="text-center py-12 text-slate-500 font-bold animate-pulse">Memuat...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-12 text-slate-500">Belum ada log aktivitas.</td></tr>
              ) : logs.map((log, i) => {
                const color = ACTION_COLORS[log.action_type] || ACTION_COLORS.default;
                return (
                  <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-6">
                      <span className={`bg-${color}-500/10 text-${color}-400 text-xs px-3 py-1.5 rounded-md font-bold border border-${color}-500/20 shadow-sm inline-block`}>
                        {log.action_type}
                      </span>
                    </td>
                    <td className="py-3 px-6 whitespace-normal max-w-lg leading-relaxed">{log.description}</td>
                    <td className="py-3 px-6 font-bold text-theme-400 capitalize">{log.username}</td>
                    <td className="py-3 px-6 text-slate-400 text-xs font-medium">
                      {new Date(log.created_at).toLocaleString("id-ID", {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination: Disembunyikan untuk Petugas karena dilimit 10 */}
      {role !== 'petugas' && totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} totalItems={totalItems} onPageChange={handlePageChange} />
      )}
    </div>
  );
}
