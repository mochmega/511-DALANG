import sqlite3
from app import app, init_db
from extensions import db
from models import DataBerkas, ActivityLog
import os

def migrate():
    # Pastikan tabel-tabel SQLAlchemy di gudang.db terbentuk
    with app.app_context():
        print("Mempersiapkan skema database gudang.db...")
        init_db()
        
        # Buka koneksi ke SQLite lama
        if not os.path.exists('database.db'):
            print("database.db tidak ditemukan, tidak ada yang perlu dimigrasikan.")
            return

        conn = sqlite3.connect('database.db')
        conn.row_factory = sqlite3.Row
        
        print("Migrasi tabel data_berkas...")
        berkas_rows = conn.execute("SELECT * FROM data_berkas").fetchall()
        for row in berkas_rows:
            # Cek apakah sudah ada (hindari duplikasi jika script dijalankan 2x)
            if not DataBerkas.query.filter_by(id=row['id']).first():
                new_berkas = DataBerkas(
                    id=row['id'],
                    no_berkas=row['no_berkas'],
                    npwp_9=row['npwp_9'],
                    npwp=row['npwp'],
                    npwp_16=row['npwp_16'],
                    nitku=row['nitku'],
                    nama=row['nama'],
                    isi_berkas=row['isi_berkas'],
                    lokasi=row['lokasi'],
                    status_pinjam=row['status_pinjam']
                )
                db.session.add(new_berkas)
        
        print("Migrasi tabel activity_log...")
        import datetime
        log_rows = conn.execute("SELECT * FROM activity_log").fetchall()
        for row in log_rows:
            if not ActivityLog.query.filter_by(id=row['id']).first():
                # parsing string to datetime
                created_at_dt = None
                if row['created_at']:
                    try:
                        created_at_dt = datetime.datetime.strptime(row['created_at'], '%Y-%m-%d %H:%M:%S')
                    except ValueError:
                        created_at_dt = datetime.datetime.now()
                
                new_log = ActivityLog(
                    id=row['id'],
                    action_type=row['action_type'],
                    description=row['description'],
                    username=row['username'],
                    created_at=created_at_dt
                )
                db.session.add(new_log)
        
        db.session.commit()
        conn.close()
        print("Migrasi selesai dengan sukses!")

if __name__ == '__main__':
    migrate()
