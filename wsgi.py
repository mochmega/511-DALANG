# File: wsgi.py
import threading
from app import app, init_db, auto_backup_worker, logger

# Jalankan inisialisasi database (migrations + superuser)
logger.info("WSGI: Menjalankan inisialisasi database (init_db)...")
init_db()

# Hidupkan robot auto backup di background (Daemon = True)
threading.Thread(target=auto_backup_worker, args=(app,), daemon=True).start()
logger.info("WSGI: Background auto-backup worker berhasil dinyalakan.")
