import { AppSettings, DocumentType, SuratDocument } from '../types';

const BULAN_INDO = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const HARI_INDO = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export function formatTanggalIndo(isoDate: string): string {
  if (!isoDate) return '-';
  const m = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return isoDate;
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const day = parseInt(m[3], 10);
  if (month < 1 || month > 12) return isoDate;
  return `${day} ${BULAN_INDO[month - 1]} ${year}`;
}

export function formatHariTanggalIndo(isoDate: string): string {
  if (!isoDate) return '-';
  const d = new Date(isoDate.slice(0, 10) + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return isoDate;
  return `${HARI_INDO[d.getDay()]}, ${d.getDate()} ${BULAN_INDO[d.getMonth()]} ${d.getFullYear()}`;
}

export function getPaperDimensions(kertas: 'F4' | 'A4') {
  if (kertas === 'A4') {
    return { widthMm: 210, heightMm: 297, label: 'A4 (210 × 297 mm)' };
  }
  return { widthMm: 215, heightMm: 330, label: 'F4 / Folio (215 × 330 mm)' };
}

export function getDefaultBodyForType(jenis: DocumentType, settings: AppSettings): Record<string, any> {
  const today = new Date().toISOString().slice(0, 10);
  switch (jenis) {
    case 'surat_undangan':
      return {
        pembuka:
          'Dengan hormat, dalam rangka meningkatkan koordinasi penyelenggaraan pemerintahan dan pelayanan publik di wilayah Kecamatan Muara Wis, bersama ini kami mengundang Bapak/Ibu/Saudara untuk hadir pada kegiatan yang akan dilaksanakan pada:',
        hari_tanggal: formatHariTanggalIndo(today),
        waktu: '09.00 WITA s.d. selesai',
        tempat: 'Aula Kantor Camat Muara Wis, Jl. Patin RT. 08 No. 33',
        acara: 'Rapat Koordinasi Pemerintahan Kecamatan Muara Wis',
        isi_paragraf: [
          'Mengingat pentingnya agenda pembahasan tersebut, dimohon kehadirannya tepat pada waktunya.',
        ],
        catatan_undangan: 'Harap membawa data pendukung sesuai bidang tugas masing-masing.',
        penutup: 'Demikian undangan ini disampaikan. Atas perhatian dan kehadirannya diucapkan terima kasih.',
      };
    case 'surat_tugas':
      return {
        dasar: [
          'Undang-Undang Nomor 23 Tahun 2014 tentang Pemerintahan Daerah;',
          'Program Kerja Kecamatan Muara Wis Tahun Anggaran 2026.',
        ],
        petugas: [
          {
            nama: 'Rina Sari Dewi, S.AP',
            pangkat: 'Penata (III/c)',
            nip: '198409152010012014',
            jabatan: 'Kasi Pemerintahan',
          },
        ],
        tujuan_tugas: [
          'Melaksanakan monitoring dan koordinasi lapangan di wilayah Kecamatan Muara Wis;',
          'Melaporkan hasil pelaksanaan tugas secara tertulis kepada Camat Muara Wis.',
        ],
        penutup: 'Demikian Surat Tugas ini dibuat untuk dilaksanakan dengan penuh rasa tanggung jawab.',
      };
    case 'surat_edaran':
      return {
        judul_tentang: 'PENINGKATAN KETERTIBAN, KEBERSIHAN LINGKUNGAN, DAN PELAYANAN PUBLIK',
        isi_paragraf: [
          'Dalam rangka menjaga kondusivitas wilayah serta meningkatkan kualitas lingkungan dan pelayanan kepada masyarakat di Kecamatan Muara Wis, bersama ini disampaikan kepada seluruh Kepala Desa dan unsur masyarakat hal-hal sebagai berikut:',
        ],
        poin_edaran: [
          'Mengaktifkan kegiatan gotong royong kebersihan lingkungan dan drainase di setiap RT/Desa;',
          'Meningkatkan kesiapsiagaan terhadap potensi banjir dan perubahan cuaca di wilayah Sungai Mahakam serta Danau Melintang/Semayang;',
          'Melaporkan perkembangan situasi wilayah secara berjenjang kepada Camat Muara Wis.',
        ],
        penutup: 'Demikian Surat Edaran ini disampaikan untuk dipedomani dan dilaksanakan sebagaimana mestinya.',
      };
    case 'surat_keterangan':
      return {
        judul_surat: 'SURAT KETERANGAN',
        pembuka:
          'Yang bertanda tangan di bawah ini, Camat Muara Wis Kabupaten Kutai Kartanegara Provinsi Kalimantan Timur, menerangkan dengan sebenarnya bahwa:',
        pemohon_nama: 'Syahrial Rahman',
        pemohon_nik: '6402181504880002',
        pemohon_ttl: 'Muara Wis, 15 April 1988',
        pemohon_jk: 'Laki-laki',
        pemohon_pekerjaan: 'Nelayan / Pembudidaya Ikan Keramba',
        pemohon_alamat: 'RT. 03 Desa Muara Wis, Kecamatan Muara Wis, Kab. Kutai Kartanegara',
        keterangan_isi:
          'Nama tersebut di atas benar merupakan penduduk yang berdomisili di wilayah Kecamatan Muara Wis dan benar memiliki usaha/aktivitas tersebut serta berkelakuan baik.',
        keperluan: 'Kelengkapan Administrasi Pengajuan Kredit Usaha Rakyat (KUR)',
        penutup: 'Demikian Surat Keterangan ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.',
      };
    case 'nota_dinas':
      return {
        kepada_internal: 'Camat Muara Wis',
        dari: 'Sekretaris Camat Muara Wis',
        isi_paragraf: [
          'Dengan hormat, bersama ini kami sampaikan usulan dan laporan koordinasi pelaksanaan kegiatan administrasi perkantoran dan layanan PATEN di Kantor Camat Muara Wis.',
          'Sehubungan dengan hal tersebut, mohon arahan dan persetujuan Bapak Camat guna kelancaran tindak lanjut pelaksanaannya.',
        ],
        penutup: 'Demikian Nota Dinas ini disampaikan. Atas perhatian Bapak diucapkan terima kasih.',
      };
    case 'surat_pengantar':
      return {
        items: [
          {
            naskah: 'Laporan Evaluasi Kinerja Kecamatan Muara Wis Tahun 2026',
            banyaknya: '1 (satu) Berkas',
            keterangan: 'Disampaikan dengan hormat untuk bahan evaluasi.',
          },
        ],
        penerima_jabatan: 'Petugas Tata Usaha / Penerima',
      };
    case 'berita_acara':
      return {
        judul_acara: 'SERAH TERIMA DOKUMEN DAN BARANG INVENTARIS',
        pembuka: `Pada hari ${formatHariTanggalIndo(today)}, bertempat di Kantor Camat Muara Wis, kami yang bertanda tangan di bawah ini:`,
        pihak_pertama: {
          nama: settings.camat_nama,
          nip_nik: `NIP. ${settings.camat_nip}`,
          jabatan: settings.camat_jabatan,
          instansi: 'Kecamatan Muara Wis, Kab. Kutai Kartanegara',
        },
        pihak_kedua: {
          nama: 'Kepala Desa Muara Wis',
          nip_nik: 'NIK. -',
          jabatan: 'Kepala Desa',
          instansi: 'Pemerintah Desa Muara Wis',
        },
        poin_kesepakatan: [
          'PIHAK PERTAMA telah menyerahkan kepada PIHAK KEDUA dokumen/barang sesuai daftar terlampir dalam kondisi baik dan lengkap;',
          'PIHAK KEDUA telah menerima dan memeriksa kelengkapan objek serah terima tersebut untuk dimanfaatkan sesuai ketentuan.',
        ],
        saksi: ['1. Sekretaris Camat Muara Wis', '2. Kasi Pemerintahan Kecamatan Muara Wis'],
        penutup: 'Demikian Berita Acara ini dibuat untuk dipergunakan sebagaimana mestinya.',
      };
    case 'sk_camat':
      return {
        judul_tentang: 'PEMBENTUKAN TIM EVALUASI DAN PEMBINAAN ADMINISTRASI DESA KECAMATAN MUARA WIS TAHUN 2026',
        menimbang: [
          'bahwa dalam rangka tertib administrasi pemerintahan desa di wilayah Kecamatan Muara Wis, dipandang perlu membentuk Tim Evaluasi dan Pembinaan;',
          'bahwa berdasarkan pertimbangan pada huruf a, perlu menetapkan Keputusan Camat Muara Wis.',
        ],
        mengingat: [
          'Undang-Undang Nomor 23 Tahun 2014 tentang Pemerintahan Daerah;',
          'Undang-Undang Nomor 6 Tahun 2014 tentang Desa sebagaimana telah diubah dengan Undang-Undang Nomor 3 Tahun 2024;',
          'Peraturan Pemerintah Nomor 17 Tahun 2018 tentang Kecamatan.',
        ],
        diktum: [
          {
            label: 'KESATU',
            isi: 'Membentuk Tim Evaluasi dan Pembinaan Administrasi Desa se-Kecamatan Muara Wis Tahun Anggaran 2026.',
          },
          {
            label: 'KEDUA',
            isi: 'Tim bertugas melakukan pembinaan, verifikasi dokumen perencanaan, serta pelaporan berkala kepada Camat Muara Wis.',
          },
          {
            label: 'KETIGA',
            isi: 'Keputusan ini mulai berlaku sejak tanggal ditetapkan.',
          },
        ],
      };
    case 'laporan_kegiatan':
      return {
        judul_laporan: 'LAPORAN PELAKSANAAN KEGIATAN KOORDINASI PEMERINTAHAN',
        pendahuluan:
          'Dalam rangka meningkatkan efektivitas pelaksanaan program kerja Kecamatan Muara Wis, telah dilaksanakan kegiatan koordinasi bersama Pemerintah Desa.',
        dasar_pelaksanaan: 'Program Kerja Kecamatan Muara Wis Tahun 2026.',
        maksud_tujuan: 'Mewujudkan sinergi tata kelola pemerintahan dan pelayanan masyarakat yang responsif.',
        waktu_tempat: `${formatHariTanggalIndo(today)}, pukul 09.00 WITA bertempat di Aula Kantor Camat Muara Wis.`,
        peserta: 'Camat, Sekretaris Camat, para Kasi, dan perwakilan 7 Desa se-Kecamatan Muara Wis.',
        hasil_kegiatan: [
          'Kegiatan berjalan lancar dengan kehadiran seluruh perwakilan desa;',
          'Disepakati jadwal pelaporan rutin dan sinkronisasi data desa.',
        ],
        hambatan_saran: 'Kondisi geografis perairan diantisipasi dengan koordinasi terjadwal.',
        kesimpulan: 'Kegiatan terlaksana sesuai target dan mendukung capaian kinerja Kecamatan Muara Wis.',
      };
    default:
      return {
        pembuka:
          'Dengan hormat, dalam rangka kelancaran koordinasi penyelenggaraan pemerintahan dan pelayanan publik di Kecamatan Muara Wis, bersama ini kami sampaikan hal-hal sebagai berikut:',
        isi_paragraf: [
          'Sehubungan dengan hal tersebut, dimohon kerja sama Bapak/Ibu/Saudara untuk segera menindaklanjuti sesuai ketentuan yang berlaku.',
        ],
        penutup: 'Demikian disampaikan, atas perhatian dan kerja samanya diucapkan terima kasih.',
      };
  }
}

export function createBlankDocument(jenis: DocumentType, settings: AppSettings): SuratDocument {
  const today = new Date().toISOString().slice(0, 10);
  const year = today.slice(0, 4);
  return {
    kode_verifikasi: `MW-${year}-DRAFT`,
    hash_sha256: '',
    jenis_dokumen: jenis,
    kode_klasifikasi: jenis === 'surat_tugas' ? '800.1' : '100.1',
    nomor_urut: 1,
    nomor_surat: `${jenis === 'surat_tugas' ? '800.1' : '100.1'}/001/${settings.kode_instansi || 'KMW'}/XI/${year}`,
    sifat: 'Penting',
    lampiran: '-',
    hal: 'Koordinasi Penyelenggaraan Pemerintahan Kecamatan Muara Wis',
    tanggal_surat: today,
    tempat_surat: settings.tempat_surat || 'Muara Wis',
    kepada: 'Kepala Desa se-Kecamatan Muara Wis\ndi -\n    Tempat',
    tembusan: '1. Bupati Kutai Kartanegara di Tenggarong (sebagai laporan);\n2. Arsip.',
    body: getDefaultBodyForType(jenis, settings),
    penandatangan_nama: settings.camat_nama,
    penandatangan_nip: settings.camat_nip,
    penandatangan_pangkat: settings.camat_pangkat,
    penandatangan_jabatan: settings.camat_jabatan,
    atas_nama: '',
    status: 'ditandatangani',
    ai_mode: 'local',
    prompt_asal: '',
    kertas: settings.kertas_default || 'F4',
    font_family: settings.font_default || 'Times New Roman',
    show_stempel: settings.show_stempel || false,
  };
}
