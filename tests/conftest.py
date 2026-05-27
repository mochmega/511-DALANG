import os
import tempfile
import sqlite3
import pytest

# Pastikan set env sebelum app diimport
os.environ['TESTING'] = 'True'
os.environ['SQLITE_DB'] = 'test_database.db'
os.environ['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///test_gudang.db'
os.environ['JWT_SECRET_KEY'] = 'test-secret-key-32-chars-long-security-key'
os.environ['ADMIN_USERNAME'] = 'admin'
os.environ['ADMIN_PASSWORD'] = 'admin'

from app import app as flask_app, init_db
from extensions import db

@pytest.fixture
def app():
    import shutil
    import os
    
    src_path = os.path.join(flask_app.instance_path, 'load_test.db')
    dst_path = os.path.join(flask_app.instance_path, 'test_gudang.db')
    
    # Salin load_test.db untuk diuji (Session Sandbox) agar data asli tetap aman
    if os.path.exists(src_path):
        shutil.copy(src_path, dst_path)
        
    with flask_app.app_context():
        init_db()  # Menjamin skema up-to-date dan superuser admin disetup jika belum ada
    
    yield flask_app

    # Cleanup sesudah test
    with flask_app.app_context():
        db.session.remove()
        db.engine.dispose()
    
    # Hapus salinan sementara agar tidak meninggalkan file sampah
    if os.path.exists(dst_path):
        try:
            os.remove(dst_path)
        except Exception:
            pass

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def superuser_token(client):
    # Admin dibuat via init_db
    res = client.post('/api/login', json={'username': 'admin', 'password': 'admin'})
    return res.get_json()['token']

@pytest.fixture
def user_token(client, superuser_token):
    # Buat user biasa untuk test
    client.post('/api/register', 
        headers={'Authorization': f'Bearer {superuser_token}'},
        json={'username': 'testuser', 'password': 'testuser', 'role': 'user'}
    )
    res = client.post('/api/login', json={'username': 'testuser', 'password': 'testuser'})
    return res.get_json()['token']
