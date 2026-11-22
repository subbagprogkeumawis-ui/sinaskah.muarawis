import json
import re
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

import httpx

from database import DESA_MUARA_WIS, get_next_number, get_settings, list_pegawai

INDONESIAN_DAYS = [
    "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"
]
INDONESIAN_MONTHS = {
    1: "Januari", 2: "Februari", 3: "Maret", 4: "April",
    5: "Mei", 6: "Juni", 7: "Juli", 8: "Agustus",
    9: "September", 10: "Oktober", 11: "November", 12: "Desember",
}
MONTH_NAME_TO_NUM = {
    "januari": 1, "jan": 1,
    "februari": 2, "pebruari": 2, "feb": 2,
    "maret": 3, "mar": 3,
    "april": 4, "apr": 4,
    "mei": 5,
    "juni": 6, "jun": 6,
    "juli": 7, "jul": 7,
    "agustus": 8, "agu": 8, "agt": 8,
    "september": 9, "sep": 9, "sept": 9,
    "oktober": 10, "okt": 10,
    "november": 11, "nopember": 11, "nov": 11,
    "desember": 12, "des": 12,
}


def format_tanggal_indo(date_str: str) -> str:
    try:
        dt = datetime.strptime(date_str[:10], "%Y-%m-%d")
        return f"{dt.day} {INDONESIAN_MONTHS[dt.month]} {dt.year}"
    except Exception:
        return date_str


def format_hari_tanggal_indo(date_str: str) -> str:
    try:
        dt = datetime.strptime(date_str[:10], "%Y-%m-%d")
        day_name = INDONESIAN_DAYS[dt.weekday()]
        return f"{day_name}, {dt.day} {INDONESIAN_MONTHS[dt.month]} {dt.year}"
    except Exception:
        return date_str


def _clean_topic(prompt: str) -> str:
    s = prompt.strip()
    # Strip common casual prefixes
    prefixes = [
        r"^(?:bro|tolong|mohon|bantu|coba|please|plis)\s+",
        r"^(?:buatkan|buatin|bikin|bikinin|susunkan|susun|rancang|generate)\s+(?:gue|aku|saya|kami|dong)?\s*",
        r"^(?:surat\s+(?:undangan|tugas|edaran|keterangan|rekomendasi|pengantar|dinas)|nota\s+dinas|berita\s+acara|sk\s+camat|keputusan\s+camat|laporan\s+kegiatan)\s*",
        r"^(?:tentang|mengenai|soal|terkait|untuk|perihal|hal|dari|buat)\s+",
    ]
    for _ in range(4):
        for p in prefixes:
            s = re.sub(p, "", s, flags=re.IGNORECASE).strip()

    # Strip "dari X ke Y" or "untuk Nama1 dan Nama2" lead-ins in nota dinas / surat tugas
    s = re.sub(r"^(?:dari\s+[\w\s.]+?\s+ke\s+[\w\s.]+?\s+(?=(?:usulan|permohonan|laporan|pengajuan|penambahan|perbaikan|rencana|terkait|tentang)))", "", s, flags=re.IGNORECASE).strip()
    s = re.sub(r"^(?:[\w\s.]*?\bke\s+camat\s+)", "", s, flags=re.IGNORECASE).strip()
    s = re.sub(r"^(?:untuk\s+[A-Z][A-Za-z.\s]+(?:\s+dan\s+[A-Z][A-Za-z.\s]+)?\s+(?:melaksanakan\s+)?)", "", s).strip()

    # Remove trailing date/time/place clauses for cleaner subject
    s_clean = re.split(
        r"\b(?:pada\s+hari|hari\s+(?:senin|selasa|rabu|kamis|jumat|sabtu|minggu)|(?:senin|selasa|rabu|kamis|jumat|sabtu|minggu)\s+(?:besok|lusa|tanggal|tgl|jam|pukul)|besok|lusa|tanggal|tgl|pukul|jam\s+\d|di\s+(?:aula|kantor|ruang))\b",
        s,
        maxsplit=1,
        flags=re.IGNORECASE,
    )[0].strip(" ,.;:-")

    if len(s_clean) < 6:
        s_clean = s.strip(" ,.;:-")
    if not s_clean:
        s_clean = "Koordinasi Penyelenggaraan Pemerintahan dan Pelayanan Publik Kecamatan Muara Wis"

    # Expand common Indonesian shorthand & acronyms
    expansions = [
        (r"\brakors?\b", "Rapat Koordinasi"),
        (r"\bkades\b", "Kepala Desa"),
        (r"\bsekcam\b", "Sekretaris Camat"),
        (r"\bse[- ]?muara\s+wis\b", "se-Kecamatan Muara Wis"),
        (r"\bbupati\s+kukar\b", "Bupati Kutai Kartanegara"),
        (r"\bsakip\b", "SAKIP"),
        (r"\bakip\b", "AKIP"),
        (r"\bapbdes\b", "APBDes"),
        (r"\bpaten\b", "PATEN"),
        (r"\bkur\b", "KUR"),
        (r"\bhumas\b", "Humas"),
        (r"\bhut\s+ri\b", "HUT RI"),
        (r"\bposyandu\b", "Posyandu"),
        (r"\bbumdes\b", "BUMDes"),
        (r"\bmuara\s+wis\b", "Muara Wis"),
        (r"\bkutai\s+kartanegara\b", "Kutai Kartanegara"),
        (r"\bkukar\b", "Kabupaten Kutai Kartanegara"),
        (r"\bsungai\s+mahakam\b", "Sungai Mahakam"),
        (r"\bdanau\s+melintang\b", "Danau Melintang"),
        (r"\bsoal\b", "terkait"),
    ]
    for pat, rep in expansions:
        s_clean = re.sub(pat, rep, s_clean, flags=re.IGNORECASE)

    # Smart Title-Case for clean formal Hal (keep short prepositions lowercase)
    lower_words = {"dan", "atau", "di", "ke", "dari", "pada", "dalam", "untuk", "tentang", "terkait", "atas", "serta", "yang", "se-Kecamatan"}
    words = s_clean.split()
    formatted = []
    for idx, w in enumerate(words):
        if w.isupper() and len(w) >= 2:
            formatted.append(w)
        elif w.lower() in lower_words and idx > 0:
            formatted.append(w.lower() if w != "se-Kecamatan" else w)
        elif "-" in w:
            parts = w.split("-")
            formatted.append(parts[0].lower() + "-" + "-".join(p.capitalize() for p in parts[1:]))
        else:
            formatted.append(w[0].upper() + w[1:])
    return " ".join(formatted)


def _detect_jenis(prompt: str, forced_jenis: Optional[str] = None) -> str:
    if forced_jenis and forced_jenis != "auto":
        return forced_jenis
    p = prompt.lower()
    # Explicit document type phrases take highest priority
    explicit_map = [
        ("sk_camat", ["sk camat", "keputusan camat", "surat keputusan"]),
        ("berita_acara", ["berita acara"]),
        ("nota_dinas", ["nota dinas"]),
        ("surat_pengantar", ["surat pengantar", "pengantar berkas", "pengantar dokumen"]),
        ("surat_tugas", ["surat tugas", "perintah tugas", "surat perintah"]),
        ("surat_undangan", ["surat undangan", "undangan rapat", "mengundang"]),
        ("surat_edaran", ["surat edaran"]),
        ("surat_keterangan", ["surat keterangan", "surat rekomendasi", "sktm"]),
        ("laporan_kegiatan", ["laporan kegiatan", "laporan pelaksanaan"]),
    ]
    for j, keywords in explicit_map:
        if any(k in p for k in keywords):
            return j

    # Fallback intent heuristics
    if any(k in p for k in ["membentuk tim", "menetapkan tim", "penetapan panitia"]):
        return "sk_camat"
    if any(k in p for k in ["serah terima", "penyerahan bantuan", "kesepakatan bersama"]):
        return "berita_acara"
    if any(k in p for k in ["spt", "sppd", "menugaskan", "perjalanan dinas", "monitoring"]):
        return "surat_tugas"
    if any(k in p for k in ["undangan", "rakor", "rapat koordinasi", "musrenbang", "sosialisasi", "pertemuan"]):
        return "surat_undangan"
    if any(k in p for k in ["edaran", "imbauan", "himbauan", "pemberitahuan umum", "seruan"]):
        return "surat_edaran"
    if any(k in p for k in ["domisili", "tidak mampu", "kur", "atas nama"]):
        return "surat_keterangan"
    if any(k in p for k in ["laporan hasil"]):
        return "laporan_kegiatan"
    return "surat_dinas"


def _detect_klasifikasi(prompt: str, jenis: str) -> str:
    p = prompt.lower()
    if any(k in p for k in ["tugas", "sppd", "pegawai", "cuti", "absensi", "asn", "kepegawaian"]):
        return "800.1"
    if any(k in p for k in ["apbdes", "anggaran", "keuangan", "dana desa", "spj", "sakip", "akip"]):
        return "900.1"
    if any(k in p for k in ["banjir", "bencana", "linmas", "keamanan", "trantib", "ketertiban", "kebakaran", "karhutla"]):
        return "300.2"
    if any(k in p for k in ["desa", "kades", "kepala desa", "musrenbang", "pemberdayaan", "posyandu", "bumdes", "bpd"]):
        return "400.10"
    if any(k in p for k in ["umkm", "usaha", "kur", "nelayan", "perikanan", "keramba", "pertanian", "perkebunan"]):
        return "500.5"
    if any(k in p for k in ["kesehatan", "stunting", "bansos", "bantuan sosial", "tidak mampu", "sktm", "pendidikan", "hut ri"]):
        return "400.7"
    if any(k in p for k in ["jalan", "jembatan", "infrastruktur", "semenisasi", "dermaga", "lingkungan"]):
        return "600.1"
    if jenis == "surat_tugas":
        return "800.1"
    if jenis == "surat_keterangan":
        return "400.10"
    if jenis in ("surat_undangan", "surat_edaran"):
        return "100.1"
    return "100.1"


def _extract_event_date(prompt: str, default_offset_days: int = 2) -> str:
    now = datetime.now()
    p = prompt.lower()

    if "lusa" in p:
        return (now + timedelta(days=2)).strftime("%Y-%m-%d")
    if "besok" in p:
        return (now + timedelta(days=1)).strftime("%Y-%m-%d")
    if "hari ini" in p:
        return now.strftime("%Y-%m-%d")

    # Match DD Month YYYY
    m = re.search(
        r"\b(\d{1,2})\s+(januari|februari|pebruari|maret|april|mei|juni|juli|agustus|september|oktober|november|nopember|desember|jan|feb|mar|apr|jun|jul|agu|agt|sep|sept|okt|nov|des)(?:\s+(\d{4}))?",
        p,
    )
    if m:
        day = int(m.group(1))
        mon = MONTH_NAME_TO_NUM.get(m.group(2), now.month)
        yr = int(m.group(3)) if m.group(3) else now.year
        try:
            return datetime(yr, mon, min(day, 28 if mon == 2 else 30 if mon in (4,6,9,11) else 31)).strftime("%Y-%m-%d")
        except Exception:
            pass

    # Match weekday names (senin..minggu)
    for idx, dname in enumerate(INDONESIAN_DAYS):
        if re.search(rf"\b{dname.lower()}\b", p):
            days_ahead = (idx - now.weekday()) % 7
            if days_ahead == 0:
                days_ahead = 7
            return (now + timedelta(days=days_ahead)).strftime("%Y-%m-%d")

    return (now + timedelta(days=default_offset_days)).strftime("%Y-%m-%d")


def _extract_time(prompt: str) -> str:
    p = prompt.lower()
    m = re.search(r"(?:pukul|jam)\s*(\d{1,2})(?:[:.](\d{2}))?(?:\s*[-s/d]+\s*(\d{1,2})(?:[:.](\d{2}))?)?", p)
    if m:
        h1 = int(m.group(1))
        m1 = m.group(2) or "00"
        if h1 < 7 and "malam" not in p:
            h1 += 12 if "siang" in p or "sore" in p else 0
        start = f"{h1:02d}.{m1}"
        if m.group(3):
            h2 = int(m.group(3))
            m2 = m.group(4) or "00"
            return f"{start} - {h2:02d}.{m2} WITA"
        return f"{start} WITA s.d. selesai"
    return "09.00 WITA s.d. selesai"


def _extract_place(prompt: str) -> str:
    m = re.search(r"\bdi\s+([A-Za-z0-9\s.,/-]{4,60}?)(?:\s+(?:pada|tanggal|tgl|pukul|jam|untuk|dengan|yang)\b|$)", prompt, flags=re.IGNORECASE)
    if m:
        place = m.group(1).strip(" ,.")
        if len(place) >= 4:
            return place
    for desa in DESA_MUARA_WIS:
        if desa.lower() in prompt.lower():
            return f"Kantor {desa}, Kecamatan Muara Wis"
    return "Aula Kantor Camat Muara Wis, Jl. Patin RT. 08 No. 33"


def _extract_recipients(prompt: str, jenis: str) -> str:
    p = prompt.lower()
    if any(k in p for k in ["kepala desa", "kades", "7 desa", "tujuh desa", "seluruh desa", "se-kecamatan muara wis", "se kecamatan muara wis"]):
        daftar = "\n".join([f"{i+1}. Kepala {d}" for i, d in enumerate(DESA_MUARA_WIS)])
        return f"Kepala Desa se-Kecamatan Muara Wis\n({', '.join([d.replace('Desa ', '') for d in DESA_MUARA_WIS])})\ndi -\n    Tempat"
    if "bupati" in p:
        return "Bupati Kutai Kartanegara\nc.q. Kepala Bagian Pemerintahan Setda Kab. Kukar\ndi -\n    Tenggarong"
    if "camat" in p and jenis == "nota_dinas":
        return "Camat Muara Wis"
    if "bpd" in p:
        return "Ketua BPD se-Kecamatan Muara Wis\ndi -\n    Tempat"
    if "rt" in p or "masyarakat" in p:
        return "1. Kepala Desa se-Kecamatan Muara Wis\n2. Ketua RT/RW se-Kecamatan Muara Wis\n3. Tokoh Masyarakat/Pemuda\ndi -\n    Tempat"

    # Try matching specific desa
    matched_desas = [d for d in DESA_MUARA_WIS if d.replace("Desa ", "").lower() in p]
    if matched_desas:
        return "\n".join([f"{i+1}. Kepala {d}" for i, d in enumerate(matched_desas)]) + "\ndi -\n    Tempat"

    # Try extracting "kepada ..." or "untuk ..."
    m = re.search(r"\b(?:kepada|untuk|buat)\s+(?:yth\.?\s*)?([A-Za-z0-9\s.,/-]{4,55}?)(?:\s+(?:hari|tanggal|tgl|pukul|jam|di|tentang|soal|terkait)\b|$)", prompt, flags=re.IGNORECASE)
    if m:
        target = m.group(1).strip(" ,.")
        if target.lower() not in ("gue", "aku", "saya", "kami", "kita", "camat"):
            return f"{target.title()}\ndi -\n    Tempat"

    return "Kepala Desa dan Perangkat Desa se-Kecamatan Muara Wis\ndi -\n    Tempat"


def _extract_matched_staff(prompt: str) -> List[Dict[str, Any]]:
    staff = list_pegawai()
    p = prompt.lower()
    matched = []
    for s in staff:
        first_part = s["nama"].split(",")[0].lower()
        tokens = [t for t in first_part.split() if len(t) >= 3 and t not in ("s.pd", "s.sos", "s.ip", "s.ap", "a.md")]
        if any(re.search(rf"\b{re.escape(tok)}\b", p) for tok in tokens):
            matched.append(s)
    if not matched:
        # Check count like "3 pegawai"
        m = re.search(r"\b(\d+)\s*(?:orang|pegawai|staf)\b", p)
        cnt = min(int(m.group(1)), len(staff)) if m else 2
        # Skip Camat as assignee by default, pick Kasi/Kasubbag
        non_camat = [s for s in staff if "Camat Muara Wis" != s["jabatan"]]
        matched = non_camat[:max(1, cnt)]
    return matched


def generate_local_document(prompt: str, forced_jenis: Optional[str] = None) -> Dict[str, Any]:
    settings = get_settings()
    now_str = datetime.now().strftime("%Y-%m-%d")
    jenis = _detect_jenis(prompt, forced_jenis)
    kode_klasifikasi = _detect_klasifikasi(prompt, jenis)
    num_info = get_next_number(kode_klasifikasi, now_str)
    topic = _clean_topic(prompt)
    event_date = _extract_event_date(prompt)
    hari_tgl = format_hari_tanggal_indo(event_date)
    waktu = _extract_time(prompt)
    tempat = _extract_place(prompt)
    kepada = _extract_recipients(prompt, jenis)

    p_lower = prompt.lower()
    sifat = "Segera" if any(k in p_lower for k in ["segera", "penting", "darurat", "banjir", "mendesak", "cepat"]) else "Penting"

    body: Dict[str, Any] = {}
    hal = topic
    lampiran = "-"
    tembusan = "1. Bupati Kutai Kartanegara di Tenggarong (sebagai laporan);\n2. Arsip."

    if jenis == "surat_undangan":
        hal = f"Undangan {topic}" if not topic.lower().startswith("undangan") else topic
        body = {
            "pembuka": (
                f"Dengan hormat, dalam rangka menindaklanjuti program kerja Pemerintah Kabupaten Kutai Kartanegara "
                f"serta memperkuat koordinasi penyelenggaraan pemerintahan di wilayah Kecamatan Muara Wis terkait {topic}, "
                f"bersama ini kami mengundang Bapak/Ibu/Saudara untuk berkenan hadir pada kegiatan dimaksud yang akan dilaksanakan pada:"
            ),
            "hari_tanggal": hari_tgl,
            "waktu": waktu,
            "tempat": tempat,
            "acara": topic,
            "isi_paragraf": [
                "Mengingat pentingnya agenda pembahasan tersebut bagi kelancaran pelayanan dan pembangunan di Kecamatan Muara Wis, dimohon kehadirannya tepat pada waktunya dan tidak mewakilkan apabila tidak berhalangan mendesak."
            ],
            "catatan_undangan": "Membawa data/bahan pendukung sesuai bidang tugas masing-masing serta mengenakan pakaian dinas yang berlaku.",
            "penutup": "Demikian surat undangan ini disampaikan. Atas perhatian dan kehadirannya diucapkan terima kasih.",
        }

    elif jenis == "surat_tugas":
        hal = f"Surat Tugas {topic}"
        petugas = _extract_matched_staff(prompt)
        matched_desas = [d for d in DESA_MUARA_WIS if d.replace("Desa ", "").lower() in p_lower]
        lokasi = ", ".join(matched_desas) if matched_desas else tempat
        body = {
            "dasar": [
                "Undang-Undang Nomor 23 Tahun 2014 tentang Pemerintahan Daerah sebagaimana telah diubah beberapa kali terakhir dengan Undang-Undang Nomor 6 Tahun 2023;",
                "Peraturan Daerah Kabupaten Kutai Kartanegara tentang Pembentukan dan Susunan Perangkat Daerah;",
                f"Program Kerja Kecamatan Muara Wis Tahun {datetime.now().year} mengenai {topic}.",
            ],
            "petugas": [
                {
                    "nama": pg["nama"],
                    "pangkat": pg["pangkat"],
                    "nip": pg["nip"],
                    "jabatan": pg["jabatan"],
                }
                for pg in petugas
            ],
            "tujuan_tugas": [
                f"Melaksanakan kegiatan {topic} bertempat di {lokasi} pada hari {hari_tgl} pukul {waktu};",
                "Melakukan koordinasi dengan Pemerintah Desa/instansi terkait serta menghimpun data lapangan secara akurat;",
                "Melaporkan hasil pelaksanaan tugas secara tertulis kepada Camat Muara Wis paling lambat 3 (tiga) hari kerja setelah pelaksanaan tugas.",
            ],
            "penutup": "Demikian Surat Tugas ini dibuat untuk dilaksanakan dengan penuh rasa tanggung jawab dan sebagaimana mestinya.",
        }
        kepada = ""
        tembusan = "1. Sekretaris Camat Muara Wis;\n2. Arsip."

    elif jenis == "surat_edaran":
        hal = f"Surat Edaran tentang {topic}"
        body = {
            "judul_tentang": topic.upper(),
            "isi_paragraf": [
                f"Dalam rangka meningkatkan efektivitas pelaksanaan kebijakan Pemerintah Kabupaten Kutai Kartanegara serta menjaga ketertiban, keamanan, dan kesejahteraan masyarakat di wilayah Kecamatan Muara Wis terkait {topic}, perlu adanya langkah-langkah terpadu dari seluruh unsur pemerintahan desa dan masyarakat.",
                "Sehubungan dengan hal tersebut, bersama ini diminta perhatian dan pelaksanaan hal-hal sebagai berikut:",
            ],
            "poin_edaran": [
                f"Kepala Desa dan Ketua BPD se-Kecamatan Muara Wis agar segera menindaklanjuti dan menyosialisasikan kebijakan mengenai {topic} hingga ke tingkat RT dan masyarakat;",
                "Melakukan pendataan, pemantauan kondisi wilayah secara berkala, serta berkoordinasi aktif dengan Seksi terkait di Kantor Camat Muara Wis;",
                "Mengedepankan semangat gotong royong serta melaporkan setiap perkembangan maupun kendala di lapangan secara berjenjang kepada Camat Muara Wis.",
            ],
            "penutup": "Demikian Surat Edaran ini disampaikan untuk dipedomani dan dilaksanakan dengan penuh tanggung jawab.",
        }

    elif jenis == "surat_keterangan":
        # Extract person details if provided
        m_nama = re.search(r"(?:atas\s+nama|a\.n\.?|nama)\s+([A-Z][A-Za-z.\s']{2,35}?)(?=\s+(?:nik|warga|rt|desa|alamat|lahir|pekerjaan|usaha|untuk|keperluan)\b|,|$)", prompt, flags=re.IGNORECASE)
        nama_pemohon = m_nama.group(1).strip().title() if m_nama else "Syahrial Rahman"

        m_nik = re.search(r"nik\s*[:.]?\s*(\d{10,16})", p_lower)
        nik_pemohon = m_nik.group(1) if m_nik else "6402181504880002"

        m_rt = re.search(r"rt\.?\s*0*(\d{1,3})", p_lower)
        rt_str = f"RT. {int(m_rt.group(1)):02d}" if m_rt else "RT. 03"

        matched_desa = next((d for d in DESA_MUARA_WIS if d.replace("Desa ", "").lower() in p_lower), "Desa Muara Wis")

        m_usaha = re.search(r"(?:usaha|pekerjaan)\s+([A-Za-z0-9\s.,/-]{3,45}?)(?=\s+(?:untuk|keperluan|di\s+desa)\b|,|$)", prompt, flags=re.IGNORECASE)
        pekerjaan = m_usaha.group(1).strip().title() if m_usaha else ("Nelayan / Pembudidaya Ikan Keramba" if "nelayan" in p_lower or "keramba" in p_lower or "ikan" in p_lower else "Wiraswasta / Pedagang")

        m_kep = re.search(r"(?:untuk|keperluan)\s+(?:pengajuan\s+)?([A-Za-z0-9\s.,/-]{4,60})$", prompt, flags=re.IGNORECASE)
        keperluan = m_kep.group(1).strip() if m_kep else "Kelengkapan Administrasi Pengajuan Kredit Usaha Rakyat (KUR) / Pelayanan Publik"

        judul = "SURAT REKOMENDASI" if "rekomendasi" in p_lower else "SURAT KETERANGAN"
        hal = f"{judul.title()} a.n. {nama_pemohon}"
        body = {
            "judul_surat": judul,
            "pembuka": "Yang bertanda tangan di bawah ini, Camat Muara Wis Kabupaten Kutai Kartanegara Provinsi Kalimantan Timur, menerangkan dengan sebenarnya bahwa:",
            "pemohon_nama": nama_pemohon,
            "pemohon_nik": nik_pemohon,
            "pemohon_ttl": "Muara Wis, 15 April 1988",
            "pemohon_jk": "Laki-laki",
            "pemohon_pekerjaan": pekerjaan,
            "pemohon_alamat": f"{rt_str} {matched_desa}, Kecamatan Muara Wis, Kab. Kutai Kartanegara",
            "keterangan_isi": (
                f"Bahwa nama tersebut di atas benar merupakan penduduk yang berdomisili di wilayah {matched_desa}, Kecamatan Muara Wis, "
                f"dan sepanjang pengetahuan serta surat pengantar dari Pemerintah Desa setempat, yang bersangkutan benar memiliki aktivitas {pekerjaan} "
                f"serta berkelakuan baik."
            ),
            "keperluan": keperluan,
            "penutup": f"Demikian {judul.title()} ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.",
        }
        kepada = ""
        tembusan = ""

    elif jenis == "nota_dinas":
        hal = topic
        kepada = "Yth. Camat Muara Wis"
        body = {
            "kepada_internal": "Camat Muara Wis",
            "dari": "Sekretaris Camat Muara Wis",
            "isi_paragraf": [
                f"Dengan hormat, bersama ini kami sampaikan telaahan dan laporan singkat mengenai {topic} di lingkungan Kantor Camat Muara Wis.",
                f"Berdasarkan hasil identifikasi kebutuhan operasional dan koordinasi antar seksi, diperlukan tindak lanjut berupa penyusunan langkah teknis, dukungan sarana administrasi, serta penjadwalan kegiatan paling lambat pada hari {hari_tgl}.",
                "Sehubungan dengan hal tersebut, mohon kiranya Bapak Camat berkenan memberikan arahan dan persetujuan lebih lanjut agar pelaksanaan tugas pelayanan kepada masyarakat Kecamatan Muara Wis dapat berjalan optimal.",
            ],
            "penutup": "Demikian Nota Dinas ini disampaikan. Atas perhatian dan arahan Bapak diucapkan terima kasih.",
        }
        tembusan = ""

    elif jenis == "surat_pengantar":
        hal = f"Pengantar {topic}"
        lampiran = "1 (satu) berkas"
        body = {
            "pembuka": f"Dengan hormat, bersama ini kami kirimkan dokumen/berkas terkait {topic} dari Kecamatan Muara Wis Kabupaten Kutai Kartanegara dengan perincian sebagai berikut:",
            "items": [
                {
                    "naskah": f"Dokumen / Berkas {topic} Kecamatan Muara Wis Tahun {datetime.now().year}",
                    "banyaknya": "1 (satu) Berkas",
                    "keterangan": "Disampaikan dengan hormat untuk diproses / diketahui sebagaimana mestinya.",
                },
                {
                    "naskah": "Lampiran Rekapitulasi Data Pendukung (7 Desa se-Kecamatan Muara Wis)",
                    "banyaknya": "1 (satu) Eksemplar",
                    "keterangan": "Sebagai bahan kelengkapan administrasi.",
                },
            ],
            "penerima_jabatan": "Penerima / Petugas Tata Usaha",
            "penutup": "Demikian surat pengantar ini dibuat. Atas perhatian dan kerja samanya diucapkan terima kasih.",
        }

    elif jenis == "berita_acara":
        hal = f"Berita Acara {topic}"
        body = {
            "judul_acara": topic.upper(),
            "hari_tanggal_teks": f"hari {hari_tgl}",
            "pembuka": f"Pada {hari_tgl}, bertempat di {tempat}, kami yang bertanda tangan di bawah ini:",
            "pihak_pertama": {
                "nama": settings.get("camat_nama", "Fadhli Annur, S.Pd"),
                "nip_nik": f"NIP. {settings.get('camat_nip', '197106051996031004')}",
                "jabatan": settings.get("camat_jabatan", "Camat Muara Wis"),
                "instansi": "Pemerintah Kecamatan Muara Wis, Kab. Kutai Kartanegara",
            },
            "pihak_kedua": {
                "nama": "Perwakilan Pemerintah Desa / Penerima Manfaat",
                "nip_nik": "NIK/NIP. -",
                "jabatan": "Kepala Desa / Ketua Panitia",
                "instansi": "Wilayah Kecamatan Muara Wis",
            },
            "poin_kesepakatan": [
                f"PIHAK PERTAMA dan PIHAK KEDUA telah melaksanakan kegiatan/pemeriksaan terkait {topic} secara tertib, transparan, dan akuntabel;",
                "Seluruh kelengkapan dokumen, jumlah objek/berkas, serta kondisi fisik di lapangan telah diperiksa dan dinyatakan sesuai dengan ketentuan yang berlaku;",
                "Sejak ditandatanganinya Berita Acara ini, segala hak, kewajiban, dan tanggung jawab administratif beralih sesuai ketentuan peraturan perundang-undangan.",
            ],
            "saksi": ["1. Sekretaris Camat Muara Wis", "2. Kasi Pemerintahan / PMD Kecamatan Muara Wis"],
            "penutup": "Demikian Berita Acara ini dibuat dalam rangkap secukupnya untuk dipergunakan sebagaimana mestinya.",
        }
        kepada = ""
        tembusan = ""

    elif jenis == "sk_camat":
        hal = f"Keputusan Camat tentang {topic}"
        body = {
            "judul_tentang": topic.upper(),
            "menimbang": [
                f"bahwa dalam rangka kelancaran, efektivitas, dan tertib administrasi pelaksanaan {topic} di wilayah Kecamatan Muara Wis Kabupaten Kutai Kartanegara, dipandang perlu melakukan pengaturan dan penetapan pelaksanaannya;",
                "bahwa berdasarkan pertimbangan sebagaimana dimaksud pada huruf a, perlu menetapkan Keputusan Camat Muara Wis tentang hal dimaksud.",
            ],
            "mengingat": [
                "Undang-Undang Nomor 23 Tahun 2014 tentang Pemerintahan Daerah sebagaimana telah beberapa kali diubah terakhir dengan Undang-Undang Nomor 6 Tahun 2023;",
                "Undang-Undang Nomor 6 Tahun 2014 tentang Desa sebagaimana telah diubah dengan Undang-Undang Nomor 3 Tahun 2024;",
                "Peraturan Pemerintah Nomor 17 Tahun 2018 tentang Kecamatan;",
                "Peraturan Daerah Kabupaten Kutai Kartanegara tentang Pembentukan dan Susunan Perangkat Daerah Kabupaten Kutai Kartanegara.",
            ],
            "diktum": [
                {"label": "KESATU", "isi": f"Menetapkan pelaksanaan {topic} di lingkungan Kecamatan Muara Wis Kabupaten Kutai Kartanegara Tahun Anggaran {datetime.now().year}."},
                {"label": "KEDUA", "isi": "Menugaskan Sekretaris Camat, para Kepala Seksi terkait, serta Pemerintah Desa se-Kecamatan Muara Wis untuk melaksanakan koordinasi, pembinaan, dan pelaporan sesuai bidang tugas masing-masing."},
                {"label": "KETIGA", "isi": "Segala biaya yang timbul akibat ditetapkannya Keputusan ini dibebankan pada Dokumen Pelaksanaan Anggaran (DPA) Kecamatan Muara Wis sesuai ketentuan yang berlaku."},
                {"label": "KEEMPAT", "isi": "Keputusan Camat ini mulai berlaku sejak tanggal ditetapkan, dengan ketentuan apabila di kemudian hari terdapat kekeliruan akan diadakan perbaikan sebagaimana mestinya."},
            ],
        }
        kepada = ""
        tembusan = "1. Bupati Kutai Kartanegara di Tenggarong;\n2. Inspektur Daerah Kabupaten Kutai Kartanegara;\n3. Kepala Desa se-Kecamatan Muara Wis."

    elif jenis == "laporan_kegiatan":
        hal = f"Laporan Pelaksanaan {topic}"
        body = {
            "judul_laporan": f"LAPORAN PELAKSANAAN {topic.upper()}",
            "pendahuluan": f"Dalam rangka mendukung pencapaian target kinerja Kecamatan Muara Wis serta meningkatkan kualitas pelayanan publik dan tata kelola pemerintahan wilayah, telah dilaksanakan kegiatan {topic}.",
            "dasar_pelaksanaan": f"Program Kerja Kecamatan Muara Wis Tahun {datetime.now().year} serta Surat Perintah/Undangan Camat Muara Wis.",
            "maksud_tujuan": f"Terwujudnya sinkronisasi data, peningkatan koordinasi antarperangkat desa, dan terselesaikannya agenda {topic} secara tepat sasaran.",
            "waktu_tempat": f"Hari {hari_tgl}, pukul {waktu}, bertempat di {tempat}.",
            "peserta": "Camat Muara Wis, Sekretaris Camat, para Kepala Seksi, Staf Kecamatan, serta perwakilan 7 Pemerintah Desa se-Kecamatan Muara Wis.",
            "hasil_kegiatan": [
                f"Kegiatan {topic} terlaksana dengan lancar, tertib, dan dihadiri oleh seluruh unsur terkait;",
                "Tercapainya kesepakatan rencana tindak lanjut serta pembagian peran antara Kecamatan Muara Wis dan Pemerintah Desa;",
                "Terdokumentasikannya daftar hadir, notulensi, dan bukti pelaksanaan sebagai bahan evaluasi SAKIP Kecamatan.",
            ],
            "hambatan_saran": "Kendala akses transportasi perairan pada beberapa desa di tepian Danau Melintang/Semayang diantisipasi melalui koordinasi daring dan penjadwalan lebih awal.",
            "kesimpulan": f"Secara keseluruhan pelaksanaan {topic} berjalan sesuai rencana dan memberikan dampak positif bagi tata kelola pemerintahan Kecamatan Muara Wis.",
        }
        kepada = "Bupati Kutai Kartanegara\nc.q. Sekretaris Daerah Kab. Kutai Kartanegara\ndi -\n    Tenggarong"

    else:  # surat_dinas default
        hal = topic
        body = {
            "pembuka": (
                f"Dengan hormat, dalam rangka optimalisasi penyelenggaraan pemerintahan, pembangunan, dan pembinaan kemasyarakatan "
                f"di wilayah Kecamatan Muara Wis Kabupaten Kutai Kartanegara terkait {topic}, bersama ini kami sampaikan beberapa hal penting untuk menjadi perhatian bersama."
            ),
            "isi_paragraf": [
                f"Sehubungan dengan hal tersebut di atas, dimohon kerja sama Bapak/Ibu/Saudara untuk segera menindaklanjuti koordinasi dan penyampaian data maupun langkah teknis terkait {topic} di wilayah kerja masing-masing.",
                f"Adapun tindak lanjut dan penyampaian laporan perkembangan dapat dikoordinasikan langsung dengan Seksi terkait di Kantor Camat Muara Wis paling lambat pada hari {hari_tgl}.",
            ],
            "penutup": "Demikian disampaikan untuk dapat ditindaklanjuti. Atas perhatian dan kerja sama yang baik diucapkan terima kasih.",
        }

    return {
        "jenis_dokumen": jenis,
        "kode_klasifikasi": kode_klasifikasi,
        "nomor_urut": num_info["nomor_urut"],
        "nomor_surat": num_info["nomor_surat"],
        "sifat": sifat,
        "lampiran": lampiran,
        "hal": hal,
        "tanggal_surat": now_str,
        "tempat_surat": settings.get("tempat_surat", "Muara Wis"),
        "kepada": kepada,
        "tembusan": tembusan,
        "body": body,
        "ai_mode": "local",
        "ai_note": "Disusun otomatis oleh Mesin AI Lokal Tata Naskah Dinas (Permendagri 1/2023)",
    }


def _extract_json_block(text: str) -> Dict[str, Any]:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1:
        cleaned = cleaned[start : end + 1]
    return json.loads(cleaned)


async def generate_with_llm(prompt: str, forced_jenis: Optional[str], settings: Dict[str, Any]) -> Dict[str, Any]:
    provider = settings.get("ai_provider", "local")
    api_key = (settings.get("ai_api_key") or "").strip()
    if provider == "local" or not api_key:
        return generate_local_document(prompt, forced_jenis)

    # First produce baseline template/entities locally so fallback and schema structure are rock solid
    baseline = generate_local_document(prompt, forced_jenis)
    target_jenis = baseline["jenis_dokumen"]
    staff = list_pegawai()
    staff_txt = "\n".join([f"- {p['nama']} | NIP: {p['nip']} | {p['pangkat']} | {p['jabatan']}" for p in staff])

    system_prompt = f"""Anda adalah Asisten Ahli Tata Naskah Dinas Pemerintah Kabupaten Kutai Kartanegara — Kecamatan Muara Wis (Provinsi Kalimantan Timur, berpedoman pada Permendagri No. 1 Tahun 2023 & EYD V).
Data Instansi:
- Pemda: {settings.get('nama_pemda')}
- Instansi: {settings.get('nama_instansi')}
- Alamat: {settings.get('alamat')} {settings.get('kode_pos')}
- 7 Desa di Kec. Muara Wis: {', '.join(DESA_MUARA_WIS)}
- Camat: {settings.get('camat_nama')} ({settings.get('camat_pangkat')}, NIP. {settings.get('camat_nip')})
- Pegawai tersedia:\n{staff_txt}

Tugas: Ubah permintaan pengguna menjadi JSON dokumen resmi bertipe "{target_jenis}".
Kembalikan HANYA JSON valid tanpa teks pengantar/markdown, mengikuti persis struktur kunci berikut:
{{
  "jenis_dokumen": "{target_jenis}",
  "kode_klasifikasi": "kode arsip misal 100.1 / 400.10 / 800.1 / 900.1 / 300.2 / 500.5",
  "sifat": "Biasa | Penting | Segera",
  "lampiran": "- atau 1 (satu) berkas",
  "hal": "perihal singkat formal",
  "kepada": "penerima surat lengkap dengan 'di -\\n    Tempat'",
  "tembusan": "tembusan bernomor dipisah newline atau kosong",
  "body": {json.dumps(baseline['body'], ensure_ascii=False)}
}}
Pastikan bahasa resmi pemerintahan Indonesia yang baku, sopan, logis, kaya detail relevan dengan Kecamatan Muara Wis, dan pertahankan seluruh kunci pada objek "body"."""

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            if provider == "gemini":
                model = settings.get("ai_model") or "gemini-2.5-flash"
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
                resp = await client.post(
                    url,
                    json={
                        "system_instruction": {"parts": [{"text": system_prompt}]},
                        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                        "generationConfig": {"temperature": 0.3, "responseMimeType": "application/json"},
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
            else:
                # OpenAI-compatible (openai, groq, openrouter, custom)
                base_urls = {
                    "openai": "https://api.openai.com/v1",
                    "groq": "https://api.groq.com/openai/v1",
                    "openrouter": "https://openrouter.ai/api/v1",
                }
                default_models = {
                    "openai": "gpt-4o-mini",
                    "groq": "llama-3.3-70b-versatile",
                    "openrouter": "google/gemini-2.5-flash",
                }
                base_url = (settings.get("ai_base_url") or base_urls.get(provider, "https://api.openai.com/v1")).rstrip("/")
                model = settings.get("ai_model") or default_models.get(provider, "gpt-4o-mini")
                resp = await client.post(
                    f"{base_url}/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={
                        "model": model,
                        "temperature": 0.3,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": prompt},
                        ],
                    },
                )
                resp.raise_for_status()
                raw_text = resp.json()["choices"][0]["message"]["content"]

        parsed = _extract_json_block(raw_text)
        # Merge into baseline cleanly
        kode_klas = parsed.get("kode_klasifikasi") or baseline["kode_klasifikasi"]
        num_info = get_next_number(kode_klas, baseline["tanggal_surat"])
        merged_body = dict(baseline["body"])
        if isinstance(parsed.get("body"), dict):
            merged_body.update(parsed["body"])

        return {
            "jenis_dokumen": parsed.get("jenis_dokumen") or baseline["jenis_dokumen"],
            "kode_klasifikasi": kode_klas,
            "nomor_urut": num_info["nomor_urut"],
            "nomor_surat": num_info["nomor_surat"],
            "sifat": parsed.get("sifat") or baseline["sifat"],
            "lampiran": parsed.get("lampiran") if parsed.get("lampiran") is not None else baseline["lampiran"],
            "hal": parsed.get("hal") or baseline["hal"],
            "tanggal_surat": baseline["tanggal_surat"],
            "tempat_surat": baseline["tempat_surat"],
            "kepada": parsed.get("kepada") if parsed.get("kepada") is not None else baseline["kepada"],
            "tembusan": parsed.get("tembusan") if parsed.get("tembusan") is not None else baseline["tembusan"],
            "body": merged_body,
            "ai_mode": provider,
            "ai_note": f"Disusun oleh AI Cloud ({provider.upper()}) + Standar Tata Naskah Dinas Kec. Muara Wis",
        }
    except Exception as exc:
        baseline["ai_mode"] = "local_fallback"
        baseline["ai_note"] = f"Fallback AI Lokal aktif (LLM {provider} gagal/timeout: {str(exc)[:90]})"
        return baseline


async def polish_official_text(text: str, settings: Dict[str, Any]) -> Dict[str, str]:
    provider = settings.get("ai_provider", "local")
    api_key = (settings.get("ai_api_key") or "").strip()

    if provider != "local" and api_key:
        try:
            sys_msg = (
                "Ubah teks berikut menjadi bahasa surat dinas pemerintah Indonesia yang baku, ringkas, sopan, "
                "sesuai EYD V dan Permendagri No. 1 Tahun 2023. Kembalikan hanya hasil perbaikan teksnya saja."
            )
            async with httpx.AsyncClient(timeout=25.0) as client:
                if provider == "gemini":
                    model = settings.get("ai_model") or "gemini-2.5-flash"
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
                    resp = await client.post(
                        url,
                        json={
                            "system_instruction": {"parts": [{"text": sys_msg}]},
                            "contents": [{"role": "user", "parts": [{"text": text}]}],
                        },
                    )
                    resp.raise_for_status()
                    out = resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
                else:
                    base_urls = {
                        "openai": "https://api.openai.com/v1",
                        "groq": "https://api.groq.com/openai/v1",
                        "openrouter": "https://openrouter.ai/api/v1",
                    }
                    default_models = {
                        "openai": "gpt-4o-mini",
                        "groq": "llama-3.3-70b-versatile",
                        "openrouter": "google/gemini-2.5-flash",
                    }
                    base_url = (settings.get("ai_base_url") or base_urls.get(provider, "https://api.openai.com/v1")).rstrip("/")
                    model = settings.get("ai_model") or default_models.get(provider, "gpt-4o-mini")
                    resp = await client.post(
                        f"{base_url}/chat/completions",
                        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                        json={
                            "model": model,
                            "messages": [{"role": "system", "content": sys_msg}, {"role": "user", "content": text}],
                        },
                    )
                    resp.raise_for_status()
                    out = resp.json()["choices"][0]["message"]["content"].strip()
                return {"text": out, "mode": provider}
        except Exception:
            pass

    # Local formalizer replacements
    replacements = [
        (r"\bgue\b|\baku\b", "kami"),
        (r"\bkalian\b|\belo\b|\blo\b", "Bapak/Ibu/Saudara"),
        (r"\bbuat\b", "untuk"),
        (r"\bnggak\b|\bgak\b|\bga\b|\btdk\b", "tidak"),
        (r"\budah\b|\bsdh\b", "telah"),
        (r"\bdlm\b", "dalam"),
        (r"\byg\b", "yang"),
        (r"\btgl\b", "tanggal"),
        (r"\bjam\b", "pukul"),
        (r"\bmakasih\b|\bterima kasih banyak\b", "diucapkan terima kasih"),
        (r"\bsoal\b", "terkait"),
        (r"\bbiar\b", "agar"),
        (r"\bsama\b", "bersama"),
    ]
    res = text.strip()
    for pat, rep in replacements:
        res = re.sub(pat, rep, res, flags=re.IGNORECASE)
    if res and not res.endswith("."):
        res += "."
    if res:
        res = res[0].upper() + res[1:]
    return {"text": res, "mode": "local"}
