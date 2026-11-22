# Panduan Deploy Cloud (Dapat URL Permanen Gratis/Murah) — SI-NASKAH Muara Wis

Paket **`muarawis-surat-siap-deploy.zip`** (`435 KB`) di workspace sudah disiapkan **khusus agar langsung jalan di Render, Railway, atau Koyeb** (sudah berisi frontend terkompilasi di `backend/static/`, `Dockerfile`, `render.yaml`, `railway.json`, serta fitur **Unduh Backup / Pulihkan JSON** di menu Pengaturan).

---

## Langkah 1: Download & Upload ke GitHub (2 Menit, Tanpa Coding)
1. Di panel file workspace sebelah kiri/viewer, unduh file **`muarawis-surat-siap-deploy.zip`** ke laptop/HP kamu.
2. **Ekstrak** file ZIP tersebut hingga muncul folder berisi: `Dockerfile`, `render.yaml`, `railway.json`, `backend/`, `frontend/`, dll.
3. Buka **[github.com](https://github.com)** → login → klik **+** (kanan atas) → **New repository**:
   - Isi **Repository name**: misalnya `si-naskah-muara-wis`
   - Pilih **Private** atau **Public** → klik **Create repository**.
4. Di halaman repo kosong yang baru dibuat, klik link **`uploading an existing file`**:
   - **Drag & drop seluruh isi folder hasil ekstrak** (`Dockerfile`, `render.yaml`, `railway.json`, folder `backend`, folder `frontend`, dll.) ke kotak upload.
   - *(Pastikan `Dockerfile` berada di halaman utama repo, bukan di dalam sub-folder ganda).*
   - Klik **Commit changes**.

---

## Langkah 2: Pilih Platform Cloud (Render Gratis / Railway Murah)

### Opsi A — Render.com (Gratis Rp 0 — Cocok untuk Uji Coba & Pakai Ringan)
1. Buka **[render.com](https://render.com)** → daftar / login pakai akun **GitHub** kamu.
2. Klik **New +** → pilih **Web Service**.
3. Pilih repository `si-naskah-muara-wis` → klik **Connect**.
4. Isi pengaturan (biasanya otomatis terisi):
   - **Name**: `si-naskah-muara-wis` *(nanti URL-nya jadi `https://si-naskah-muara-wis.onrender.com`)*
   - **Region**: **Singapore (Southeast Asia)** *(paling cepat dari Kalimantan Timur)*
   - **Language / Runtime**: **Docker**
   - **Instance Type**: **Free** (`$0/month`)
5. Klik **Create Web Service** → tunggu ~1–2 menit sampai status menjadi **Live**.
6. Selesai! Klik URL **`https://si-naskah-muara-wis.onrender.com`** — langsung terbuka dari HP/laptop mana pun, dan QR Code TTE Camat otomatis memakai URL tersebut!

> **Penting untuk Render Free Tier:**
> - Server gratis tidur otomatis jika tidak ada yang buka selama 15 menit (akan bangun lagi ~30 detik saat dibuka kembali), dan data SQLite bisa ter-reset saat redeploy.
> - Gunakan tombol **Pengaturan → Backup & Pulihkan Data Arsip (.JSON)** untuk mengunduh cadangan surat secara rutin atau memulihkannya 1 klik!

---

### Opsi B — Railway.app (~$5/bulan — Paling Stabil untuk Kantor Kecamatan, Database Permanen!)
Jika dipakai rutin harian oleh kantor Kecamatan Muara Wis agar server **tidak pernah tidur** dan **arsip surat permanen**:
1. Buka **[railway.app](https://railway.app)** → login pakai **GitHub**.
2. Klik **New Project → Deploy from GitHub Repo** → pilih `si-naskah-muara-wis`.
3. Railway otomatis build lewat `Dockerfile` (`railway.json`).
4. Masuk ke tab **Settings → Networking → Generate Domain** untuk mendapatkan URL permanen (`https://...up.railway.app`), atau sambungkan **Custom Domain** seperti `surat.muarawis.id`.
5. **Wajib agar Arsip Surat Permanen**:
   - Klik kanan pada service → **Add Volume** → isi Mount Path: **`/app/data`**
   - Atau masuk ke tab **Variables** → tambah `DB_PATH=/app/data/muarawis_surat.db`.

---

### Opsi C — Koyeb.com (Gratis 1 Web App + Region Singapore)
1. Buka **[app.koyeb.com](https://app.koyeb.com)** → login pakai **GitHub**.
2. **Create Web Service → GitHub** → pilih repo `si-naskah-muara-wis`.
3. Pilih **Builder: Dockerfile**, Region **Singapore**, Port **8000**, Instance **Free**.
4. Klik **Deploy** → langsung dapat URL `https://...koyeb.app`.

---

## Langkah 3 (Opsional): Pasang Domain Resmi Sendiri
Di Render, Railway, maupun Koyeb, masuk ke menu **Settings → Custom Domain**, masukkan subdomain (misalnya `surat.muarawis.kukarkab.go.id` atau `sinaskah.muarawis.id`), lalu arahkan DNS `CNAME` sesuai instruksi platformnya. SSL (`https://`) otomatis aktif gratis!
