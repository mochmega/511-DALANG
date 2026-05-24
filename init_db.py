import sqlite3

# Membuka koneksi ke database (file database.db akan otomatis dibuat jika belum ada)
connection = sqlite3.connect('database.db')

# Membuat tabel data_berkas dengan struktur yang kita rencanakan
with open('schema.sql', 'w') as f:
    f.write('''
        CREATE TABLE IF NOT EXISTS data_berkas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            no_berkas TEXT NOT NULL,
            nama TEXT NOT NULL,
            identitas TEXT NOT NULL,
            isi_berkas TEXT,
            lokasi TEXT,
            status_pinjam TEXT DEFAULT 'Di Gudang'
        );
    ''')

with open('schema.sql', 'r') as f:
    connection.executescript(f.read())

# Memasukkan 1 data contoh agar aplikasi tidak kosong
cur = connection.cursor()
cur.execute("INSERT INTO data_berkas (no_berkas, nama, identitas, isi_berkas, lokasi) VALUES (?, ?, ?, ?, ?)",
            ('B-001', 'Budi Santoso', '3301234567890123', 'Laporan 2023, Fotokopi KTP', 'Rak A1'))

connection.commit()
connection.close()
print("Database berhasil dibuat dan diisi 1 data contoh!")