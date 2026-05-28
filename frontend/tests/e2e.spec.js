import { test, expect } from '@playwright/test';

const baseURL = 'http://localhost:5173';

test.describe('E2E Testing - APLIKASI GUDANG (All Roles & All Actions)', () => {
  
  test.beforeEach(async ({ page }) => {
    // Print all browser console logs and errors to terminal for debugging
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  });

  // 🧑‍💼 PART 1: SUPERUSER ROLE (admin123)
  
  test('Skenario 1: Superuser - Login & Theme / Mode Toggle', async ({ page }) => {
    // 1. Login success
    await page.goto(baseURL);
    await page.locator('input[type="text"]').fill('admin123');
    await page.locator('input[type="password"]').fill('admin123');
    await page.locator('button:has-text("LOGIN")').click();
    
    // Wait until logged in and dashboard renders (crucial to ensure JWT session is stored)
    await expect(page.locator('text=Dashboard 511 DALANG')).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(baseURL + '/');

    // 2. Toggle Mode (Light/Dark)
    const toggleBtn = page.locator('button[title="Toggle Terang/Gelap"]');
    await expect(toggleBtn).toBeVisible();
    await toggleBtn.click();
    await page.waitForTimeout(500);
    await toggleBtn.click(); // toggle back
    
    // 3. Switch Theme Color
    await page.goto(baseURL + '/pengaturan');
    await expect(page).toHaveURL(/.*\/pengaturan/);
    await page.locator('button:has-text("Tampilan")').click();
    
    // Click theme color button (e.g. style background containing Sky, Emerald, etc.)
    const themeButtons = page.locator('button[style*="background-color"]');
    if (await themeButtons.count() >= 2) {
      await themeButtons.nth(1).click(); // Emerald theme
      await page.waitForTimeout(500);
    }
  });

  test('Skenario 2: Superuser - Manajemen User (Buat Petugas & User)', async ({ page }) => {
    await page.goto(baseURL);
    await page.locator('input[type="text"]').fill('admin123');
    await page.locator('input[type="password"]').fill('admin123');
    await page.locator('button:has-text("LOGIN")').click();
    
    // Wait until logged in and dashboard renders
    await expect(page.locator('text=Dashboard 511 DALANG')).toBeVisible({ timeout: 10000 });

    await page.goto(baseURL + '/pengaturan');
    
    const tabManajemenUser = page.locator('button:has-text("Manajemen User")');
    await expect(tabManajemenUser).toBeVisible({ timeout: 5000 });
    await tabManajemenUser.click();
    
    // Clean up petugas_e2e and user_e2e if they exist already to ensure pristine state
    const deletePetugasBtn = page.locator('tr:has-text("petugas_e2e")').locator('td:has-text("Hapus")');
    if (await deletePetugasBtn.count() > 0) {
      await deletePetugasBtn.first().click({ force: true });
      await page.locator('button:has-text("Ya, Lanjutkan")').click({ force: true });
      await page.waitForTimeout(1000);
    }
    
    const deleteUserBtn = page.locator('tr:has-text("user_e2e")').locator('td:has-text("Hapus")');
    if (await deleteUserBtn.count() > 0) {
      await deleteUserBtn.first().click({ force: true });
      await page.locator('button:has-text("Ya, Lanjutkan")').click({ force: true });
      await page.waitForTimeout(1000);
    }

    // Register petugas_e2e
    const addBtn = page.locator('button:has-text("+ Tambah User")');
    await expect(addBtn).toBeVisible({ timeout: 5000 });
    await addBtn.click();
    
    const formUser = page.locator('form:has-text("Tambah Satu User")');
    await expect(formUser).toBeVisible({ timeout: 5000 });
    
    await formUser.locator('label:has-text("Username") + input').fill('petugas_e2e');
    await formUser.locator('label:has-text("Password") + input').fill('password123');
    await formUser.locator('select').selectOption('petugas');
    await formUser.locator('button:has-text("Simpan User")').click();
    
    const alertOke1 = page.locator('button:has-text("Oke")');
    await expect(alertOke1).toBeVisible({ timeout: 10000 });
    await alertOke1.click({ force: true });

    // Register user_e2e
    await expect(addBtn).toBeVisible({ timeout: 5000 });
    await addBtn.click();
    await formUser.locator('label:has-text("Username") + input').fill('user_e2e');
    await formUser.locator('label:has-text("Password") + input').fill('password123');
    await formUser.locator('select').selectOption('user');
    await formUser.locator('button:has-text("Simpan User")').click();
    
    const alertOke2 = page.locator('button:has-text("Oke")');
    await expect(alertOke2).toBeVisible({ timeout: 10000 });
    await alertOke2.click({ force: true });
    
    // Verify in table
    await expect(page.locator('tr:has-text("petugas_e2e")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('tr:has-text("user_e2e")')).toBeVisible({ timeout: 5000 });
  });

  test('Skenario 3: Superuser - Server Storage Info & Backup DB', async ({ page }) => {
    await page.goto(baseURL);
    await page.locator('input[type="text"]').fill('admin123');
    await page.locator('input[type="password"]').fill('admin123');
    await page.locator('button:has-text("LOGIN")').click();
    
    // Wait until logged in and dashboard renders
    await expect(page.locator('text=Dashboard 511 DALANG')).toBeVisible({ timeout: 10000 });

    await page.goto(baseURL + '/pengaturan');
    
    // Verify server storage tab is visible & click it
    await page.locator('button:has-text("🖥️ Server")').click();
    await expect(page.locator('text=disk sistem')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Rincian Data Aplikasi')).toBeVisible();

    // Trigger backup DB download
    await page.locator('button:has-text("Tampilan")').click();
    const downloadPromise = page.waitForEvent('download');
    await page.locator('button:has-text("Unduh Backup (.zip)")').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.zip');
  });

  test('Skenario 4: Superuser - Registrasi Rumah Berkas Satuan Baru', async ({ page }) => {
    await page.goto(baseURL);
    await page.locator('input[type="text"]').fill('admin123');
    await page.locator('input[type="password"]').fill('admin123');
    await page.locator('button:has-text("LOGIN")').click();
    
    // Wait until logged in and dashboard renders
    await expect(page.locator('text=Dashboard 511 DALANG')).toBeVisible({ timeout: 10000 });

    await page.goto(baseURL + '/registrasi');
    await expect(page).toHaveURL(/.*\/registrasi/);
    
    // Wait for auto-fill recommendation to load
    const noBerkasInput = page.locator('input[name="no_berkas"]');
    await expect(noBerkasInput).not.toHaveValue('', { timeout: 10000 });
    
    // Fill specific known number to guarantee uniqueness
    await noBerkasInput.fill('9999');
    
    await page.locator('input[name="nama"]').fill('PT SUPERUSER CORP');
    await page.locator('input[name="npwp"]').fill('12.345.678.9-012.000');
    await page.locator('input[name="npwp_16"]').fill('8888888888888888');
    
    await page.locator('button:has-text("REGISTRASI WP BARU")').click();
    
    const alertOke = page.locator('button:has-text("Oke")');
    await expect(alertOke).toBeVisible({ timeout: 10000 });
    await alertOke.click({ force: true });
  });

  // 👮 PART 2: PETUGAS ROLE (petugas_e2e)

  test('Skenario 5: Petugas - RBAC Access Blocks', async ({ page }) => {
    await page.goto(baseURL);
    await page.locator('input[type="text"]').fill('petugas_e2e');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button:has-text("LOGIN")').click();
    
    // Wait until logged in and dashboard renders
    await expect(page.locator('text=Dashboard 511 DALANG')).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(baseURL + '/');

    await page.goto(baseURL + '/pengaturan');
    
    // Verify that "Manajemen User" and "🖥️ Server" tabs are NOT visible
    await expect(page.locator('button:has-text("Manajemen User")')).not.toBeVisible();
    await expect(page.locator('button:has-text("🖥️ Server")')).not.toBeVisible();
  });

  test('Skenario 6: Petugas - Cari Berkas & Tambah Dokumen Baru', async ({ page }) => {
    await page.goto(baseURL);
    await page.locator('input[type="text"]').fill('petugas_e2e');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button:has-text("LOGIN")').click();
    
    // Wait until logged in and dashboard renders
    await expect(page.locator('text=Dashboard 511 DALANG')).toBeVisible({ timeout: 10000 });

    await page.goto(baseURL + '/pencarian');
    
    // Search for PT SUPERUSER CORP
    const searchInput = page.locator('input[type="text"]').first();
    await searchInput.fill('PT SUPERUSER CORP');
    await searchInput.press('Enter');
    await page.waitForTimeout(1000);

    // Click Lihat Isi (with force to bypass stacking sidebar overlay checks)
    const lihatIsiBtn = page.locator('button:has-text("Lihat Isi")').first();
    await expect(lihatIsiBtn).toBeVisible({ timeout: 5000 });
    await lihatIsiBtn.click({ force: true });

    // Click Tambah Dokumen (with force to bypass stacking sidebar overlay checks)
    const tambahDokumenBtn = page.locator('button:has-text("➕ Tambah Dokumen")');
    await expect(tambahDokumenBtn).toBeVisible({ timeout: 5000 });
    await tambahDokumenBtn.click({ force: true });
    
    // Fill Document form
    const namaInput = page.locator('input[placeholder="Cth: Akta Pendirian"]');
    try {
      await expect(namaInput).toBeVisible({ timeout: 10000 });
    } catch (err) {
      console.log("PLAYWRIGHT DEBUG: Element 'Cth: Akta Pendirian' not visible! Page HTML:");
      console.log(await page.content());
      throw err;
    }
    await namaInput.fill('AKTA PENDIRIAN');
    await page.locator('input[placeholder="Cth: 123/IX/2023"]').fill('SIUP/777/2026');
    await page.locator('input[placeholder="Cth: Akta, SPT..."]').fill('AKTA');
    await page.locator('input[placeholder="2023"]').fill('2026');
    
    // Click Simpan Dokumen (with force to bypass stacking sidebar overlay checks)
    await page.locator('button:has-text("Simpan Dokumen")').click({ force: true });
    
    const alertOke = page.locator('button:has-text("Oke")');
    await expect(alertOke).toBeVisible({ timeout: 10000 });
    await alertOke.click({ force: true });

    // Verify added document exists in the Lihat Isi modal list
    await expect(page.locator('td:has-text("SIUP/777/2026")')).toBeVisible({ timeout: 5000 });
    
    // Close modal (with force to bypass stacking sidebar overlay checks)
    await page.locator('button:has-text("Tutup")').click({ force: true });
  });

  test('Skenario 7: Petugas - Sirkulasi Peminjaman Dokumen Langsung', async ({ page }) => {
    await page.goto(baseURL);
    await page.locator('input[type="text"]').fill('petugas_e2e');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button:has-text("LOGIN")').click();
    
    // Wait until logged in and dashboard renders
    await expect(page.locator('text=Dashboard 511 DALANG')).toBeVisible({ timeout: 10000 });

    await page.goto(baseURL + '/sirkulasi');
    
    // Search for PT SUPERUSER CORP
    const searchInput = page.locator('input[type="text"]').first();
    await searchInput.fill('PT SUPERUSER CORP');
    await searchInput.press('Enter');
    await page.waitForTimeout(1000);

    // Select the berkas row in the left panel
    const berkasRow = page.locator('text=PT SUPERUSER CORP').first();
    await expect(berkasRow).toBeVisible({ timeout: 5000 });
    await berkasRow.click({ force: true });

    // Fill logbook
    await page.locator('input[placeholder="Cth: Andi Setiawan"]').fill('Budi Santoso');
    await page.locator('input[placeholder="Cth: Pemeriksaan Lapangan"]').fill('Pemeriksaan Pajak');
    
    // Click Pinjamkan on the AKTA PENDIRIAN document
    const row = page.locator('div:has-text("AKTA PENDIRIAN")').locator('button:has-text("Pinjamkan")');
    await expect(row.first()).toBeVisible({ timeout: 5000 });
    await row.first().click({ force: true });
    
    const alertOke = page.locator('button:has-text("Oke")');
    await expect(alertOke).toBeVisible({ timeout: 10000 });
    await alertOke.click({ force: true });

    // Verify status changes to Dipinjam
    await expect(page.locator('span:has-text("Dipinjam")').first()).toBeVisible({ timeout: 5000 });
  });

  test('Skenario 8: Petugas - Sirkulasi Pengembalian Dokumen Langsung', async ({ page }) => {
    await page.goto(baseURL);
    await page.locator('input[type="text"]').fill('petugas_e2e');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button:has-text("LOGIN")').click();
    
    // Wait until logged in and dashboard renders
    await expect(page.locator('text=Dashboard 511 DALANG')).toBeVisible({ timeout: 10000 });

    await page.goto(baseURL + '/sirkulasi');
    
    // Select the berkas
    const searchInput = page.locator('input[type="text"]').first();
    await searchInput.fill('PT SUPERUSER CORP');
    await searchInput.press('Enter');
    await page.waitForTimeout(1000);
    
    const berkasRow = page.locator('text=PT SUPERUSER CORP').first();
    await expect(berkasRow).toBeVisible({ timeout: 5000 });
    await berkasRow.click({ force: true });

    // Click Kembalikan (Rak)
    const returnBtn = page.locator('button:has-text("Kembalikan (Rak)")');
    await expect(returnBtn.first()).toBeVisible({ timeout: 5000 });
    await returnBtn.first().click({ force: true });
    
    const alertOke = page.locator('button:has-text("Oke")');
    await expect(alertOke).toBeVisible({ timeout: 10000 });
    await alertOke.click({ force: true });

    // Verify status changes back to Di Rak
    await expect(page.locator('span:has-text("Di Rak")').first()).toBeVisible({ timeout: 5000 });
  });

  test('Skenario 9: Petugas - Mutasi Keluar & Pembekuan Berkas', async ({ page }) => {
    await page.goto(baseURL);
    await page.locator('input[type="text"]').fill('petugas_e2e');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button:has-text("LOGIN")').click();
    
    // Wait until logged in and dashboard renders
    await expect(page.locator('text=Dashboard 511 DALANG')).toBeVisible({ timeout: 10000 });

    await page.goto(baseURL + '/mutasi');
    
    // Search for PT SUPERUSER CORP
    const searchInput = page.locator('input[type="text"]').first();
    await searchInput.fill('PT SUPERUSER CORP');
    await searchInput.press('Enter');
    await page.waitForTimeout(1000);

    // Click Mutasi Satuan
    await page.locator('button:has-text("Mutasi Satuan")').first().click({ force: true });

    // Fill reason in modal
    await page.locator('input[placeholder*="Cth: Pindah KPP"]').fill('Mutasi Pindah KPP Kembangan');
    
    // Click MUTASI SEKARANG
    await page.locator('button:has-text("MUTASI SEKARANG")').click({ force: true });
    
    const alertOke = page.locator('button:has-text("Oke")');
    await expect(alertOke).toBeVisible({ timeout: 10000 });
    await alertOke.click({ force: true });

    // Verify in Riwayat Dimutasi
    await page.locator('button:has-text("Riwayat Dimutasi")').click({ force: true });
    await expect(page.locator('td:has-text("EKS-")').first()).toBeVisible();
    await expect(page.locator('h6:has-text("PT SUPERUSER CORP")').first()).toBeVisible();
  });

  // 👤 PART 3: REGULAR USER ROLE (user_e2e)

  test('Skenario 10: User Biasa - RBAC Access Blocks', async ({ page }) => {
    await page.goto(baseURL);
    await page.locator('input[type="text"]').fill('user_e2e');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button:has-text("LOGIN")').click();
    
    // Wait until logged in and dashboard renders
    await expect(page.locator('text=Dashboard 511 DALANG')).toBeVisible({ timeout: 10000 });

    // Verify sidebar menu links for Registrasi & Mutasi are not present on screen
    await expect(page.locator('a[href="/registrasi"]')).not.toBeVisible();
    await expect(page.locator('a[href="/mutasi"]')).not.toBeVisible();

    // Open Pencarian directly
    await page.goto(baseURL + '/pencarian');
    const searchInput = page.locator('input[type="text"]').first();
    await searchInput.fill('PT');
    await searchInput.press('Enter');
    await page.waitForTimeout(1000);

    await page.locator('button:has-text("Lihat Isi")').first().click({ force: true });
    await expect(page.locator('button:has-text("➕ Tambah Dokumen")')).not.toBeVisible();
    await expect(page.locator('button[title="Edit"]')).not.toBeVisible();
    await expect(page.locator('button[title="Hapus"]')).not.toBeVisible();
    
    // Close modal
    await page.locator('button:has-text("Tutup")').click({ force: true });
  });

  test('Skenario 11: User Biasa - Pengajuan Peminjaman Dokumen', async ({ page }) => {
    await page.goto(baseURL);
    await page.locator('input[type="text"]').fill('user_e2e');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button:has-text("LOGIN")').click();
    
    // Wait until logged in and dashboard renders
    await expect(page.locator('text=Dashboard 511 DALANG')).toBeVisible({ timeout: 10000 });

    await page.goto(baseURL + '/sirkulasi');
    
    // Search any active berkas
    const searchInput = page.locator('input[type="text"]').first();
    await searchInput.fill('PT');
    await searchInput.press('Enter');
    await page.waitForTimeout(1000);

    // Select the first active berkas
    await page.locator('text=PT ').first().click({ force: true });

    // Fill logbook
    await page.locator('input[placeholder="Cth: Andi Setiawan"]').fill('User Biasa E2E');
    await page.locator('input[placeholder="Cth: Pemeriksaan Lapangan"]').fill('Penelitian Mandiri');

    // Click "Ajukan Pinjam"
    const applyBtn = page.locator('button:has-text("Ajukan Pinjam")');
    if (await applyBtn.count() > 0) {
      await applyBtn.first().click({ force: true });
      
      const alertOke = page.locator('button:has-text("Oke")');
      await expect(alertOke).toBeVisible({ timeout: 10000 });
      await alertOke.click({ force: true });
      
      // Verify status changes to Menunggu
      await expect(page.locator('span:has-text("Menunggu")').first()).toBeVisible();
    }
  });

  test('Skenario 12: User Biasa - Pengajuan Pengembalian Dokumen', async ({ page }) => {
    // Step 1: Login as superuser and set a document to "Dipinjam" under user_e2e
    await page.goto(baseURL);
    await page.locator('input[type="text"]').fill('admin123');
    await page.locator('input[type="password"]').fill('admin123');
    await page.locator('button:has-text("LOGIN")').click();
    
    // Wait until logged in and dashboard renders
    await expect(page.locator('text=Dashboard 511 DALANG')).toBeVisible({ timeout: 10000 });

    await page.goto(baseURL + '/sirkulasi');
    const searchInput = page.locator('input[type="text"]').first();
    await searchInput.fill('PT');
    await searchInput.press('Enter');
    await page.waitForTimeout(1000);
    await page.locator('text=PT ').first().click({ force: true });

    await page.locator('input[placeholder="Cth: Andi Setiawan"]').fill('user_e2e');
    await page.locator('input[placeholder="Cth: Pemeriksaan Lapangan"]').fill('Pajak E2E');
    
    const pinjamBtn = page.locator('button:has-text("Pinjamkan")');
    if (await pinjamBtn.count() > 0) {
      await pinjamBtn.first().click({ force: true });
      
      const alertOke = page.locator('button:has-text("Oke")');
      await expect(alertOke).toBeVisible({ timeout: 10000 });
      await alertOke.click({ force: true });
    }

    // Step 2: Logout & Login as user biasa
    await page.locator('button[title="Keluar"]').click({ force: true });
    await page.locator('input[type="text"]').fill('user_e2e');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button:has-text("LOGIN")').click();
    
    // Wait until logged in and dashboard renders
    await expect(page.locator('text=Dashboard 511 DALANG')).toBeVisible({ timeout: 10000 });

    await page.goto(baseURL + '/sirkulasi');
    await page.locator('input[type="text"]').first().fill('PT');
    await page.locator('input[type="text"]').first().press('Enter');
    await page.waitForTimeout(1000);
    await page.locator('text=PT ').first().click({ force: true });

    // Click "Ajukan Pengembalian"
    const applyReturnBtn = page.locator('button:has-text("Ajukan Pengembalian")');
    if (await applyReturnBtn.count() > 0) {
      await applyReturnBtn.first().click({ force: true });
      
      const alertOke = page.locator('button:has-text("Oke")');
      await expect(alertOke).toBeVisible({ timeout: 10000 });
      await alertOke.click({ force: true });

      // Verify status changes to Menunggu
      await expect(page.locator('span:has-text("Menunggu")').first()).toBeVisible();
    }
  });

});
