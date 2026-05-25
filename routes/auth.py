import json
import os
import time
import csv
import zipfile
from io import StringIO
from flask import Blueprint, jsonify, request, send_file, Response
from extensions import db
from models import User
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from utils.decorators import superuser_required
from werkzeug.security import check_password_hash, generate_password_hash
import logging

logger = logging.getLogger('gudang.routes.auth')

auth_bp = Blueprint('auth_bp', __name__)

@auth_bp.route('/api/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(username=data.get('username')).first()
    
    if user and check_password_hash(user.password_hash, data.get('password')):
        access_token = create_access_token(identity=str(user.username), additional_claims={'role': user.role})
        return jsonify(status='success', token=access_token, role=user.role, theme=user.theme)
    
    return jsonify(status='error', message='Username atau Password salah'), 401

from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt

@auth_bp.route('/api/validate-token', methods=['GET'])
@jwt_required()
def validate_token():
    identity = get_jwt_identity()
    claims = get_jwt()
    return jsonify(status='ok', username=identity, role=claims.get('role', 'user'))

@auth_bp.route('/api/user/theme', methods=['POST'])
@jwt_required()
def update_theme():
    identity = get_jwt_identity()
    data = request.json
    theme = data.get('theme')
    
    user = User.query.filter_by(username=identity).first()
    if user:
        user.theme = theme
        db.session.commit()
        return jsonify(status='success', message='Tema berhasil diperbarui')
    return jsonify(status='error', message='User tidak ditemukan'), 404

@auth_bp.route('/api/export-db', methods=['GET'])
@superuser_required
def export_db():

    zip_path = os.path.join(os.getcwd(), 'export_database.zip')
    try:
        with zipfile.ZipFile(zip_path, 'w') as zipf:
            db_path1 = os.path.join(os.getcwd(), 'database.db')
            db_path2 = os.path.join(os.getcwd(), 'instance', 'gudang.db')
            if os.path.exists(db_path1):
                zipf.write(db_path1, 'database.db')
            if os.path.exists(db_path2):
                zipf.write(db_path2, 'gudang.db')
        
        return send_file(zip_path, as_attachment=True, download_name='backup_database_lengkap.zip')
    except Exception as e:
        return jsonify(status='error', message=str(e)), 500

@auth_bp.route('/api/register', methods=['POST'])
@superuser_required
def register():

    data = request.json
    username = data.get('username')
    password = data.get('password')
    role = data.get('role', 'user')

    if not username or not password:
        return jsonify(status='error', message='Username dan password wajib diisi'), 400

    if User.query.filter_by(username=username).first():
        return jsonify(status='error', message='Username sudah ada'), 400

    new_user = User(
        username=username,
        password_hash=generate_password_hash(password),
        role=role
    )
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify(status='success', message=f'User {username} berhasil ditambahkan')

@auth_bp.route('/api/users', methods=['GET'])
@superuser_required
def get_users():
    users = User.query.all()
    return jsonify([{'username': u.username, 'role': u.role} for u in users])

@auth_bp.route('/api/users/<username>', methods=['DELETE'])
@superuser_required
def delete_user(username):

    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify(status='error', message='User tidak ditemukan'), 404

    if user.role == 'superuser':
        sisa_super = User.query.filter_by(role='superuser').count()
        if sisa_super <= 1:
            return jsonify(status='error', message='Tidak bisa menghapus satu-satunya superuser yang tersisa!'), 400

    db.session.delete(user)
    db.session.commit()
    return jsonify(status='success', message=f'User {username} dihapus')

@auth_bp.route("/api/user/ganti-password", methods=["POST"])
@jwt_required()
def ganti_password():
    identity = get_jwt_identity()
    data = request.json
    password_lama = data.get("password_lama")
    password_baru = data.get("password_baru")

    if not password_lama or not password_baru:
        return jsonify({"status": "error", "message": "Semua field wajib diisi"}), 400
    if len(password_baru) < 6:
        return jsonify({"status": "error", "message": "Password baru minimal 6 karakter"}), 400

    user = User.query.filter_by(username=identity).first()
    if not check_password_hash(user.password_hash, password_lama):
        return jsonify({"status": "error", "message": "Password lama salah"}), 401

    user.password_hash = generate_password_hash(password_baru)
    db.session.commit()
    return jsonify({"status": "success", "message": "Password berhasil diubah"})

@auth_bp.route('/api/register/bulk', methods=['POST'])
@superuser_required
def register_bulk():

    if 'file' not in request.files:
        return jsonify(status='error', message='File tidak ditemukan'), 400
    file = request.files['file']
    if not file.filename.endswith('.csv'):
        return jsonify(status='error', message='Harus file CSV'), 400

    stream = StringIO(file.stream.read().decode("UTF8"), newline=None)
    csv_input = csv.reader(stream)
    
    header = next(csv_input, None)
    if not header or len(header) < 3 or header[0].strip().lower() != 'username':
        return jsonify(status='error', message='Format header CSV salah! Harus (username, password, role)'), 400

    berhasil = 0
    dilewati = 0
    for row in csv_input:
        if len(row) < 3: continue
        username, password, role = row[0].strip(), row[1].strip(), row[2].strip()
        if not username or not password: continue
        
        if User.query.filter_by(username=username).first():
            dilewati += 1
            continue

        new_user = User(
            username=username,
            password_hash=generate_password_hash(password),
            role=role if role in ('user', 'petugas') else 'user'
        )
        db.session.add(new_user)
        berhasil += 1

    db.session.commit()
    return jsonify(status='success', message=f'{berhasil} user berhasil ditambahkan, {dilewati} dilewati (sudah ada).')

@auth_bp.route('/api/register/template', methods=['GET'])
@jwt_required()
def download_csv_template():
    si = StringIO()
    cw = csv.writer(si)
    cw.writerow(['username', 'password', 'role'])
    cw.writerow(['contoh_petugas', 'password123', 'petugas'])
    
    return Response(
        si.getvalue(),
        mimetype='text/csv',
        headers={"Content-Disposition": "attachment;filename=Template_User_Gudang.csv"}
    )
