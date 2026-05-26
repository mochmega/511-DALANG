# File: wsgi.py
import threading
from app import app, init_db, auto_backup_worker, logger

# Jalankan inisialisasi database (migrations + superuser)
logger.info("WSGI: Menjalankan inisialisasi database (init_db)...")
init_db()

# Jalankan thread daemon untuk layanan pencadangan otomatis (background task)
threading.Thread(target=auto_backup_worker, args=(app,), daemon=True).start()
logger.info("WSGI: Layanan pencadangan otomatis di latar belakang berhasil diaktifkan.")
