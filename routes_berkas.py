# File: routes_berkas.py
import json
import os
import time
import shutil
import threading
import csv
import zipfile
from datetime import datetime
from io import StringIO
from flask import Response, make_response
from flask import Blueprint, jsonify, request, send_from_directory, send_file
from werkzeug.utils import secure_filename
from database import get_db_connection
from extensions import db, jwt
from models import User
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import check_password_hash, generate_password_hash
# Konfigurasi Folder Upload (Otomatis bikin folder 'uploads' kalau belum ada)
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# --- ROBOT AUTO BACKUP (JALAN DI LATAR BELAKANG) ---
def auto_backup_worker():
    backup_folder = os.path.join(os.getcwd(), 'backups')
    os.makedirs(backup_folder, exist_ok=True)
    
    while True:
        now = datetime.now()
        # Eksekusi backup setiap jam 02:00 Pagi
        if now.hour == 2 and now.minute == 0:
            db_path = os.path.join(os.getcwd(), 'gudang.db')
            backup_name = os.path.join(backup_folder, f"gudang_backup_{now.strftime('%Y%m%d')}.db")
            
            if os.path.exists(db_path) and not os.path.exists(backup_name):
                shutil.copy(db_path, backup_name)
                print(f"AUTO-BACKUP BERHASIL: {backup_name}")
                
        time.sleep(60) # Cek jam setiap 1 menit

# Hidupkan robotnya (Daemon = True agar mati otomatis kalau Flask dimatikan)
threading.Thread(target=auto_backup_worker, daemon=True).start()
# ---------------------------------------------------
auth_bp = Blueprint('auth_bp', __name__)

@auth_bp.route('/api/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(username=data.get('username')).first()
    
    if user and check_password_hash(user.password_hash, data.get('password')):
        access_token = create_access_token(identity=str(user.username), additional_claims={'role': user.role})
        return jsonify(status='success', token=access_token, role=user.role, theme=user.theme)
    
    return jsonify(status='error', message='Username atau Password salah'), 401

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
@jwt_required()
def export_db():
    identity = get_jwt_identity()
    user = User.query.filter_by(username=identity).first()
    if not user or user.role != 'superuser':
        return jsonify(status='error', message='Akses ditolak. Hanya superuser yang dapat mengunduh database.'), 403

    # Buat zip file sementara
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
@jwt_required()
def register():
    identity = get_jwt_identity()
    caller = User.query.filter_by(username=identity).first()
    if not caller or caller.role != 'superuser':
        return jsonify(status='error', message='Akses ditolak, hanya superuser yang bisa mendaftar akun'), 403

    data = request.json
    username = data.get('username')
    password = data.get('password')
    role = data.get('role', 'user') # default role is 'user'

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
@jwt_required()
def get_users():
    identity = get_jwt_identity()
    caller = User.query.filter_by(username=identity).first()
    if not caller or caller.role != 'superuser':
        return jsonify(status='error', message='Akses ditolak'), 403
    users = User.query.all()
    return jsonify([{'username': u.username, 'role': u.role} for u in users])

@auth_bp.route('/api/users/<username>', methods=['DELETE'])
@jwt_required()
def delete_user(username):
    identity = get_jwt_identity()
    caller = User.query.filter_by(username=identity).first()
    if not caller or caller.role != 'superuser':
        return jsonify(status='error', message='Akses ditolak'), 403

    if username == 'admin123':
        return jsonify(status='error', message='Superuser admin123 tidak bisa dihapus!'), 400
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify(status='error', message='User tidak ditemukan'), 404
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
            role=role if role else 'user'
        )
        db.session.add(new_user)
        berhasil += 1

    db.session.commit()
    return jsonify(status='success', message=f'{berhasil} user berhasil ditambahkan, {dilewati} dilewati (sudah ada).')

@auth_bp.route('/api/register/template', methods=['GET'])
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

berkas_bp = Blueprint('berkas', __name__)

# ==========================================
# Rute API Dashboard (Statistik Gudang)
# ==========================================
@berkas_bp.route('/api/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard_stats():
    identity = get_jwt_identity()
    user = User.query.filter_by(username=identity).first()

    conn = get_db_connection()
    # Hanya hitung wadah yang BUKAN EKS (Tidak Dimutasi)
    total_rumah = conn.execute("SELECT COUNT(DISTINCT no_berkas) FROM data_berkas WHERE no_berkas NOT LIKE 'EKS-%'").fetchone()[0]
    
    # Hanya pantau dokumen yang dipinjam dari WP yang masih aktif
    rows = conn.execute("SELECT isi_berkas FROM data_berkas WHERE isi_berkas != 'Belum diupdate' AND isi_berkas IS NOT NULL AND no_berkas NOT LIKE 'EKS-%'").fetchall()
    
    total_dipinjam = 0
    for row in rows:
        try:
            dokumen_list = json.loads(row['isi_berkas'])
            for doc in dokumen_list:
                if doc.get('status') == 'Dipinjam':
                    total_dipinjam += 1
        except:
            pass 
            
    # Fetch recent activities based on role
    if user and user.role == 'user':
        logs_raw = conn.execute("SELECT action_type, description, username, created_at FROM activity_log WHERE action_type IN ('Pinjam', 'Kembali', 'Approve') ORDER BY created_at DESC LIMIT 5").fetchall()
    else:
        logs_raw = conn.execute("SELECT action_type, description, username, created_at FROM activity_log ORDER BY created_at DESC LIMIT 5").fetchall()
        
    activities = [dict(log) for log in logs_raw]
    
    conn.close()
    return jsonify({'total_rumah': total_rumah, 'dipinjam': total_dipinjam, 'activities': activities})

@auth_bp.route('/api/validate-token', methods=['GET'])
@jwt_required()
def validate_token():
    return jsonify({'status': 'success', 'message': 'Token valid'})

@berkas_bp.route('/api/berkas', methods=['GET'])
def search_berkas():
    search_query = request.args.get('search', '').strip()
    search_by = request.args.get('by', 'all')
    page = request.args.get('page', 1, type=int)
    limit_str = request.args.get('limit', '50').lower()
    
    if limit_str in ['semua', 'all']:
        limit = -1
    else:
        try:
            limit = int(limit_str)
        except ValueError:
            limit = 50

    offset = (page - 1) * limit if limit > 0 else 0
    
    conn = get_db_connection()
    
    if search_query:
        if search_by == 'no_berkas':
            count_sql = "SELECT COUNT(DISTINCT no_berkas) as total FROM data_berkas WHERE no_berkas = ?"
            query_sql = "SELECT DISTINCT no_berkas FROM data_berkas WHERE no_berkas = ? LIMIT ? OFFSET ?"
            count_params = (search_query,)
            params = (search_query, limit, offset)
            
        elif search_by == 'nama':
            count_sql = "SELECT COUNT(DISTINCT no_berkas) as total FROM data_berkas WHERE nama LIKE ?"
            query_sql = "SELECT DISTINCT no_berkas FROM data_berkas WHERE nama LIKE ? LIMIT ? OFFSET ?"
            count_params = (f"%{search_query}%",)
            params = (f"%{search_query}%", limit, offset)
            
        elif search_by == 'npwp':
            count_sql = "SELECT COUNT(DISTINCT no_berkas) as total FROM data_berkas WHERE npwp LIKE ? OR npwp_16 LIKE ? OR nitku LIKE ?"
            query_sql = "SELECT DISTINCT no_berkas FROM data_berkas WHERE npwp LIKE ? OR npwp_16 LIKE ? OR nitku LIKE ? LIMIT ? OFFSET ?"
            count_params = (f"%{search_query}%", f"%{search_query}%", f"%{search_query}%")
            params = (f"%{search_query}%", f"%{search_query}%", f"%{search_query}%", limit, offset)
            
        else:
            count_sql = '''
                SELECT COUNT(DISTINCT no_berkas) as total FROM data_berkas 
                WHERE nama LIKE ? OR no_berkas LIKE ? OR npwp LIKE ? OR npwp_16 LIKE ? OR nitku LIKE ?
            '''
            query_sql = '''
                SELECT DISTINCT no_berkas FROM data_berkas 
                WHERE nama LIKE ? OR no_berkas LIKE ? OR npwp LIKE ? OR npwp_16 LIKE ? OR nitku LIKE ?
                LIMIT ? OFFSET ?
            '''
            count_params = (f"%{search_query}%", f"%{search_query}%", f"%{search_query}%", f"%{search_query}%", f"%{search_query}%")
            params = (f"%{search_query}%", f"%{search_query}%", f"%{search_query}%", f"%{search_query}%", f"%{search_query}%", limit, offset)
            
        total_wadah = conn.execute(count_sql, count_params).fetchone()['total']
        matching_berkas = conn.execute(query_sql, params).fetchall()
        
        if not matching_berkas:
            conn.close()
            return jsonify({'data': [], 'total_pages': 0, 'current_page': page, 'total_items': 0})
        no_berkas_list = [row['no_berkas'] for row in matching_berkas]
        
    else:
        total_wadah = conn.execute("SELECT COUNT(DISTINCT no_berkas) as total FROM data_berkas").fetchone()['total']
        matching_berkas = conn.execute("SELECT DISTINCT no_berkas FROM data_berkas ORDER BY CAST(no_berkas AS INTEGER) ASC LIMIT ? OFFSET ?", (limit, offset)).fetchall()
        if not matching_berkas:
            conn.close()
            return jsonify({'data': [], 'total_pages': 0, 'current_page': page, 'total_items': 0})
        no_berkas_list = [row['no_berkas'] for row in matching_berkas]

    import math
    total_pages = math.ceil(total_wadah / limit) if limit > 0 else 1

    placeholders = ','.join('?' * len(no_berkas_list))
    berkas = conn.execute(f'''
        SELECT * FROM data_berkas 
        WHERE no_berkas IN ({placeholders})
        ORDER BY CAST(no_berkas AS INTEGER) ASC, nitku ASC
    ''', no_berkas_list).fetchall()
        
    conn.close()
    hasil = [dict(b) for b in berkas]
    
    return jsonify({
        'data': hasil,
        'total_pages': total_pages,
        'current_page': page,
        'total_items': total_wadah
    })

# --- TRUE ARCHITECTURE (PISAH KAMAR) ---
@berkas_bp.route('/api/berkas/update-isi', methods=['POST'])
@jwt_required()
def update_isi_berkas():
    data = request.get_json()
    no_berkas = data.get('no_berkas')
    full_doc_list = data.get('isi_berkas', [])

    if not no_berkas:
        return jsonify({'status': 'error', 'message': 'Nomor berkas tidak valid'}), 400
        
    username = data.get('username', 'Sistem')
    log_action = data.get('log_action')
    log_desc = data.get('log_desc')
        
    conn = get_db_connection()
    all_rows = conn.execute("SELECT id, nama, nitku FROM data_berkas WHERE no_berkas = ?", (no_berkas,)).fetchall()
    docs_per_row = {row['id']: [] for row in all_rows}
    
    for doc in full_doc_list:
        pemilik_str = doc.get('pemilik', '')
        matched_id = None
        
        for row in all_rows:
            if row['nitku'] and row['nitku'] in pemilik_str:
                matched_id = row['id']
                break
                
        if not matched_id and "[Pusat]" in pemilik_str:
            for row in all_rows:
                if row['nitku'].endswith('000000') or row['nitku'] == '0000000000000000':
                    matched_id = row['id']
                    break
            if not matched_id:
                matched_id = all_rows[0]['id']
                
        if matched_id:
            docs_per_row[matched_id].append(doc)
        else:
            docs_per_row[all_rows[0]['id']].append(doc)

    for row_id, doc_list in docs_per_row.items():
        json_str = json.dumps(doc_list) if doc_list else '[]'
        conn.execute("UPDATE data_berkas SET isi_berkas = ? WHERE id = ?", (json_str, row_id))

    # Dual write to dokumen table (Backward compatibility during transition)
    conn.execute("DELETE FROM dokumen WHERE no_berkas = ?", (no_berkas,))
    for doc in full_doc_list:
        conn.execute("""
            INSERT INTO dokumen (no_berkas, nama, nomor, jenis, tahun, tanggal,
                                pemilik, wadah, status, peminjam, tanggal_pinjam,
                                tanggal_kembali, keperluan, file_scan)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            no_berkas,
            doc.get("nama", "-"),
            doc.get("nomor", "-"),
            doc.get("jenis", "-"),
            doc.get("tahun", "-"),
            doc.get("tanggal", ""),
            doc.get("pemilik", ""),
            doc.get("wadah", no_berkas),
            doc.get("status", "Di Gudang"),
            doc.get("peminjam", ""),
            doc.get("tanggal_pinjam", ""),
            doc.get("tanggal_kembali", ""),
            doc.get("keperluan", ""),
            doc.get("file_scan", "")
        ))

    if log_action and log_desc:
        conn.execute("INSERT INTO activity_log (action_type, description, username) VALUES (?, ?, ?)", (log_action, log_desc, username))

    conn.commit()
    conn.close()
    return jsonify({'status': 'success', 'message': 'Tersimpan ke kamar masing-masing!'})

@berkas_bp.route('/api/sirkulasi/dipinjam', methods=['GET'])
@jwt_required()
def get_dipinjam():
    conn = get_db_connection()
    rows = conn.execute("SELECT no_berkas, nama, isi_berkas FROM data_berkas WHERE isi_berkas != 'Belum diupdate' AND isi_berkas IS NOT NULL").fetchall()
    conn.close()
    
    dipinjam_list = []
    for row in rows:
        try:
            dokumen_list = json.loads(row['isi_berkas'])
            for index, doc in enumerate(dokumen_list):
                if doc.get('status') == 'Dipinjam':
                    dipinjam_list.append({
                        'no_berkas': row['no_berkas'],
                        'nama_wp_induk': row['nama'],
                        'doc_index': index,     
                        'dokumen': doc
                    })
        except:
            pass
    return jsonify(dipinjam_list)
    
# ==========================================
# Rute API Eksekusi Mutasi Keluar
# ==========================================
@berkas_bp.route('/api/mutasi', methods=['POST'])
@jwt_required()
def proses_mutasi():
    data = request.get_json()
    no_berkas = data.get('no_berkas')
    alasan = data.get('alasan', 'Tanpa Keterangan') # Tangkap alasan
    
    if not no_berkas:
        return jsonify({'status': 'error', 'message': 'Nomor berkas tidak valid'}), 400
        
    conn = get_db_connection()
    rows = conn.execute("SELECT id, nama, isi_berkas FROM data_berkas WHERE no_berkas = ?", (no_berkas,)).fetchall()
    
    if not rows:
        conn.close()
        return jsonify({'status': 'error', 'message': 'Berkas tidak ditemukan'}), 404
        
    new_no_berkas = f"EKS-{no_berkas}"
    for row in rows:
        new_nama = f"[MUTASI - {alasan}] {row['nama']}" # Masukkan alasan ke nama!
        
        isi_berkas_json = row['isi_berkas']
        new_isi_berkas = isi_berkas_json
        if isi_berkas_json and isi_berkas_json != 'Belum diupdate':
            try:
                dokumen_list = json.loads(isi_berkas_json)
                for doc in dokumen_list:
                    doc['status'] = 'Dimutasi'
                new_isi_berkas = json.dumps(dokumen_list)
            except:
                pass 
        
        conn.execute("UPDATE data_berkas SET no_berkas = ?, nama = ?, isi_berkas = ? WHERE id = ?",
            (new_no_berkas, new_nama, new_isi_berkas, row['id']))
            
    conn.commit()
    conn.close()
    return jsonify({'status': 'success', 'message': f'Berkas {no_berkas} berhasil dimutasi!'})

# ==========================================
# Rute API Eksekusi Mutasi Massal (Bulk)
# ==========================================
@berkas_bp.route('/api/mutasi/bulk', methods=['POST'])
@jwt_required()
def proses_mutasi_bulk():
    data = request.get_json()
    no_berkas_list = data.get('no_berkas_list', [])
    alasan = data.get('alasan', 'Tanpa Keterangan') # Tangkap alasan
    
    if not no_berkas_list:
        return jsonify({'status': 'error', 'message': 'Daftar berkas kosong'}), 400
        
    conn = get_db_connection()
    berhasil = 0
    for no_berkas in no_berkas_list:
        rows = conn.execute("SELECT id, nama, isi_berkas FROM data_berkas WHERE no_berkas = ?", (no_berkas,)).fetchall()
        if rows:
            new_no_berkas = f"EKS-{no_berkas}"
            for row in rows:
                new_nama = f"[MUTASI - {alasan}] {row['nama']}" # Masukkan alasan
                
                isi_berkas_json = row['isi_berkas']
                new_isi_berkas = isi_berkas_json
                if isi_berkas_json and isi_berkas_json != 'Belum diupdate':
                    try:
                        dokumen_list = json.loads(isi_berkas_json)
                        for doc in dokumen_list:
                            doc['status'] = 'Dimutasi'
                        new_isi_berkas = json.dumps(dokumen_list)
                    except:
                        pass 
                
                conn.execute("UPDATE data_berkas SET no_berkas = ?, nama = ?, isi_berkas = ? WHERE id = ?",
                    (new_no_berkas, new_nama, new_isi_berkas, row['id']))
            berhasil += 1
            
    conn.commit()
    conn.close()
    return jsonify({'status': 'success', 'message': f'{berhasil} Wajib Pajak berhasil dimutasi!'})
    
# ==========================================
# 6. Rute API Registrasi Cerdas (Smart Registration)
# ==========================================
@berkas_bp.route('/api/registrasi/saran-nomor', methods=['GET'])
@jwt_required()
def saran_nomor():
    conn = get_db_connection()
    # Tarik semua nomor berkas yang aktif (mengabaikan yang depannya EKS-)
    rows = conn.execute("SELECT DISTINCT no_berkas FROM data_berkas WHERE no_berkas NOT LIKE 'EKS-%'").fetchall()
    conn.close()

    # Kumpulkan dan konversi ke angka (integer) untuk diurutkan
    nomor_aktif = []
    for row in rows:
        try:
            nomor_aktif.append(int(row['no_berkas']))
        except ValueError:
            pass # Abaikan kalau ada format aneh
            
    nomor_aktif.sort()

    saran = 1
    is_daur_ulang = False
    
    if not nomor_aktif:
        saran = 1
    else:
        # LOGIKA GIGI BOLONG: Cek dari angka 1 sampai angka terbesar
        for i in range(1, nomor_aktif[-1] + 1):
            if i not in nomor_aktif:
                saran = i
                is_daur_ulang = True
                break
        
        # Jika tidak ada yang bolong, buat nomor baru di paling ujung
        if not is_daur_ulang:
            saran = nomor_aktif[-1] + 1

    return jsonify({
        'saran_nomor': str(saran),
        'is_daur_ulang': is_daur_ulang
    })

@berkas_bp.route('/api/registrasi', methods=['POST'])
@jwt_required()
def proses_registrasi():
    data = request.get_json()
    no_berkas = data.get('no_berkas')
    nama = data.get('nama')
    npwp = data.get('npwp', '-')
    npwp_16 = data.get('npwp_16', '-')
    nitku = data.get('nitku', '-')
    
    if not no_berkas or not nama:
        return jsonify({'status': 'error', 'message': 'Nomor berkas dan Nama wajib diisi!'}), 400
        
    conn = get_db_connection()
    
    # Keamanan Ganda: Pastikan nomor belum dipakai
    cek = conn.execute("SELECT id FROM data_berkas WHERE no_berkas = ?", (no_berkas,)).fetchone()
    if cek:
        conn.close()
        return jsonify({'status': 'error', 'message': f'Nomor berkas {no_berkas} sudah dipakai! Silakan refresh.'}), 400
        
    # Masukkan data baru dengan wadah dokumen kosong ('[]') agar siap diisi
    conn.execute('''
        INSERT INTO data_berkas (no_berkas, nama, npwp, npwp_16, nitku, isi_berkas)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (no_berkas, nama.upper(), npwp, npwp_16, nitku, '[]'))
    
    conn.commit()
    conn.close()
    
    return jsonify({'status': 'success', 'message': f'WP {nama.upper()} sukses terdaftar di Berkas No. {no_berkas}!'})
    
# ==========================================
# 8. Rute API Upload File Scan & Lihat File
# ==========================================
@berkas_bp.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'status': 'error', 'message': 'Tidak ada file yang dikirim'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'status': 'error', 'message': 'File kosong'}), 400

    allowed_extensions = {'.jpg', '.jpeg', '.pdf'}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_extensions:
        return jsonify({'status': 'error', 'message': 'Hanya file JPG dan PDF yang diizinkan'}), 400

    # Amankan nama file dan beri tambahan timestamp (waktu) agar tidak ada nama yang kembar/bentrok
    filename = secure_filename(file.filename)
    unique_filename = f"{int(time.time())}_{filename}"
    
    # Simpan file fisiknya ke folder 'uploads'
    filepath = os.path.join(UPLOAD_FOLDER, unique_filename)
    file.save(filepath)

    return jsonify({'status': 'success', 'filename': unique_filename})

# Rute ini untuk menampilkan file PDF/JPG di browser (Preview)
@berkas_bp.route('/api/files/<filename>', methods=['GET'])
def get_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)


# ==========================================
# 9. Rute API Export Seluruh Data ke Excel/CSV
# ==========================================
@berkas_bp.route('/api/export/csv', methods=['GET'])
def export_csv():
    conn = get_db_connection()
    # Ambil semua data berkas urut berdasarkan nomor berkas
    rows = conn.execute('''
        SELECT no_berkas, nama, npwp, npwp_16, nitku, isi_berkas 
        FROM data_berkas 
        ORDER BY CAST(no_berkas AS INTEGER) ASC, nitku ASC
    ''').fetchall()
    conn.close()

    # Buat buffer string untuk menampung data CSV
    si = StringIO()
    # Pakai delimiter ';' agar otomatis rapi saat dibuka di Excel regional Indonesia
    cw = csv.writer(si, delimiter=';') 
    
    # Menulis Header Kolom di Excel
    cw.writerow([
        'No Berkas Wadah', 'Nama Wajib Pajak (Induk/Cabang)', 
        'NPWP 15 Digit', 'NPWP 16 Digit', 'NITKU', 
        'Nama Dokumen', 'Nomor Dokumen', 'Tahun', 
        'Status Dokumen', 'Nama Peminjam', 'Tanggal Pinjam', 'Nama File Scan'
    ])

    # Looping membongkar data
    for row in rows:
        no_berkas = row['no_berkas']
        nama = row['nama']
        npwp = row['npwp']
        npwp_16 = row['npwp_16']
        nitku = row['nitku']
        isi = row['isi_berkas']
        
        # Jika isi_berkas ada isinya (berupa JSON array)
        if isi and isi != 'Belum diupdate' and isi != '[]':
            try:
                dokumen_list = json.loads(isi)
                for doc in dokumen_list:
                    cw.writerow([
                        no_berkas,
                        nama,
                        npwp,
                        npwp_16,
                        nitku,
                        doc.get('nama', '-'),
                        doc.get('nomor', '-'),
                        doc.get('tahun', '-'),
                        doc.get('status', 'Di Gudang'),
                        doc.get('peminjam', '-'),
                        doc.get('tanggal_pinjam', '-'),
                        doc.get('file_scan', '-')
                    ])
            except:
                # Jaga-jaga kalau JSON korup, tetap tulis data WP-nya
                cw.writerow([no_berkas, nama, npwp, npwp_16, nitku, 'Gagal Membaca Data Dokumen', '-', '-', '-', '-', '-', '-'])
        else:
            # Jika wadah berkas masih kosong melompong belum diupdate dokumennya
            cw.writerow([no_berkas, nama, npwp, npwp_16, nitku, '(Wadah Kosong / Belum Ada Dokumen)', '-', '-', '-', '-', '-', '-'])

    # Kembalikan file berupa download stream ke browser
    response = Response(si.getvalue(), mimetype='text/csv')
    response.headers['Content-Disposition'] = 'attachment; filename=MASTER_DATA_ARSIP_GUDANG.csv'
    return response

@berkas_bp.route("/api/log", methods=["GET"])
@jwt_required()
def get_activity_log():
    identity = get_jwt_identity()
    user = User.query.filter_by(username=identity).first()
    if not user:
        return jsonify(status='error', message='User tidak valid'), 401
    
    page = request.args.get("page", 1, type=int)
    limit = request.args.get("limit", 50, type=int)
    action_filter = request.args.get("action", "")
    user_filter = request.args.get("user", "")

    # Role logic adjustments
    if user.role == 'petugas':
        limit = 10
        page = 1
    
    offset = (page - 1) * limit
    conn = get_db_connection()

    where_clauses = []
    params = []
    if action_filter:
        where_clauses.append("action_type = ?")
        params.append(action_filter)
    if user_filter:
        where_clauses.append("username LIKE ?")
        params.append(f"%{user_filter}%")
        
    if user.role == 'user':
        where_clauses.append("action_type IN ('Pinjam', 'Kembali', 'Approve')")

    where_sql = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""

    total = conn.execute(
        f"SELECT COUNT(*) FROM activity_log {where_sql}", params
    ).fetchone()[0]

    if user.role == 'petugas':
        total = min(total, 10)

    logs = conn.execute(
        f"SELECT * FROM activity_log {where_sql} ORDER BY created_at DESC LIMIT ? OFFSET ?",
        params + [limit, offset]
    ).fetchall()

    conn.close()
    import math
    return jsonify({
        "data": [dict(log) for log in logs],
        "total": total,
        "total_pages": math.ceil(total / limit) if limit > 0 else 0,
        "current_page": page
    })