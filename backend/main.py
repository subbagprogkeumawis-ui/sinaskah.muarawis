import json
import os
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from ai_engine import generate_local_document, generate_with_llm, polish_official_text
from database import (
    DESA_MUARA_WIS,
    KLASIFIKASI_ARSIP,
    delete_pegawai,
    get_conn,
    get_next_number,
    get_settings,
    init_db,
    list_pegawai,
    update_settings,
    upsert_pegawai,
)
from docx_exporter import export_document_to_docx
from qr_service import (
    LOGO_BW_PATH,
    LOGO_COLOR_PATH,
    compute_doc_hash,
    generate_qr_data_url,
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")

app = FastAPI(title="SI-NASKAH Kecamatan Muara Wis API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _get_base_url(request: Request, explicit: str = "") -> str:
    if explicit and explicit.startswith("http"):
        return explicit.rstrip("/")
    proto = request.headers.get("x-forwarded-proto") or request.url.scheme or "http"
    host = request.headers.get("x-forwarded-host") or request.headers.get("host") or ""
    if host:
        return f"{proto}://{host}".rstrip("/")
    return ""


def _seed_sample_documents() -> None:
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM documents")
    if cur.fetchone()[0] > 0:
        conn.close()
        return

    settings = get_settings()
    samples = [
        (
            "Buatkan surat undangan rapat koordinasi evaluasi APBDes dan ketahanan pangan untuk seluruh Kepala Desa se-Kecamatan Muara Wis hari Selasa tanggal 24 November 2026 pukul 09.00 WITA di Aula Kantor Camat Muara Wis",
            "surat_undangan",
        ),
        (
            "Buatkan surat tugas untuk Rina Sari Dewi dan M. Ridwan melaksanakan monitoring penyaluran bantuan sosial dan kesiapsiagaan banjir di Desa Melintang dan Desa Enggelam tanggal 25 November 2026",
            "surat_tugas",
        ),
        (
            "Buatkan surat edaran camat tentang gerakan kebersihan lingkungan, drainase, dan kewaspadaan musim penghujan di tepian Sungai Mahakam dan Danau Melintang untuk 7 Kepala Desa se-Kecamatan Muara Wis",
            "surat_edaran",
        ),
    ]
    now = datetime.now().isoformat(timespec="seconds")
    for idx, (prompt, jenis) in enumerate(samples, start=1):
        draft = generate_local_document(prompt, jenis)
        kode_verif = f"MW-{datetime.now().year}-{idx:04d}"
        doc_obj = {
            "kode_verifikasi": kode_verif,
            "jenis_dokumen": draft["jenis_dokumen"],
            "kode_klasifikasi": draft["kode_klasifikasi"],
            "nomor_urut": idx,
            "nomor_surat": draft["nomor_surat"].replace("001", f"{idx:03d}"),
            "sifat": draft["sifat"],
            "lampiran": draft["lampiran"],
            "hal": draft["hal"],
            "tanggal_surat": draft["tanggal_surat"],
            "tempat_surat": draft["tempat_surat"],
            "kepada": draft["kepada"],
            "tembusan": draft["tembusan"],
            "body": draft["body"],
            "penandatangan_nama": settings["camat_nama"],
            "penandatangan_nip": settings["camat_nip"],
            "penandatangan_pangkat": settings["camat_pangkat"],
            "penandatangan_jabatan": settings["camat_jabatan"],
            "atas_nama": "",
        }
        doc_hash = compute_doc_hash(doc_obj)
        cur.execute(
            """INSERT INTO documents (
                kode_verifikasi, hash_sha256, jenis_dokumen, kode_klasifikasi, nomor_urut,
                nomor_surat, sifat, lampiran, hal, tanggal_surat, tempat_surat, kepada,
                tembusan, body_json, penandatangan_nama, penandatangan_nip,
                penandatangan_pangkat, penandatangan_jabatan, atas_nama, status,
                ai_mode, prompt_asal, kertas, font_family, show_stempel, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                kode_verif,
                doc_hash,
                doc_obj["jenis_dokumen"],
                doc_obj["kode_klasifikasi"],
                idx,
                doc_obj["nomor_surat"],
                doc_obj["sifat"],
                doc_obj["lampiran"],
                doc_obj["hal"],
                doc_obj["tanggal_surat"],
                doc_obj["tempat_surat"],
                doc_obj["kepada"],
                doc_obj["tembusan"],
                json.dumps(doc_obj["body"], ensure_ascii=False),
                doc_obj["penandatangan_nama"],
                doc_obj["penandatangan_nip"],
                doc_obj["penandatangan_pangkat"],
                doc_obj["penandatangan_jabatan"],
                "",
                "ditandatangani",
                "local",
                prompt,
                settings["kertas_default"],
                settings["font_default"],
                0,
                now,
                now,
            ),
        )
    conn.commit()
    conn.close()


@app.on_event("startup")
def on_startup() -> None:
    init_db()
    _seed_sample_documents()


class AIGenerateRequest(BaseModel):
    prompt: str
    jenis_dokumen: Optional[str] = "auto"
    base_url: Optional[str] = ""


class AIPolishRequest(BaseModel):
    text: str


class QRPreviewRequest(BaseModel):
    document: Dict[str, Any]
    base_url: Optional[str] = ""


class DocumentSaveRequest(BaseModel):
    id: Optional[int] = None
    kode_verifikasi: Optional[str] = None
    jenis_dokumen: str
    kode_klasifikasi: str
    nomor_urut: int
    nomor_surat: str
    sifat: str = "Penting"
    lampiran: str = "-"
    hal: str
    tanggal_surat: str
    tempat_surat: str = "Muara Wis"
    kepada: str = ""
    tembusan: str = ""
    body: Dict[str, Any]
    penandatangan_nama: str
    penandatangan_nip: str
    penandatangan_pangkat: str
    penandatangan_jabatan: str
    atas_nama: str = ""
    status: str = "ditandatangani"
    ai_mode: str = "local"
    prompt_asal: str = ""
    kertas: str = "F4"
    font_family: str = "Times New Roman"
    show_stempel: bool = False


class PegawaiRequest(BaseModel):
    id: Optional[int] = None
    nama: str
    nip: str
    pangkat: str
    jabatan: str
    unit: str = ""
    is_penandatangan: bool = False


class ExportDocxRequest(BaseModel):
    document: Dict[str, Any]
    base_url: Optional[str] = ""


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "SI-NASKAH Kecamatan Muara Wis"}


@app.get("/api/backup/export")
def api_export_backup():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM documents ORDER BY id ASC")
    docs = [dict(r) for r in cur.fetchall()]
    conn.close()
    backup = {
        "exported_at": datetime.now().isoformat(timespec="seconds"),
        "app": "SI-NASKAH Kecamatan Muara Wis",
        "settings": get_settings(),
        "pegawai": list_pegawai(),
        "documents": docs,
    }
    raw = json.dumps(backup, ensure_ascii=False, indent=2)
    fname = f"backup_sinaskah_muarawis_{datetime.now().strftime('%Y%m%d')}.json"
    return Response(
        content=raw.encode("utf-8"),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )


@app.post("/api/backup/import")
def api_import_backup(payload: Dict[str, Any]):
    if isinstance(payload.get("settings"), dict):
        update_settings(payload["settings"])

    conn = get_conn()
    cur = conn.cursor()
    imported_docs = 0
    for d in payload.get("documents", []):
        if not d.get("kode_verifikasi"):
            continue
        cur.execute(
            """INSERT INTO documents (
                kode_verifikasi, hash_sha256, jenis_dokumen, kode_klasifikasi, nomor_urut,
                nomor_surat, sifat, lampiran, hal, tanggal_surat, tempat_surat, kepada,
                tembusan, body_json, penandatangan_nama, penandatangan_nip,
                penandatangan_pangkat, penandatangan_jabatan, atas_nama, status,
                ai_mode, prompt_asal, kertas, font_family, show_stempel, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(kode_verifikasi) DO UPDATE SET
                hash_sha256=excluded.hash_sha256,
                hal=excluded.hal,
                nomor_surat=excluded.nomor_surat,
                body_json=excluded.body_json,
                updated_at=excluded.updated_at""",
            (
                d["kode_verifikasi"],
                d.get("hash_sha256", ""),
                d.get("jenis_dokumen", "surat_dinas"),
                d.get("kode_klasifikasi", "100.1"),
                d.get("nomor_urut", 1),
                d.get("nomor_surat", ""),
                d.get("sifat", "Penting"),
                d.get("lampiran", "-"),
                d.get("hal", ""),
                d.get("tanggal_surat", ""),
                d.get("tempat_surat", "Muara Wis"),
                d.get("kepada", ""),
                d.get("tembusan", ""),
                d.get("body_json") or json.dumps(d.get("body", {}), ensure_ascii=False),
                d.get("penandatangan_nama", ""),
                d.get("penandatangan_nip", ""),
                d.get("penandatangan_pangkat", ""),
                d.get("penandatangan_jabatan", ""),
                d.get("atas_nama", ""),
                d.get("status", "ditandatangani"),
                d.get("ai_mode", "local"),
                d.get("prompt_asal", ""),
                d.get("kertas", "F4"),
                d.get("font_family", "Times New Roman"),
                1 if d.get("show_stempel") else 0,
                d.get("created_at", datetime.now().isoformat(timespec="seconds")),
                d.get("updated_at", datetime.now().isoformat(timespec="seconds")),
            ),
        )
        imported_docs += 1
    conn.commit()
    conn.close()
    return {"ok": True, "imported_documents": imported_docs}


@app.get("/api/logo/{mode}")
def get_logo(mode: str):
    path = LOGO_BW_PATH if mode == "bw" else LOGO_COLOR_PATH
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Logo not found")
    return FileResponse(path, media_type="image/png")


@app.get("/api/meta")
def get_meta():
    return {
        "desa": DESA_MUARA_WIS,
        "klasifikasi": KLASIFIKASI_ARSIP,
        "settings": get_settings(),
        "pegawai": list_pegawai(),
    }


@app.get("/api/settings")
def api_get_settings():
    return get_settings()


@app.put("/api/settings")
def api_update_settings(payload: Dict[str, Any]):
    return update_settings(payload)


@app.get("/api/pegawai")
def api_list_pegawai():
    return list_pegawai()


@app.post("/api/pegawai")
def api_upsert_pegawai(req: PegawaiRequest):
    return upsert_pegawai(req.model_dump())


@app.delete("/api/pegawai/{pid}")
def api_delete_pegawai(pid: int):
    delete_pegawai(pid)
    return {"ok": True}


@app.get("/api/next-number")
def api_next_number(kode: str = "100.1", tanggal: Optional[str] = None):
    return get_next_number(kode, tanggal)


@app.post("/api/ai/generate")
async def api_ai_generate(req: AIGenerateRequest, request: Request):
    settings = get_settings()
    draft = await generate_with_llm(req.prompt, req.jenis_dokumen, settings)
    base_url = _get_base_url(request, req.base_url or "")
    kode_verif = f"MW-{datetime.now().year}-{draft['nomor_urut']:04d}"

    full_doc = {
        **draft,
        "kode_verifikasi": kode_verif,
        "penandatangan_nama": settings["camat_nama"],
        "penandatangan_nip": settings["camat_nip"],
        "penandatangan_pangkat": settings["camat_pangkat"],
        "penandatangan_jabatan": settings["camat_jabatan"],
        "atas_nama": "",
        "status": "ditandatangani",
        "prompt_asal": req.prompt,
        "kertas": settings["kertas_default"],
        "font_family": settings["font_default"],
        "show_stempel": settings["show_stempel"],
    }
    full_doc["hash_sha256"] = compute_doc_hash(full_doc)
    qr = generate_qr_data_url(full_doc, settings, base_url=base_url)
    full_doc["qr_data_url"] = qr["data_url"]
    full_doc["qr_payload"] = qr["payload"]
    return full_doc


@app.post("/api/ai/polish")
async def api_ai_polish(req: AIPolishRequest):
    settings = get_settings()
    return await polish_official_text(req.text, settings)


@app.post("/api/qr/preview")
def api_qr_preview(req: QRPreviewRequest, request: Request):
    settings = get_settings()
    base_url = _get_base_url(request, req.base_url or "")
    doc = dict(req.document)
    doc_hash = compute_doc_hash(doc)
    doc["hash_sha256"] = doc_hash
    qr = generate_qr_data_url(doc, settings, base_url=base_url)
    return {
        "hash_sha256": doc_hash,
        "qr_data_url": qr["data_url"],
        "qr_payload": qr["payload"],
    }


def _row_to_doc(row, settings: Dict[str, Any], base_url: str = "") -> Dict[str, Any]:
    d = dict(row)
    d["body"] = json.loads(d.pop("body_json"))
    d["show_stempel"] = bool(d.get("show_stempel", 0))
    qr = generate_qr_data_url(d, settings, base_url=base_url)
    d["qr_data_url"] = qr["data_url"]
    d["qr_payload"] = qr["payload"]
    return d


@app.get("/api/documents")
def api_list_documents(
    request: Request,
    q: str = "",
    jenis: str = "",
    status: str = "",
):
    settings = get_settings()
    base_url = _get_base_url(request)
    conn = get_conn()
    cur = conn.cursor()
    sql = "SELECT * FROM documents WHERE 1=1"
    params: List[Any] = []
    if jenis and jenis != "all":
        sql += " AND jenis_dokumen = ?"
        params.append(jenis)
    if status and status != "all":
        sql += " AND status = ?"
        params.append(status)
    if q.strip():
        like = f"%{q.strip()}%"
        sql += " AND (nomor_surat LIKE ? OR hal LIKE ? OR kepada LIKE ? OR kode_verifikasi LIKE ? OR penandatangan_nama LIKE ?)"
        params.extend([like, like, like, like, like])
    sql += " ORDER BY id DESC"
    cur.execute(sql, params)
    rows = cur.fetchall()
    conn.close()
    return [_row_to_doc(r, settings, base_url) for r in rows]


@app.get("/api/documents/{doc_id}")
def api_get_document(doc_id: int, request: Request):
    settings = get_settings()
    base_url = _get_base_url(request)
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM documents WHERE id = ?", (doc_id,))
    row = cur.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Dokumen tidak ditemukan")
    return _row_to_doc(row, settings, base_url)


@app.post("/api/documents")
def api_save_document(req: DocumentSaveRequest, request: Request):
    settings = get_settings()
    base_url = _get_base_url(request)
    now = datetime.now().isoformat(timespec="seconds")
    conn = get_conn()
    cur = conn.cursor()

    payload = req.model_dump()
    doc_hash = compute_doc_hash(payload)

    if req.id:
        cur.execute("SELECT id, kode_verifikasi FROM documents WHERE id = ?", (req.id,))
        existing = cur.fetchone()
        if existing:
            kode_verif = existing["kode_verifikasi"]
            cur.execute(
                """UPDATE documents SET
                    hash_sha256=?, jenis_dokumen=?, kode_klasifikasi=?, nomor_urut=?,
                    nomor_surat=?, sifat=?, lampiran=?, hal=?, tanggal_surat=?, tempat_surat=?,
                    kepada=?, tembusan=?, body_json=?, penandatangan_nama=?, penandatangan_nip=?,
                    penandatangan_pangkat=?, penandatangan_jabatan=?, atas_nama=?, status=?,
                    ai_mode=?, prompt_asal=?, kertas=?, font_family=?, show_stempel=?, updated_at=?
                WHERE id=?""",
                (
                    doc_hash,
                    req.jenis_dokumen,
                    req.kode_klasifikasi,
                    req.nomor_urut,
                    req.nomor_surat,
                    req.sifat,
                    req.lampiran,
                    req.hal,
                    req.tanggal_surat,
                    req.tempat_surat,
                    req.kepada,
                    req.tembusan,
                    json.dumps(req.body, ensure_ascii=False),
                    req.penandatangan_nama,
                    req.penandatangan_nip,
                    req.penandatangan_pangkat,
                    req.penandatangan_jabatan,
                    req.atas_nama,
                    req.status,
                    req.ai_mode,
                    req.prompt_asal,
                    req.kertas,
                    req.font_family,
                    1 if req.show_stempel else 0,
                    now,
                    req.id,
                ),
            )
            conn.commit()
            cur.execute("SELECT * FROM documents WHERE id = ?", (req.id,))
            row = cur.fetchone()
            conn.close()
            return _row_to_doc(row, settings, base_url)

    # Generate unique kode_verifikasi
    cur.execute("SELECT MAX(id) as mid FROM documents")
    mid = (cur.fetchone()["mid"] or 0) + 1
    kode_verif = req.kode_verifikasi or f"MW-{datetime.now().year}-{mid:04d}"
    # Ensure uniqueness
    cur.execute("SELECT id FROM documents WHERE kode_verifikasi = ?", (kode_verif,))
    if cur.fetchone():
        kode_verif = f"MW-{datetime.now().year}-{mid:04d}-{int(datetime.now().timestamp()) % 1000:03d}"

    cur.execute(
        """INSERT INTO documents (
            kode_verifikasi, hash_sha256, jenis_dokumen, kode_klasifikasi, nomor_urut,
            nomor_surat, sifat, lampiran, hal, tanggal_surat, tempat_surat, kepada,
            tembusan, body_json, penandatangan_nama, penandatangan_nip,
            penandatangan_pangkat, penandatangan_jabatan, atas_nama, status,
            ai_mode, prompt_asal, kertas, font_family, show_stempel, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            kode_verif,
            doc_hash,
            req.jenis_dokumen,
            req.kode_klasifikasi,
            req.nomor_urut,
            req.nomor_surat,
            req.sifat,
            req.lampiran,
            req.hal,
            req.tanggal_surat,
            req.tempat_surat,
            req.kepada,
            req.tembusan,
            json.dumps(req.body, ensure_ascii=False),
            req.penandatangan_nama,
            req.penandatangan_nip,
            req.penandatangan_pangkat,
            req.penandatangan_jabatan,
            req.atas_nama,
            req.status,
            req.ai_mode,
            req.prompt_asal,
            req.kertas,
            req.font_family,
            1 if req.show_stempel else 0,
            now,
            now,
        ),
    )
    new_id = cur.lastrowid
    conn.commit()
    cur.execute("SELECT * FROM documents WHERE id = ?", (new_id,))
    row = cur.fetchone()
    conn.close()
    return _row_to_doc(row, settings, base_url)


@app.delete("/api/documents/{doc_id}")
def api_delete_document(doc_id: int):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
    conn.commit()
    conn.close()
    return {"ok": True}


@app.get("/api/verify/{kode}")
def api_verify_document(kode: str, h: str = Query(default="")):
    settings = get_settings()
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM documents WHERE kode_verifikasi = ?", (kode.strip(),))
    row = cur.fetchone()
    conn.close()
    if not row:
        return {
            "valid": False,
            "kode_verifikasi": kode,
            "message": "Kode verifikasi tidak terdaftar pada sistem arsip Kecamatan Muara Wis.",
        }
    d = dict(row)
    d["body"] = json.loads(d.pop("body_json"))
    recomputed = compute_doc_hash(d)
    hash_ok = (recomputed == d["hash_sha256"]) and (not h or d["hash_sha256"].upper().startswith(h.upper()))
    return {
        "valid": hash_ok,
        "kode_verifikasi": d["kode_verifikasi"],
        "hash_sha256": d["hash_sha256"],
        "short_hash": d["hash_sha256"][:12].upper(),
        "instansi": settings["nama_instansi"],
        "pemda": settings["nama_pemda"],
        "jenis_dokumen": d["jenis_dokumen"],
        "nomor_surat": d["nomor_surat"],
        "hal": d["hal"],
        "tanggal_surat": d["tanggal_surat"],
        "tempat_surat": d["tempat_surat"],
        "kepada": d["kepada"],
        "penandatangan_nama": d["penandatangan_nama"],
        "penandatangan_nip": d["penandatangan_nip"],
        "penandatangan_pangkat": d["penandatangan_pangkat"],
        "penandatangan_jabatan": d["penandatangan_jabatan"],
        "atas_nama": d["atas_nama"],
        "status": d["status"],
        "created_at": d["created_at"],
    }


@app.post("/api/export/docx")
def api_export_docx(req: ExportDocxRequest, request: Request):
    settings = get_settings()
    base_url = _get_base_url(request, req.base_url or "")
    doc = dict(req.document)
    if not doc.get("hash_sha256"):
        doc["hash_sha256"] = compute_doc_hash(doc)
    docx_bytes = export_document_to_docx(doc, settings, base_url=base_url)

    safe_hal = "".join(c if c.isalnum() or c in (" ", "-", "_") else "_" for c in (doc.get("hal") or "Dokumen"))[:50].strip().replace(" ", "_")
    filename = f"{doc.get('jenis_dokumen', 'surat')}_{safe_hal}.docx"
    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# Mount static frontend if compiled
if os.path.exists(os.path.join(STATIC_DIR, "assets")):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")


@app.get("/{full_path:path}")
def serve_spa(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API endpoint not found")
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return HTMLResponse(
        "<h2>SI-NASKAH Muara Wis Backend Aktif</h2><p>Frontend sedang dibangun...</p>"
    )
