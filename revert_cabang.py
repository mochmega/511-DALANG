import sqlite3
import os
import json
from app import app
from extensions import db
from models import DataBerkas, Dokumen

def revert_database():
    db_path = os.path.join('instance', 'gudang.db')
    print(f"Connecting to {db_path}...")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        print("Membatalkan indeks unik di data_berkas...")
        cursor.execute("DROP INDEX IF EXISTS ix_data_berkas_no_berkas")
        
        print("Membuat ulang indeks non-unik...")
        cursor.execute("CREATE INDEX ix_data_berkas_no_berkas ON data_berkas (no_berkas)")
        
        print("Membersihkan embel-embel _DUP_X dari no_berkas...")
        # Update dengan INSTR untuk menemukan posisi _DUP_ dan memotong string
        cursor.execute("""
            UPDATE data_berkas 
            SET no_berkas = SUBSTR(no_berkas, 1, INSTR(no_berkas, '_DUP_') - 1)
            WHERE no_berkas LIKE '%_DUP_%'
        """)
        
        rows_affected = cursor.rowcount
        print(f"Berhasil membersihkan {rows_affected} baris no_berkas.")
        
        conn.commit()
    except Exception as e:
        print(f"Error pada SQLite: {e}")
        conn.rollback()
    finally:
        conn.close()

def repopulate_dokumen():
    with app.app_context():
        print("Mengosongkan tabel Dokumen...")
        Dokumen.query.delete()
        db.session.commit()
        
        print("Membangun ulang relasi Dokumen dari DataBerkas.isi_berkas...")
        rows = DataBerkas.query.all()
        doc_count = 0
        for row in rows:
            if not row.isi_berkas or row.isi_berkas == 'Belum diupdate':
                continue
            try:
                docs = json.loads(row.isi_berkas)
                for doc in docs:
                    d = Dokumen(
                        no_berkas=row.no_berkas,
                        nama=doc.get('nama', '-'),
                        nomor=doc.get('nomor', '-'),
                        jenis=doc.get('jenis', '-'),
                        tahun=doc.get('tahun', '-'),
                        tanggal=doc.get('tanggal', ''),
                        pemilik=doc.get('pemilik', ''),
                        wadah=doc.get('wadah', ''),
                        status=doc.get('status', 'Di Gudang'),
                        peminjam=doc.get('peminjam', ''),
                        tanggal_pinjam=doc.get('tanggal_pinjam', ''),
                        tanggal_kembali=doc.get('tanggal_kembali', ''),
                        keperluan=doc.get('keperluan', ''),
                        file_scan=doc.get('file_scan', ''),
                        batas_kembali=doc.get('batas_kembali', '')
                    )
                    db.session.add(d)
                    doc_count += 1
            except Exception as e:
                print(f"Error parse JSON {row.no_berkas}: {e}")
        
        db.session.commit()
        print(f"Berhasil me-rebuild {doc_count} dokumen dari JSON asli!")

if __name__ == "__main__":
    revert_database()
    repopulate_dokumen()
