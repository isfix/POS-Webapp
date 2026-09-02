# Panduan Operasional & Pemeliharaan: RotiKita Bakery POS

Dokumen ini adalah panduan standar operasional sistem, administrasi basis data Supabase, manajemen lingkungan (*environment variables*), dan prosedur verifikasi berkala untuk aplikasi **RotiKita Bakery POS**.

---

## 1. Setup Awal Proyek

### Kebutuhan Sistem
- **Node.js**: v18.17.0+ atau v20+
- **NPM**: v9+
- **Browser**: Google Chrome, Mozilla Firefox, Microsoft Edge, atau Safari versi modern.

### Langkah Instalasi
1. Clone repositori dan masuk ke direktori proyek:
   ```bash
   git clone <URL_REPOSITORI>
   cd POS
   ```
2. Pasang dependensi proyek:
   ```bash
   npm install
   ```
3. Salin dan konfigurasikan berkas lingkungan lokal:
   ```bash
   cp .env.example .env.local
   ```
4. Jalankan server pengembangan web Next.js:
   ```bash
   npm run dev
   ```
   Buka peramban di `http://localhost:3000`.

---

## 2. Setup Database Supabase

Seluruh skema DDL, indeks, RLS (*Row Level Security*), dan konfigurasi penyimpanan berkas didefinisikan secara deklaratif di [`supabase/schema.sql`](../supabase/schema.sql). Skema ini bersifat **idempoten** (`IF NOT EXISTS` dan `DROP POLICY IF EXISTS`), sehingga aman dijalankan berulang kali.

Pilih salah satu dari 2 metode penerapan berikut:

### Metode A: Melalui Supabase SQL Editor (Dashboard Web)
1. Buka Supabase SQL Editor proyek:
   [https://supabase.com/dashboard/project/qdrjunkvjtfiugzjbddl/sql](https://supabase.com/dashboard/project/qdrjunkvjtfiugzjbddl/sql)
2. Buat kueri baru (*New query*).
3. Salin seluruh isi berkas [`supabase/schema.sql`](../supabase/schema.sql) dan tempel ke editor.
4. Klik tombol **Run** (atau tekan `Ctrl+Enter`).
5. Pastikan semua pernyataan DDL berhasil dieksekusi (*Success. No rows returned*).

### Metode B: Melalui Connection String (`DATABASE_URL`)
1. Ambil URI koneksi basis data dari dashboard Supabase:
   **Project Settings** → **Database** → **Connection string** (Pilih mode *Transaction*, Port `6543`).
   Format: `postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`
2. Jalankan skrip DDL otomatis:
   ```bash
   DATABASE_URL="postgresql://postgres.qdrjunkvjtfiugzjbddl:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres" npm run db:apply
   ```
3. Skrip akan mengeksekusi seluruh 68 pernyataan DDL secara berurutan dan mengonfirmasi status penerapan.

---

## 3. Verifikasi & Pengujian Berkala

### 1. Deteksi Perubahan Skema (`npm run db:diff`)
Memeriksa apakah ada ketidaksesuaian (*schema drift*) antara kolom yang ada di database langsung (*live database*) dengan spesifikasi di [`supabase/schema.sql`](../supabase/schema.sql):
```bash
npm run db:diff
```
- **Keluaran Sukses (Exit 0)**: `Schema Diff Summary: 9/9 tables synchronized. ✅ Schema is 100% synchronized with no drift!`
- **Keluaran Drift (Exit 1)**: Menampilkan daftar tabel/kolom yang belum sinkron beserta saran perbaikannya.

### 2. Pengujian Menyeluruh / E2E Smoke Tests (`npm run db:smoke`)
Menjalankan pengujian keamanan RLS dan siklus CRUD lengkap langsung ke server Supabase:
```bash
npm run db:smoke
```
**Tahapan Pengujian (6 Fase)**:
1. **RLS Anon Gate**: Memastikan pengguna anonim hanya bisa melihat menu aktif dan dicegah mengakses data pesanan/keuangan sensitif.
2. **Auth Lifecycle**: Membuat sesi pengguna staf terotentikasi secara aman.
3. **CRUD `menu_items`**: Pengujian tambah produk, baca detail, ubah harga, dan hapus produk.
4. **CRUD `inventory`**: Pengujian pencatatan bahan baku, mutasi kuantitas stok, dan audit logistik.
5. **CRUD `orders`**: Pengujian transaksi POS kasir, verifikasi total nominal, dan pembatalan pesanan.
6. **Session Revocation & Cleanup**: Pembersihan data uji (*try/finally safety pass*) dan pencabutan token sesi.

---

## 4. Daftar Perintah NPM (Scripts)

| Perintah | Fungsi | Lingkungan |
|---|---|---|
| `npm run dev` | Menjalankan server lokal Next.js (port 3000) dengan hot-reload | Development |
| `npm run typecheck` | Menjalankan validasi ketat TypeScript (`tsc --noEmit`) | CI / Pre-commit |
| `npm run build` | Melakukan kompilasi & optimasi produksi Next.js | Production Build |
| `npm start` | Menjalankan server Next.js mode produksi | Production |
| `npm run lint` | Memeriksa format & aturan kode ESLint | Development |
| `npm run test` | Menjalankan pengujian unit Vitest (`vitest run`) | Testing / CI |
| `npm run test:watch` | Menjalankan Vitest dalam mode watch interaktif | Development |
| `npm run db:apply` | Menerapkan/memvalidasi skema basis data `supabase/schema.sql` | Migration / Admin |
| `npm run db:diff` | Memeriksa integritas kolom 9 tabel publik live terhadap skema | Audit / CI |
| `npm run db:smoke` | Menjalankan pengujian integrasi E2E dan verifikasi RLS live | Verification |

---

## 5. Variabel Lingkungan (*Environment Variables*)

Konfigurasikan variabel lingkungan pada berkas `.env.local`:

### Variabel Sisi Klien (`NEXT_PUBLIC_*`)
*Variabel ini dibundel ke sisi browser pengguna secara aman untuk koneksi publik:*

| Variabel | Kebutuhan | Deskripsi & Contoh Nilai |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Wajib** | URL endpoint REST Supabase, contoh: `https://qdrjunkvjtfiugzjbddl.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Wajib** | Kunci API anonim publik Supabase (guarded oleh RLS) |
| `NEXT_PUBLIC_SUPABASE_BUCKET_NAME` | Opsional | Nama bucket penyimpanan foto produk/aset (Default: `assets`) |
| `NEXT_PUBLIC_SENTRY_DSN` | Opsional | DSN Sentry untuk pemantauan error & exception reporting |
| `NEXT_PUBLIC_LOG_ENDPOINT` | Opsional | Endpoint HTTP/Beacon penerima log terstruktur klien (contoh: `/api/log`) |

### Variabel Sisi Server (Server-Only & Secrets)
*Variabel ini HANYA dibaca di server / API route handler dan TIDAK PERNAH dikirim ke bundle JavaScript klien:*

| Variabel | Kebutuhan | Deskripsi & Contoh Nilai |
|---|---|---|
| `GEMINI_API_KEY` | **Wajib untuk AI** | API Key Google Gemini untuk fitur asisten toko Aura AI & parsing data NLP |
| `SUPABASE_SERVICE_ROLE_KEY` | Opsional (Admin) | Kunci rahasia master Supabase (digunakan pada skrip migrasi/smoke-test) |
| `DATABASE_URL` / `SUPABASE_DB_URL` | Opsional (CLI) | Connection string PostgreSQL langsung untuk `npm run db:apply` |

---

## 6. Prosedur Cadangan & Pemulihan (*Backup & Recovery*)

### Cadangan Data (*Backup*)
1. **Melalui Dashboard Supabase**:
   - Buka **Project Settings** → **Database** → **Backups**.
   - Supabase menyediakan cadangan harian otomatis (*Daily automated backups*).
2. **Ekspor Manual via Dashboard (CSV / JSON)**:
   - Masuk ke **Table Editor** untuk masing-masing tabel (`menu_items`, `inventory`, `orders`, `expenses`, `assets`).
   - Klik **Export data** → **Export to CSV**.
3. **Ekspor Database via `pg_dump`**:
   ```bash
   pg_dump "postgresql://postgres.qdrjunkvjtfiugzjbddl:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres" > backup_rotikita_$(date +%Y%m%d).sql
   ```

### Pemulihan Data (*Recovery*)
1. Jalankan skrip inisialisasi skema struktur:
   ```bash
   DATABASE_URL="postgresql://..." npm run db:apply
   ```
2. Pulihkan data cadangan menggunakan `psql`:
   ```bash
   psql "postgresql://..." < backup_rotikita_YYYYMMDD.sql
   ```

---

## 7. Pemecahan Masalah (*Troubleshooting*)

### Masalah 1: Transaksi Kasir Mengalami RLS Block / Gagal Sinkron
- **Penyebab**: Pengguna belum masuk (*logged in*) menggunakan akun staf Supabase asli dan mencoba menulis data sensitif ke tabel live.
- **Solusi**:
  - Untuk mode latihan/demo kasir: Aplikasi secara otomatis menyimpan transaksi di `localStorage` (`rotikita_orders`) tanpa mengganggu database live.
  - Untuk mode toko resmi: Masuk melalui menu `/login` dengan kredensial staf kasir terdaftar di Supabase Auth.

### Masalah 2: Data Kasir atau Inventaris di Browser Tidak Berubah
- **Penyebab**: Cache `localStorage` lokal tersimpan dari sesi demonstrasi sebelumnya.
- **Solusi**:
  - Buka *Developer Tools* browser (`F12` / `Ctrl+Shift+I`).
  - Pilih tab **Application** → **Local Storage** → Bersihkan kunci berawalan `rotikita_*`.
  - Muat ulang halaman (`Ctrl+F5`).

### Masalah 3: Kunci API Gemini Bocor / Limit Tercapai
- **Penyebab**: Kunci API dipanggil dari berkas komponen klien.
- **Solusi**:
  - Pastikan variabel `GEMINI_API_KEY` **TIDAK** menggunakan awalan `NEXT_PUBLIC_`.
  - Seluruh panggilan AI telah dipusatkan melalui server-side API routes di [`src/app/api/ai/chat/route.ts`](../src/app/api/ai/chat/route.ts) dan [`src/app/api/ai/data-entry/route.ts`](../src/app/api/ai/data-entry/route.ts).

---

## 8. Observabilitas, Log Terstruktur & Audit Trail

### 1. Logger Terstruktur (`src/lib/logger.ts`)
Aplikasi menggunakan logger JSON terstruktur murni (*zero-dependency*) yang kompatibel di lingkungan peramban (browser) dan server (Node.js).

**Format Standar Baris Log (JSON)**:
```json
{
  "timestamp": "2026-09-02T05:15:30.124Z",
  "level": "info",
  "message": "[AUDIT] Transaksi Kasir ord-1788301234 (3 item - Rp 45.000)",
  "app": "rotikita-pos-webapp",
  "env": "production",
  "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "url": "/pos",
  "context": {
    "total": 45000,
    "paymentMethod": "QRIS",
    "itemCount": 3
  }
}
```

### 2. Integrasi Sentry Opsional (`src/lib/sentry.ts`)
- Jika variabel `NEXT_PUBLIC_SENTRY_DSN` tidak diatur, modul bertindak sebagai *safe no-op* tanpa membebani ukuran bundel.
- Jika diatur dan pustaka `@sentry/nextjs` terpasang, exception akan otomatis diteruskan ke dashboard Sentry.
- Seluruh uncaught exception pada root halaman ditangkap oleh [`src/app/global-error.tsx`](../src/app/global-error.tsx).

### 3. Log Audit Sistem & Micro-Batching (`src/actions/audit.ts`)
- Setiap mutasi pada katalog menu, stok bahan baku, pengeluaran operasional, aset toko, dan checkout POS kasir mencatat audit log otomatis melalui `recordAudit()`.
- **Micro-batching**: Jika terjadi mutasi beruntun dalam 1 detik, log akan dikelompokkan dan dikirim dalam satu permintaan (*batch insert*) ke tabel `activity_logs`.
- **Tampilan Audit**: Dapat dipantau langsung pada tab **Log Aktivitas** di menu `/data` serta diekspor ke format Excel (.xlsx).

---

## 9. Pengujian Terotomatisasi (*Testing Suite*)

Aplikasi dilengkapi dengan strategi pengujian berlapis yang mencakup **Unit Testing (Vitest)**, **Integrasi Basis Data & Logika**, serta **End-to-End UI Testing (Playwright)**.

### 1. Pengujian Unit & Logika Murni (Vitest)
Menjalankan pengujian cepat untuk modul inti, fallback penyimpanan offline, antrean transaksi kasir, dan kalkulasi keuangan tanpa fake fallback data:

```bash
npm run test        # Menjalankan seluruh unit test (mode headless)
npm run test:watch  # Menjalankan unit test dengan hot-reload saat file diedit
npm run test:ui     # Membuka antarmuka visual Vitest di browser
```

**Cakupan Berkas Uji Unit (`src/**/__tests__/*`)**:
- [`src/lib/__tests__/logger.test.ts`](../src/lib/__tests__/logger.test.ts): Memvalidasi struktur baris JSON log, level logging, pelacakan sessionId, dan error formatting.
- [`src/lib/__tests__/db.test.ts`](../src/lib/__tests__/db.test.ts): Menguji helper `withFallback` (kondisi Supabase online, offline fallback, unconfigured, fallbackDefault) dan `mutateWithLocalSync`.
- [`src/lib/__tests__/order-queue.test.ts`](../src/lib/__tests__/order-queue.test.ts): Menguji antrean pesanan offline (`rotikita_pending_orders`), batas maksimal antrean (50), gating otentikasi sesi staf, dan retensi counter percobaan saat kegagalan jaringan.
- [`src/lib/__tests__/audit.test.ts`](../src/lib/__tests__/audit.test.ts): Memverifikasi penulisan optimistik ke `rotikita_activity_logs`, mekanisme micro-batching 1 detik, dan toleransi kegagalan jaringan.
- [`src/lib/__tests__/supabase.test.ts`](../src/lib/__tests__/supabase.test.ts): Menguji heuristik validator kredensial Supabase (`isSupabaseConfigured`) dan inisialisasi aman tanpa crash saat environment variable kosong.
- [`src/actions/__tests__/financials.test.ts`](../src/actions/__tests__/financials.test.ts): Memvalidasi bahwa kalkulasi keuangan, laba kotor, dan HPP menghasilkan nilai exact 0 (bebas dari nilai angka palsu / fake numbers).
- [`src/actions/__tests__/ai.test.ts`](../src/actions/__tests__/ai.test.ts): Menguji respon jujur saat model offline dan parser NLP yang mengembalikan `price: 0` tanpa fallback hardcoded fake price.

### 2. Pengujian Antarmuka Pengguna E2E (Playwright)
Menguji alur kerja nyata kasir dan manajemen di peramban Chromium langsung:

```bash
npm run test:e2e     # Menjalankan seluruh skenario E2E Playwright
npm run test:e2e:ui  # Membuka Playwright UI interaktif untuk debugging
npm run test:all     # Menjalankan Vitest unit tests + Playwright E2E sekaligus
```

**Skenario Pengujian E2E (`tests/e2e/*`)**:
- [`tests/e2e/pos-checkout.spec.ts`](../tests/e2e/pos-checkout.spec.ts):
  1. *Demo Login Flow*: Masuk melalui tombol Masuk Demo Kasir dan verifikasi navigasi ke `/dashboard`.
  2. *Add to Cart*: Memilih menu roti dari katalog dan memverifikasi pembaruan panel pesanan & subtotal.
  3. *POS Checkout & Reset*: Memilih nominal "Uang Pas", menyelesaikan pembayaran kasir, menampilkan notifikasi sukses, dan mengosongkan keranjang.
  4. *Order Persistence*: Memverifikasi data transaksi kasir tersimpan di `localStorage.rotikita_orders` dengan format field snake_case (`gross_revenue`, `total_cost`, `total_profit`, `payment_method`).
- [`tests/e2e/inventory-crud.spec.ts`](../tests/e2e/inventory-crud.spec.ts):
  1. *Inventory CRUD*: Membuka modal tambah bahan baku, mengisi nama, kuantitas, ambang batas, dan harga beli, serta memastikan baris data baru muncul di tabel inventaris.
  2. *Low Stock Alert*: Memastikan indikator peringatan stok menipis muncul saat kuantitas bahan baku berada di bawah ambang batas minimum (*minimum threshold*).

### 3. Panduan Menambahkan Pengujian Baru
- **Unit Test Baru**: Buat berkas baru di direktori `src/**/__tests__/[nama-fitur].test.ts`. Gunakan stub `localStorage` dan mock `@/lib/supabase` untuk menguji isolasi logika murni.
- **E2E Spec Baru**: Tambahkan berkas skenario di `tests/e2e/[nama-fitur].spec.ts`. Gunakan `data-testid` pada tombol/input utama untuk memastikan selektor stabil terhadap perubahan tata letak visual.

### 4. Rencana Integrasi CI/CD Masa Depan (*Continuous Integration Note*)
Ketika repositori dihubungkan ke GitHub Actions, pipeline verifikasi otomatis dapat dikonfigurasikan pada setiap *Pull Request* dengan menjalankan:
```yaml
# Contoh alur verifikasi PR GitHub Actions:
- name: Install Dependencies
  run: npm ci
- name: Run Unit Tests
  run: npm run test
- name: Verify TypeScript Types
  run: npm run typecheck
- name: Build Production Bundle
  run: npm run build
- name: Run E2E Smoke & Schema Diff
  run: |
    npm run test:e2e
    npm run db:diff
```

---

## 10. Kinerja & Analisis Ukuran Bundel (*Performance & Bundle Analysis*)

Untuk menjamin kecepatan pemuatan (*fast initial page load*) pada perangkat kasir POS dan tablet toko, aplikasi menerapkan strategi pemisahan kode (*route-level code splitting*) dan analisis bundel terotomatisasi.

### 1. Menjalankan Penganalisis Bundel (*Bundle Analyzer*)
Gunakan perintah `npm run analyze` untuk membangun bundel produksi dan menghasilkan peta visual (*treemap*) distribusi modul:

```bash
npm run analyze
```
Setelah proses kompilasi selesai, buka berkas laporan visual di peramban:
- **Client Bundle Treemap**: `.next/analyze/client.html`
- **Node.js Server Modules**: `.next/analyze/nodejs.html`
- **Edge Runtime Modules**: `.next/analyze/edge.html`

### 2. Bottleneck Utama & Strategi *Code Splitting*
1. **Pustaka Grafik Recharts (~200+ kB)**:
   - *Masalah*: Mengimpor `recharts` secara statis menyebabkan pembengkakan ukuran halaman dasbor dan laporan.
   - *Solusi*: Komponen grafik (`SalesChart`, `ProfitChart`, `MonthlySalesChart`) dimuat secara dinamis via `next/dynamic` dengan opsi `{ ssr: false, loading: () => <Skeleton /> }`.
2. **Pustaka Ekspor Excel `xlsx` (~230 kB)**:
   - *Masalah*: Ekspor Excel hanya dibutuhkan sesekali saat tombol diklik oleh pengguna, namun sebelumnya terbundel di halaman inisial.
   - *Solusi*: Seluruh fungsi ekspor diubah menjadi *dynamic asynchronous import* (`const xlsx = await import('xlsx');`), sehingga pustaka `xlsx` hanya diunduh dari server saat pengguna mengklik tombol "Ekspor Excel".
3. **Pustaka Lokalisasi `date-fns`**:
   - *Solusi*: Menggunakan subpath langsung `import { id as idLocale } from 'date-fns/locale/id'` untuk menghindari impor *barrel* seluruh bahasa dunia.
4. **Optimasi Gambar Produk (`next/image`)**:
   - *Solusi*: Mengaktifkan optimasi bawaan Next.js dengan `remotePatterns` untuk domain CDN Unsplash (`images.unsplash.com`) dan Supabase Storage.

### 3. Hasil Pengukuran Sebelum & Sesudah (*Before vs After*)

| Rute Halaman | Ukuran Sebelum (First Load JS) | Ukuran Sesudah (First Load JS) | Efisiensi Reduksi |
|---|---|---|---|
| `/dashboard` | 271 kB | **169 kB** | **-102 kB (-37.6%)** |
| `/reports/end-of-month` | 376 kB | **162 kB** | **-214 kB (-56.9%)** |
| `/inventory` | 338 kB | **223 kB** | **-115 kB (-34.0%)** |
| `/data` | 346 kB | **231 kB** | **-115 kB (-33.2%)** |
| `/assets` | 338 kB | **224 kB** | **-114 kB (-33.7%)** |
| `/expenses` | 337 kB | **223 kB** | **-114 kB (-33.8%)** |
| `/financials/projections` | 309 kB | **195 kB** | **-114 kB (-36.9%)** |
| `/reports/daily-sales` | 313 kB | **198 kB** | **-115 kB (-36.7%)** |
| `/reports/end-of-day` | 275 kB | **160 kB** | **-115 kB (-41.8%)** |
| `/reports/financial-statements` | 321 kB | **207 kB** | **-114 kB (-35.5%)** |
| **Shared First Load JS** | 102 kB | **102 kB** | *Optimal baseline* |

---

## 11. Pencetakan Struk Kasir & Riwayat Transaksi (*Receipt Printing & Thermal Setup*)

Aplikasi RotiKita POS dilengkapi modul pencetakan struk termal standar 80mm/58mm yang dioptimalkan untuk mesin cetak kasir (POS thermal printer) serta opsi unduh file HTML mandiri untuk arsip offline.

### 1. Cara Kerja Pencetakan Peramban (*Browser Thermal Printing*)
- Modul `src/lib/print.ts` menggunakan mekanisme *hidden iframe* yang terisolasi untuk menyuntikkan dokumen struk berformat termal (font monospace kontras tinggi, layout 80mm, garis putus-putus) langsung ke dialog cetak peramban (`window.print()`).
- Keunggulan metode ini adalah **tidak memicu pemblokir pop-up (*popup blocker*)** pada browser kasir Chrome/Edge/Safari dan tidak merusak tata letak halaman utama kasir.
- Pada dialog cetak sistem (Ctrl+P / Command+P):
  1. Pilih printer termal (misal: *Epson TM-T82, Xprinter, Sunmi POS*).
  2. Atur ukuran kertas ke **80mm Roll** atau **58mm Roll**.
  3. Matikan opsi *"Headers and footers"* bawaan peramban agar waktu dan URL browser tidak ikut tercetak pada kertas struk.
  4. Margin diatur ke **None / Minimum**.

### 2. Panduan Menghubungkan Printer Termal (*Thermal Printer Setup*)
- **Desktop / Laptop (Windows/macOS/Linux)**: Pasang driver USB/Bluetooth printer termal dan tetapkan sebagai *Default Printer* atau pilih dari daftar dropdown dialog cetak browser.
- **Chrome OS / Android POS Tablet**: Hubungkan via Bluetooth atau USB OTG melalui menu `chrome://devices` atau pengaturan pencetakan OS (*Default Print Service*).

### 3. Opsi Unduh Berkas HTML (*HTML Receipt Download Fallback*)
- Jika kasir belum memiliki printer fisik yang terhubung atau pelanggan meminta bukti transaksi digital, kasir dapat mengklik tombol **"Unduh HTML"**.
- Berkas `Struk_[ORDER_ID].html` mandiri (*standalone*) akan tersimpan di komputer kasir dan dapat dibuka atau dicetak kapan saja dari perangkat apa pun tanpa membutuhkan koneksi internet.

### 4. Cetak Ulang dari Riwayat Struk (*Reprint from History*)
- Buka menu **Laporan → Riwayat Struk** (`/reports/receipts`).
- Tabel menampilkan 50 transaksi terakhir yang tersimpan di database Supabase atau fallback lokal `rotikita_orders`.
- Kasir dapat melakukan pratinjau struk (ikon mata), mengunduh HTML, atau mengklik **"Cetak"** untuk mencetak ulang struk secara instan.

### 5. Pengaturan Profil Toko Roti (*Bakery Settings Note*)
- Nilai nama toko, alamat, dan nomor telepon struk saat ini menggunakan konstanta standar di `DEFAULT_BAKERY_SETTINGS` (`src/lib/print.ts`).
- *TODO*: Integrasi masa depan akan memuat nama/alamat secara dinamis dari pengaturan profil toko (`/settings` → Supabase `settings` table).

---

## 12. Rekonsiliasi Kasir & Tutup Shift Harian (*Daily Cash Reconciliation*)

Fitur Rekonsiliasi Kasir (`/reports/daily-close`) menjamin integritas uang tunai fisik di laci kasir dengan membandingkan saldo modal awal dan seluruh penjualan tunai yang tercatat pada sistem.

### 1. Alur Operasional Shift (*Shift Operational Workflow*)
1. **Buka Shift (Awal Hari Kerja)**:
   - Kasir/Manajer membuka menu **Laporan → Tutup Kasir Harian** (`/reports/daily-close`).
   - Masukkan nominal **Modal Kasir Awal (*Opening Float*)** di laci (misal: Rp 200.000 untuk uang kembalian).
   - Klik **"Buka Shift Kasir Sekarang"**.
2. **Operasional & Transaksi Penjualan**:
   - Seluruh transaksi kasir POS tunai dan non-tunai (QRIS) berlangsung seperti biasa.
   - Sistem secara otomatis menghitung akumulasi omzet penjualan tunai (*cash sales*) dan non-tunai.
3. **Hitung Fisik (Akhir Hari Kerja)**:
   - Di akhir shift, manajer/kasir menghitung seluruh uang fisik (kertas & koin) yang ada di laci kasir.
   - Masukkan total nominal fisik ke kolom **"Uang Fisik Dihitung di Laci (Rp)"**.
4. **Tutup Shift & Simpan Rekonsiliasi**:
   - Sistem melakukan verifikasi variansi instan: `Selisih = Uang Fisik - (Modal Awal + Penjualan Tunai)`.
   - Jika `Selisih == 0`, status shift menjadi **"Shift Selesai (Pas)"**.
   - Jika `Selisih != 0`, status shift ditandai **"Ada Selisih (*Discrepancy*)"** dan kasir dapat menambahkan catatan keterangan.
   - Klik **"Tutup Shift & Simpan Rekonsiliasi"**. Data tersimpan ke Supabase `cash_reconciliations` dan log audit otomatis tercatat.

### 2. Urgensi & Manfaat Rekonsiliasi Kas (*Why Daily Close Matters*)
- **Pencegahan Kecurangan & Fraud Kasir**: Memastikan tidak ada transaksi tunai yang tidak diinput atau uang laci yang hilang.
- **Deteksi Dini Kesalahan Kembalian**: Mengetahui selisih uang receh akibat pembulatan atau salah hitung kembalian pelanggan.
- **Audit & Kepatuhan Keuangan**: Mempermudah tim akuntansi dalam mencocokkan saldo setor bank dan buku kas harian toko roti.

### 3. Batas Toleransi Selisih (*Variance Handling*)
- Setiap perbedaan nominal sekecil apa pun (bahkan Rp 500) akan ditandai dengan indikator peringatan warna merah/oranye untuk transparansi audit.
- Untuk selisih karena pembulatan atau kembalian permen, staf wajib mencantumkan alasan pada kolom **"Catatan / Keterangan"**.





