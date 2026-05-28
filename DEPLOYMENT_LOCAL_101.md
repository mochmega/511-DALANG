# 🏢 DEPLOYMENT LOCAL (INTRANET) 101: APLIKASI GUDANG

Panduan ini ditujukan **KHUSUS** jika Anda ingin menginstal aplikasi ini pada **1 Komputer Utama (Server)** di kantor, agar bisa diakses oleh **Komputer-komputer Lain (Client)** yang terhubung dalam satu jaringan Wi-Fi atau kabel LAN yang sama (Intranet).

Panduan ini menggunakan sistem operasi Windows sebagai contoh Server.

---

## 🛑 TAHAP 1: Mengetahui IP Address Komputer Server
Agar komputer lain bisa memanggil aplikasi Anda, Anda harus tahu "Alamat" komputer server Anda.
1. Di komputer Server, klik Start, ketik **CMD** (Command Prompt), lalu buka.
2. Ketik perintah berikut dan tekan Enter:
   ```cmd
   ipconfig
   ```
3. Cari baris bertuliskan **IPv4 Address**.
4. Catat angkanya. (Misalnya: `192.168.1.150`). Ini adalah **IP Server Anda**.

---

## 🐍 TAHAP 2: Konfigurasi Backend (Database & API)
Buka terminal/CMD, arahkan ke folder proyek `APLIKASI GUDANG`.

1. **Buat & Aktifkan Virtual Environment:**
   ```cmd
   python -m venv venv
   venv\Scripts\activate
   ```
2. **Install semua kebutuhan aplikasi:**
   ```cmd
   pip install -r requirements.txt
   ```
3. **Install *Waitress*:** (Mesin server backend khusus Windows yang kuat untuk produksi)
   ```cmd
   pip install waitress
   ```
4. **Siapkan Konfigurasi:**
   Buat file `.env` di folder utama aplikasi, isi dengan:
   ```ini
   FLASK_SECRET_KEY=kunci_rahasia_anda_disini_bebas
   JWT_SECRET_KEY=kunci_jwt_anda_disini_bebas
   ```
5. **Buat Database Awal:**
   ```cmd
   python init_db.py
   ```

---

## ⚛️ TAHAP 3: Konfigurasi Frontend (Tampilan UI)
Buka tab CMD baru.

1. **Masuk ke folder frontend:**
   ```cmd
   cd frontend
   ```
2. **Install dependensi Node.js:**
   ```cmd
   npm install
   ```
3. **KONEKSIKAN FRONTEND KE BACKEND (SANGAT PENTING!):**
   Buat file bernama `.env` di dalam folder `frontend`. Isi dengan alamat IP Server Anda ditambah port `5000`.
   *(Ganti angka IP di bawah ini dengan IP yang Anda catat di Tahap 1)*
   ```ini
   VITE_API_URL=http://192.168.1.150:5000
   ```
4. **Bangun (Build) Tampilan menjadi Produksi:**
   ```cmd
   npm run build
   ```
   *(Proses ini akan membungkus aplikasi Anda menjadi HTML/CSS biasa di dalam folder `frontend/dist`)*

---

## 🚀 TAHAP 4: Menjalankan Server secara Permanen (Background)
Agar Anda tidak perlu repot membuka CMD terus-menerus setiap kali komputer dinyalakan, kita akan menggunakan **PM2**.

1. **Install PM2 dan Serve:** (Buka CMD baru)
   ```cmd
   npm install -g pm2 serve
   ```

2. **Jalankan Backend (API):**
   Kembali ke folder utama aplikasi (tempat `app.py` berada), jalankan perintah ini:
   ```cmd
   pm2 start venv\Scripts\waitress-serve.exe --name "backend-gudang" -- --port=5000 --host=0.0.0.0 app:app
   ```
   *(Penjelasan: `--host=0.0.0.0` artinya backend Anda mengizinkan koneksi dari luar/komputer lain)*

3. **Jalankan Frontend (Tampilan):**
   Masuk ke folder `frontend`, lalu jalankan:
   ```cmd
   pm2 start serve --name "frontend-gudang" -- -s dist -l 3000
   ```

4. **Simpan Konfigurasi PM2:**
   Ketik perintah ini agar PM2 mengingat aplikasi Anda saat server direstart:
   ```cmd
   pm2 save
   ```

---

## 🛡️ TAHAP 5: Buka Jalur Firewall Windows
Secara default, Windows akan memblokir komputer lain yang mencoba masuk. Anda harus membukanya.
1. Klik Start Windows, cari **"Windows Defender Firewall"**.
2. Klik **"Advanced settings"** di menu sebelah kiri.
3. Klik **"Inbound Rules"**, lalu klik **"New Rule..."** di kanan.
4. Pilih **Port**, lalu klik Next.
5. Masukkan **Specific local ports**: `3000, 5000`, lalu Next.
6. Pilih **Allow the connection**, klik Next, Next lagi.
7. Beri nama: **Aplikasi Gudang Intranet**, lalu klik Finish.

---

## 🎉 TAHAP 6: Cara Mengakses dari Komputer Client (Pekerja)
Selesai! Komputer Server Anda sekarang sudah memancarkan Aplikasi Gudang ke seluruh jaringan.

Bagi pengguna/pekerja lain, mereka tidak perlu menginstal apa pun! 
Mereka hanya perlu membuka browser (Chrome/Edge) di komputer/laptop mereka masing-masing, dan mengetik alamat URL Server Anda dengan Port `3000`.

**Contoh URL yang diakses dari komputer lain:**
```url
http://192.168.1.150:3000
```
*(Ganti dengan IP asli komputer server Anda)*

Jika halaman Login muncul, selamat! Aplikasi Gudang Intranet Anda berhasil beroperasi secara penuh! 🥳
