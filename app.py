# File: app.py
import os
import logging
from datetime import timedelta
from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS
from extensions import db, jwt
from models import User, generate_password_hash
from routes.auth import auth_bp
from routes.berkas import berkas_bp
from routes.sirkulasi import sirkulasi_bp
from routes.dashboard import dashboard_bp
import threading
import time
import shutil

# Setup logging — satu kali di sini, berlaku untuk seluruh aplikasi
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger('gudang')

# --- ROBOT AUTO BACKUP (JALAN DI LATAR BELAKANG) ---
def auto_backup_worker():
    backup_folder = os.path.join(os.getcwd(), 'backups')
    os.makedirs(backup_folder, exist_ok=True)
    
    while True:
        import datetime
        now = datetime.datetime.now()
        # Eksekusi backup setiap jam 02:00 Pagi
        if now.hour == 2 and now.minute == 0:
            db_path = os.path.join(os.getcwd(), 'instance', 'gudang.db')
            backup_name = os.path.join(backup_folder, f"gudang_backup_{now.strftime('%Y%m%d')}.db")
            
            if os.path.exists(db_path) and not os.path.exists(backup_name):
                shutil.copy(db_path, backup_name)
                logger.info(f"AUTO-BACKUP BERHASIL: {backup_name}")
                
        time.sleep(60) # Cek jam setiap 1 menit

# Hidupkan robotnya (Daemon = True agar mati otomatis kalau Flask dimatikan)
threading.Thread(target=auto_backup_worker, daemon=True).start()
# ---------------------------------------------------

app = Flask(__name__)

# Konfigurasi
load_dotenv()
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('SQLALCHEMY_DATABASE_URI', 'sqlite:///gudang.db')
app.config['TESTING'] = os.environ.get('TESTING', 'False') == 'True'

# Fix #1: Crash if JWT_SECRET_KEY not set in .env — no silent fallback
secret = os.environ.get("JWT_SECRET_KEY")
if not secret:
    raise RuntimeError("FATAL: JWT_SECRET_KEY belum diset di .env!")
app.config['JWT_SECRET_KEY'] = secret

# JWT token expiry — baca dari .env, default 8 jam jika tidak diset
_expires_seconds = int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRES', 28800))
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(seconds=_expires_seconds)
logger.info(f"JWT token expiry: {_expires_seconds // 3600} jam ({_expires_seconds} detik)")

app.config['MAX_CONTENT_LENGTH'] = 20 * 1024 * 1024  # Limit uploads to 20 MB

# Fix #8: Restrict CORS to known origins only
# Explicitly allow both localhost and 127.0.0.1 variants used by Vite dev server
_env_origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
allowed_origins = [o.strip() for o in _env_origins]
# Ensure both localhost and 127.0.0.1 are covered when running dev
if "http://localhost:5173" in allowed_origins and "http://127.0.0.1:5173" not in allowed_origins:
    allowed_origins.append("http://127.0.0.1:5173")
CORS(app, origins=allowed_origins, supports_credentials=True)
db.init_app(app)
jwt.init_app(app)

# Daftar Blueprint
app.register_blueprint(auth_bp)
app.register_blueprint(berkas_bp)
app.register_blueprint(sirkulasi_bp)
app.register_blueprint(dashboard_bp)

# --- FUNGSI INISIALISASI DB ---
def init_db():
    with app.app_context():
        db.create_all()
        # Fix #2: Admin credentials from .env — not hardcoded in source code
        admin_user = os.environ.get("ADMIN_USERNAME", "admin")
        admin_pass = os.environ.get("ADMIN_PASSWORD")
        if admin_pass and not User.query.filter_by(username=admin_user).first():
            admin = User(
                username=admin_user,
                password_hash=generate_password_hash(admin_pass),
                role='superuser'
            )
            db.session.add(admin)
            db.session.commit()
            logger.info(f"Superuser '{admin_user}' berhasil dibuat.")
        elif not admin_pass:
            logger.warning("ADMIN_PASSWORD tidak diset di .env — superuser tidak dibuat otomatis.")

if __name__ == '__main__':
    init_db()
    logger.info("Backend API Flask menyala di port 5000")
    app.run(debug=False, host='0.0.0.0', port=5000)