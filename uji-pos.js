import puppeteer from 'puppeteer';
import { PuppeteerAgent } from '@midscene/web/puppeteer';

(async () => {
    console.log("Membuka browser otomatis...");

    // 1. Membuka Chrome secara otomatis
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    // ... (lanjutkan sisa kode di bawahnya)

    // Arahkan ke URL Web POS Anda yang sudah live
    await page.goto('https://pos-umkm-live.vercel.app/');

    // 2. Membangunkan Agen AI Midscene
    const agent = new PuppeteerAgent(page);

    try {
        console.log("Memulai simulasi AI...");

        // 3. AI Action: Menyuruh AI melakukan tindakan
        await agent.aiAction('Ketik email "admin@sayur.com" dan password "12345", lalu klik tombol Login');

        // Tunggu sebentar (2 detik) agar halaman memuat produk sepenuhnya
        await new Promise(resolve => setTimeout(resolve, 2000));

        await agent.aiAction('Klik produk bernama "Wortel" untuk memasukkannya ke keranjang belanja');

        await agent.aiAction('Pilih metode pembayaran "Tunai"');

        // Skenario uang kurang
        await agent.aiAction('Ketik angka "5000" pada input jumlah uang (asumsi harga wortel lebih dari 5000), lalu klik tombol Bayar');

        // 4. AI Assert: Memeriksa apakah fitur uang kurang berfungsi
        console.log("Mengecek kebenaran UI...");
        await agent.aiAssert('Harus ada teks yang menampilkan tulisan "Kurang" dan memiliki nominal negatif seperti -Rp');

        // Tambah pelanggan
        await agent.aiAction('Ketik nama "Bu Budi" pada pencarian pelanggan, dan klik tombol Tambah Pelanggan Baru');

        await agent.aiAction('Klik tombol Selesai/Simpan Transaksi');

        console.log("✅ PENGUJIAN BERHASIL! Web POS Anda sudah berfungsi dengan baik untuk skenario uang kurang.");

    } catch (error) {
        console.error("❌ PENGUJIAN GAGAL. Web tidak merespons sesuai harapan:", error.message);
    } finally {
        // 5. Tutup browser setelah pengujian selesai
        await browser.close();
    }
})();