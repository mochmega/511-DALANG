import os
import tempfile
import sqlite3
import pytest

# Pastikan set env sebelum app diimport
os.environ['TESTING'] = 'True'
os.environ['SQLITE_DB'] = 'test_database.db'
os.environ['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///test_gudang.db'
os.environ['JWT_SECRET_KEY'] = 'test-secret'
os.environ['ADMIN_USERNAME'] = 'admin'
os.environ['ADMIN_PASSWORD'] = 'admin'

from app import app as flask_app, init_db
from extensions import db

@pytest.fixture
def app():
    with flask_app.app_context():
        init_db()  # Ini akan bikin tabel gudang.db via SQLAlchemy (User, Dokumen, DataBerkas, ActivityLog)
    
    yield flask_app

    # Cleanup sesudah test
    with flask_app.app_context():
        db.session.remove()
        db.drop_all()

    try:
        os.remove('instance/test_gudang.db')
    except:
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
