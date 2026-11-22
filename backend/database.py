import json
import os
import sqlite3
from datetime import datetime
from typing import Any, Dict, List, Optional

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.environ.get("DB_PATH") or os.path.join(BASE_DIR, "data", "muarawis_surat.db")

DESA_MUARA_WIS = [
    "Desa Muara Wis",
    "Desa Sebemban",
    "Desa Melintang",
    "Desa Lebak Cilong",
    "Desa Lebak Mantan",
    "Desa Enggelam",
    "Desa Muara Enggelam",
]

KLASIFIKASI_ARSIP = [
    {"kode": "000.1", "nama": "Ketatausahaan & Kerumahtanggaan"},
    {"kode": "000.8", "nama": "Organisasi & Tata Laksana"},
    {"kode": "100.1", "nama": "Otonomi Daerah & Pemerintahan Umum"},
    {"kode": "100.3", "nama": "Pemerintahan Desa & Kelurahan"},
    {"kode": "300.1", "nama": "Ketentraman & Ketertiban Umum (Trantibum)"},
    {"kode": "300.2", "nama": "Penanggulangan Bencana & Linmas"},
    {"kode": "400.3", "nama": "Pendidikan, Pemuda & Olahraga"},
    {"kode": "400.7", "nama": "Kesehatan & Kesejahteraan Sosial"},
    {"kode": "400.10", "nama": "Pemberdayaan Masyarakat & Desa (PMD)"},
    {"kode": "500.3", "nama": "Koperasi, UMKM & Perekonomian"},
    {"kode": "500.5", "nama": "Perikanan, Kelautan & Pertanian"},
    {"kode": "600.1", "nama": "Pekerjaan Umum & Penataan Ruang"},
    {"kode": "800.1", "nama": "Kepegawaian, Tugas & Perjalanan Dinas"},
    {"kode": "900.1", "nama": "Keuangan & Pengelolaan Anggaran / APBDes"},
]

DEFAULT_SETTINGS: Dict[str, Any] = {
    "nama_pemda": "PEMERINTAH KABUPATEN KUTAI KARTANEGARA",
    "nama_instansi": "KECAMATAN MUARA WIS",
    "kode_instansi": "KMW",
    "alamat": "Jalan Patin RT. 08 No. 33 Desa Muara Wis, Kec. Muara Wis, Kab. Kutai Kartanegara",
    "kode_pos": "75559",
    "telepon": "(0541) -",
    "email": "kec.muarawis@gmail.com",
    "website": "https://muarawis.kukarkab.go.id",
    "tempat_surat": "Muara Wis",
    "camat_nama": "Fadhli Annur, S.Pd",
    "camat_pangkat": "Pembina (IV/a)",
    "camat_nip": "197106051996031004",
    "camat_jabatan": "Camat Muara Wis",
    "sekcam_nama": "Sekretaris Camat Muara Wis",
    "sekcam_pangkat": "Penata Tk. I (III/d)",
    "sekcam_nip": "197804122005011008",
    "sekcam_jabatan": "Sekretaris Camat Muara Wis",
    "kertas_default": "F4",
    "font_default": "Times New Roman",
    "logo_mode": "color",
    "qr_mode": "hybrid",  # 'url' | 'offline' | 'hybrid'
    "show_footer_tte": True,
    "show_stempel": False,
    "format_nomor": "{kode}/{urut}/{instansi}/{romawi}/{tahun}",
    "ai_provider": "local",  # 'local' | 'gemini' | 'openai' | 'groq' | 'openrouter' | 'custom'
    "ai_api_key": "",
    "ai_model": "",
    "ai_base_url": "",
    "public_base_url": "",
}

DEFAULT_PEGAWAI = [
    {
        "nama": "Fadhli Annur, S.Pd",
        "nip": "197106051996031004",
        "pangkat": "Pembina (IV/a)",
        "jabatan": "Camat Muara Wis",
        "unit": "Pimpinan",
        "is_penandatangan": 1,
    },
    {
        "nama": "H. Ahmad Fauzi, S.Sos",
        "nip": "197804122005011008",
        "pangkat": "Penata Tk. I (III/d)",
        "jabatan": "Sekretaris Camat Muara Wis",
        "unit": "Sekretariat",
        "is_penandatangan": 1,
    },
    {
        "nama": "Rina Sari Dewi, S.AP",
        "nip": "198409152010012014",
        "pangkat": "Penata (III/c)",
        "jabatan": "Kasi Pemerintahan",
        "unit": "Seksi Pemerintahan",
        "is_penandatangan": 0,
    },
    {
        "nama": "M. Ridwan, S.IP",
        "nip": "198203212009021003",
        "pangkat": "Penata (III/c)",
        "jabatan": "Kasi Pemberdayaan Masyarakat Desa",
        "unit": "Seksi PMD",
        "is_penandatangan": 0,
    },
    {
        "nama": "Siti Rahmah, S.E",
        "nip": "198611082011012009",
        "pangkat": "Penata Muda Tk. I (III/b)",
        "jabatan": "Kasi Pelayanan Umum (PATEN)",
        "unit": "Seksi Pelayanan Umum",
        "is_penandatangan": 0,
    },
    {
        "nama": "Dedy Kurniawan, S.Sos",
        "nip": "198507142010011007",
        "pangkat": "Penata (III/c)",
        "jabatan": "Kasi Ketentraman dan Ketertiban Umum",
        "unit": "Seksi Trantibum",
        "is_penandatangan": 0,
    },
    {
        "nama": "Nurul Hidayah, S.Pd",
        "nip": "198802272014032002",
        "pangkat": "Penata Muda Tk. I (III/b)",
        "jabatan": "Kasi Kesejahteraan Sosial",
        "unit": "Seksi Kesos",
        "is_penandatangan": 0,
    },
    {
        "nama": "Hendra Wijaya, A.Md",
        "nip": "199105192019031005",
        "pangkat": "Pengatur Tk. I (II/d)",
        "jabatan": "Kasubbag Umum, Tata Laksana & Kepegawaian",
        "unit": "Subbag Umum",
        "is_penandatangan": 0,
    },
]


def get_conn() -> sqlite3.Connection:
    db_dir = os.path.dirname(DB_PATH)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def to_roman(month: int) -> str:
    romans = [
        "I", "II", "III", "IV", "V", "VI",
        "VII", "VIII", "IX", "X", "XI", "XII"
    ]
    if 1 <= month <= 12:
        return romans[month - 1]
    return "XI"


def init_db() -> None:
    conn = get_conn()
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS pegawai (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nama TEXT NOT NULL,
            nip TEXT NOT NULL,
            pangkat TEXT NOT NULL,
            jabatan TEXT NOT NULL,
            unit TEXT DEFAULT '',
            is_penandatangan INTEGER DEFAULT 0
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            kode_verifikasi TEXT UNIQUE NOT NULL,
            hash_sha256 TEXT NOT NULL,
            jenis_dokumen TEXT NOT NULL,
            kode_klasifikasi TEXT NOT NULL,
            nomor_urut INTEGER NOT NULL,
            nomor_surat TEXT NOT NULL,
            sifat TEXT DEFAULT 'Penting',
            lampiran TEXT DEFAULT '-',
            hal TEXT NOT NULL,
            tanggal_surat TEXT NOT NULL,
            tempat_surat TEXT DEFAULT 'Muara Wis',
            kepada TEXT DEFAULT '',
            tembusan TEXT DEFAULT '',
            body_json TEXT NOT NULL,
            penandatangan_nama TEXT NOT NULL,
            penandatangan_nip TEXT NOT NULL,
            penandatangan_pangkat TEXT NOT NULL,
            penandatangan_jabatan TEXT NOT NULL,
            atas_nama TEXT DEFAULT '',
            status TEXT DEFAULT 'ditandatangani',
            ai_mode TEXT DEFAULT 'local',
            prompt_asal TEXT DEFAULT '',
            kertas TEXT DEFAULT 'F4',
            font_family TEXT DEFAULT 'Times New Roman',
            show_stempel INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)

    # Seed settings if empty
    for k, v in DEFAULT_SETTINGS.items():
        cur.execute(
            "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
            (k, json.dumps(v) if not isinstance(v, str) else v),
        )

    # Seed pegawai if empty
    cur.execute("SELECT COUNT(*) FROM pegawai")
    if cur.fetchone()[0] == 0:
        for p in DEFAULT_PEGAWAI:
            cur.execute(
                """INSERT INTO pegawai (nama, nip, pangkat, jabatan, unit, is_penandatangan)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (p["nama"], p["nip"], p["pangkat"], p["jabatan"], p["unit"], p["is_penandatangan"]),
            )

    conn.commit()
    conn.close()


def get_settings() -> Dict[str, Any]:
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT key, value FROM settings")
    rows = cur.fetchall()
    conn.close()
    result = dict(DEFAULT_SETTINGS)
    for row in rows:
        k, v = row["key"], row["value"]
        if k in ("show_footer_tte", "show_stempel"):
            try:
                result[k] = bool(json.loads(v))
            except Exception:
                result[k] = v.lower() == "true"
        else:
            result[k] = v
    return result


def update_settings(payload: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_conn()
    cur = conn.cursor()
    for k, v in payload.items():
        if k in DEFAULT_SETTINGS:
            val_str = json.dumps(v) if isinstance(v, bool) else str(v)
            cur.execute(
                "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                (k, val_str),
            )
    conn.commit()
    conn.close()
    return get_settings()


def get_next_number(kode_klasifikasi: str = "100.1", tanggal_str: Optional[str] = None) -> Dict[str, Any]:
    settings = get_settings()
    now = datetime.now()
    month = now.month
    year = now.year
    if tanggal_str:
        # Try parsing YYYY-MM-DD
        try:
            dt = datetime.strptime(tanggal_str[:10], "%Y-%m-%d")
            month = dt.month
            year = dt.year
        except Exception:
            pass

    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT MAX(nomor_urut) as max_urut FROM documents WHERE created_at LIKE ?", (f"{year}%",))
    row = cur.fetchone()
    next_urut = (row["max_urut"] or 0) + 1
    conn.close()

    romawi = to_roman(month)
    fmt = settings.get("format_nomor") or "{kode}/{urut}/{instansi}/{romawi}/{tahun}"
    instansi = settings.get("kode_instansi") or "KMW"
    nomor_surat = (
        fmt.replace("{kode}", kode_klasifikasi)
        .replace("{urut}", f"{next_urut:03d}")
        .replace("{instansi}", instansi)
        .replace("{romawi}", romawi)
        .replace("{tahun}", str(year))
    )
    return {
        "nomor_urut": next_urut,
        "nomor_surat": nomor_surat,
        "romawi": romawi,
        "tahun": year,
    }


def list_pegawai() -> List[Dict[str, Any]]:
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM pegawai ORDER BY is_penandatangan DESC, id ASC")
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows


def upsert_pegawai(data: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_conn()
    cur = conn.cursor()
    if data.get("id"):
        cur.execute(
            """UPDATE pegawai SET nama=?, nip=?, pangkat=?, jabatan=?, unit=?, is_penandatangan=? WHERE id=?""",
            (
                data["nama"],
                data["nip"],
                data["pangkat"],
                data["jabatan"],
                data.get("unit", ""),
                1 if data.get("is_penandatangan") else 0,
                data["id"],
            ),
        )
        pid = data["id"]
    else:
        cur.execute(
            """INSERT INTO pegawai (nama, nip, pangkat, jabatan, unit, is_penandatangan) VALUES (?, ?, ?, ?, ?, ?)""",
            (
                data["nama"],
                data["nip"],
                data["pangkat"],
                data["jabatan"],
                data.get("unit", ""),
                1 if data.get("is_penandatangan") else 0,
            ),
        )
        pid = cur.lastrowid
    conn.commit()
    cur.execute("SELECT * FROM pegawai WHERE id=?", (pid,))
    row = dict(cur.fetchone())
    conn.close()
    return row


def delete_pegawai(pid: int) -> None:
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM pegawai WHERE id=?", (pid,))
    conn.commit()
    conn.close()
