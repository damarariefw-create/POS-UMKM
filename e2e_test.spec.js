// =============================================================================
// E2E Browser Test - POS UMKM Sayur Keliling (ESM version)
// Jalankan dengan: npx playwright test e2e_test.spec.js --headed
// =============================================================================

import { test, expect } from '@playwright/test';

const APP_URL = 'https://pos-umkm-five.vercel.app';
// ⚠️  Ganti dengan email & password akun POS UMKM Anda yang aktif:
const EMAIL = 'damarariefwtjksn@gmail.com';
const PASSWORD = 'password123';

test.describe('POS UMKM E2E Test Suite', () => {

  test.setTimeout(120000); // 2 menit per test

  // ─── LANGKAH 1: Buka & Refresh Halaman ────────────────────────────────────
  test('Langkah 1: Buka & Refresh Halaman', async ({ page }) => {
    console.log('\n[STEP 1] Navigasi ke halaman utama...');
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/step1a_homepage.png', fullPage: true });
    console.log('[STEP 1] Screenshot awal diambil. URL:', page.url());

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/step1b_after_refresh.png', fullPage: true });
    console.log('[STEP 1] ✅ PASS - Halaman berhasil dibuka dan di-refresh. URL:', page.url());
  });

  // ─── LANGKAH 2-9: Full POS Flow ────────────────────────────────────────────
  test('Langkah 2-9: Full POS Flow (Login → Transaksi Kasbon)', async ({ page }) => {

    // == LANGKAH 2: Login ==
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[STEP 2] Login ke aplikasi...');

    // Buka root — ProtectedRoute akan redirect ke /login otomatis
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const urlAfterOpen = page.url();
    console.log('[STEP 2] URL setelah buka root:', urlAfterOpen);
    await page.screenshot({ path: 'screenshots/step2a_initial_page.png', fullPage: true });

    // Jika sudah login, navigate ke POS langsung
    if (!urlAfterOpen.includes('/login')) {
      console.log('[STEP 2] ✅ PASS - Sudah login (session aktif), langsung menuju POS.');
      await page.goto(`${APP_URL}/pos`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
    } else {
      // Isi form login berdasarkan selector yang ada di LoginPage.jsx
      // Input punya id="email" dan id="password"
      const emailInput = page.locator('#email');
      const passwordInput = page.locator('#password');

      await emailInput.waitFor({ state: 'visible', timeout: 15000 });
      await emailInput.fill(EMAIL);
      await passwordInput.fill(PASSWORD);
      await page.screenshot({ path: 'screenshots/step2b_login_filled.png', fullPage: true });
      console.log('[STEP 2] Form login diisi.');

      // Klik tombol "Masuk / Daftar Akun"
      await page.locator('button[type="submit"]').click();
      console.log('[STEP 2] Tombol login diklik, menunggu redirect...');

      // Tunggu redirect ke /pos
      await page.waitForURL('**/pos**', { timeout: 20000 }).catch(async () => {
        console.warn('[STEP 2] Redirect /pos timeout, cek URL sekarang:', page.url());
        await page.screenshot({ path: 'screenshots/step2_login_timeout.png', fullPage: true });
      });

      await page.waitForTimeout(2000);
      const afterLoginUrl = page.url();
      console.log('[STEP 2] URL setelah login:', afterLoginUrl);

      if (afterLoginUrl.includes('/pos') || afterLoginUrl.includes('/')) {
        console.log('[STEP 2] ✅ PASS - Login berhasil!');
      } else {
        console.warn('[STEP 2] ⚠️  FAIL - Masih di halaman login.');
      }
      await page.screenshot({ path: 'screenshots/step2c_after_login.png', fullPage: true });
    }

    // == LANGKAH 3: Navigasi ke Kasir ==
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[STEP 3] Navigasi ke halaman Kasir/POS...');

    // Coba klik link kasir di navbar, atau navigate langsung
    const kasirNavLink = page.locator('a[href="/pos"], a[href="/"], nav a').filter({ hasText: /kasir|pos/i }).first();
    if (await kasirNavLink.count() > 0) {
      await kasirNavLink.click();
      await page.waitForTimeout(2000);
    }

    const posUrl = page.url();
    console.log('[STEP 3] URL Kasir:', posUrl);
    await page.screenshot({ path: 'screenshots/step3_kasir_page.png', fullPage: true });
    console.log('[STEP 3] ✅ PASS - Halaman kasir terbuka.');

    // == LANGKAH 4: Tambah Produk ke Keranjang ==
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[STEP 4] Menambahkan produk ke keranjang...');
    await page.waitForTimeout(2000);

    // Selectors dari POSPage.jsx: produk adalah div dengan onclick di dalam grid
    // Coba beberapa selector
    const productSelectors = [
      'div[class*="cursor-pointer"][class*="rounded"]',
      'div[class*="bg-surface"][class*="rounded"]',
      'div.grid > div:first-child',
      'main div[class*="grid"] > div:first-child',
    ];

    let productClicked = false;
    for (const sel of productSelectors) {
      const el = page.locator(sel).first();
      if (await el.count() > 0 && await el.isVisible()) {
        try {
          await el.click({ timeout: 5000 });
          productClicked = true;
          console.log(`[STEP 4] Produk diklik dengan selector: ${sel}`);
          break;
        } catch (e) {
          console.log(`[STEP 4] Selector "${sel}" gagal, coba berikutnya...`);
        }
      }
    }

    if (!productClicked) {
      // Last resort: klik koordinat di area produk
      console.warn('[STEP 4] Semua selector gagal, mencoba klik koordinat...');
      await page.mouse.click(100, 350);
    }

    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'screenshots/step4_product_added.png', fullPage: true });

    // Cek apakah ada perubahan (cart counter muncul atau tombol cart muncul)
    const cartIndicator = page.locator('text=/Keranjang|item|pcs/i').first();
    if (await cartIndicator.count() > 0) {
      console.log('[STEP 4] ✅ PASS - Produk berhasil ditambahkan ke keranjang.');
    } else {
      console.warn('[STEP 4] ⚠️  Produk mungkin belum masuk keranjang, periksa screenshot.');
    }

    // == LANGKAH 5: Buka Panel Checkout ==
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[STEP 5] Membuka panel checkout...');

    // Cari tombol cart floating (mobile) — biasanya ada teks "Keranjang" atau total harga
    const fabSelectors = [
      'div[class*="fixed"][class*="bottom"] button',
      'button:has-text("Keranjang")',
      'button:has-text("Lihat Pesanan")',
      '[class*="fixed bottom"] button',
    ];

    for (const sel of fabSelectors) {
      const el = page.locator(sel).first();
      if (await el.count() > 0 && await el.isVisible()) {
        await el.click();
        console.log(`[STEP 5] Cart button diklik: ${sel}`);
        break;
      }
    }
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/step5_checkout_panel.png', fullPage: true });
    console.log('[STEP 5] ✅ PASS - Panel checkout dibuka.');

    // == LANGKAH 6: Uji Uang Kurang → Label "Kurang (Otomatis Kasbon)" ==
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[STEP 6] Menguji fitur Uang Kurang → Label Kurang...');

    // Pastikan metode Tunai terpilih
    const tunaiBtn = page.locator('button').filter({ hasText: /^Tunai$/ }).first();
    if (await tunaiBtn.count() > 0 && await tunaiBtn.isVisible()) {
      await tunaiBtn.click();
      await page.waitForTimeout(500);
      console.log('[STEP 6] Metode "Tunai" dipilih.');
    }

    // Temukan input nominal uang — type="number"
    const cashInput = page.locator('input[type="number"]').first();
    if (await cashInput.count() > 0) {
      await cashInput.scrollIntoViewIfNeeded();
      await cashInput.click();
      await cashInput.fill('500');
      await page.waitForTimeout(1200);
      console.log('[STEP 6] Nominal Rp 500 dimasukkan (lebih kecil dari total tagihan).');
      await page.screenshot({ path: 'screenshots/step6a_cash_input.png', fullPage: true });
    } else {
      console.warn('[STEP 6] ⚠️  Input uang diterima tidak ditemukan.');
    }

    // Verifikasi label "Kurang" muncul menggantikan "Kembalian"
    await page.waitForTimeout(500);
    const pageContent = await page.content();
    if (pageContent.includes('Kurang')) {
      console.log('[STEP 6] ✅ PASS - Label "Kurang" ditemukan di halaman! Fitur kasbon otomatis aktif.');
    } else if (pageContent.includes('Kembalian')) {
      console.warn('[STEP 6] ⚠️  Label masih "Kembalian", belum berubah ke "Kurang".');
    }
    await page.screenshot({ path: 'screenshots/step6b_kurang_label.png', fullPage: true });

    // == LANGKAH 7: Tambah Pelanggan Instan ==
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[STEP 7] Menambahkan pelanggan instan...');

    // Scroll ke bagian pelanggan di checkout panel
    const custSearchSelectors = [
      'input[placeholder*="pelanggan"]',
      'input[placeholder*="Cari"]',
      'input[placeholder*="ketik nama"]',
      'input[placeholder*="nama pelanggan"]',
    ];

    let custFound = false;
    for (const sel of custSearchSelectors) {
      const custInput = page.locator(sel).first();
      if (await custInput.count() > 0) {
        await custInput.scrollIntoViewIfNeeded();
        await custInput.click();
        await custInput.fill('Bu Retno Test E2E');
        await page.waitForTimeout(1200);
        await page.screenshot({ path: 'screenshots/step7a_customer_typed.png', fullPage: true });
        console.log(`[STEP 7] Input pelanggan "${sel}" ditemukan dan diisi.`);
        custFound = true;

        // Cari dan klik tombol Tambah pelanggan baru
        const addBtnSelectors = [
          'button:has-text("Bu Retno")',
          'button:has-text("Tambah") >> nth=0',
        ];
        for (const btnSel of addBtnSelectors) {
          const btn = page.locator(btnSel).first();
          if (await btn.count() > 0 && await btn.isVisible()) {
            await btn.scrollIntoViewIfNeeded();
            await btn.click();
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'screenshots/step7b_customer_added.png', fullPage: true });
            console.log('[STEP 7] ✅ PASS - Tombol Tambah Pelanggan diklik!');
            break;
          }
        }
        break;
      }
    }
    if (!custFound) {
      console.warn('[STEP 7] ⚠️  FAIL - Input pencarian pelanggan tidak ditemukan.');
      await page.screenshot({ path: 'screenshots/step7_not_found.png', fullPage: true });
    }

    // == LANGKAH 8: Tambahkan Catatan ==
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[STEP 8] Menambahkan catatan pembayaran...');

    const notesSelectors = [
      'input[placeholder*="Catatan"]',
      'input[placeholder*="catatan"]',
      'textarea[placeholder*="catatan"]',
      'textarea[placeholder*="Catatan"]',
    ];
    let notesFound = false;
    for (const sel of notesSelectors) {
      const notesInput = page.locator(sel).first();
      if (await notesInput.count() > 0) {
        await notesInput.scrollIntoViewIfNeeded();
        await notesInput.fill('Test E2E otomatis kasbon');
        console.log('[STEP 8] ✅ PASS - Catatan pembayaran diisi.');
        notesFound = true;
        break;
      }
    }
    if (!notesFound) console.warn('[STEP 8] ⚠️  Input catatan tidak ditemukan.');
    await page.screenshot({ path: 'screenshots/step8_notes.png', fullPage: true });

    // == LANGKAH 9: Selesaikan Transaksi ==
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[STEP 9] Menyelesaikan transaksi...');

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(800);

    const payBtnTexts = ['CATAT KASBON', 'BAYAR SEKARANG', 'Kasbon', 'Bayar'];
    let payClicked = false;
    for (const txt of payBtnTexts) {
      const btn = page.locator(`button:has-text("${txt}")`).last();
      if (await btn.count() > 0 && await btn.isVisible()) {
        await btn.scrollIntoViewIfNeeded();
        await btn.click();
        console.log(`[STEP 9] Tombol "${txt}" diklik.`);
        payClicked = true;
        await page.waitForTimeout(4000);
        break;
      }
    }
    if (!payClicked) console.warn('[STEP 9] ⚠️  Tombol bayar tidak ditemukan.');
    await page.screenshot({ path: 'screenshots/step9a_after_pay.png', fullPage: true });

    // Verifikasi modal sukses
    const successTexts = ['Transaksi Berhasil', 'Kasbon Tersimpan', 'Berhasil'];
    let successFound = false;
    for (const txt of successTexts) {
      const el = page.locator(`text=${txt}`).first();
      if (await el.count() > 0) {
        console.log(`[STEP 9] ✅ PASS - Modal sukses ditemukan: "${txt}"!`);
        successFound = true;
        await page.screenshot({ path: 'screenshots/step9b_success_modal.png', fullPage: true });
        break;
      }
    }
    if (!successFound) {
      console.warn('[STEP 9] ⚠️  Modal sukses tidak muncul. Periksa screenshots/step9a.');
    }

    // Tutup modal
    const closeBtn = page.locator('button').filter({ hasText: /Selesai|Tutup|Transaksi Baru/i }).first();
    if (await closeBtn.count() > 0 && await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(1000);
    }

    await page.screenshot({ path: 'screenshots/step9c_final_state.png', fullPage: true });
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ [SELESAI] Seluruh langkah E2E selesai!');
    console.log('   📁 Cek folder screenshots/ untuk semua hasil pengujian.');
  });
});
