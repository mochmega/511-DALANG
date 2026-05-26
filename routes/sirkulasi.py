import math
from flask import Blueprint, jsonify, request
from extensions import db
from models import DataBerkas, Dokumen, User, ActivityLog
from flask_jwt_extended import jwt_required, get_jwt_identity
from utils.decorators import superuser_required, petugas_required

sirkulasi_bp = Blueprint('sirkulasi_bp', __name__)

def _mutasi_satu_berkas(no_berkas, alasan):
    rows = DataBerkas.query.filter_by(no_berkas=no_berkas).all()
    if not rows:
        return False
        
    new_no_berkas = f"EKS-{no_berkas}"
    for row in rows:
        row.nama = f"[MUTASI - {alasan}] {row.nama}"
        
        docs = Dokumen.query.filter_by(no_berkas=row.no_berkas).all()
        for doc in docs:
            doc.status = 'Dimutasi'
            doc.no_berkas = new_no_berkas
        
        row.no_berkas = new_no_berkas
    return True

@sirkulasi_bp.route('/api/sirkulasi/dipinjam', methods=['GET'])
@jwt_required()
def get_dipinjam():
    page  = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 50, type=int)

    query = db.session.query(Dokumen, DataBerkas).join(DataBerkas, Dokumen.no_berkas == DataBerkas.no_berkas).filter(
        Dokumen.status == 'Dipinjam',
        DataBerkas.no_berkas.notlike('EKS-%')
    )

    total = query.count()
    total_pages = math.ceil(total / limit) if limit > 0 else 1
    offset = (page - 1) * limit
    
    results = query.offset(offset).limit(limit).all()

    dipinjam_list = []
    for doc, data_berkas in results:
        dipinjam_list.append({
            'no_berkas': data_berkas.no_berkas,
            'nama_wp': data_berkas.nama,
            'npwp_16': data_berkas.npwp_16 or '-',
            'doc_id': doc.id,
            'nama': doc.nama,
            'nomor': doc.nomor,
            'jenis': doc.jenis,
            'tahun': doc.tahun,
            'status': doc.status,
            'peminjam': doc.peminjam,
            'tanggal_pinjam': doc.tanggal_pinjam.isoformat() if doc.tanggal_pinjam else "",
            'batas_kembali': doc.batas_kembali.isoformat() if doc.batas_kembali else "",
            'keperluan': doc.keperluan,
        })

    return jsonify({
        'data': dipinjam_list,
        'total': total,
        'total_pages': total_pages,
        'current_page': page
    })

@sirkulasi_bp.route('/api/mutasi', methods=['POST'])
@jwt_required()
@petugas_required
def proses_mutasi():
    data = request.get_json()
    no_berkas = data.get('no_berkas')
    alasan = data.get('alasan', 'Tanpa Keterangan')
    
    if not no_berkas:
        return jsonify({'status': 'error', 'message': 'Nomor berkas tidak valid'}), 400
        
    success = _mutasi_satu_berkas(no_berkas, alasan)
    if not success:
        return jsonify({'status': 'error', 'message': 'Berkas tidak ditemukan'}), 404
            
    identity = get_jwt_identity()
    new_log = ActivityLog(action_type='Mutasi', description=f'Mutasi berkas {no_berkas} — {alasan}', username=identity)
    db.session.add(new_log)
    db.session.commit()
    return jsonify({'status': 'success', 'message': f'Berkas {no_berkas} berhasil dimutasi!'})

@sirkulasi_bp.route('/api/mutasi/bulk', methods=['POST'])
@jwt_required()
@petugas_required
def proses_mutasi_bulk():
    data = request.get_json()
    no_berkas_list = data.get('no_berkas_list', [])
    alasan = data.get('alasan', 'Tanpa Keterangan')
    
    if not no_berkas_list:
        return jsonify({'status': 'error', 'message': 'Daftar berkas kosong'}), 400
    if len(no_berkas_list) > 100:
        return jsonify({'status': 'error', 'message': 'Maksimal 100 item untuk bulk mutasi'}), 400
        
    berhasil = 0
    for no_berkas in no_berkas_list:
        if _mutasi_satu_berkas(no_berkas, alasan):
            berhasil += 1
            
    identity = get_jwt_identity()
    new_log = ActivityLog(action_type='Mutasi', description=f'Mutasi bulk {berhasil} berkas — {alasan}', username=identity)
    db.session.add(new_log)
    db.session.commit()
    return jsonify({'status': 'success', 'message': f'{berhasil} Wajib Pajak berhasil dimutasi!'})
