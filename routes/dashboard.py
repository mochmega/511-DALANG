import math
from datetime import date, timedelta
from flask import Blueprint, jsonify, request
from extensions import db
from models import User, DataBerkas, Dokumen, ActivityLog
from flask_jwt_extended import jwt_required, get_jwt_identity
import logging

logger = logging.getLogger('gudang.routes.dashboard')

dashboard_bp = Blueprint('dashboard_bp', __name__)

@dashboard_bp.route('/api/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard_stats():
    identity = get_jwt_identity()
    user = User.query.filter_by(username=identity).first()

    # Hanya hitung wadah yang BUKAN EKS (Tidak Dimutasi)
    total_rumah = db.session.query(DataBerkas.no_berkas)\
        .filter(DataBerkas.no_berkas.notlike('EKS-%'))\
        .distinct().count()
    
    # Hanya pantau dokumen dari WP yang masih aktif (Bukan EKS)
    # Sedang Dipinjam
    total_dipinjam = db.session.query(Dokumen).join(
        DataBerkas, Dokumen.no_berkas == DataBerkas.no_berkas
    ).filter(
        DataBerkas.no_berkas.notlike('EKS-%'),
        Dokumen.status == 'Dipinjam'
    ).count()
            
    # Terlambat Kembali
    hari_ini = date.today()
    total_terlambat = db.session.query(Dokumen).join(
        DataBerkas, Dokumen.no_berkas == DataBerkas.no_berkas
    ).filter(
        DataBerkas.no_berkas.notlike('EKS-%'),
        Dokumen.status == 'Dipinjam',
        Dokumen.batas_kembali != None,
        Dokumen.batas_kembali < hari_ini
    ).count()
            
    # Fetch recent activities based on role
    query = ActivityLog.query
    if user and user.role == 'user':
        query = query.filter(ActivityLog.action_type.in_(['Pinjam', 'Kembali', 'Approve']))
    
    logs_raw = query.order_by(ActivityLog.created_at.desc()).limit(5).all()
        
    activities = [{
        'action_type': log.action_type,
        'description': log.description,
        'username': log.username,
        'created_at': log.created_at.isoformat() + 'Z' if log.created_at else ''
    } for log in logs_raw]
    
    return jsonify({
        'total_rumah': total_rumah, 
        'dipinjam': total_dipinjam, 
        'terlambat': total_terlambat,
        'activities': activities
    })

@dashboard_bp.route("/api/log", methods=["GET"])
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
    
    query = ActivityLog.query

    if action_filter:
        query = query.filter(ActivityLog.action_type == action_filter)
    if user_filter:
        query = query.filter(ActivityLog.username.like(f"%{user_filter}%"))
        
    if user.role == 'user':
        query = query.filter(ActivityLog.action_type.in_(['Pinjam', 'Kembali', 'Approve']))

    total = query.count()

    if user.role == 'petugas':
        total = min(total, 10)

    offset = (page - 1) * limit
    logs = query.order_by(ActivityLog.created_at.desc()).offset(offset).limit(limit).all()

    logs_data = [{
        'action_type': log.action_type,
        'description': log.description,
        'username': log.username,
        'created_at': log.created_at.isoformat() + 'Z' if log.created_at else ''
    } for log in logs]

    return jsonify({
        "data": logs_data,
        "total": total,
        "total_pages": math.ceil(total / limit) if limit > 0 else 0,
        "current_page": page
    })

@dashboard_bp.route('/api/statistik', methods=['GET'])
@jwt_required()
def get_statistik():
    try:
        from sqlalchemy import func

        # ── 1. Distribusi Jenis Arsip (Pie Chart) ──
        # Ambil dari model Dokumen, field 'jenis'
        distribusi_raw = db.session.query(
            Dokumen.jenis,
            func.count(Dokumen.id).label('total')
        ).filter(
            Dokumen.no_berkas.notlike('EKS-%')
        ).group_by(Dokumen.jenis).all()

        distribusi_jenis = [
            {'jenis': row.jenis or 'Lainnya', 'total': row.total}
            for row in distribusi_raw
        ]

        # ── 2. Top 5 WP berdasarkan jumlah berkas (Bar/List) ──
        # Ambil dari DataBerkas yang berelasi dengan Dokumen berstatus Dipinjam
        top_wp_raw = db.session.query(
            DataBerkas.nama,
            func.count(Dokumen.id).label('total')
        ).join(
            Dokumen, DataBerkas.no_berkas == Dokumen.no_berkas
        ).filter(
            DataBerkas.no_berkas.notlike('EKS-%'),
            DataBerkas.nama.isnot(None),
            Dokumen.status == 'Dipinjam'
        ).group_by(DataBerkas.nama)\
         .order_by(func.count(Dokumen.id).desc())\
         .limit(5).all()

        top_wp = [
            {'nama': row.nama, 'total': row.total}
            for row in top_wp_raw
        ]

        # ── 3. Tren Peminjaman 6 Bulan Terakhir (Line Chart) ──
        # Hitung dari Dokumen yang status-nya 'Dipinjam' per bulan
        tren_peminjaman = []
        today = date.today()
        from sqlalchemy import extract
        for i in range(5, -1, -1):
            # Hitung bulan mundur secara akurat
            month = today.month - i
            year = today.year
            if month <= 0:
                year -= (abs(month) // 12) + 1
                month = 12 - (abs(month) % 12)
                
            target_date = date(year, month, 1)
            label_display = target_date.strftime('%b %Y') # Contoh: May 2026

            jumlah = db.session.query(func.count(Dokumen.id))\
                .filter(
                    Dokumen.status == 'Dipinjam',
                    extract('year', Dokumen.tanggal_pinjam) == year,
                    extract('month', Dokumen.tanggal_pinjam) == month
                ).scalar() or 0

            tren_peminjaman.append({'label': label_display, 'total': jumlah})

        return jsonify({
            'status': 'success',
            'distribusi_jenis': distribusi_jenis,
            'top_wp': top_wp,
            'tren_peminjaman': tren_peminjaman
        }), 200

    except Exception as e:
        logger.error(f"Statistik error: {e}", exc_info=True)
        return jsonify({'status': 'error', 'message': 'Terjadi kesalahan internal'}), 500

@dashboard_bp.route('/api/server/storage', methods=['GET'])
@jwt_required()
def get_storage_info():
    from utils.decorators import superuser_required
    identity = get_jwt_identity()
    user = User.query.filter_by(username=identity).first()
    if not user or user.role != 'superuser':
        return jsonify({'status': 'error', 'message': 'Akses ditolak'}), 403
    
    try:
        import shutil
        import os
        BASE_DIR = os.path.dirname(os.path.abspath(__file__))
        ROOT_DIR = os.path.join(BASE_DIR, '..')
        
        disk = shutil.disk_usage(ROOT_DIR)
        
        upload_dir = os.path.join(ROOT_DIR, 'uploads')
        uploads_size = 0
        upload_file_count = 0
        if os.path.exists(upload_dir):
            for dirpath, dirnames, filenames in os.walk(upload_dir):
                for f in filenames:
                    fp = os.path.join(dirpath, f)
                    uploads_size += os.path.getsize(fp)
                    upload_file_count += 1
        
        db_path = os.path.join(ROOT_DIR, 'instance', 'gudang.db')
        db_size = os.path.getsize(db_path) if os.path.exists(db_path) else 0
        
        backup_dir = os.path.join(ROOT_DIR, 'backups')
        backup_size = 0
        backup_count = 0
        if os.path.exists(backup_dir):
            for f in os.listdir(backup_dir):
                fp = os.path.join(backup_dir, f)
                if os.path.isfile(fp):
                    backup_size += os.path.getsize(fp)
                    backup_count += 1
        
        def fmt(b):
            for unit in ['B', 'KB', 'MB', 'GB']:
                if b < 1024:
                    return f"{b:.1f} {unit}"
                b /= 1024
            return f"{b:.1f} TB"
        
        return jsonify({
            'status': 'success',
            'disk': {
                'total': fmt(disk.total),
                'used': fmt(disk.used),
                'free': fmt(disk.free),
                'percent': round(disk.used / disk.total * 100, 1),
                'total_bytes': disk.total,
                'used_bytes': disk.used,
                'free_bytes': disk.free,
            },
            'uploads': {
                'size': fmt(uploads_size),
                'size_bytes': uploads_size,
                'file_count': upload_file_count
            },
            'database': {
                'size': fmt(db_size),
                'size_bytes': db_size
            },
            'backups': {
                'size': fmt(backup_size),
                'count': backup_count
            }
        })
    except Exception as e:
        logger.error(f"Storage info error: {e}", exc_info=True)
        return jsonify({'status': 'error', 'message': 'Terjadi kesalahan internal'}), 500
