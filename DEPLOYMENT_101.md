# 🚀 DEPLOYMENT 101: APLIKASI GUDANG

Panduan praktis langkah demi langkah untuk menginstal dan menjalankan **Aplikasi Gudang** di server baru.

---

## 📋 Persyaratan Sistem Server (Prerequisites)
Pastikan server Anda sudah terinstal perangkat lunak berikut:
1. **Python** (Minimal versi 3.9+)
2. **Node.js** (Minimal versi 18+) & **npm**
3. **Git**

---

## 🛠️ Langkah 1: Kloning & Persiapan Repositori
Jalankan perintah ini di terminal server Anda untuk mengunduh kode aplikasi:
```bash
git clone <url-github-anda>
cd aplikasi-gudang
```

---

## 🐍 Langkah 2: Setup Backend (Python Flask)
Aplikasi ini menggunakan Python Flask sebagai mesin utamanya. Kita akan membuat *Virtual Environment* agar server tetap bersih.

1. **Buat Virtual Environment baru:**
```bash
python -m venv venv
```

2. **Aktifkan Virtual Environment:**
- Di Windows: `venv\Scripts\activate`
- Di Linux/Mac: `source venv/bin/activate`

3. **Install semua dependensi (requirements):**
```bash
pip install -r requirements.txt
```

4. **Siapkan File .env:**
- Buat file `.env` di folder root (sejajar dengan `app.py`).
- Isi file tersebut dengan konfigurasi wajib berikut:
```ini
FLASK_SECRET_KEY=ganti_dengan_kode_rahasia_anda_yang_sangat_panjang
JWT_SECRET_KEY=ganti_dengan_kode_rahasia_jwt_anda
```

5. **Jalankan Inisialisasi Database Pertama Kali:**
```bash
python init_db.py
```
*(Perintah ini akan membuat `database.db` dan membuat akun Superuser bawaan jika diatur dalam script)*

6. **Jalankan Server Backend (Development Mode):**
```bash
python app.py
```
*Backend sekarang berjalan di `http://localhost:5000` atau `http://127.0.0.1:5000`.*

---

## ⚛️ Langkah 3: Setup Frontend (React Vite)
Buka tab terminal baru (biarkan terminal backend tetap berjalan).

1. **Masuk ke folder frontend:**
```bash
cd frontend
```

2. **Install dependensi Node.js:**
```bash
npm install
```

3. **Siapkan File .env Frontend:**
- Buat file `.env` di dalam folder `frontend/`.
- Isi dengan URL tempat backend Anda berjalan:
```ini
VITE_API_URL=http://localhost:5000
```
*(Catatan: Jika backend di-*deploy* ke domain publik, ganti URL di atas dengan domain publik tersebut).*

4. **Build Frontend (Khusus Production/Server Asli):**
```bash
npm run build
```
*(Ini akan menghasilkan folder `dist/` yang berisi file statis siap dilayani oleh Nginx/Apache)*

**Atau untuk Testing/Development:**
```bash
npm run dev
```

---

## 🌐 Langkah 4: Deployment Produksi (Opsional tapi Direkomendasikan)
Untuk performa server produksi (live server), jangan gunakan `python app.py` dan `npm run dev`.
Gunakan **Gunicorn** (Linux) atau **Waitress** (Windows) untuk backend, dan **Nginx/Apache** untuk frontend.

**Contoh Menjalankan dengan Waitress (Windows/Linux):**
```bash
waitress-serve --port=5000 app:app
```

**Contoh Menjalankan dengan Gunicorn (Hanya Linux):**
```bash
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

Selesai! Aplikasi Gudang Anda sudah siap melayani Wajib Pajak di server baru! 🎉
