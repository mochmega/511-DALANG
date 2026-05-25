import json
import os
import time
import math
import csv
from io import StringIO
from flask import Blueprint, jsonify, request, send_from_directory, Response
from werkzeug.utils import secure_filename
from sqlalchemy import or_, func, cast, Integer
from extensions import db
from models import DataBerkas, ActivityLog, User
from flask_jwt_extended import jwt_required, get_jwt_identity
from utils.decorators import superuser_required
import magic

berkas_bp = Blueprint('berkas_bp', __name__)
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@berkas_bp.route('/api/berkas', methods=['GET'])
@jwt_required()
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
    
    query = DataBerkas.query

    if search_query:
        if search_by == 'no_berkas':
            query = query.filter(DataBerkas.no_berkas == search_query)
        elif search_by == 'nama':
            query = query.filter(DataBerkas.nama.like(f"%{search_query}%"))
        elif search_by == 'npwp':
            query = query.filter(
                or_(
                    DataBerkas.npwp.like(f"%{search_query}%"),
                    DataBerkas.npwp_16.like(f"%{search_query}%"),
                    DataBerkas.nitku.like(f"%{search_query}%")
                )
            )
        else:
            query = query.filter(
                or_(
                    DataBerkas.no_berkas.like(f"%{search_query}%"),
                    DataBerkas.nama.like(f"%{search_query}%"),
                    DataBerkas.npwp.like(f"%{search_query}%"),
                    DataBerkas.npwp_16.like(f"%{search_query}%"),
                    DataBerkas.nitku.like(f"%{search_query}%")
                )
            )

    # Calculate total unique no_berkas
    total_wadah = query.with_entities(func.count(func.distinct(DataBerkas.no_berkas))).scalar()
    
    if total_wadah == 0:
        return jsonify({'data': [], 'total_pages': 0, 'current_page': page, 'total_items': 0})
        
    # Get paginated no_berkas
    # Note: Using SQLite specific CAST in order_by to match old raw SQL behavior
    subquery = query.with_entities(DataBerkas.no_berkas).distinct()\
        .order_by(cast(DataBerkas.no_berkas, Integer).asc())\
        .offset(offset)
        
    if limit > 0:
        subquery = subquery.limit(limit)
        
    no_berkas_list = [row[0] for row in subquery.all()]
    
    if not no_berkas_list:
        return jsonify({'data': [], 'total_pages': 0, 'current_page': page, 'total_items': 0})

    # Fetch all full rows for these no_berkas
    berkas = DataBerkas.query\
        .filter(DataBerkas.no_berkas.in_(no_berkas_list))\
        .order_by(cast(DataBerkas.no_berkas, Integer).asc(), DataBerkas.nitku.asc())\
        .all()

    total_pages = math.ceil(total_wadah / limit) if limit > 0 else 1

    hasil = [{
        'id': b.id,
        'no_berkas': b.no_berkas,
        'npwp_9': b.npwp_9,
        'npwp': b.npwp,
        'npwp_16': b.npwp_16,
        'nitku': b.nitku,
        'nama': b.nama,
        'isi_berkas': b.isi_berkas,
        'lokasi': b.lokasi,
        'status_pinjam': b.status_pinjam
    } for b in berkas]
    
    return jsonify({
        'data': hasil,
        'total_pages': total_pages,
        'current_page': page,
        'total_items': total_wadah
    })

@berkas_bp.route('/api/berkas/update-isi', methods=['POST'])
@jwt_required()
def update_isi_berkas():
    data = request.get_json()
    no_berkas = data.get('no_berkas')
    full_doc_list = data.get('isi_berkas', [])

    if not no_berkas:
        return jsonify({'status': 'error', 'message': 'Nomor berkas tidak valid'}), 400
        
    username = get_jwt_identity()
    log_action = data.get('log_action')
    log_desc = data.get('log_desc')
        
    all_rows = DataBerkas.query.filter_by(no_berkas=no_berkas).all()
    if not all_rows:
        return jsonify({'status': 'error', 'message': 'Berkas tidak ditemukan'}), 404
        
    docs_per_row = {row.id: [] for row in all_rows}
    
    for doc in full_doc_list:
        pemilik_str = doc.get('pemilik', '')
        matched_id = None
        
        for row in all_rows:
            if row.nitku and row.nitku in pemilik_str:
                matched_id = row.id
                break
                
        if not matched_id and "[Pusat]" in pemilik_str:
            for row in all_rows:
                if row.nitku and (row.nitku.endswith('000000') or row.nitku == '0000000000000000'):
                    matched_id = row.id
                    break
            if not matched_id:
                matched_id = all_rows[0].id
                
        if matched_id:
            docs_per_row[matched_id].append(doc)
        else:
            docs_per_row[all_rows[0].id].append(doc)

    for row_id, doc_list in docs_per_row.items():
        json_str = json.dumps(doc_list) if doc_list else '[]'
        row = DataBerkas.query.get(row_id)
        if row:
            row.isi_berkas = json_str

    if log_action and log_desc:
        new_log = ActivityLog(action_type=log_action, description=log_desc, username=username)
        db.session.add(new_log)

    db.session.commit()
    return jsonify({'status': 'success', 'message': 'Tersimpan ke kamar masing-masing!'})


@berkas_bp.route('/api/registrasi/saran-nomor', methods=['GET'])
@jwt_required()
def saran_nomor():
    rows = DataBerkas.query.filter(DataBerkas.no_berkas.notlike('EKS-%')).with_entities(DataBerkas.no_berkas).distinct().all()

    nomor_aktif = []
    for row in rows:
        try:
            nomor_aktif.append(int(row[0]))
        except ValueError:
            pass
            
    nomor_aktif.sort()

    saran = 1
    is_daur_ulang = False
    
    if not nomor_aktif:
        saran = 1
    else:
        for i in range(1, nomor_aktif[-1] + 1):
            if i not in nomor_aktif:
                saran = i
                is_daur_ulang = True
                break
        
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
        
    cek = DataBerkas.query.filter_by(no_berkas=no_berkas).first()
    if cek:
        return jsonify({'status': 'error', 'message': f'Nomor berkas {no_berkas} sudah dipakai! Silakan refresh.'}), 400
        
    new_berkas = DataBerkas(
        no_berkas=no_berkas,
        nama=nama.upper(),
        npwp=npwp,
        npwp_16=npwp_16,
        nitku=nitku,
        isi_berkas='[]'
    )
    db.session.add(new_berkas)
    db.session.commit()
    
    return jsonify({'status': 'success', 'message': f'WP {nama.upper()} sukses terdaftar di Berkas No. {no_berkas}!'})
    
@berkas_bp.route('/api/upload', methods=['POST'])
@jwt_required()
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

    mime = magic.from_buffer(file.read(2048), mime=True)
    file.seek(0)
    if mime not in ['image/jpeg', 'application/pdf']:
        return jsonify({'status': 'error', 'message': 'Tipe file tidak diizinkan'}), 400

    filename = secure_filename(file.filename)
    unique_filename = f"{int(time.time())}_{filename}"
    
    filepath = os.path.join(UPLOAD_FOLDER, unique_filename)
    file.save(filepath)

    return jsonify({'status': 'success', 'filename': unique_filename})

@berkas_bp.route('/api/files/<filename>', methods=['GET'])
@jwt_required()
def get_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

@berkas_bp.route('/api/export/csv', methods=['GET'])
@jwt_required()
def export_csv():
    rows = DataBerkas.query.order_by(cast(DataBerkas.no_berkas, Integer).asc(), DataBerkas.nitku.asc()).all()

    si = StringIO()
    cw = csv.writer(si, delimiter=';') 
    
    cw.writerow([
        'No Berkas Wadah', 'Nama Wajib Pajak (Induk/Cabang)', 
        'NPWP 15 Digit', 'NPWP 16 Digit', 'NITKU', 
        'Nama Dokumen', 'Nomor Dokumen', 'Tahun', 
        'Status Dokumen', 'Nama Peminjam', 'Tanggal Pinjam', 'Nama File Scan'
    ])

    for row in rows:
        no_berkas = row.no_berkas
        nama = row.nama
        npwp = row.npwp
        npwp_16 = row.npwp_16
        nitku = row.nitku
        isi = row.isi_berkas
        
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
                cw.writerow([no_berkas, nama, npwp, npwp_16, nitku, 'Gagal Membaca Data Dokumen', '-', '-', '-', '-', '-', '-'])
        else:
            cw.writerow([no_berkas, nama, npwp, npwp_16, nitku, '(Wadah Kosong / Belum Ada Dokumen)', '-', '-', '-', '-', '-', '-'])

    response = Response(si.getvalue(), mimetype='text/csv')
    response.headers['Content-Disposition'] = 'attachment; filename=MASTER_DATA_ARSIP_GUDANG.csv'
    return response

@berkas_bp.route('/api/berkas/<no_berkas>', methods=['DELETE'])
@superuser_required
def delete_berkas(no_berkas):
    identity = get_jwt_identity()
    berkas = DataBerkas.query.filter_by(no_berkas=no_berkas).all()
    if not berkas:
        return jsonify(status='error', message='Berkas tidak ditemukan'), 404
        
    for b in berkas:
        db.session.delete(b)
        
    new_log = ActivityLog(action_type='Delete', description=f'Menghapus seluruh berkas wadah No: {no_berkas}', username=identity)
    db.session.add(new_log)
    
    db.session.commit()
    return jsonify(status='success', message=f'Wadah {no_berkas} beserta isinya dihapus')
