# File: extensions.py
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

db = SQLAlchemy()
jwt = JWTManager()
# DOKUMENTASI (MEDIUM-1): 
# Saat ini Rate Limiter menggunakan "in-memory storage" bawaan Flask-Limiter.
# Efeknya: Rate limit akan ter-reset jika server di-restart, dan memory tidak di-share 
# antar-proses/worker. Untuk arsitektur saat ini (Deployment Windows via Waitress single-process),
# hal ini sangat aman dan sepenuhnya dapat diterima tanpa memerlukan Redis/Memcached.
limiter = Limiter(key_func=get_remote_address, default_limits=["1000 per minute"])