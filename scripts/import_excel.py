import pandas as pd
import sqlite3

print("Mulai membaca file Excel...")

try:
    # TRIK ANTI HILANG NOL: Menambahkan dtype=str
    # Ini memaksa Pandas membaca seluruh isi Excel sebagai Teks murni
    df = pd.read_excel('data_lama.xlsx', dtype=str)
except FileNotFoundError:
    print("Error: File 'data_lama.xlsx' tidak ditemukan.")
    exit()

# Membersihkan nama kolom dari spasi berlebih agar tidak error
df.columns = df.columns.str.strip()

print("Membuat database baru dengan struktur canggih...")
conn = sqlite3.connect('database.db')
cursor = conn.cursor()

# Membuat tabel baru yang mendukung NITKU dan NPWP
cursor.execute('''
    CREATE TABLE IF NOT EXISTS data_berkas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        no_berkas TEXT NOT NULL,
        npwp_9 TEXT,
        npwp TEXT,
        npwp_16 TEXT,
        nitku TEXT,
        nama TEXT NOT NULL,
        isi_berkas TEXT,
        lokasi TEXT,
        status_pinjam TEXT DEFAULT 'Di Gudang'
    )
''')

sukses = 0
gagal = 0

print("Memasukkan data, mengamankan angka 0 di depan...")

for index, row in df.iterrows():
    try:
        # Mengambil data persis seperti teks di Excel
        # Jika ada data kosong (NaN), kita ubah jadi teks kosong
        no_berkas = str(row['NO BERKAS']).strip() if pd.notna(row['NO BERKAS']) else ""
        npwp_9 = str(row['NPWP 9 DIGIT']).strip() if pd.notna(row['NPWP 9 DIGIT']) else ""
        npwp = str(row['NPWP']).strip() if pd.notna(row['NPWP']) else ""
        npwp_16 = str(row['NPWP16']).strip() if pd.notna(row['NPWP16']) else ""
        nitku = str(row['NITKU']).strip() if pd.notna(row['NITKU']) else ""
        nama = str(row['NAMA_WP']).strip() if pd.notna(row['NAMA_WP']) else ""
        
        isi_berkas = "Belum diupdate"
        lokasi = "Belum ditentukan"
        status_pinjam = "Di Gudang"

        cursor.execute('''
            INSERT INTO data_berkas 
            (no_berkas, npwp_9, npwp, npwp_16, nitku, nama, isi_berkas, lokasi, status_pinjam)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (no_berkas, npwp_9, npwp, npwp_16, nitku, nama, isi_berkas, lokasi, status_pinjam))
        
        sukses += 1
    except Exception as e:
        print(f"Gagal di baris Excel ke-{index + 2}: {e}")
        gagal += 1

conn.commit()
conn.close()

print("========================================")
print("PROSES SELESAI!")
print(f"Berhasil: {sukses} data (Angka 0 aman!)")
if gagal > 0:
    print(f"Gagal: {gagal} data")
print("========================================")