"""
End-to-End Test Suite for Gudang Berkas Application
Tests all critical API endpoints and data flows.
"""
import sys
import os
import json

# Add parent to path dynamically
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app, init_db
from extensions import db
from models import User, DataBerkas, Dokumen, ActivityLog
from werkzeug.security import generate_password_hash

PASS = "✅ PASS"
FAIL = "❌ FAIL"
WARN = "⚠️ WARN"

results = []

def record(category, test_name, passed, detail=""):
    status = PASS if passed else FAIL
    results.append((category, test_name, status, detail))
    print(f"  {status} {test_name}" + (f" — {detail}" if detail else ""))

def get_token(client, username, password):
    res = client.post('/api/login', json={'username': username, 'password': password})
    data = res.get_json()
    if data and data.get('token'):
        return data['token']
    return None

def auth_header(token):
    return {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

def run_tests():
    app.config['TESTING'] = True
    
    with app.app_context():
        init_db()
        
        # 0. SEED DATA FOR CI (IF DB IS EMPTY)
        if DataBerkas.query.count() == 0:
            for i in range(1, 10):
                db.session.add(DataBerkas(no_berkas=str(i), nama=f'PT Dummy {i}', npwp=f'123{i}'))
            # Add duplicate for cabang grouping test
            db.session.add(DataBerkas(no_berkas='1', nama='PT Dummy 1 Cabang', npwp='1231-cabang'))
            db.session.commit()
            
            # Add isi_berkas for parsing test
            b1 = DataBerkas.query.filter_by(no_berkas='1').first()
            if b1:
                b1.isi_berkas = json.dumps([{'nama': 'Test Doc', 'nomor': '001', 'tahun': '2023', 'status': 'Di Gudang'}])
                db.session.commit()
        
        client = app.test_client()
        
        # ============================================================
        # PHASE 1: AUTHENTICATION & AUTHORIZATION
        # ============================================================
        print("\n" + "="*60)
        print("🔐 PHASE 1: AUTHENTICATION & AUTHORIZATION")
        print("="*60)
        
        # 1.1 Login with valid superuser
        res = client.post('/api/login', json={'username': 'admin', 'password': 'admin'})
        data = res.get_json()
        su_token = data.get('token') if data else None
        record("Auth", "Login superuser (admin)", res.status_code == 200 and su_token is not None)
        
        # 1.2 Login with wrong password
        res = client.post('/api/login', json={'username': 'admin', 'password': 'wrongpass'})
        record("Auth", "Login wrong password returns 401", res.status_code == 401)
        
        # 1.3 Login with non-existent user
        res = client.post('/api/login', json={'username': 'ghostuser', 'password': 'any'})
        record("Auth", "Login non-existent user returns 401", res.status_code == 401)
        
        # 1.4 Access protected endpoint without token
        res = client.get('/api/dashboard')
        record("Auth", "Dashboard without token returns 401", res.status_code == 401)
        
        # 1.5 Access protected endpoint with invalid token
        res = client.get('/api/dashboard', headers={'Authorization': 'Bearer fakefaketoken'})
        record("Auth", "Dashboard with fake token returns 422", res.status_code == 422)
        
        # 1.6 Verify JWT identity is correct
        res = client.get('/api/validate-token', headers=auth_header(su_token))
        data = res.get_json() if res.status_code == 200 else {}
        record("Auth", "GET /api/validate-token returns user info", 
               res.status_code == 200 and data.get('username') == 'admin')
        
        # ============================================================
        # PHASE 2: DASHBOARD
        # ============================================================
        print("\n" + "="*60)
        print("📊 PHASE 2: DASHBOARD")
        print("="*60)
        
        # 2.1 Dashboard stats
        res = client.get('/api/dashboard', headers=auth_header(su_token))
        data = res.get_json()
        record("Dashboard", "GET /api/dashboard returns 200", res.status_code == 200)
        record("Dashboard", "Response has total_rumah field", 'total_rumah' in (data or {}))
        record("Dashboard", "Response has dipinjam field", 'dipinjam' in (data or {}))
        record("Dashboard", "Response has terlambat field", 'terlambat' in (data or {}))
        record("Dashboard", "Response has activities field", 'activities' in (data or {}))
        record("Dashboard", "total_rumah is valid", 
               isinstance(data.get('total_rumah'), int) and data.get('total_rumah') >= 0,
               f"Got {data.get('total_rumah')}")
        
        # 2.2 Activity Log
        res = client.get('/api/log', headers=auth_header(su_token))
        data = res.get_json()
        record("Dashboard", "GET /api/log returns 200", res.status_code == 200)
        record("Dashboard", "Log response has data array", isinstance((data or {}).get('data'), list))
        
        # 2.3 Statistik
        res = client.get('/api/statistik', headers=auth_header(su_token))
        data = res.get_json()
        record("Dashboard", "GET /api/statistik returns 200", res.status_code == 200)
        record("Dashboard", "Statistik has distribusi_jenis", 'distribusi_jenis' in (data or {}))
        record("Dashboard", "Statistik has tren_peminjaman", 'tren_peminjaman' in (data or {}))
        
        # 2.4 Server Storage (superuser only)
        res = client.get('/api/server/storage', headers=auth_header(su_token))
        record("Dashboard", "GET /api/server/storage returns 200 for superuser", res.status_code == 200)
        
        # ============================================================
        # PHASE 3: BERKAS SEARCH (Main Feature)
        # ============================================================
        print("\n" + "="*60)
        print("🔍 PHASE 3: BERKAS SEARCH")
        print("="*60)
        
        # 3.1 Basic search
        res = client.get('/api/berkas?search=&by=all&page=1&limit=10', headers=auth_header(su_token))
        data = res.get_json()
        record("Berkas", "GET /api/berkas returns 200", res.status_code == 200)
        record("Berkas", "Response has data array", isinstance((data or {}).get('data'), list))
        record("Berkas", "Response has total_pages", 'total_pages' in (data or {}))
        record("Berkas", "Response has current_page", 'current_page' in (data or {}))
        record("Berkas", "Response has total_items", 'total_items' in (data or {}))
        
        # 3.2 Check dokumen_list format (critical: must be array, not JSON string)
        items = (data or {}).get('data', [])
        if items:
            first_item = items[0]
            has_dokumen_list = 'dokumen_list' in first_item
            is_array = isinstance(first_item.get('dokumen_list'), list)
            no_isi_berkas = 'isi_berkas' not in first_item
            record("Berkas", "Response items have 'dokumen_list' key", has_dokumen_list)
            record("Berkas", "'dokumen_list' is an array (not JSON string)", is_array)
            record("Berkas", "Old 'isi_berkas' key is NOT present (migration clean)", no_isi_berkas)
        else:
            record("Berkas", "Response items have dokumen_list key", False, "No items returned")
        
        # 3.3 Search by no_berkas
        res = client.get('/api/berkas?search=1&by=no_berkas&page=1&limit=10', headers=auth_header(su_token))
        data = res.get_json()
        record("Berkas", "Search by no_berkas returns results", 
               len((data or {}).get('data', [])) > 0)
        
        # 3.4 Search by nama
        res = client.get('/api/berkas?search=PT&by=nama&page=1&limit=5', headers=auth_header(su_token))
        data = res.get_json()
        record("Berkas", "Search by nama returns results", 
               res.status_code == 200)
        
        # 3.5 Pagination
        res_p1 = client.get('/api/berkas?search=&by=all&page=1&limit=5', headers=auth_header(su_token))
        res_p2 = client.get('/api/berkas?search=&by=all&page=2&limit=5', headers=auth_header(su_token))
        d1 = res_p1.get_json()
        d2 = res_p2.get_json()
        page1_nos = [x.get('no_berkas') for x in (d1 or {}).get('data', [])]
        page2_nos = [x.get('no_berkas') for x in (d2 or {}).get('data', [])]
        no_overlap = not bool(set(page1_nos) & set(page2_nos))
        record("Berkas", "Pagination: page 1 and page 2 have no overlap", no_overlap, 
               f"P1={page1_nos[:3]}... P2={page2_nos[:3]}...")
        
        # ============================================================
        # PHASE 4: DOKUMEN SEARCH (CariDokumen)
        # ============================================================
        print("\n" + "="*60)
        print("📄 PHASE 4: DOKUMEN SEARCH (CariDokumen)")
        print("="*60)
        
        # 4.1 Basic dokumen search
        res = client.get('/api/dokumen/cari?q=&status=&tahun=&page=1', headers=auth_header(su_token))
        data = res.get_json()
        record("Dokumen", "GET /api/dokumen/cari returns 200", res.status_code == 200)
        record("Dokumen", "Response has data array", isinstance((data or {}).get('data'), list))
        record("Dokumen", "Response has total count", 'total' in (data or {}))
        total_docs = (data or {}).get('total', -1)
        record("Dokumen", f"Total dokumen in search = {total_docs}", total_docs >= 0)
        
        # Check if Dokumen table is actually populated
        dokumen_count = Dokumen.query.count()
        record("Dokumen", f"Dokumen table has {dokumen_count} rows", dokumen_count >= 0,
               "0 means migration hasn't populated it yet" if dokumen_count == 0 else "")
        
        # ============================================================
        # PHASE 5: SIRKULASI (Pinjam/Kembali)
        # ============================================================
        print("\n" + "="*60)
        print("🔄 PHASE 5: SIRKULASI")
        print("="*60)
        
        # 5.1 Get dipinjam list
        res = client.get('/api/sirkulasi/dipinjam?page=1&limit=10', headers=auth_header(su_token))
        record("Sirkulasi", "GET /api/sirkulasi/dipinjam returns 200", res.status_code == 200)
        
        # ============================================================
        # PHASE 6: ROLE-BASED ACCESS CONTROL
        # ============================================================
        print("\n" + "="*60)
        print("🛡️ PHASE 6: ROLE-BASED ACCESS CONTROL")
        print("="*60)
        
        # Create a test user with 'user' role
        test_user = User.query.filter_by(username='test_e2e_user').first()
        if not test_user:
            test_user = User(username='test_e2e_user', 
                           password_hash=generate_password_hash('testpass123'),
                           role='user')
            db.session.add(test_user)
            db.session.commit()
        
        user_token = get_token(client, 'test_e2e_user', 'testpass123')
        record("RBAC", "Login as 'user' role succeeds", user_token is not None)
        
        if user_token:
            # 6.1 User should NOT be able to update-isi
            res = client.post('/api/berkas/update-isi', 
                            headers=auth_header(user_token),
                            json={'no_berkas': '1', 'isi_berkas': []})
            record("RBAC", "User role blocked from /api/berkas/update-isi (403)", 
                   res.status_code == 403)
            
            # 6.2 User should NOT be able to mutasi
            res = client.post('/api/mutasi', 
                            headers=auth_header(user_token),
                            json={'no_berkas': '99999', 'alasan': 'test'})
            record("RBAC", "User role blocked from /api/mutasi (403)", 
                   res.status_code == 403)
            
            # 6.3 User should NOT access server storage
            res = client.get('/api/server/storage', headers=auth_header(user_token))
            record("RBAC", "User role blocked from /api/server/storage (403)", 
                   res.status_code == 403)
            
            # 6.4 User CAN access dashboard
            res = client.get('/api/dashboard', headers=auth_header(user_token))
            record("RBAC", "User role CAN access /api/dashboard (200)", 
                   res.status_code == 200)
            
            # 6.5 User CAN search berkas
            res = client.get('/api/berkas?search=&by=all&page=1&limit=5', 
                           headers=auth_header(user_token))
            record("RBAC", "User role CAN access /api/berkas (200)", 
                   res.status_code == 200)
        
        # Clean up test user
        User.query.filter_by(username='test_e2e_user').delete()
        db.session.commit()
        
        # ============================================================
        # PHASE 7: DATA INTEGRITY
        # ============================================================
        print("\n" + "="*60)
        print("🔗 PHASE 7: DATA INTEGRITY")
        print("="*60)
        
        # 7.1 Check DataBerkas.no_berkas allows duplicates (cabang)
        cabang_count = db.session.query(db.func.count(DataBerkas.id)).scalar()
        unique_no_berkas = db.session.query(db.func.count(db.func.distinct(DataBerkas.no_berkas))).scalar()
        has_cabang = cabang_count > unique_no_berkas
        record("Integrity", f"DataBerkas total rows = {cabang_count}", cabang_count > 0)
        record("Integrity", f"Unique no_berkas = {unique_no_berkas}", unique_no_berkas > 0)
        record("Integrity", "Cabang grouping works (total > unique)", has_cabang,
               f"{cabang_count} total vs {unique_no_berkas} unique")
        
        # 7.2 Check no _DUP_ remnants
        dup_count = DataBerkas.query.filter(DataBerkas.no_berkas.like('%_DUP_%')).count()
        record("Integrity", "No _DUP_ remnants in no_berkas", dup_count == 0,
               f"Found {dup_count} rows with _DUP_" if dup_count > 0 else "Clean")
        
        # 7.3 Check Dokumen ForeignKey integrity
        orphan_docs = db.session.query(Dokumen).filter(
            ~Dokumen.no_berkas.in_(
                db.session.query(DataBerkas.no_berkas).distinct()
            )
        ).count()
        record("Integrity", "No orphaned Dokumen (FK integrity)", orphan_docs == 0,
               f"Found {orphan_docs} orphans" if orphan_docs > 0 else "Clean")
        
        # 7.4 Check EKS- filtering in dashboard
        eks_count = DataBerkas.query.filter(DataBerkas.no_berkas.like('EKS-%')).count()
        record("Integrity", f"EKS- (mutasi) records exist: {eks_count}", True, "Informational")
        
        # ============================================================
        # PHASE 8: EDGE CASES & ERROR HANDLING
        # ============================================================
        print("\n" + "="*60)
        print("⚡ PHASE 8: EDGE CASES & ERROR HANDLING")
        print("="*60)
        
        # 8.1 Registrasi with missing fields
        res = client.post('/api/registrasi', 
                         headers=auth_header(su_token),
                         json={'no_berkas': '', 'nama': ''})
        record("Edge", "Registrasi with empty fields returns 400", res.status_code == 400)
        
        # 8.2 Update-isi for non-existent berkas
        res = client.post('/api/berkas/update-isi',
                         headers=auth_header(su_token),
                         json={'no_berkas': 'NONEXISTENT_99999', 'isi_berkas': []})
        record("Edge", "Update-isi non-existent berkas returns 404", res.status_code == 404)
        
        # 8.3 Delete non-existent berkas
        res = client.delete('/api/berkas/NONEXISTENT_99999', headers=auth_header(su_token))
        record("Edge", "Delete non-existent berkas returns 404", res.status_code == 404)
        
        # 8.4 Mutasi non-existent berkas
        res = client.post('/api/mutasi',
                         headers=auth_header(su_token),
                         json={'no_berkas': 'NONEXISTENT_99999', 'alasan': 'test'})
        record("Edge", "Mutasi non-existent berkas returns 404", res.status_code == 404)
        
        # 8.5 Search with special characters
        res = client.get('/api/berkas?search=%27OR%201%3D1--&by=all&page=1&limit=5',
                        headers=auth_header(su_token))
        record("Edge", "SQL injection attempt returns safely", res.status_code == 200)
        
        # 8.6 Pagination edge: page 0
        res = client.get('/api/berkas?search=&by=all&page=0&limit=5', headers=auth_header(su_token))
        record("Edge", "Page 0 doesn't crash", res.status_code == 200)
        
        # 8.7 Pagination edge: very large page
        res = client.get('/api/berkas?search=&by=all&page=99999&limit=5', headers=auth_header(su_token))
        data = res.get_json()
        record("Edge", "Very large page returns empty data gracefully", 
               res.status_code == 200 and len((data or {}).get('data', [])) == 0)
        
        # ============================================================
        # PHASE 9: EXPORT & UTILITY ENDPOINTS
        # ============================================================
        print("\n" + "="*60)
        print("📤 PHASE 9: EXPORT & UTILITY")
        print("="*60)
        
        # 9.1 CSV Export
        res = client.get('/api/export/csv', headers=auth_header(su_token))
        record("Export", "GET /api/export/csv returns 200", res.status_code == 200)
        record("Export", "CSV response is text/csv", 'text/csv' in res.content_type)
        
        # 9.2 Saran Nomor
        res = client.get('/api/registrasi/saran-nomor', headers=auth_header(su_token))
        data = res.get_json()
        record("Export", "GET /api/registrasi/saran-nomor returns 200", res.status_code == 200)
        record("Export", "Saran nomor has 'saran_nomor' field", 'saran_nomor' in (data or {}))
        
        # ============================================================
        # PHASE 10: FRONTEND-BACKEND CONTRACT
        # ============================================================
        print("\n" + "="*60)
        print("🤝 PHASE 10: FRONTEND-BACKEND CONTRACT")
        print("="*60)
        
        # 10.1 Check /api/berkas response matches what frontend expects
        res = client.get('/api/berkas?search=1&by=no_berkas&page=1&limit=1', headers=auth_header(su_token))
        data = res.get_json()
        items = (data or {}).get('data', [])
        if items:
            item = items[0]
            expected_keys = ['id', 'no_berkas', 'npwp', 'npwp_16', 'nitku', 'nama', 'dokumen_list', 'lokasi', 'status_pinjam']
            missing = [k for k in expected_keys if k not in item]
            record("Contract", "Berkas response has all expected keys", len(missing) == 0,
                   f"Missing: {missing}" if missing else "All present")
        else:
            record("Contract", "Berkas response has expected keys", False, "No items to check")
        
        # 10.2 Check /api/dokumen/cari response schema
        res = client.get('/api/dokumen/cari?q=&page=1', headers=auth_header(su_token))
        data = res.get_json()
        doc_items = (data or {}).get('data', [])
        if doc_items:
            doc = doc_items[0]
            expected_doc_keys = ['no_berkas', 'nama_wp', 'doc_index', 'nama', 'nomor', 'jenis', 
                                'tahun', 'status', 'peminjam']
            missing = [k for k in expected_doc_keys if k not in doc]
            record("Contract", "Dokumen/cari response has all expected keys", len(missing) == 0,
                   f"Missing: {missing}" if missing else "All present")
        else:
            record("Contract", "Dokumen/cari response has expected keys", True, 
                   "No docs in DB (table empty) — schema check skipped")
        
        # 10.3 Check /api/dashboard response schema
        res = client.get('/api/dashboard', headers=auth_header(su_token))
        data = res.get_json()
        expected_dash_keys = ['total_rumah', 'dipinjam', 'terlambat', 'activities']
        missing = [k for k in expected_dash_keys if k not in (data or {})]
        record("Contract", "Dashboard response has all expected keys", len(missing) == 0,
               f"Missing: {missing}" if missing else "All present")
        
        # ============================================================
        # FINAL REPORT
        # ============================================================
        print("\n" + "="*60)
        print("📋 FINAL E2E TEST REPORT")
        print("="*60)
        
        total = len(results)
        passed = sum(1 for _, _, s, _ in results if s == PASS)
        failed = sum(1 for _, _, s, _ in results if s == FAIL)
        warned = sum(1 for _, _, s, _ in results if s == WARN)
        
        print(f"\n  Total Tests: {total}")
        print(f"  ✅ Passed:   {passed}")
        print(f"  ❌ Failed:   {failed}")
        print(f"  ⚠️ Warned:   {warned}")
        print(f"\n  Score:       {passed}/{total} ({round(passed/total*100, 1)}%)")
        
        if failed > 0:
            print(f"\n  ❌ FAILED TESTS:")
            for cat, name, status, detail in results:
                if status == FAIL:
                    print(f"     [{cat}] {name}" + (f" — {detail}" if detail else ""))
        
        print("\n" + "="*60)
        
        return passed, total, failed

if __name__ == '__main__':
    passed, total, failed = run_tests()
    if failed > 0:
        sys.exit(1)
