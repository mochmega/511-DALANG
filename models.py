# File: models.py
from extensions import db
from werkzeug.security import generate_password_hash

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(120), nullable=False)
    role = db.Column(db.String(20), default='user') # superuser, petugas, user
    theme = db.Column(db.String(20), default='sky')

class Dokumen(db.Model):
    __tablename__ = "dokumen"
    id           = db.Column(db.Integer, primary_key=True)
    no_berkas    = db.Column(db.String(50), nullable=False)  # FK ke data_berkas
    nama         = db.Column(db.String(200), nullable=False)
    nomor        = db.Column(db.String(100), default="-")
    jenis        = db.Column(db.String(100), default="-")
    tahun        = db.Column(db.String(10), default="-")
    tanggal      = db.Column(db.String(20), default="")
    pemilik      = db.Column(db.String(200), default="")  # Nama WP Pusat/Cabang
    wadah        = db.Column(db.String(50), default="")
    status       = db.Column(db.String(50), default="Di Gudang")
    peminjam     = db.Column(db.String(200), default="")
    tanggal_pinjam = db.Column(db.String(20), default="")
    tanggal_kembali = db.Column(db.String(20), default="")
    keperluan    = db.Column(db.String(300), default="")
    file_scan    = db.Column(db.String(200), default="")
    batas_kembali = db.Column(db.String(20), default="")  # Fitur baru: deadline
    created_at   = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at   = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())