# File: scripts/seed_load_test.py
import os
import sqlite3
import random
from werkzeug.security import generate_password_hash

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DB = os.path.join(BASE_DIR, 'instance', 'gudang.db')
DST_DB = os.path.join(BASE_DIR, 'instance', 'load_test.db')

print("="*60)
print("🚀 MEMULAI PROSES MIGRASI & SEEDING DATABASE LOAD TEST")
print("="*60)
print(f"Source DB: {SRC_DB}")
print(f"Target DB: {DST_DB}\n")

if not os.path.exists(SRC_DB):
    print("❌ Error: Database sumber 'gudang.db' tidak ditemukan di folder instance!")
    exit(1)

# Inisialisasi koneksi
src_conn = sqlite3.connect(SRC_DB)
src_cursor = src_conn.cursor()

dst_conn = sqlite3.connect(DST_DB)
dst_cursor = dst_conn.cursor()

# 1. Pastikan tabel di load_test.db terbuat (jalankan create table jika belum ada)
# Menggunakan skema yang sama dengan model.py
dst_cursor.execute('''
    CREATE TABLE IF NOT EXISTS data_berkas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        no_berkas VARCHAR(50) NOT NULL,
        npwp_9 VARCHAR(50),
        npwp VARCHAR(50),
        npwp_16 VARCHAR(50),
        nitku VARCHAR(50),
        nama VARCHAR(200) NOT NULL,
        lokasi VARCHAR(100),
        status_pinjam VARCHAR(50) DEFAULT 'Di Gudang'
    )
''')

dst_cursor.execute('''
    CREATE TABLE IF NOT EXISTS dokumen (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        no_berkas VARCHAR(50) NOT NULL,
        nama VARCHAR(200) NOT NULL,
        nomor VARCHAR(100) DEFAULT '-',
        jenis VARCHAR(100) DEFAULT '-',
        tahun VARCHAR(10) DEFAULT '-',
        tanggal DATE,
        pemilik VARCHAR(200) DEFAULT '',
        wadah VARCHAR(50) DEFAULT '',
        status VARCHAR(50) DEFAULT 'Di Gudang',
        peminjam VARCHAR(200) DEFAULT '',
        tanggal_pinjam DATE,
        tanggal_kembali DATE,
        keperluan VARCHAR(300) DEFAULT '',
        file_scan VARCHAR(200) DEFAULT '',
        batas_kembali DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
''')

dst_cursor.execute('''
    CREATE TABLE IF NOT EXISTS user (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(80) UNIQUE NOT NULL,
        password_hash VARCHAR(120) NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        theme VARCHAR(20) DEFAULT 'sky',
        mode VARCHAR(10) DEFAULT 'dark'
    )
''')

dst_cursor.execute('''
    CREATE TABLE IF NOT EXISTS activity_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action_type VARCHAR(50),
        description VARCHAR(255),
        username VARCHAR(80),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
''')

# 2. Bersihkan tabel di load_test.db agar steril untuk pengetesan
print("🧹 Membersihkan data usang di database target...")
dst_cursor.execute("DELETE FROM data_berkas")
dst_cursor.execute("DELETE FROM dokumen")
dst_cursor.execute("DELETE FROM user")
dst_cursor.execute("DELETE FROM activity_log")
dst_conn.commit()

# 3. Ambil 500 berkas pertama dari gudang.db
print("📦 Membaca 500 berkas pertama dari database produksi...")
src_cursor.execute("""
    SELECT no_berkas, npwp_9, npwp, npwp_16, nitku, nama, lokasi, status_pinjam 
    FROM data_berkas 
    LIMIT 500
""")
berkas_rows = src_cursor.fetchall()

if not berkas_rows:
    print("⚠️ Peringatan: Tidak ada data berkas yang ditemukan di 'gudang.db' untuk dimigrasi!")
else:
    print(f"💾 Memasukkan {len(berkas_rows)} berkas ke database load_test...")
    for r in berkas_rows:
        dst_cursor.execute("""
            INSERT INTO data_berkas (no_berkas, npwp_9, npwp, npwp_16, nitku, nama, lokasi, status_pinjam)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, r)
    dst_conn.commit()
    print("✅ Migrasi berkas selesai.")

# 4. Tambahkan 100 data dummy isi dokumen ke berkas secara acak
if berkas_rows:
    print("\n📄 Menghasilkan 100 dokumen dummy isi berkas secara acak...")
    jenis_list = ["SPT Tahunan", "NPWP", "SKT", "SPPKP", "Surat Keputusan", "Surat Himbauan", "Laporan Keuangan", "SPT Masa"]
    wadah_no_list = [r[0] for r in berkas_rows]
    wp_nama_list = [r[5] for r in berkas_rows]
    
    for i in range(1, 101):
        # Pilih wadah dan nama WP pemilik berkas secara acak
        random_index = random.randint(0, len(berkas_rows) - 1)
        no_berkas = wadah_no_list[random_index]
        nama_wp = wp_nama_list[random_index]
        
        jenis = random.choice(jenis_list)
        nomor = f"DOC-{random.randint(1000, 9999)}"
        tahun = str(random.choice([2021, 2022, 2023, 2024, 2025]))
        nama_doc = f"Dokumen {jenis} WP {nama_wp}"
        
        dst_cursor.execute("""
            INSERT INTO dokumen (no_berkas, nama, nomor, jenis, tahun, pemilik, wadah, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (no_berkas, nama_doc, nomor, jenis, tahun, nama_wp, no_berkas, "Di Gudang"))
        
    dst_conn.commit()
    print("✅ Pembuatan 100 dokumen dummy selesai.")

# 5. Buat 8 user Petugas (username: petugas1 s.d petugas8, password: petugas123)
print("\n👥 Membuat 8 user Petugas untuk pengetesan beban...")
pass_petugas = generate_password_hash("petugas123")
for i in range(1, 9):
    username = f"petugas{i}"
    try:
        dst_cursor.execute("""
            INSERT INTO user (username, password_hash, role)
            VALUES (?, ?, ?)
        """, (username, pass_petugas, "petugas"))
    except sqlite3.IntegrityError:
        pass
dst_conn.commit()
print("✅ Pembuatan 8 user petugas selesai.")

# 6. Buat 50 user biasa (username: user1 s.d user50, password: user123)
print("👥 Membuat 50 user Biasa untuk pengetesan beban...")
pass_user = generate_password_hash("user123")
for i in range(1, 51):
    username = f"user{i}"
    try:
        dst_cursor.execute("""
            INSERT INTO user (username, password_hash, role)
            VALUES (?, ?, ?)
        """, (username, pass_user, "user"))
    except sqlite3.IntegrityError:
        pass
dst_conn.commit()
print("✅ Pembuatan 50 user biasa selesai.")

# 7. Daftarkan akun Admin bawaan agar Locust bisa login admin jika diperlukan
print("👑 Mendaftarkan akun admin default (admin123/admin123)...")
pass_admin = generate_password_hash("admin123")
try:
    dst_cursor.execute("""
        INSERT INTO user (username, password_hash, role)
        VALUES (?, ?, ?)
    """, ("admin123", pass_admin, "superuser"))
except sqlite3.IntegrityError:
    pass
dst_conn.commit()

# Tutup koneksi
src_conn.close()
dst_conn.close()

print("\n" + "="*60)
print("🎉 SELURUH DATA BERHASIL DIMIGRASI & DITANAM DI DATABASE LOAD_TEST.DB!")
print("="*60)
