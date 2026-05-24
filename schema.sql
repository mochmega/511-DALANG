
        CREATE TABLE IF NOT EXISTS data_berkas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            no_berkas TEXT NOT NULL,
            nama TEXT NOT NULL,
            identitas TEXT NOT NULL,
            isi_berkas TEXT,
            lokasi TEXT,
            status_pinjam TEXT DEFAULT 'Di Gudang'
        );
    