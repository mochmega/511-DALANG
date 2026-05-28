export default function Pagination({ currentPage, totalPages, onPageChange, totalItems, itemName = "Rumah Berkas" }) {
  if (totalPages <= 1 && totalItems === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row flex-wrap items-center justify-between gap-4 mt-6 bg-slate-900 p-4 rounded-xl border border-slate-800">
      <div className="text-slate-400 text-sm shrink-0 whitespace-nowrap">
        Total <span className="font-bold text-white">{totalItems}</span> {itemName} ditemukan
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            currentPage <= 1
              ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
              : 'bg-slate-800 text-white hover:bg-slate-700 hover:text-theme-400'
          }`}
        >
          &lt;
        </button>
        
        <div className="flex flex-wrap items-center justify-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => {
              if (totalPages <= 7) return true;
              if (p === 1 || p === totalPages) return true;
              if (currentPage <= 4 && p <= 5) return true;
              if (currentPage >= totalPages - 3 && p >= totalPages - 4) return true;
              if (p >= currentPage - 1 && p <= currentPage + 1) return true;
              return false;
            })
            .map((p, index, array) => {
              const prev = array[index - 1];
              return (
                <span key={p} className="flex items-center gap-1">
                  {prev && p - prev > 1 && (
                    <span className="text-slate-500 px-2">...</span>
                  )}
                  <button
                    onClick={() => onPageChange(p)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      currentPage === p
                        ? 'bg-theme-500 text-white shadow-md'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                </span>
              );
            })}
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
          &gt;
        </button>
      </div>
    </div>
  )
}
