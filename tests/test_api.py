import json

def test_login_success(client):
    res = client.post('/api/login', json={'username': 'admin', 'password': 'admin'})
    assert res.status_code == 200
    data = res.get_json()
    assert 'token' in data
    assert data['role'] == 'superuser'

def test_login_fail(client):
    res = client.post('/api/login', json={'username': 'admin', 'password': 'salah'})
    assert res.status_code == 401

def test_register_and_delete_user(client, superuser_token):
    hdrs = {'Authorization': f'Bearer {superuser_token}'}
    # Register
    res = client.post('/api/register', headers=hdrs, json={'username': 'budi', 'password': 'testpass123', 'role': 'petugas'})
    assert res.status_code == 200
    
    # Check if exists
    res = client.get('/api/users', headers=hdrs)
    users = res.get_json()
    assert any(u['username'] == 'budi' for u in users)

    # Delete
    res = client.delete('/api/users/budi', headers=hdrs)
    assert res.status_code == 200

def test_berkas_crud(client, superuser_token):
    hdrs = {'Authorization': f'Bearer {superuser_token}'}
    
    # 1. Tambah data berkas
    res = client.post('/api/registrasi', headers=hdrs, json={
        'no_berkas': 'B-001',
        'nama': 'PT ABC',
        'npwp': '123'
    })
    assert res.status_code == 200

    # 2. Get list berkas
    res = client.get('/api/berkas?search=B-001&by=all&page=1&limit=10', headers=hdrs)
    data = res.get_json()['data']
    assert len(data) == 1
    assert data[0]['no_berkas'] == "B-001"

def test_sirkulasi_pinjam_kembali(client, superuser_token):
    hdrs = {'Authorization': f'Bearer {superuser_token}'}
    
    # 1. Tambah data
    client.post('/api/registrasi', headers=hdrs, json={'no_berkas': 'B-002', 'nama': 'PT XYZ'})

    # 2. Isi dokumen (simulasikan save doc list)
    dokumenList = [{
        "nama": "Surat Izin",
        "nomor": "001",
        "tahun": "2023",
        "status": "Di Gudang"
    }]
    res = client.post('/api/berkas/update-isi', headers=hdrs, json={
        'no_berkas': 'B-002',
        'isi_berkas': dokumenList,
        'log_action': 'Simpan',
        'log_desc': 'Simpan list'
    })
    assert res.status_code == 200
    
    # 3. Pinjam dokumen index 0 via update-isi
    dokumenList[0]['status'] = 'Dipinjam'
    dokumenList[0]['peminjam'] = 'admin'

    res = client.post('/api/berkas/update-isi', headers=hdrs, json={
        'no_berkas': 'B-002',
        'isi_berkas': dokumenList,
        'log_action': 'Pinjam',
        'log_desc': 'Dipinjam admin'
    })
    assert res.status_code == 200

    # 4. Cek API dipinjam
    res = client.get('/api/sirkulasi/dipinjam?page=1&limit=10', headers=hdrs)
    dipinjam = res.get_json()['data']
    assert len(dipinjam) == 1
    assert dipinjam[0]['no_berkas'] == 'B-002'

def test_dashboard_stats(client, superuser_token):
    hdrs = {'Authorization': f'Bearer {superuser_token}'}
    res = client.get('/api/dashboard', headers=hdrs)
    assert res.status_code == 200
    data = res.get_json()
    assert 'total_rumah' in data
    assert 'dipinjam' in data
    assert 'activities' in data

def test_user_cannot_access_admin_endpoints(client, user_token):
    hdrs = {'Authorization': f'Bearer {user_token}'}
    
    # 1. Coba daftar user baru (khusus superuser)
    res = client.post('/api/register', headers=hdrs, json={
        'username': 'hacker',
        'password': 'password123',
        'role': 'petugas'
    })
    assert res.status_code == 403
    
    # 2. Coba lihat daftar user (khusus superuser)
    res = client.get('/api/users', headers=hdrs)
    assert res.status_code == 403
    
    # 3. Coba unduh backup database (khusus superuser)
    res = client.get('/api/export-db', headers=hdrs)
    assert res.status_code == 403

def test_path_traversal_prevention(client, superuser_token):
    hdrs = {'Authorization': f'Bearer {superuser_token}'}
    
    # Cobalah melakukan path traversal untuk mengakses berkas di luar uploads/
    res = client.get('/api/files/../instance/load_test.db', headers=hdrs)
    assert res.status_code in [404, 400]
    
    res = client.get('/api/files/../../app.py', headers=hdrs)
    assert res.status_code in [404, 400]
    
    res = client.get('/api/files/%2e%2e%2f%2e%2e%2fapp.py', headers=hdrs)
    assert res.status_code in [404, 400]
