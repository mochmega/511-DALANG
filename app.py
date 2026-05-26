# File: app.py
import os
import logging
import datetime
from datetime import timedelta
from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS
from extensions import db, jwt, limiter
from models import User, generate_password_hash
from routes.auth import auth_bp
from routes.berkas import berkas_bp
from routes.sirkulasi import sirkulasi_bp
from routes.dashboard import dashboard_bp
import threading
import time
import shutil
from alembic.config import Config
from alembic import command

# Setup logging — satu kali di sini, berlaku untuk seluruh aplikasi
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger('gudang')

# --- LAYANAN CADANGAN OTOMATIS (BACKGROUND DAEMON) ---
def auto_backup_worker(app_context_app):
    _BASE = os.path.dirname(os.path.abspath(__file__))
    backup_folder = os.path.join(_BASE, 'backups')
    os.makedirs(backup_folder, exist_ok=True)
    
    from sqlalchemy.engine import make_url
    db_uri = app_context_app.config['SQLALCHEMY_DATABASE_URI']
    db_path = make_url(db_uri).database  # resolve path aktual
    if not os.path.isabs(db_path):
        db_path = os.path.join(_BASE, db_path)
    
    while True:
        now = datetime.datetime.now()
        # Eksekusi backup setiap jam 02:00 Pagi
        if now.hour == 2 and now.minute == 0:
            backup_name = os.path.join(backup_folder, f"gudang_backup_{now.strftime('%Y%m%d')}.db")
            
            if os.path.exists(db_path) and not os.path.exists(backup_name):
                try:
                    shutil.copy(db_path, backup_name)
                    logger.info(f"AUTO-BACKUP BERHASIL: {backup_name}")
                except Exception as e:
                    logger.error(f"AUTO-BACKUP GAGAL saat menyalin: {e}")
            elif not os.path.exists(db_path) and now.minute == 0:
                logger.error(f"AUTO-BACKUP GAGAL: File database '{db_path}' tidak ditemukan!")
                
        time.sleep(60) # Cek jam setiap 1 menit

# ---------------------------------------------------

app = Flask(__name__)

# ProxyFix middleware untuk mendeteksi IP klien asli via header X-Forwarded-For (berguna saat di balik Nginx/Load Test)
if os.environ.get("TRUST_PROXIES", "False") == "True":
    from werkzeug.middleware.proxy_fix import ProxyFix
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1)

# Konfigurasi
_BASE = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(_BASE, '.env')
load_dotenv(dotenv_path=env_path)
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
limiter.init_app(app)

# Batasan limit global (60 req / min) untuk perlindungan DoS / Scraping
limiter.limit("60 per minute")(berkas_bp)
limiter.limit("60 per minute")(sirkulasi_bp)
limiter.limit("60 per minute")(dashboard_bp)

# Daftar Blueprint
app.register_blueprint(auth_bp)
app.register_blueprint(berkas_bp)
app.register_blueprint(sirkulasi_bp)
app.register_blueprint(dashboard_bp)

def run_migrations(app):
    """Jalankan alembic upgrade head otomatis saat startup."""
    with app.app_context():
        try:
            _BASE = os.path.dirname(os.path.abspath(__file__))
            alembic_cfg = Config(os.path.join(_BASE, 'alembic.ini'))
            alembic_cfg.set_main_option('sqlalchemy.url', app.config['SQLALCHEMY_DATABASE_URI'])
            command.upgrade(alembic_cfg, 'head')
            logger.info('✅ Database migration: up to date')
        except Exception as e:
            logger.error(f'❌ Migration gagal: {e}')
            logger.warning('⚠️ Aplikasi tetap dilanjutkan (fallback), tapi awas ada skema database yang mungkin tidak sinkron!')

# --- FUNGSI INISIALISASI DB ---
def init_db():
    run_migrations(app)
    with app.app_context():
        # db.create_all() # Diganti dengan run_migrations
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
    # Jalankan thread daemon untuk layanan pencadangan otomatis berkas database
    threading.Thread(target=auto_backup_worker, args=(app,), daemon=True).start()
    logger.info("Backend API Flask menyala di port 5000")
    app.run(debug=False, host='0.0.0.0', port=5000)