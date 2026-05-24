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
app.config['JWT_SECRET_KEY'] = os.environ.get("JWT_SECRET_KEY", "fallback-dev-only") 
app.config['MAX_CONTENT_LENGTH'] = 20 * 1024 * 1024 # Limit uploads to 20 MB

# Inisialisasi
CORS(app)
db.init_app(app)
jwt.init_app(app)

# Daftar Blueprint
app.register_blueprint(berkas_bp)
app.register_blueprint(auth_bp)

# --- FUNGSI INISIALISASI DB ---
def init_db():
    with app.app_context():
        db.create_all()
        # Buat akun admin otomatis jika belum ada
        if not User.query.filter_by(username='admin123').first():
            admin = User(
                username='admin123',
                password_hash=generate_password_hash('admin123'),
                role='superuser'
            )
            db.session.add(admin)
            db.session.commit()
            print("--- Superuser 'admin123' berhasil dibuat! ---")

if __name__ == '__main__':
    init_db() # Jalankan fungsi buat DB & Admin
    print("Backend API Flask menyala di port 5000!")
    app.run(debug=False, host='0.0.0.0', port=5000)