export default function UniversalSearch({ 
  searchTerm, 
  onSearchChange, 
  searchBy, 
  onSearchByChange, 
  limit, 
  onLimitChange,
  placeholder = "Ketik kata kunci pencarian..."
}) {
  return (
    <div className="flex flex-col md:flex-row bg-slate-900 rounded-xl border border-slate-700 overflow-hidden shadow-lg focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-all">
      <div className="flex md:w-auto border-b md:border-b-0 md:border-r border-slate-700 bg-slate-900/50">
        <select 
          className="bg-transparent text-slate-300 font-semibold py-3 px-4 focus:outline-none cursor-pointer appearance-none"
          value={searchBy}
          onChange={(e) => onSearchByChange(e.target.value)}
        >
          <option value="all">🔍 Semua Kategori</option>
          <option value="nama">👤 Nama WP</option>
          <option value="no_berkas">📁 No Rumah Berkas</option>
          <option value="npwp">💳 NPWP / NITKU</option>
        </select>
      </div>
      <input 
        type="text" 
        className="flex-1 bg-transparent text-white px-4 py-3 focus:outline-none placeholder-slate-500"
        placeholder={searchBy === 'no_berkas' ? 'Ketik Nomor Rumah Berkas...' : placeholder} 
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <div className="flex md:w-auto border-t md:border-t-0 md:border-l border-slate-700 bg-slate-900/50">
        <select 
          className="bg-transparent text-slate-400 font-medium py-3 px-4 focus:outline-none cursor-pointer appearance-none text-sm"
          value={limit}
          onChange={(e) => onLimitChange(e.target.value)}
        >
          <option value="10">Limit: 10</option>
          <option value="15">Limit: 15</option>
          <option value="25">Limit: 25</option>
          <option value="50">Limit: 50</option>
          <option value="100">Limit: 100</option>
          <option value="semua">Semua (Max)</option>
        </select>
      </div>
    </div>
  )
}
