# File: app.py
import os
from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS
from extensions import db, jwt
from models import User, generate_password_hash
from routes_berkas import berkas_bp, auth_bp

app = Flask(__name__)

# Konfigurasi
load_dotenv()
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///gudang.db'

# Fix #1: Crash if JWT_SECRET_KEY not set in .env — no silent fallback
secret = os.environ.get("JWT_SECRET_KEY")
if not secret:
    raise RuntimeError("FATAL: JWT_SECRET_KEY belum diset di .env!")
app.config['JWT_SECRET_KEY'] = secret
app.config['MAX_CONTENT_LENGTH'] = 20 * 1024 * 1024  # Limit uploads to 20 MB

# Fix #8: Restrict CORS to known origins only
allowed_origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
CORS(app, origins=[o.strip() for o in allowed_origins])
db.init_app(app)
jwt.init_app(app)

# Daftar Blueprint
app.register_blueprint(berkas_bp)
app.register_blueprint(auth_bp)

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
            print(f"--- Superuser '{admin_user}' berhasil dibuat! ---")
        elif not admin_pass:
            print("[WARNING] ADMIN_PASSWORD tidak diset di .env — superuser tidak dibuat otomatis.")

if __name__ == '__main__':
    init_db() # Jalankan fungsi buat DB & Admin
    print("Backend API Flask menyala di port 5000!")
    app.run(debug=False, host='0.0.0.0', port=5000)