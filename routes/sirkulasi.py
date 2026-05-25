import json
import math
from flask import Blueprint, jsonify, request
from extensions import db
from models import DataBerkas
from flask_jwt_extended import jwt_required

sirkulasi_bp = Blueprint('sirkulasi_bp', __name__)

@sirkulasi_bp.route('/api/sirkulasi/dipinjam', methods=['GET'])
@jwt_required()
def get_dipinjam():
    page  = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 50, type=int)

    berkas_items = DataBerkas.query\
        .filter(DataBerkas.isi_berkas != 'Belum diupdate')\
        .filter(DataBerkas.isi_berkas.isnot(None)).all()

    dipinjam_list = []
    for row in berkas_items:
        try:
            if not row.isi_berkas: continue
            dokumen_list = json.loads(row.isi_berkas)
            for index, doc in enumerate(dokumen_list):
                if doc.get('status') == 'Dipinjam':
                    dipinjam_list.append({
                        'no_berkas': row.no_berkas,
                        'nama_wp_induk': row.nama,
                        'doc_index': index,
                        'dokumen': doc
                    })
        except Exception as e:
            import logging
            logging.getLogger('gudang').error(f"JSON Corrupt pada Berkas {row.no_berkas}: {str(e)}")

    total = len(dipinjam_list)
    total_pages = math.ceil(total / limit) if limit > 0 else 1
    offset = (page - 1) * limit
    paginated = dipinjam_list[offset: offset + limit]

    return jsonify({
        'data': paginated,
        'total': total,
        'total_pages': total_pages,
        'current_page': page
    })

@sirkulasi_bp.route('/api/mutasi', methods=['POST'])
@jwt_required()
def proses_mutasi():
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
