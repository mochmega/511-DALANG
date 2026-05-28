# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e.spec.js >> E2E Testing - APLIKASI GUDANG (All Roles & All Actions) >> Skenario 6: Petugas - Cari Berkas & Tambah Dokumen Baru
- Location: tests\e2e.spec.js:183:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('input[placeholder="Cth: Akta Pendirian"]')
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('input[placeholder="Cth: Akta Pendirian"]')

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
  - text: pe
  - paragraph: petugas_e2e
  - paragraph: petugas
  - button "Keluar":
    - img
- banner:
  - button:
    - img
  - text: APLIKASI GUDANG BELAKANG
  - button "Toggle Terang/Gelap":
    - img
- main:
  - heading "⚙️ Pengaturan Sistem" [level=2]
  - button "Profil & Keamanan"
  - button "Tampilan"
  - heading "Akun & Keamanan" [level=3]
  - text: Username
  - textbox [disabled]: petugas_e2e
  - text: Role
  - textbox [disabled]: petugas
  - separator
  - heading "Ganti Password" [level=4]
  - textbox "Password Lama"
  - textbox "Password Baru (min. 6 karakter)"
  - button "Simpan Password"
```

# Test source

```ts
  113 |     await page.locator('input[type="password"]').fill('admin123');
  114 |     await page.locator('button:has-text("LOGIN")').click();
  115 |     
  116 |     // Wait until logged in and dashboard renders
  117 |     await expect(page.locator('text=Dashboard 511 DALANG')).toBeVisible({ timeout: 10000 });
  118 | 
  119 |     await page.goto(baseURL + '/pengaturan');
  120 |     
  121 |     // Verify server storage tab is visible & click it
  122 |     await page.locator('button:has-text("🖥️ Server")').click();
  123 |     await expect(page.locator('text=disk sistem')).toBeVisible({ timeout: 10000 });
  124 |     await expect(page.locator('text=Rincian Data Aplikasi')).toBeVisible();
  125 | 
  126 |     // Trigger backup DB download
  127 |     await page.locator('button:has-text("Tampilan")').click();
  128 |     const downloadPromise = page.waitForEvent('download');
  129 |     await page.locator('button:has-text("Unduh Backup (.zip)")').click();
  130 |     const download = await downloadPromise;
  131 |     expect(download.suggestedFilename()).toContain('.zip');
  132 |   });
  133 | 
  134 |   test('Skenario 4: Superuser - Registrasi Rumah Berkas Satuan Baru', async ({ page }) => {
  135 |     await page.goto(baseURL);
  136 |     await page.locator('input[type="text"]').fill('admin123');
  137 |     await page.locator('input[type="password"]').fill('admin123');
  138 |     await page.locator('button:has-text("LOGIN")').click();
  139 |     
  140 |     // Wait until logged in and dashboard renders
  141 |     await expect(page.locator('text=Dashboard 511 DALANG')).toBeVisible({ timeout: 10000 });
  142 | 
  143 |     await page.goto(baseURL + '/registrasi');
  144 |     await expect(page).toHaveURL(/.*\/registrasi/);
  145 |     
  146 |     // Wait for auto-fill recommendation to load
  147 |     const noBerkasInput = page.locator('input[name="no_berkas"]');
  148 |     await expect(noBerkasInput).not.toHaveValue('', { timeout: 10000 });
  149 |     
  150 |     // Fill specific known number to guarantee uniqueness
  151 |     await noBerkasInput.fill('9999');
  152 |     
  153 |     await page.locator('input[name="nama"]').fill('PT SUPERUSER CORP');
  154 |     await page.locator('input[name="npwp"]').fill('12.345.678.9-012.000');
  155 |     await page.locator('input[name="npwp_16"]').fill('8888888888888888');
  156 |     
  157 |     await page.locator('button:has-text("REGISTRASI WP BARU")').click();
  158 |     
  159 |     const alertOke = page.locator('button:has-text("Oke")');
  160 |     await expect(alertOke).toBeVisible({ timeout: 10000 });
  161 |     await alertOke.click({ force: true });
  162 |   });
  163 | 
  164 |   // 👮 PART 2: PETUGAS ROLE (petugas_e2e)
  165 | 
  166 |   test('Skenario 5: Petugas - RBAC Access Blocks', async ({ page }) => {
  167 |     await page.goto(baseURL);
  168 |     await page.locator('input[type="text"]').fill('petugas_e2e');
  169 |     await page.locator('input[type="password"]').fill('password123');
  170 |     await page.locator('button:has-text("LOGIN")').click();
  171 |     
  172 |     // Wait until logged in and dashboard renders
  173 |     await expect(page.locator('text=Dashboard 511 DALANG')).toBeVisible({ timeout: 10000 });
  174 |     await expect(page).toHaveURL(baseURL + '/');
  175 | 
  176 |     await page.goto(baseURL + '/pengaturan');
  177 |     
  178 |     // Verify that "Manajemen User" and "🖥️ Server" tabs are NOT visible
  179 |     await expect(page.locator('button:has-text("Manajemen User")')).not.toBeVisible();
  180 |     await expect(page.locator('button:has-text("🖥️ Server")')).not.toBeVisible();
  181 |   });
  182 | 
  183 |   test('Skenario 6: Petugas - Cari Berkas & Tambah Dokumen Baru', async ({ page }) => {
  184 |     await page.goto(baseURL);
  185 |     await page.locator('input[type="text"]').fill('petugas_e2e');
  186 |     await page.locator('input[type="password"]').fill('password123');
  187 |     await page.locator('button:has-text("LOGIN")').click();
  188 |     
  189 |     // Wait until logged in and dashboard renders
  190 |     await expect(page.locator('text=Dashboard 511 DALANG')).toBeVisible({ timeout: 10000 });
  191 | 
  192 |     await page.goto(baseURL + '/pencarian');
  193 |     
  194 |     // Search for PT SUPERUSER CORP
  195 |     const searchInput = page.locator('input[type="text"]').first();
  196 |     await searchInput.fill('PT SUPERUSER CORP');
  197 |     await searchInput.press('Enter');
  198 |     await page.waitForTimeout(1000);
  199 | 
  200 |     // Click Lihat Isi (with force to bypass stacking sidebar overlay checks)
  201 |     const lihatIsiBtn = page.locator('button:has-text("Lihat Isi")').first();
  202 |     await expect(lihatIsiBtn).toBeVisible({ timeout: 5000 });
  203 |     await lihatIsiBtn.click({ force: true });
  204 | 
  205 |     // Click Tambah Dokumen (with force to bypass stacking sidebar overlay checks)
  206 |     const tambahDokumenBtn = page.locator('button:has-text("➕ Tambah Dokumen")');
  207 |     await expect(tambahDokumenBtn).toBeVisible({ timeout: 5000 });
  208 |     await tambahDokumenBtn.click({ force: true });
  209 |     
  210 |     // Fill Document form
  211 |     const namaInput = page.locator('input[placeholder="Cth: Akta Pendirian"]');
  212 |     try {
> 213 |       await expect(namaInput).toBeVisible({ timeout: 10000 });
      |                               ^ Error: expect(locator).toBeVisible() failed
  214 |     } catch (err) {
  215 |       console.log("PLAYWRIGHT DEBUG: Element 'Cth: Akta Pendirian' not visible! Page HTML:");
  216 |       console.log(await page.content());
  217 |       throw err;
  218 |     }
  219 |     await namaInput.fill('AKTA PENDIRIAN');
  220 |     await page.locator('input[placeholder="Cth: 123/IX/2023"]').fill('SIUP/777/2026');
  221 |     await page.locator('input[placeholder="Cth: Akta, SPT..."]').fill('AKTA');
  222 |     await page.locator('input[placeholder="2023"]').fill('2026');
  223 |     
  224 |     // Click Simpan Dokumen (with force to bypass stacking sidebar overlay checks)
  225 |     await page.locator('button:has-text("Simpan Dokumen")').click({ force: true });
  226 |     
  227 |     const alertOke = page.locator('button:has-text("Oke")');
  228 |     await expect(alertOke).toBeVisible({ timeout: 10000 });
  229 |     await alertOke.click({ force: true });
  230 | 
  231 |     // Verify added document exists in the Lihat Isi modal list
  232 |     await expect(page.locator('td:has-text("SIUP/777/2026")')).toBeVisible({ timeout: 5000 });
  233 |     
  234 |     // Close modal (with force to bypass stacking sidebar overlay checks)
  235 |     await page.locator('button:has-text("Tutup")').click({ force: true });
  236 |   });
  237 | 
  238 |   test('Skenario 7: Petugas - Sirkulasi Peminjaman Dokumen Langsung', async ({ page }) => {
  239 |     await page.goto(baseURL);
  240 |     await page.locator('input[type="text"]').fill('petugas_e2e');
  241 |     await page.locator('input[type="password"]').fill('password123');
  242 |     await page.locator('button:has-text("LOGIN")').click();
  243 |     
  244 |     // Wait until logged in and dashboard renders
  245 |     await expect(page.locator('text=Dashboard 511 DALANG')).toBeVisible({ timeout: 10000 });
  246 | 
  247 |     await page.goto(baseURL + '/sirkulasi');
  248 |     
  249 |     // Search for PT SUPERUSER CORP
  250 |     const searchInput = page.locator('input[type="text"]').first();
  251 |     await searchInput.fill('PT SUPERUSER CORP');
  252 |     await searchInput.press('Enter');
  253 |     await page.waitForTimeout(1000);
  254 | 
  255 |     // Select the berkas row in the left panel
  256 |     const berkasRow = page.locator('text=PT SUPERUSER CORP').first();
  257 |     await expect(berkasRow).toBeVisible({ timeout: 5000 });
  258 |     await berkasRow.click({ force: true });
  259 | 
  260 |     // Fill logbook
  261 |     await page.locator('input[placeholder="Cth: Andi Setiawan"]').fill('Budi Santoso');
  262 |     await page.locator('input[placeholder="Cth: Pemeriksaan Lapangan"]').fill('Pemeriksaan Pajak');
  263 |     
  264 |     // Click Pinjamkan on the AKTA PENDIRIAN document
  265 |     const row = page.locator('div:has-text("AKTA PENDIRIAN")').locator('button:has-text("Pinjamkan")');
  266 |     await expect(row.first()).toBeVisible({ timeout: 5000 });
  267 |     await row.first().click({ force: true });
  268 |     
  269 |     const alertOke = page.locator('button:has-text("Oke")');
  270 |     await expect(alertOke).toBeVisible({ timeout: 10000 });
  271 |     await alertOke.click({ force: true });
  272 | 
  273 |     // Verify status changes to Dipinjam
  274 |     await expect(page.locator('span:has-text("Dipinjam")').first()).toBeVisible({ timeout: 5000 });
  275 |   });
  276 | 
  277 |   test('Skenario 8: Petugas - Sirkulasi Pengembalian Dokumen Langsung', async ({ page }) => {
  278 |     await page.goto(baseURL);
  279 |     await page.locator('input[type="text"]').fill('petugas_e2e');
  280 |     await page.locator('input[type="password"]').fill('password123');
  281 |     await page.locator('button:has-text("LOGIN")').click();
  282 |     
  283 |     // Wait until logged in and dashboard renders
  284 |     await expect(page.locator('text=Dashboard 511 DALANG')).toBeVisible({ timeout: 10000 });
  285 | 
  286 |     await page.goto(baseURL + '/sirkulasi');
  287 |     
  288 |     // Select the berkas
  289 |     const searchInput = page.locator('input[type="text"]').first();
  290 |     await searchInput.fill('PT SUPERUSER CORP');
  291 |     await searchInput.press('Enter');
  292 |     await page.waitForTimeout(1000);
  293 |     
  294 |     const berkasRow = page.locator('text=PT SUPERUSER CORP').first();
  295 |     await expect(berkasRow).toBeVisible({ timeout: 5000 });
  296 |     await berkasRow.click({ force: true });
  297 | 
  298 |     // Click Kembalikan (Rak)
  299 |     const returnBtn = page.locator('button:has-text("Kembalikan (Rak)")');
  300 |     await expect(returnBtn.first()).toBeVisible({ timeout: 5000 });
  301 |     await returnBtn.first().click({ force: true });
  302 |     
  303 |     const alertOke = page.locator('button:has-text("Oke")');
  304 |     await expect(alertOke).toBeVisible({ timeout: 10000 });
  305 |     await alertOke.click({ force: true });
  306 | 
  307 |     // Verify status changes back to Di Rak
  308 |     await expect(page.locator('span:has-text("Di Rak")').first()).toBeVisible({ timeout: 5000 });
  309 |   });
  310 | 
  311 |   test('Skenario 9: Petugas - Mutasi Keluar & Pembekuan Berkas', async ({ page }) => {
  312 |     await page.goto(baseURL);
  313 |     await page.locator('input[type="text"]').fill('petugas_e2e');
```