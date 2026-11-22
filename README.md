# SI-NASKAH AI — Kecamatan Muara Wis

Mesin AI pembuat surat dinas dan dokumen resmi Kecamatan Muara Wis, Kabupaten Kutai Kartanegara, sesuai standar **Tata Naskah Dinas (Permendagri No. 1 Tahun 2023)**.

## Fitur Utama
- **Mesin AI Hybrid**: Langsung jalan tanpa API Key (AI Lokal Tata Naskah Dinas) + mendukung integrasi **Gemini / OpenAI / Groq / OpenRouter / Custom API Key** di menu Pengaturan.
- **10 Jenis Dokumen Resmi**: Surat Dinas, Surat Undangan, Surat Tugas/SPT, Surat Edaran, Surat Keterangan/Rekomendasi (PATEN), Nota Dinas, Surat Pengantar, Berita Acara, Keputusan Camat (SK), dan Laporan Kegiatan.
- **QR Code Tanda Tangan Elektronik (TTE) Camat**: Otomatis menghasilkan QR Code dengan sidik jari SHA-256 dan Portal Verifikasi Dokumen (`/verifikasi/{kode}`).
- **Siap Cetak Otomatis (F4 & A4) + Export Word (`.docx`)**: Kop surat resmi Lambang Kabupaten Kutai Kartanegara (Berwarna / Hitam-Putih), opsi Stempel Digital Kecamatan, cetak PDF/Printer langsung, dan export `.docx` native.
- **Buku Agenda & Penomoran Otomatis**: Tersimpan permanen di SQLite (`backend/data/muarawis_surat.db`) dengan klasifikasi arsip Kemendagri.

## Cara Menjalankan
```bash
chmod +x start.sh
./start.sh
```
Akses aplikasi di browser melalui port `8000`.
