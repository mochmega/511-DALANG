from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from models import User

def superuser_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        identity = get_jwt_identity()
        user = User.query.filter_by(username=identity).first()
        if not user or user.role != 'superuser':
            return jsonify(status='error', message='Akses ditolak'), 403
        return fn(*args, **kwargs)
    return wrapper

def petugas_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        identity = get_jwt_identity()
        user = User.query.filter_by(username=identity).first()
        if not user or user.role not in ('petugas', 'superuser'):
            return jsonify(status='error', message='Akses ditolak'), 403
        return fn(*args, **kwargs)
    return wrapper
