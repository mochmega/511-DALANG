import json
import math
from datetime import date
from flask import Blueprint, jsonify, request
from extensions import db
from models import User, DataBerkas, ActivityLog
from flask_jwt_extended import jwt_required, get_jwt_identity

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
    
    # Hanya pantau dokumen yang dipinjam dari WP yang masih aktif
    berkas_items = DataBerkas.query\
        .filter(DataBerkas.isi_berkas != 'Belum diupdate')\
        .filter(DataBerkas.isi_berkas.isnot(None))\
        .filter(DataBerkas.no_berkas.notlike('EKS-%')).all()
    
    total_dipinjam = 0
    for row in berkas_items:
        try:
            if not row.isi_berkas: continue
            dokumen_list = json.loads(row.isi_berkas)
            for doc in dokumen_list:
                if doc.get('status') == 'Dipinjam':
                    total_dipinjam += 1
        except Exception:
            pass 
            
    # ✅ Sprint 3.2 — Hitung dokumen terlambat kembali
    hari_ini = date.today().isoformat()
    total_terlambat = 0
    for row in berkas_items:
        try:
            if not row.isi_berkas:
                continue
            dokumen_list = json.loads(row.isi_berkas)
            for doc in dokumen_list:
                batas = doc.get('batas_kembali', '')
                if doc.get('status') == 'Dipinjam' and batas and batas < hari_ini:
                    total_terlambat += 1
        except Exception:
            pass
            
    # Fetch recent activities based on role
    query = ActivityLog.query
    if user and user.role == 'user':
        query = query.filter(ActivityLog.action_type.in_(['Pinjam', 'Kembali', 'Approve']))
    
    logs_raw = query.order_by(ActivityLog.created_at.desc()).limit(5).all()
        
    activities = [{
        'action_type': log.action_type,
        'description': log.description,
        'username': log.username,
        'created_at': log.created_at.strftime('%Y-%m-%d %H:%M:%S') if log.created_at else ''
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
        'created_at': log.created_at.strftime('%Y-%m-%d %H:%M:%S') if log.created_at else ''
    } for log in logs]

    return jsonify({
        "data": logs_data,
        "total": total,
        "total_pages": math.ceil(total / limit) if limit > 0 else 0,
        "current_page": page
    })
