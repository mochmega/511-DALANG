"""
Load Test Suite — 511-DALANG
=============================
Cara jalankan:
  locust -f tests/locustfile.py --host=http://localhost:5000

Buka browser: http://localhost:8089
Lalu set:
  - Number of users: mulai dari 20, naik ke 50, 100
  - Spawn rate: 5 (tambah 5 user/detik)
  - Duration: 5 menit per skenario

Atau headless (tanpa UI):
  locust -f tests/locustfile.py --host=http://localhost:5000 \
    --users=50 --spawn-rate=5 --run-time=5m --headless \
    --html=tests/load_report.html
"""

import random
import string
from locust import HttpUser, task, between, events
from locust.runners import MasterRunner

# ============================================================
# KONFIGURASI
# ============================================================
ADMIN_USER = "admin"
ADMIN_PASS = "admin"

# Data berkas untuk skenario search (sesuaikan dengan data di DB kamu)
SAMPLE_SEARCH_TERMS = ["PT", "CV", "UD", "JAYA", "MAKMUR", "SEJAHTERA"]
SAMPLE_NO_BERKAS = [str(i) for i in range(1, 50)]  # nomor 1-49


# ============================================================
# USER KELAS 1: SUPERUSER / ADMIN
# Skenario: Kelola data, export, monitoring
# ============================================================
class SuperuserBehavior(HttpUser):
    """
    Simulasi Superuser/Admin.
    Wait time 3-8 detik — admin biasanya berpikir lebih lama.
    """
    weight = 1  # 1 superuser per 10 petugas
    wait_time = between(3, 8)
    token = None

    def on_start(self):
        """Login sekali di awal, simpan token."""
        random_ip = f"{random.randint(1,254)}.{random.randint(1,254)}.{random.randint(1,254)}.{random.randint(1,254)}"
        res = self.client.post("/api/login", json={
            "username": "admin123",
            "password": "admin123"
        }, headers={"X-Forwarded-For": random_ip})
        if res.status_code == 200:
            self.token = res.json().get("token")
        else:
            self.token = None

    def auth_headers(self):
        # Simulasikan IP klien acak untuk pengujian multi-IP / bypass rate limiter lokal
        random_ip = f"{random.randint(1,254)}.{random.randint(1,254)}.{random.randint(1,254)}.{random.randint(1,254)}"
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
            "X-Forwarded-For": random_ip
        }

    @task(3)
    def view_dashboard(self):
        """Dashboard — paling sering dibuka."""
        self.client.get("/api/dashboard", headers=self.auth_headers(),
                        name="[Admin] GET /api/dashboard")

    @task(2)
    def view_statistik(self):
        self.client.get("/api/statistik", headers=self.auth_headers(),
                        name="[Admin] GET /api/statistik")

    @task(2)
    def view_log(self):
        self.client.get("/api/log?page=1&limit=50", headers=self.auth_headers(),
                        name="[Admin] GET /api/log")

    @task(1)
    def view_server_storage(self):
        """Cek kapasitas disk — endpoint berat."""
        self.client.get("/api/server/storage", headers=self.auth_headers(),
                        name="[Admin] GET /api/server/storage")

    @task(1)
    def export_csv(self):
        """
        ⚠️ ENDPOINT PALING BERAT — Load semua data + parse JSON.
        Jalankan dengan weight rendah untuk simulasi realistic.
        """
        with self.client.get(
            "/api/export/csv",
            headers=self.auth_headers(),
            name="[Admin] GET /api/export/csv",
            catch_response=True
        ) as res:
            if res.status_code == 200:
                # Catat ukuran response untuk monitoring
                size_kb = len(res.content) / 1024
                if size_kb > 5000:  # > 5MB, tandai sebagai warning
                    res.failure(f"Response terlalu besar: {size_kb:.0f} KB")
                else:
                    res.success()
            else:
                res.failure(f"Export gagal: {res.status_code}")

    @task(1)
    def validate_token(self):
        """Simulasi refresh halaman."""
        self.client.get("/api/validate-token", headers=self.auth_headers(),
                        name="[Admin] GET /api/validate-token")


# ============================================================
# USER KELAS 2: PETUGAS
# Skenario: Search, edit dokumen, registrasi berkas
# ============================================================
class PetugasBehavior(HttpUser):
    """
    Simulasi Petugas — user terbanyak di sistem.
    Wait time 2-5 detik — workflow aktif.
    """
    weight = 5  # 5 petugas per 1 admin
    wait_time = between(2, 5)
    token = None
    username = None

    def on_start(self):
        """Login dengan salah satu dari 8 akun petugas secara acak."""
        random_ip = f"{random.randint(1,254)}.{random.randint(1,254)}.{random.randint(1,254)}.{random.randint(1,254)}"
        self.username = f"petugas{random.randint(1, 8)}"
        res = self.client.post("/api/login", json={
            "username": self.username,
            "password": "petugas123"
        }, headers={"X-Forwarded-For": random_ip})
        if res.status_code == 200:
            self.token = res.json().get("token")

    def auth_headers(self):
        # Simulasikan IP klien acak untuk pengujian multi-IP / bypass rate limiter lokal
        random_ip = f"{random.randint(1,254)}.{random.randint(1,254)}.{random.randint(1,254)}.{random.randint(1,254)}"
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
            "X-Forwarded-For": random_ip
        }

    @task(5)
    def search_berkas_by_nama(self):
        """Pencarian berkas — task paling sering."""
        term = random.choice(SAMPLE_SEARCH_TERMS)
        self.client.get(
            f"/api/berkas?search={term}&by=nama&page=1&limit=20",
            headers=self.auth_headers(),
            name="[Petugas] GET /api/berkas (search nama)"
        )

    @task(3)
    def search_berkas_by_no(self):
        """Cari berkas by nomor."""
        no = random.choice(SAMPLE_NO_BERKAS)
        self.client.get(
            f"/api/berkas?search={no}&by=no_berkas&page=1&limit=10",
            headers=self.auth_headers(),
            name="[Petugas] GET /api/berkas (search no)"
        )

    @task(3)
    def cari_dokumen(self):
        """Pencarian dokumen cross-berkas."""
        term = random.choice(SAMPLE_SEARCH_TERMS)
        self.client.get(
            f"/api/dokumen/cari?q={term}&page=1",
            headers=self.auth_headers(),
            name="[Petugas] GET /api/dokumen/cari"
        )

    @task(2)
    def lihat_sirkulasi(self):
        """Cek daftar dokumen dipinjam."""
        self.client.get(
            "/api/sirkulasi/dipinjam?page=1&limit=20",
            headers=self.auth_headers(),
            name="[Petugas] GET /api/sirkulasi/dipinjam"
        )

    @task(2)
    def update_isi_berkas(self):
        """
        Update dokumen di berkas — WRITE operation.
        Ini yang akan stress test SQLite write lock.
        """
        no = random.choice(SAMPLE_NO_BERKAS)
        dokumen_list = [
            {
                "nama": f"Dokumen Load Test {random.randint(1, 100)}",
                "nomor": f"LT-{random.randint(1000, 9999)}",
                "jenis": random.choice(["SPT", "NPWP", "SKT", "Surat"]),
                "tahun": str(random.choice([2022, 2023, 2024, 2025])),
                "tanggal": "2024-01-01",
                "pemilik": "Load Test",
                "wadah": no,
                "status": random.choice(["Di Gudang", "Dipinjam"]),
                "peminjam": "Petugas Test" if random.random() > 0.7 else "",
                "tanggal_pinjam": "2025-01-01" if random.random() > 0.7 else "",
                "tanggal_kembali": "",
                "keperluan": "Load Test",
                "file_scan": "",
                "batas_kembali": ""
            }
            for _ in range(random.randint(1, 5))
        ]
        with self.client.post(
            "/api/berkas/update-isi",
            headers=self.auth_headers(),
            json={
                "no_berkas": no,
                "isi_berkas": dokumen_list,
                "log_action": "Load Test",
                "log_desc": f"Load test update berkas {no}"
            },
            name="[Petugas] POST /api/berkas/update-isi",
            catch_response=True
        ) as res:
            if res.status_code in (200, 404):
                # 404 = berkas tidak ada, itu valid dalam load test
                res.success()
            else:
                res.failure(f"Unexpected: {res.status_code}")

    @task(1)
    def saran_nomor(self):
        """Cek saran nomor berkas baru."""
        self.client.get(
            "/api/registrasi/saran-nomor",
            headers=self.auth_headers(),
            name="[Petugas] GET /api/registrasi/saran-nomor"
        )

    @task(1)
    def registrasi_berkas(self):
        """
        Registrasi berkas baru — write concurrent ke SQLite.
        Pakai nama random untuk hindari duplicate.
        """
        suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        no_berkas = f"LT-{suffix}"
        with self.client.post(
            "/api/registrasi",
            headers=self.auth_headers(),
            json={
                "no_berkas": no_berkas,
                "nama": f"PT LOAD TEST {suffix}",
                "npwp": f"{random.randint(10**14, 10**15 - 1)}",
                "npwp_16": f"{random.randint(10**15, 10**16 - 1)}"
            },
            name="[Petugas] POST /api/registrasi",
            catch_response=True
        ) as res:
            if res.status_code == 200:
                res.success()
            elif res.status_code == 400:
                # Duplicate atau validasi gagal — masih valid
                res.success()
            else:
                res.failure(f"Registrasi error: {res.status_code}")

    @task(1)
    def view_dashboard(self):
        self.client.get("/api/dashboard", headers=self.auth_headers(),
                        name="[Petugas] GET /api/dashboard")


# ============================================================
# USER KELAS 3: USER BIASA (Read-only)
# Skenario: Search dan lihat dokumen saja
# ============================================================
class UserBiasaBehavior(HttpUser):
    """
    Simulasi User biasa — read-only, paling banyak.
    Wait time 5-15 detik — lebih pasif.
    """
    weight = 3  # 3 user biasa per 1 admin
    wait_time = between(5, 15)
    token = None

    def on_start(self):
        """Login dengan salah satu dari 50 akun user secara acak."""
        random_ip = f"{random.randint(1,254)}.{random.randint(1,254)}.{random.randint(1,254)}.{random.randint(1,254)}"
        self.username = f"user{random.randint(1, 50)}"
        res = self.client.post("/api/login", json={
            "username": self.username,
            "password": "user123"
        }, headers={"X-Forwarded-For": random_ip})
        if res.status_code == 200:
            self.token = res.json().get("token")

    def auth_headers(self):
        # Simulasikan IP klien acak untuk pengujian multi-IP / bypass rate limiter lokal
        random_ip = f"{random.randint(1,254)}.{random.randint(1,254)}.{random.randint(1,254)}.{random.randint(1,254)}"
        return {
            "Authorization": f"Bearer {self.token}",
            "X-Forwarded-For": random_ip
        }

    @task(5)
    def search_berkas(self):
        term = random.choice(SAMPLE_SEARCH_TERMS)
        page = random.randint(1, 3)
        self.client.get(
            f"/api/berkas?search={term}&by=nama&page={page}&limit=20",
            headers=self.auth_headers(),
            name="[User] GET /api/berkas"
        )

    @task(3)
    def cari_dokumen(self):
        term = random.choice(SAMPLE_SEARCH_TERMS)
        self.client.get(
            f"/api/dokumen/cari?q={term}&page=1",
            headers=self.auth_headers(),
            name="[User] GET /api/dokumen/cari"
        )

    @task(2)
    def dashboard(self):
        self.client.get("/api/dashboard", headers=self.auth_headers(),
                        name="[User] GET /api/dashboard")

    @task(1)
    def pagination_test(self):
        """Test pagination di berbagai halaman."""
        page = random.randint(1, 20)
        self.client.get(
            f"/api/berkas?search=&by=all&page={page}&limit=10",
            headers=self.auth_headers(),
            name="[User] GET /api/berkas (pagination)"
        )


# ============================================================
# EVENT HOOKS — Custom reporting
# ============================================================
@events.request.add_listener
def on_request(request_type, name, response_time, response_length,
               exception, context, **kwargs):
    """Tandai request lambat (> 2 detik) sebagai warning di log."""
    if response_time > 2000 and exception is None:
        print(f"⚠️  SLOW REQUEST: {name} — {response_time:.0f}ms")


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    print("\n" + "="*60)
    print("🚀 511-DALANG Load Test Dimulai")
    print("="*60)
    print("Target: http://localhost:5000")
    print("Skenario:")
    print("  - SuperuserBehavior (weight 1): Dashboard, Export CSV, Storage")
    print("  - PetugasBehavior   (weight 5): Search, Update, Registrasi")
    print("  - UserBiasaBehavior (weight 3): Search, Dashboard (read-only)")
    print("="*60 + "\n")


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    stats = environment.stats
    total = stats.total
    print("\n" + "="*60)
    print("📊 RINGKASAN LOAD TEST 511-DALANG")
    print("="*60)
    print(f"  Total Requests   : {total.num_requests}")
    print(f"  Total Failures   : {total.num_failures}")
    print(f"  Average Response : {total.avg_response_time:.0f} ms")
    print("="*60 + "\n")