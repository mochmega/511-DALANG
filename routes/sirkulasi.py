import json
import math
from flask import Blueprint, jsonify, request
from extensions import db
from models import DataBerkas
from flask_jwt_extended import jwt_required, get_jwt_identity

sirkulasi_bp = Blueprint('sirkulasi_bp', __name__)

@sirkulasi_bp.route('/api/sirkulasi/dipinjam', methods=['GET'])
@jwt_required()
def get_dipinjam():
    from models import Dokumen
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
            'tanggal_pinjam': doc.tanggal_pinjam,
            'batas_kembali': doc.batas_kembali,
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
def proses_mutasi():
    from models import User
    identity = get_jwt_identity()
    user = User.query.filter_by(username=identity).first()
    if not user or user.role == 'user':
        return jsonify({'status': 'error', 'message': 'Akses ditolak'}), 403
        
    data = request.get_json()
    no_berkas = data.get('no_berkas')
    alasan = data.get('alasan', 'Tanpa Keterangan')
    
    if not no_berkas:
        return jsonify({'status': 'error', 'message': 'Nomor berkas tidak valid'}), 400
        
    rows = DataBerkas.query.filter_by(no_berkas=no_berkas).all()
    
    if not rows:
        return jsonify({'status': 'error', 'message': 'Berkas tidak ditemukan'}), 404
        
    new_no_berkas = f"EKS-{no_berkas}"
    for row in rows:
        row.nama = f"[MUTASI - {alasan}] {row.nama}"
        
        if row.isi_berkas and row.isi_berkas != 'Belum diupdate':
            try:
                dokumen_list = json.loads(row.isi_berkas)
                for doc in dokumen_list:
                    doc['status'] = 'Dimutasi'
                row.isi_berkas = json.dumps(dokumen_list)
            except Exception as e:
                import logging
                logging.getLogger('gudang').error(f"JSON Corrupt saat mutasi Berkas {row.no_berkas}: {str(e)}")
        
        row.no_berkas = new_no_berkas
            
    db.session.commit()
    return jsonify({'status': 'success', 'message': f'Berkas {no_berkas} berhasil dimutasi!'})

@sirkulasi_bp.route('/api/mutasi/bulk', methods=['POST'])
@jwt_required()
def proses_mutasi_bulk():
    from models import User
    identity = get_jwt_identity()
    user = User.query.filter_by(username=identity).first()
    if not user or user.role == 'user':
        return jsonify({'status': 'error', 'message': 'Akses ditolak'}), 403
        
    data = request.get_json()
    no_berkas_list = data.get('no_berkas_list', [])
    alasan = data.get('alasan', 'Tanpa Keterangan')
    
    if not no_berkas_list:
        return jsonify({'status': 'error', 'message': 'Daftar berkas kosong'}), 400
        
    berhasil = 0
    for no_berkas in no_berkas_list:
        rows = DataBerkas.query.filter_by(no_berkas=no_berkas).all()
        if rows:
            new_no_berkas = f"EKS-{no_berkas}"
            for row in rows:
                row.nama = f"[MUTASI - {alasan}] {row.nama}"
                
                if row.isi_berkas and row.isi_berkas != 'Belum diupdate':
                    try:
                        dokumen_list = json.loads(row.isi_berkas)
                        for doc in dokumen_list:
                            doc['status'] = 'Dimutasi'
                        row.isi_berkas = json.dumps(dokumen_list)
                    except Exception as e:
                        import logging
                        logging.getLogger('gudang').error(f"JSON Corrupt saat mutasi bulk Berkas {row.no_berkas}: {str(e)}")
                
                row.no_berkas = new_no_berkas
            berhasil += 1
            
    db.session.commit()
    return jsonify({'status': 'success', 'message': f'{berhasil} Wajib Pajak berhasil dimutasi!'})
