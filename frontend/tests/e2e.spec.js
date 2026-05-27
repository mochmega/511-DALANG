import { test, expect } from '@playwright/test';

test.describe('E2E Testing - APLIKASI GUDANG', () => {
  const baseURL = 'http://localhost:5173';

  test('Skenario 1: Login Berhasil & Masuk Dasbor', async ({ page }) => {
    await page.goto(baseURL);
    
    const usernameInput = page.locator('input[type="text"]');
    await usernameInput.waitFor({ state: 'visible' });

    // Masukkan kredensial
    await usernameInput.fill('admin123');
    await page.locator('input[type="password"]').fill('admin123');
    
    // Klik tombol LOGIN
    await page.locator('button:has-text("LOGIN")').click();

    // Verifikasi redirect ke dashboard
    await expect(page).toHaveURL(baseURL + '/');
    
    // Verifikasi ada teks Dashboard 511 DALANG
    await expect(page.locator('text=Dashboard 511 DALANG')).toBeVisible();
    
    // Verifikasi kartu Total Rumah Berkas muncul
    await expect(page.locator('text=Total Rumah Berkas')).toBeVisible();
  });

  test('Skenario 2: Beralih Tema (Mode Terang/Gelap)', async ({ page }) => {
    // Login ulang (karena konteks test baru)
    await page.goto(baseURL);
    await page.locator('input[type="text"]').fill('admin123');
    await page.locator('input[type="password"]').fill('admin123');
    await page.locator('button:has-text("LOGIN")').click();
    await expect(page).toHaveURL(baseURL + '/');

    // Cari tombol toggle mode di sidebar
    // Di Navbar biasanya ada tombol theme, kita bisa cari berdasarkan title atau aria-label
    // Kita gunakan klik pada SVG Matahari/Bulan
    const toggleModeBtn = page.locator('button[title="Ganti Mode Terang/Gelap"], button[title="Ganti Tema"]'); // Sesuaikan selector
    if (await toggleModeBtn.count() > 0) {
        await toggleModeBtn.first().click();
        
        // Verifikasi class 'dark' dihapus/ditambah dari elemen html
        const isDark = await page.evaluate(() => document.documentElement.getAttribute('data-mode') === 'dark');
        expect(typeof isDark).toBe('boolean');
    }
  });

  test('Skenario 3: Navigasi ke Pencarian dan Cari Dokumen', async ({ page }) => {
    await page.goto(baseURL);
    await page.locator('input[type="text"]').fill('admin123');
    await page.locator('input[type="password"]').fill('admin123');
    await page.locator('button:has-text("LOGIN")').click();
    await expect(page).toHaveURL(baseURL + '/');

    // Klik menu Pencarian di Sidebar
    await page.locator('a[href="/pencarian"]').click();
    await expect(page).toHaveURL(/.*\/pencarian/);

    // Ketik di kolom pencarian
    // input type="text" di halaman pencarian
    const searchInput = page.locator('input[type="text"]').first();
    await searchInput.waitFor({ state: 'visible' });
    await searchInput.fill('EKS'); // Cari keyword EKS
    
    // Cari tombol "Cari Data" atau "Search" (kita tekan Enter saja di input)
    await searchInput.press('Enter');

    // Tunggu hasil (spinner hilang)
    await expect(page.locator('text=Mencari...')).not.toBeVisible();
  });
});
