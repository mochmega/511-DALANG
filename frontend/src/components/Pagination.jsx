export default function Pagination({ currentPage, totalPages, onPageChange, totalItems }) {
  if (totalPages <= 1 && totalItems === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 bg-[#0f172a] p-4 rounded-xl border border-slate-800">
      <div className="text-slate-400 text-sm">
        Total <span className="font-bold text-white">{totalItems}</span> Rumah Berkas ditemukan
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            currentPage <= 1
              ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
              : 'bg-slate-800 text-white hover:bg-slate-700 hover:text-theme-400'
          }`}
        >
          Sebeumnya
        </button>
        
        <div className="px-4 py-2 bg-slate-900 rounded-lg text-slate-300 font-medium">
          Halaman <span className="text-white">{currentPage}</span> dari <span className="text-white">{totalPages}</span>
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            currentPage >= totalPages
              ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
              : 'bg-slate-800 text-white hover:bg-slate-700 hover:text-theme-400'
          }`}
        >
          Selanjutnya
        </button>
      </div>
    </div>
  )
}
