export type DocumentType =
  | 'surat_dinas'
  | 'surat_undangan'
  | 'surat_tugas'
  | 'surat_edaran'
  | 'surat_keterangan'
  | 'nota_dinas'
  | 'surat_pengantar'
  | 'berita_acara'
  | 'sk_camat'
  | 'laporan_kegiatan';

export interface AppSettings {
  nama_pemda: string;
  nama_instansi: string;
  kode_instansi: string;
  alamat: string;
  kode_pos: string;
  telepon: string;
  email: string;
  website: string;
  tempat_surat: string;
  camat_nama: string;
  camat_pangkat: string;
  camat_nip: string;
  camat_jabatan: string;
  sekcam_nama: string;
  sekcam_pangkat: string;
  sekcam_nip: string;
  sekcam_jabatan: string;
  kertas_default: 'F4' | 'A4';
  font_default: 'Times New Roman' | 'Arial' | 'Bookman Old Style';
  logo_mode: 'color' | 'bw';
  qr_mode: 'hybrid' | 'url' | 'offline';
  show_footer_tte: boolean;
  show_stempel: boolean;
  format_nomor: string;
  ai_provider: 'local' | 'gemini' | 'openai' | 'groq' | 'openrouter' | 'custom';
  ai_api_key: string;
  ai_model: string;
  ai_base_url: string;
  public_base_url: string;
}

export interface Pegawai {
  id?: number;
  nama: string;
  nip: string;
  pangkat: string;
  jabatan: string;
  unit: string;
  is_penandatangan: number | boolean;
}

export interface KlasifikasiItem {
  kode: string;
  nama: string;
}

export interface SuratDocument {
  id?: number;
  kode_verifikasi: string;
  hash_sha256: string;
  jenis_dokumen: DocumentType;
  kode_klasifikasi: string;
  nomor_urut: number;
  nomor_surat: string;
  sifat: string;
  lampiran: string;
  hal: string;
  tanggal_surat: string;
  tempat_surat: string;
  kepada: string;
  tembusan: string;
  body: Record<string, any>;
  penandatangan_nama: string;
  penandatangan_nip: string;
  penandatangan_pangkat: string;
  penandatangan_jabatan: string;
  atas_nama: string;
  status: string;
  ai_mode: string;
  ai_note?: string;
  prompt_asal: string;
  kertas: 'F4' | 'A4';
  font_family: string;
  show_stempel: boolean;
  qr_data_url?: string;
  qr_payload?: string;
  created_at?: string;
  updated_at?: string;
}

export const DOC_TYPES: {
  id: DocumentType;
  label: string;
  short: string;
  desc: string;
}[] = [
  { id: 'surat_dinas', label: 'Surat Dinas', short: 'Surat Dinas', desc: 'Korespondensi resmi OPD & Desa' },
  { id: 'surat_undangan', label: 'Surat Undangan', short: 'Undangan', desc: 'Rapat, Musrenbangcam, Sosialisasi' },
  { id: 'surat_tugas', label: 'Surat Tugas / SPT', short: 'Surat Tugas', desc: 'Penugasan staf & perjalanan dinas' },
  { id: 'surat_edaran', label: 'Surat Edaran', short: 'Edaran', desc: 'Imbauan/kebijakan untuk 7 Desa' },
  { id: 'surat_keterangan', label: 'Surat Ket. / Rekomendasi', short: 'PATEN / Ket.', desc: 'Layanan PATEN Domisili, Usaha, SKTM' },
  { id: 'nota_dinas', label: 'Nota Dinas', short: 'Nota Dinas', desc: 'Komunikasi internal antar pejabat' },
  { id: 'surat_pengantar', label: 'Surat Pengantar', short: 'Pengantar', desc: 'Pengiriman berkas/laporan resmi' },
  { id: 'berita_acara', label: 'Berita Acara', short: 'Berita Acara', desc: 'Serah terima, pemeriksaan, rapat' },
  { id: 'sk_camat', label: 'Keputusan Camat (SK)', short: 'SK Camat', desc: 'Penetapan tim, panitia, keputusan' },
  { id: 'laporan_kegiatan', label: 'Laporan Kegiatan', short: 'Laporan', desc: 'Laporan pelaksanaan tugas kecamatan' },
];

export const QUICK_PROMPTS: { label: string; jenis: DocumentType | 'auto'; prompt: string }[] = [
  {
    label: 'Undangan Rakor 7 Kades',
    jenis: 'surat_undangan',
    prompt:
      'Buatkan surat undangan rapat koordinasi ketahanan pangan dan evaluasi APBDes untuk seluruh Kepala Desa se-Kecamatan Muara Wis hari Rabu besok pukul 09.00 WITA di Aula Kantor Camat Muara Wis',
  },
  {
    label: 'Surat Tugas Monitoring Desa',
    jenis: 'surat_tugas',
    prompt:
      'Buatkan surat tugas untuk Rina Sari Dewi dan M. Ridwan melaksanakan monitoring posyandu dan penyaluran bantuan di Desa Melintang dan Desa Enggelam tanggal 26 November 2026',
  },
  {
    label: 'Edaran Kebersihan Sungai',
    jenis: 'surat_edaran',
    prompt:
      'Buatkan surat edaran camat tentang imbauan kerja bakti kebersihan lingkungan tepian Sungai Mahakam dan kewaspadaan banjir untuk 7 Kepala Desa dan masyarakat se-Kecamatan Muara Wis',
  },
  {
    label: 'Surat Keterangan Usaha (PATEN)',
    jenis: 'surat_keterangan',
    prompt:
      'Buatkan surat keterangan usaha atas nama Budi Santoso NIK 6402181203890001 warga RT 02 Desa Sebemban usaha budidaya ikan keramba untuk pengajuan KUR BRI',
  },
  {
    label: 'SK Camat Tim Verifikasi APBDes',
    jenis: 'sk_camat',
    prompt:
      'Buatkan SK Camat tentang pembentukan tim verifikasi rancangan APBDes se-Kecamatan Muara Wis tahun anggaran 2026',
  },
  {
    label: 'Berita Acara Serah Terima',
    jenis: 'berita_acara',
    prompt:
      'Buatkan berita acara serah terima bantuan sarana perikanan dan dokumen administrasi di Desa Muara Enggelam',
  },
  {
    label: 'Nota Dinas ke Camat',
    jenis: 'nota_dinas',
    prompt:
      'Buatkan nota dinas dari Sekretaris Camat ke Camat usulan pemeliharaan perangkat layanan PATEN dan printer kantor kecamatan',
  },
  {
    label: 'Pengantar Laporan SAKIP',
    jenis: 'surat_pengantar',
    prompt:
      'Buatkan surat pengantar pengiriman dokumen laporan SAKIP dan IKU Kecamatan Muara Wis tahun 2026 kepada Bupati Kutai Kartanegara',
  },
];
