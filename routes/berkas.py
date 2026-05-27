import os
import time
import math
import csv
from io import StringIO
from datetime import datetime, timedelta
from flask import Blueprint, jsonify, request, send_from_directory, Response
from werkzeug.utils import secure_filename
from sqlalchemy import or_, func, cast, Integer
from sqlalchemy.orm import joinedload
from extensions import db
from models import DataBerkas, ActivityLog, User, Dokumen
from flask_jwt_extended import jwt_required, get_jwt_identity
from utils.decorators import superuser_required, petugas_required
from extensions import limiter
import magic

def parse_date(date_str):
    if not date_str or date_str.strip() == "":
        return None
    try:
        # Take only the date part if it's a datetime string
        clean_date = date_str.split('T')[0]
        return datetime.strptime(clean_date, "%Y-%m-%d").date()
    except ValueError:
        return None

berkas_bp = Blueprint('berkas_bp', __name__)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_ROOT = os.path.join(BASE_DIR, '..', 'uploads')
os.makedirs(UPLOAD_ROOT, exist_ok=True)

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

    hasil = []
    for b in berkas:
        docs = []
        for d in b.dokumen:
            docs.append({
                'id': d.id,
                'nama': d.nama,
                'nomor': d.nomor,
                'jenis': d.jenis,
                'tahun': d.tahun,
                'tanggal': d.tanggal.isoformat() if d.tanggal else "",
                'pemilik': d.pemilik,
                'wadah': d.wadah,
                'status': d.status,
                'peminjam': d.peminjam,
                'tanggal_pinjam': d.tanggal_pinjam.isoformat() if d.tanggal_pinjam else "",
                'tanggal_kembali': d.tanggal_kembali.isoformat() if d.tanggal_kembali else "",
                'keperluan': d.keperluan,
                'file_scan': d.file_scan,
                'batas_kembali': d.batas_kembali.isoformat() if d.batas_kembali else ""
            })
            
        hasil.append({
            'id': b.id,
            'no_berkas': b.no_berkas,
            'npwp_9': b.npwp_9,
            'npwp': b.npwp,
            'npwp_16': b.npwp_16,
            'nitku': b.nitku,
            'nama': b.nama,
            'dokumen_list': docs,
            'lokasi': b.lokasi,
            'status_pinjam': b.status_pinjam
        })
    
    return jsonify({
        'data': hasil,
        'total_pages': total_pages,
        'current_page': page,
        'total_items': total_wadah
    })

@berkas_bp.route('/api/berkas/update-isi', methods=['POST'])
@jwt_required()
@petugas_required
def update_isi_berkas():
    data = request.get_json()

    no_berkas = data.get('no_berkas')
    full_doc_list = data.get('isi_berkas', [])

    if not no_berkas:
        return jsonify({'status': 'error', 'message': 'Nomor berkas tidak valid'}), 400
        
    username = get_jwt_identity()
    log_action = data.get('log_action')
    log_desc = data.get('log_desc')
        
    data_berkas = DataBerkas.query.filter_by(no_berkas=no_berkas).first()
    if not data_berkas:
        return jsonify({'status': 'error', 'message': 'Berkas tidak ditemukan'}), 404
        
    Dokumen.query.filter_by(no_berkas=no_berkas).delete()
        
    # ✅ Sprint 3.1 — Auto-set batas_kembali +7 hari jika status Dipinjam dan belum ada
    for doc in full_doc_list:
        if doc.get("status") == "Dipinjam" and not doc.get("batas_kembali"):
            batas = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
            doc["batas_kembali"] = batas
            
        new_doc = Dokumen(
            no_berkas=no_berkas,
            nama=doc.get('nama', '-'),
            nomor=doc.get('nomor', '-'),
            jenis=doc.get('jenis', '-'),
            tahun=doc.get('tahun', '-'),
            tanggal=parse_date(doc.get('tanggal')),
            pemilik=doc.get('pemilik', ''),
            wadah=doc.get('wadah', ''),
            status=doc.get('status', 'Di Gudang'),
            peminjam=doc.get('peminjam', ''),
            tanggal_pinjam=parse_date(doc.get('tanggal_pinjam')),
            tanggal_kembali=parse_date(doc.get('tanggal_kembali')),
            keperluan=doc.get('keperluan', ''),
            file_scan=doc.get('file_scan', ''),
            batas_kembali=parse_date(doc.get('batas_kembali'))
        )
        db.session.add(new_doc)
        

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
@petugas_required
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
        nitku=nitku
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
    
    no_berkas = request.form.get('no_berkas', '').strip()
    safe_folder = secure_filename(no_berkas) if no_berkas else 'umum'
    if not safe_folder:
        safe_folder = 'umum'
        
    folder_path = os.path.join(UPLOAD_ROOT, safe_folder)
    os.makedirs(folder_path, exist_ok=True)
    
    filepath = os.path.join(folder_path, unique_filename)
    file.save(filepath)

    relative_path = f"{safe_folder}/{unique_filename}"
    return jsonify({'status': 'success', 'filename': relative_path})

@berkas_bp.route('/api/files/<path:filepath>', methods=['GET'])
@jwt_required()
def get_file(filepath):
    return send_from_directory(UPLOAD_ROOT, filepath)

@berkas_bp.route('/api/export/csv', methods=['GET'])
@jwt_required()
@limiter.limit("100 per minute")
def export_csv():
    rows = DataBerkas.query.options(joinedload(DataBerkas.dokumen)).order_by(cast(DataBerkas.no_berkas, Integer).asc(), DataBerkas.nitku.asc()).all()

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
        docs = row.dokumen
        
        if docs:
            for doc in docs:
                cw.writerow([
                    no_berkas,
                    nama,
                    npwp,
                    npwp_16,
                    nitku,
                    doc.nama,
                    doc.nomor,
                    doc.tahun,
                    doc.status,
                    doc.peminjam or '-',
                    doc.tanggal_pinjam.isoformat() if doc.tanggal_pinjam else '-',
                    doc.file_scan or '-'
                ])
        else:
            cw.writerow([no_berkas, nama, npwp, npwp_16, nitku, '(Wadah Kosong / Belum Ada Dokumen)', '-', '-', '-', '-', '-', '-'])

    response = Response(si.getvalue(), mimetype='text/csv')
    response.headers['Content-Disposition'] = 'attachment; filename=MASTER_DATA_ARSIP_GUDANG.csv'
    return response

@berkas_bp.route('/api/dokumen/cari', methods=['GET'])
@jwt_required()
@limiter.limit("300 per minute")
def cari_dokumen():
    """
    Sprint 4 — Pencarian dokumen lintas berkas.
    Mencari di tabel Dokumen (JOIN ke DataBerkas).
    Query params: q, status, tahun, page
    """
    q = request.args.get('q', '').strip().lower()
    status_filter = request.args.get('status', '').strip()
    tahun_filter = request.args.get('tahun', '').strip()
    page = request.args.get('page', 1, type=int)
    limit = 50
    offset = (page - 1) * limit

    # Ambil semua berkas yang punya isi_berkas valid (bukan EKS-)
    
    query = db.session.query(Dokumen, DataBerkas).join(
        DataBerkas, Dokumen.no_berkas == DataBerkas.no_berkas
    ).filter(
        DataBerkas.no_berkas.notlike('EKS-%')
    )
    
    if status_filter:
        query = query.filter(Dokumen.status == status_filter)
        
    if tahun_filter:
        query = query.filter(Dokumen.tahun == tahun_filter)
        
    if q:
        search_term = f"%{q}%"
        query = query.filter(
            or_(
                Dokumen.nama.like(search_term),
                Dokumen.nomor.like(search_term),
                Dokumen.jenis.like(search_term)
            )
        )
        
    total = query.count()
    results = query.offset(offset).limit(limit).all()
    
    hasil = []
    for doc, data_berkas in results:
        hasil.append({
            'no_berkas': data_berkas.no_berkas,
            'nama_wp': data_berkas.nama,
            'npwp_16': data_berkas.npwp_16 or '-',
            'doc_index': doc.id,  # Changed from idx to doc.id
            'nama': doc.nama,
            'nomor': doc.nomor,
            'jenis': doc.jenis,
            'tahun': doc.tahun,
            'tanggal': doc.tanggal.isoformat() if doc.tanggal else "",
            'pemilik': doc.pemilik,
            'status': doc.status,
            'peminjam': doc.peminjam,
            'tanggal_pinjam': doc.tanggal_pinjam.isoformat() if doc.tanggal_pinjam else "",
            'batas_kembali': doc.batas_kembali.isoformat() if doc.batas_kembali else "",
            'keperluan': doc.keperluan,
            'file_scan': doc.file_scan,
        })
        
    return jsonify({
        'data': hasil,
        'total': total,
        'total_pages': math.ceil(total / limit) if limit > 0 else 1,
        'current_page': page
    })


@berkas_bp.route('/api/berkas/<no_berkas>', methods=['DELETE'])
@jwt_required()
@superuser_required
def delete_berkas(no_berkas):
    identity = get_jwt_identity()
    berkas = DataBerkas.query.filter_by(no_berkas=no_berkas).all()
    if not berkas:
        return jsonify(status='error', message='Berkas tidak ditemukan'), 404
        
    for b in berkas:
        db.session.delete(b)
        
    # Hapus subdirektori fisik jika ada
    import shutil
    safe_folder = secure_filename(no_berkas) if no_berkas else 'umum'
    folder_path = os.path.join(UPLOAD_ROOT, safe_folder)
    if os.path.exists(folder_path):
        try:
            shutil.rmtree(folder_path)
        except Exception as e:
            import logging
            logging.getLogger('gudang').error(f"Gagal menghapus folder {folder_path}: {str(e)}")
        
    new_log = ActivityLog(action_type='Delete', description=f'Menghapus seluruh berkas wadah No: {no_berkas}', username=identity)
    db.session.add(new_log)
    
    db.session.commit()
    return jsonify(status='success', message=f'Wadah {no_berkas} beserta isinya dihapus')
