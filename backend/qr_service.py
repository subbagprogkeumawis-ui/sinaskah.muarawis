import base64
import hashlib
import io
import json
import os
from typing import Any, Dict, Optional

import qrcode
from PIL import Image, ImageDraw

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOGO_COLOR_PATH = os.path.join(BASE_DIR, "assets", "logo_kukar_color.png")
LOGO_BW_PATH = os.path.join(BASE_DIR, "assets", "logo_kukar_bw.png")


def compute_doc_hash(doc: Dict[str, Any]) -> str:
    payload = {
        "jenis_dokumen": doc.get("jenis_dokumen", ""),
        "nomor_surat": doc.get("nomor_surat", ""),
        "hal": doc.get("hal", ""),
        "tanggal_surat": doc.get("tanggal_surat", ""),
        "kepada": doc.get("kepada", ""),
        "penandatangan_nama": doc.get("penandatangan_nama", ""),
        "penandatangan_nip": doc.get("penandatangan_nip", ""),
        "body": doc.get("body") if "body" in doc else doc.get("body_json", ""),
    }
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def build_qr_payload(doc: Dict[str, Any], settings: Dict[str, Any], base_url: str = "") -> str:
    mode = settings.get("qr_mode", "hybrid")
    kode = doc.get("kode_verifikasi", "MW-2026-0001")
    doc_hash = doc.get("hash_sha256") or compute_doc_hash(doc)
    short_hash = doc_hash[:12].upper()

    public_url = (settings.get("public_base_url") or base_url or "").strip().rstrip("/")
    if mode in ("url", "hybrid") and public_url.startswith("http"):
        return f"{public_url}/verifikasi/{kode}?h={short_hash}"

    # Offline plaintext certificate payload
    lines = [
        "TTE SAH - PEMKAB KUTAI KARTANEGARA",
        f"Instansi: {settings.get('nama_instansi', 'KECAMATAN MUARA WIS')}",
        f"Kode Verifikasi: {kode}",
        f"Nomor: {doc.get('nomor_surat', '-')}",
        f"Perihal: {str(doc.get('hal', '-'))[:80]}",
        f"Tanggal: {doc.get('tanggal_surat', '-')}",
        f"Penandatangan: {doc.get('penandatangan_nama', settings.get('camat_nama', ''))}",
        f"NIP: {doc.get('penandatangan_nip', settings.get('camat_nip', ''))}",
        f"Jabatan: {doc.get('penandatangan_jabatan', settings.get('camat_jabatan', ''))}",
        f"SHA256: {short_hash}",
    ]
    return "\n".join(lines)


def generate_qr_png_bytes(
    payload: str,
    with_logo: bool = True,
    bw: bool = False,
    box_size: int = 10,
) -> bytes:
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H if with_logo else qrcode.constants.ERROR_CORRECT_M,
        box_size=box_size,
        border=2,
    )
    qr.add_data(payload)
    qr.make(fit=True)

    img = qr.make_image(fill_color="#0F172A", back_color="white").convert("RGBA")
    w, h = img.size

    if with_logo:
        logo_path = LOGO_BW_PATH if bw else LOGO_COLOR_PATH
        if os.path.exists(logo_path):
            logo = Image.open(logo_path).convert("RGBA")
            # Keep logo <= 19% of QR width so QR remains reliably scannable
            max_logo_size = int(w * 0.20)
            lw, lh = logo.size
            ratio = min(max_logo_size / lw, max_logo_size / lh)
            new_lw = max(16, int(lw * ratio))
            new_lh = max(16, int(lh * ratio))
            logo = logo.resize((new_lw, new_lh), Image.Resampling.LANCZOS)

            pad = max(4, int(w * 0.02))
            badge_w = new_lw + pad * 2
            badge_h = new_lh + pad * 2
            bx = (w - badge_w) // 2
            by = (h - badge_h) // 2

            draw = ImageDraw.Draw(img)
            draw.rounded_rectangle(
                [bx, by, bx + badge_w, by + badge_h],
                radius=max(4, pad),
                fill=(255, 255, 255, 255),
                outline=(226, 232, 240, 255),
                width=1,
            )
            img.paste(logo, (bx + pad, by + pad), logo)

    buf = io.BytesIO()
    img.convert("RGB").save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def generate_qr_data_url(
    doc: Dict[str, Any],
    settings: Dict[str, Any],
    base_url: str = "",
    with_logo: bool = True,
) -> Dict[str, str]:
    payload = build_qr_payload(doc, settings, base_url=base_url)
    bw = settings.get("logo_mode", "color") == "bw"
    png_bytes = generate_qr_png_bytes(payload, with_logo=with_logo, bw=bw, box_size=8)
    b64 = base64.b64encode(png_bytes).decode("ascii")
    return {
        "payload": payload,
        "data_url": f"data:image/png;base64,{b64}",
    }
