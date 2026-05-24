"""
Script migrasi: pindahkan data dokumen dari kolom JSON isi_berkas
ke tabel dokumen yang proper.
"""
import json
import sqlite3

DB_PATH = "database.db"

def migrasi():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    # Buat tabel baru jika belum ada
    conn.execute("""
        CREATE TABLE IF NOT EXISTS dokumen (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            no_berkas TEXT NOT NULL,
            nama TEXT NOT NULL,
            nomor TEXT DEFAULT '-',
            jenis TEXT DEFAULT '-',
            tahun TEXT DEFAULT '-',
            tanggal TEXT DEFAULT '',
            pemilik TEXT DEFAULT '',
            wadah TEXT DEFAULT '',
            status TEXT DEFAULT 'Di Gudang',
            peminjam TEXT DEFAULT '',
            tanggal_pinjam TEXT DEFAULT '',
            tanggal_kembali TEXT DEFAULT '',
            keperluan TEXT DEFAULT '',
            file_scan TEXT DEFAULT '',
            batas_kembali TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    rows = conn.execute(
        "SELECT no_berkas, isi_berkas FROM data_berkas WHERE isi_berkas IS NOT NULL AND isi_berkas != 'Belum diupdate' AND isi_berkas != ''"
    ).fetchall()

    berhasil = 0
    gagal = 0

    for row in rows:
        try:
            dokumen_list = json.loads(row["isi_berkas"])
            for doc in dokumen_list:
                conn.execute("""
                    INSERT INTO dokumen (no_berkas, nama, nomor, jenis, tahun, tanggal,
                                        pemilik, wadah, status, peminjam, tanggal_pinjam,
                                        tanggal_kembali, keperluan, file_scan)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    row["no_berkas"],
                    doc.get("nama", "-"),
                    doc.get("nomor", "-"),
                    doc.get("jenis", "-"),
                    doc.get("tahun", "-"),
                    doc.get("tanggal", ""),
                    doc.get("pemilik", ""),
                    doc.get("wadah", row["no_berkas"]),
                    doc.get("status", "Di Gudang"),
                    doc.get("peminjam", ""),
                    doc.get("tanggal_pinjam", ""),
                    doc.get("tanggal_kembali", ""),
                    doc.get("keperluan", ""),
                    doc.get("file_scan", ""),
                ))
                berhasil += 1
        except Exception as e:
            print(f"Gagal migrasi no_berkas {row['no_berkas']}: {e}")
            gagal += 1

    conn.commit()
    conn.close()
    print(f"Migrasi selesai: {berhasil} dokumen berhasil, {gagal} wadah gagal.")

if __name__ == "__main__":
    migrasi()
