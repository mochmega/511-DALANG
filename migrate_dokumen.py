from app import app
from extensions import db
from models import DataBerkas, Dokumen
import json

def migrate():
    with app.app_context():
        # Bersihkan tabel Dokumen
        Dokumen.query.delete()
        db.session.commit()
        print("Tabel Dokumen dibersihkan.")

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
        print(f"Berhasil migrasi {doc_count} dokumen!")

if __name__ == '__main__':
    migrate()
