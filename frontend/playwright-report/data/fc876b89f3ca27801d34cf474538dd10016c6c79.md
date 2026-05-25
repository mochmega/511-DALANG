# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e.spec.js >> E2E Testing - APLIKASI GUDANG >> Skenario 3: Navigasi ke Pencarian dan Cari Dokumen
- Location: tests\e2e.spec.js:50:3

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /.*\/dashboard/
Received string:  "http://localhost:5173/"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    6 × unexpected value "http://localhost:5173/login"
    7 × unexpected value "http://localhost:5173/"

```

```yaml
- complementary:
  - img "Logo 511 Dalang"
  - heading "511 DALANG" [level=1]
  - navigation:
    - link "Dashboard":
      - /url: /
      - img
      - text: Dashboard
    - link "Pencarian Berkas":
      - /url: /pencarian
      - img
      - text: Pencarian Berkas
    - link "Cari Dokumen":
      - /url: /cari-dokumen
      - img
      - text: Cari Dokumen
    - link "Sirkulasi":
      - /url: /sirkulasi
      - img
      - text: Sirkulasi
    - link "Mutasi":
      - /url: /mutasi
      - img
      - text: Mutasi
    - link "Registrasi":
      - /url: /registrasi
      - img
      - text: Registrasi
    - link "Log Aktivitas":
      - /url: /log
      - img
      - text: Log Aktivitas
    - link "Pengaturan":
      - /url: /pengaturan
      - img
      - text: Pengaturan
  - text: ad
  - paragraph: admin123
  - paragraph: superuser
  - button "Keluar":
    - img
- banner:
  - button:
    - img
  - text: APLIKASI GUDANG BELAKANG
  - button "Toggle Terang/Gelap":
    - img
- main:
  - heading "🏛️ Dashboard 511 DALANG" [level=2]
  - paragraph: Ringkasan status penyimpanan berkas di gudang saat ini.
  - text: 📦
  - heading "Total Rumah Berkas" [level=3]
  - text: "1497"
  - paragraph: 🟢 Rumah Berkas Aktif di Rak
  - text: 🚨
  - heading "Sedang Dipinjam" [level=3]
  - text: "0"
  - paragraph: 🔴 Dokumen di Luar Gudang
  - text: ⚠️
  - heading "Terlambat Kembali" [level=3]
  - text: "0"
  - heading "🏆 Top 5 WP (Dipinjam)" [level=3]
  - text: Belum ada data WP terkait.
  - heading "⚡ Aktivitas Terkini" [level=3]
  - text: 🛒
  - heading "Dokumen AKTA PENDIRIAN dihapus dari rumah berkas 1" [level=4]
  - paragraph: Oleh 817933288 • 25/5/2026, 07.26.21
  - text: ⇄ Mutasi 🔄
  - heading "Dokumen AKTA PENDIRIAN dikembalikan ke rak" [level=4]
  - paragraph: Oleh 817933288 • 25/5/2026, 07.26.12
  - text: + Kembali 🔄
  - heading "Pengajuan pinjam dokumen AKTA PENDIRIAN diverifikasi petugas" [level=4]
  - paragraph: Oleh 817933288 • 25/5/2026, 07.25.41
  - text: "- Keluar 🔄"
  - heading "Dokumen AKTA PENDIRIAN diajukan pinjam oleh 830103154" [level=4]
  - paragraph: Oleh 830103154 • 25/5/2026, 07.25.20
  - text: "- Keluar 📝"
  - 'heading "Menambahkan dokumen baru: AKTA PENDIRIAN" [level=4]'
  - paragraph: Oleh 817933288 • 25/5/2026, 07.24.33
  - text: Penambahan
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('E2E Testing - APLIKASI GUDANG', () => {
  4  |   const baseURL = 'http://localhost:5173';
  5  | 
  6  |   test('Skenario 1: Login Berhasil & Masuk Dasbor', async ({ page }) => {
  7  |     await page.goto(baseURL);
  8  |     
  9  |     const usernameInput = page.locator('input[type="text"]');
  10 |     await usernameInput.waitFor({ state: 'visible' });
  11 | 
  12 |     // Masukkan kredensial
  13 |     await usernameInput.fill('admin123');
  14 |     await page.locator('input[type="password"]').fill('admin123');
  15 |     
  16 |     // Klik tombol LOGIN
  17 |     await page.locator('button:has-text("LOGIN")').click();
  18 | 
  19 |     // Verifikasi redirect ke dashboard
  20 |     await expect(page).toHaveURL(/.*\/dashboard/);
  21 |     
  22 |     // Verifikasi ada teks Dashboard 511 DALANG
  23 |     await expect(page.locator('text=Dashboard 511 DALANG')).toBeVisible();
  24 |     
  25 |     // Verifikasi kartu Total Rumah Berkas muncul
  26 |     await expect(page.locator('text=Total Rumah Berkas')).toBeVisible();
  27 |   });
  28 | 
  29 |   test('Skenario 2: Beralih Tema (Mode Terang/Gelap)', async ({ page }) => {
  30 |     // Login ulang (karena konteks test baru)
  31 |     await page.goto(baseURL);
  32 |     await page.locator('input[type="text"]').fill('admin123');
  33 |     await page.locator('input[type="password"]').fill('admin123');
  34 |     await page.locator('button:has-text("LOGIN")').click();
  35 |     await expect(page).toHaveURL(/.*\/dashboard/);
  36 | 
  37 |     // Cari tombol toggle mode di sidebar
  38 |     // Di Navbar biasanya ada tombol theme, kita bisa cari berdasarkan title atau aria-label
  39 |     // Kita gunakan klik pada SVG Matahari/Bulan
  40 |     const toggleModeBtn = page.locator('button[title="Ganti Mode Terang/Gelap"], button[title="Ganti Tema"]'); // Sesuaikan selector
  41 |     if (await toggleModeBtn.count() > 0) {
  42 |         await toggleModeBtn.first().click();
  43 |         
  44 |         // Verifikasi class 'dark' dihapus/ditambah dari elemen html
  45 |         const isDark = await page.evaluate(() => document.documentElement.getAttribute('data-mode') === 'dark');
  46 |         expect(typeof isDark).toBe('boolean');
  47 |     }
  48 |   });
  49 | 
  50 |   test('Skenario 3: Navigasi ke Pencarian dan Cari Dokumen', async ({ page }) => {
  51 |     await page.goto(baseURL);
  52 |     await page.locator('input[type="text"]').fill('admin123');
  53 |     await page.locator('input[type="password"]').fill('admin123');
  54 |     await page.locator('button:has-text("LOGIN")').click();
> 55 |     await expect(page).toHaveURL(/.*\/dashboard/);
     |                        ^ Error: expect(page).toHaveURL(expected) failed
  56 | 
  57 |     // Klik menu Pencarian di Sidebar
  58 |     await page.locator('a[href="/pencarian"]').click();
  59 |     await expect(page).toHaveURL(/.*\/pencarian/);
  60 | 
  61 |     // Ketik di kolom pencarian
  62 |     // input type="text" di halaman pencarian
  63 |     const searchInput = page.locator('input[type="text"]').first();
  64 |     await searchInput.waitFor({ state: 'visible' });
  65 |     await searchInput.fill('EKS'); // Cari keyword EKS
  66 |     
  67 |     // Cari tombol "Cari Data" atau "Search" (kita tekan Enter saja di input)
  68 |     await searchInput.press('Enter');
  69 | 
  70 |     // Tunggu hasil (spinner hilang)
  71 |     await expect(page.locator('text=Mencari...')).not.toBeVisible();
  72 |   });
  73 | });
  74 | 
```