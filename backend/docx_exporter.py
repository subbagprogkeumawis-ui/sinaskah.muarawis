import io
import os
from typing import Any, Dict, List

from docx import Document
from docx.enum.table import WD_ALIGN_VERTICAL, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
from docx.shared import Cm, Pt, RGBColor

from ai_engine import format_tanggal_indo
from qr_service import (
    LOGO_BW_PATH,
    LOGO_COLOR_PATH,
    build_qr_payload,
    compute_doc_hash,
    generate_qr_png_bytes,
)


def _set_cell_margins(cell, top=40, bottom=40, left=60, right=60):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement("w:tcMar")
    for m, val in [("top", top), ("bottom", bottom), ("left", left), ("right", right)]:
        node = OxmlElement(f"w:{m}")
        node.set(qn("w:w"), str(val))
        node.set(qn("w:type"), "dxa")
        tcMar.append(node)
    tcPr.append(tcMar)


def _remove_table_borders(table):
    tblPr = table._tbl.tblPr
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        '<w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/>'
        '<w:right w:val="none"/><w:insideH w:val="none"/><w:insideV w:val="none"/>'
        "</w:tblBorders>"
    )
    tblPr.append(borders)


def _set_table_grid_borders(table):
    tblPr = table._tbl.tblPr
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        '<w:top w:val="single" w:sz="6" w:color="000000"/>'
        '<w:left w:val="single" w:sz="6" w:color="000000"/>'
        '<w:bottom w:val="single" w:sz="6" w:color="000000"/>'
        '<w:right w:val="single" w:sz="6" w:color="000000"/>'
        '<w:insideH w:val="single" w:sz="4" w:color="000000"/>'
        '<w:insideV w:val="single" w:sz="4" w:color="000000"/>'
        "</w:tblBorders>"
    )
    tblPr.append(borders)


def _add_kop_border_paragraph(doc: Document):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(10)
    pPr = p._p.get_or_add_pPr()
    pBdr = parse_xml(
        f'<w:pBdr {nsdecls("w")}>'
        '<w:top w:val="thickThinLargeGap" w:sz="18" w:space="1" w:color="000000"/>'
        "</w:pBdr>"
    )
    pPr.append(pBdr)


def _add_run(p, text: str, font_name: str, size_pt: float, bold=False, italic=False, underline=False, color=None):
    run = p.add_run(text)
    run.font.name = font_name
    run.font.size = Pt(size_pt)
    run.bold = bold
    run.italic = italic
    run.underline = underline
    if color:
        run.font.color.rgb = color
    return run


def _add_kop_surat(doc: Document, settings: Dict[str, Any], font_name: str):
    tbl = doc.add_table(rows=1, cols=2)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    _remove_table_borders(tbl)

    c_logo = tbl.cell(0, 0)
    c_text = tbl.cell(0, 1)
    c_logo.width = Cm(2.4)
    c_text.width = Cm(14.6)
    c_logo.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
    c_text.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
    _set_cell_margins(c_logo, 0, 0, 0, 60)
    _set_cell_margins(c_text, 0, 0, 60, 0)

    logo_path = LOGO_BW_PATH if settings.get("logo_mode") == "bw" else LOGO_COLOR_PATH
    p_logo = c_logo.paragraphs[0]
    p_logo.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_logo.paragraph_format.space_after = Pt(0)
    if os.path.exists(logo_path):
        p_logo.add_run().add_picture(logo_path, width=Cm(2.05))

    p1 = c_text.paragraphs[0]
    p1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p1.paragraph_format.space_before = Pt(0)
    p1.paragraph_format.space_after = Pt(1)
    _add_run(p1, settings.get("nama_pemda", "PEMERINTAH KABUPATEN KUTAI KARTANEGARA"), font_name, 12.5, bold=True)

    p2 = c_text.add_paragraph()
    p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p2.paragraph_format.space_before = Pt(0)
    p2.paragraph_format.space_after = Pt(2)
    _add_run(p2, settings.get("nama_instansi", "KECAMATAN MUARA WIS"), font_name, 16, bold=True)

    p3 = c_text.add_paragraph()
    p3.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p3.paragraph_format.space_before = Pt(0)
    p3.paragraph_format.space_after = Pt(1)
    _add_run(
        p3,
        f"{settings.get('alamat', '')} {settings.get('kode_pos', '75559')}",
        font_name,
        9.0,
    )

    p4 = c_text.add_paragraph()
    p4.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p4.paragraph_format.space_before = Pt(0)
    p4.paragraph_format.space_after = Pt(0)
    _add_run(
        p4,
        f"Pos-el : {settings.get('email', 'kec.muarawis@gmail.com')}   Laman : {settings.get('website', 'https://muarawis.kukarkab.go.id')}",
        font_name,
        9.0,
    )

    _add_kop_border_paragraph(doc)


def _add_kv_table(doc: Document, rows: List[tuple], font_name: str, col1_cm=3.2, col2_cm=0.5, col3_cm=13.3, indent_cm=0.0):
    tbl = doc.add_table(rows=len(rows), cols=3)
    tbl.alignment = WD_TABLE_ALIGNMENT.LEFT
    _remove_table_borders(tbl)
    for idx, (k, v) in enumerate(rows):
        c0, c1, c2 = tbl.cell(idx, 0), tbl.cell(idx, 1), tbl.cell(idx, 2)
        c0.width = Cm(col1_cm)
        c1.width = Cm(col2_cm)
        c2.width = Cm(col3_cm)
        for c in (c0, c1, c2):
            _set_cell_margins(c, 20, 20, 20, 20)
        p0 = c0.paragraphs[0]
        p0.paragraph_format.left_indent = Cm(indent_cm)
        p0.paragraph_format.space_after = Pt(1)
        _add_run(p0, k, font_name, 11)

        p1 = c1.paragraphs[0]
        p1.paragraph_format.space_after = Pt(1)
        _add_run(p1, ":" if k else "", font_name, 11)

        p2 = c2.paragraphs[0]
        p2.paragraph_format.space_after = Pt(1)
        _add_run(p2, v, font_name, 11, bold=(k.lower() in ("acara", "nama") and idx == 0))


def _add_signature_block(
    doc: Document,
    doc_data: Dict[str, Any],
    settings: Dict[str, Any],
    font_name: str,
    base_url: str = "",
    left_label: str = "",
    left_sub: str = "",
    date_prefix: str = "",
):
    p_spacer = doc.add_paragraph()
    p_spacer.paragraph_format.space_before = Pt(10)
    p_spacer.paragraph_format.space_after = Pt(0)

    tbl = doc.add_table(rows=1, cols=2)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    _remove_table_borders(tbl)

    c_left = tbl.cell(0, 0)
    c_right = tbl.cell(0, 1)
    c_left.width = Cm(8.5)
    c_right.width = Cm(8.5)
    _set_cell_margins(c_left, 20, 20, 20, 20)
    _set_cell_margins(c_right, 20, 20, 20, 20)

    if left_label:
        pl = c_left.paragraphs[0]
        pl.alignment = WD_ALIGN_PARAGRAPH.CENTER
        _add_run(pl, left_label, font_name, 11)
        for _ in range(3):
            c_left.add_paragraph()
        pl2 = c_left.add_paragraph()
        pl2.alignment = WD_ALIGN_PARAGRAPH.CENTER
        _add_run(pl2, left_sub or "( ............................................. )", font_name, 11, bold=True)
    else:
        c_left.paragraphs[0].text = ""

    tgl_text = f"{doc_data.get('tempat_surat', 'Muara Wis')}, {format_tanggal_indo(doc_data.get('tanggal_surat', ''))}"
    pr1 = c_right.paragraphs[0]
    pr1.paragraph_format.space_after = Pt(2)
    if date_prefix:
        _add_run(pr1, f"{date_prefix} {doc_data.get('tempat_surat', 'Muara Wis')}\n", font_name, 10.5)
        _add_run(pr1, f"Pada tanggal {format_tanggal_indo(doc_data.get('tanggal_surat', ''))}", font_name, 10.5)
    else:
        _add_run(pr1, tgl_text, font_name, 11)

    atas_nama = (doc_data.get("atas_nama") or "").strip()
    jabatan = doc_data.get("penandatangan_jabatan") or settings.get("camat_jabatan", "Camat Muara Wis")
    pr2 = c_right.add_paragraph()
    pr2.paragraph_format.space_after = Pt(4)
    if atas_nama:
        _add_run(pr2, f"{atas_nama}\n{jabatan},", font_name, 11, bold=True)
    else:
        _add_run(pr2, f"{jabatan},", font_name, 11, bold=True)

    # QR Code TTE
    qr_payload = build_qr_payload(doc_data, settings, base_url=base_url)
    bw = settings.get("logo_mode") == "bw"
    qr_bytes = generate_qr_png_bytes(qr_payload, with_logo=True, bw=bw, box_size=10)

    pr_qr = c_right.add_paragraph()
    pr_qr.paragraph_format.space_before = Pt(2)
    pr_qr.paragraph_format.space_after = Pt(2)
    pr_qr.add_run().add_picture(io.BytesIO(qr_bytes), width=Cm(2.25))

    pr_tte_note = c_right.add_paragraph()
    pr_tte_note.paragraph_format.space_after = Pt(3)
    _add_run(
        pr_tte_note,
        "Ditandatangani secara elektronik",
        font_name,
        8.0,
        italic=True,
        color=RGBColor(71, 85, 105),
    )

    pr3 = c_right.add_paragraph()
    pr3.paragraph_format.space_after = Pt(1)
    _add_run(
        pr3,
        doc_data.get("penandatangan_nama") or settings.get("camat_nama", "Fadhli Annur, S.Pd"),
        font_name,
        11,
        bold=True,
        underline=True,
    )

    pangkat = doc_data.get("penandatangan_pangkat") or settings.get("camat_pangkat", "Pembina (IV/a)")
    nip = doc_data.get("penandatangan_nip") or settings.get("camat_nip", "197106051996031004")
    pr4 = c_right.add_paragraph()
    pr4.paragraph_format.space_after = Pt(0)
    _add_run(pr4, f"{pangkat}\nNIP. {nip}", font_name, 10.5)


def _add_tembusan(doc: Document, tembusan: str, font_name: str):
    if not tembusan or not tembusan.strip():
        return
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(2)
    _add_run(p, "Tembusan disampaikan kepada Yth.:", font_name, 10, bold=True)
    for line in tembusan.strip().splitlines():
        pl = doc.add_paragraph()
        pl.paragraph_format.left_indent = Cm(0.5)
        pl.paragraph_format.space_after = Pt(1)
        _add_run(pl, line.strip(), font_name, 10)


def _add_tte_footer(doc: Document, doc_data: Dict[str, Any], settings: Dict[str, Any], font_name: str):
    if not settings.get("show_footer_tte", True):
        return
    section = doc.sections[0]
    footer = section.footer
    fp = footer.paragraphs[0]
    fp.alignment = WD_ALIGN_PARAGRAPH.LEFT
    kode = doc_data.get("kode_verifikasi", "MW-2026-0001")
    hshort = (doc_data.get("hash_sha256") or compute_doc_hash(doc_data))[:12].upper()
    _add_run(
        fp,
        f"Dokumen ini sah dan ditandatangani secara elektronik (TTE) oleh Camat Muara Wis. Kode Verifikasi: {kode} | Hash: {hshort}",
        font_name,
        7.5,
        italic=True,
        color=RGBColor(100, 116, 139),
    )


def export_document_to_docx(doc_data: Dict[str, Any], settings: Dict[str, Any], base_url: str = "") -> bytes:
    doc = Document()
    kertas = doc_data.get("kertas") or settings.get("kertas_default", "F4")
    font_name = doc_data.get("font_family") or settings.get("font_default", "Times New Roman")

    section = doc.sections[0]
    if kertas == "A4":
        section.page_width = Cm(21.0)
        section.page_height = Cm(29.7)
    else:  # F4 Folio
        section.page_width = Cm(21.5)
        section.page_height = Cm(33.0)

    section.top_margin = Cm(1.5)
    section.bottom_margin = Cm(1.8)
    section.left_margin = Cm(2.5)
    section.right_margin = Cm(2.0)

    jenis = doc_data.get("jenis_dokumen", "surat_dinas")
    body = doc_data.get("body") or {}

    if jenis != "nota_dinas":
        _add_kop_surat(doc, settings, font_name)
    else:
        # Nota Dinas compact header
        p_nd = doc.add_paragraph()
        p_nd.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_nd.paragraph_format.space_after = Pt(2)
        _add_run(p_nd, f"{settings.get('nama_pemda')}\n{settings.get('nama_instansi')}", font_name, 11.5, bold=True)
        _add_kop_border_paragraph(doc)

    # Render body per jenis
    if jenis in ("surat_dinas", "surat_undangan"):
        # Header 2 columns: Left (Nomor, Sifat, Lampiran, Hal), Right (Tanggal + Kepada)
        tbl_hdr = doc.add_table(rows=1, cols=2)
        tbl_hdr.alignment = WD_TABLE_ALIGNMENT.CENTER
        _remove_table_borders(tbl_hdr)
        cL, cR = tbl_hdr.cell(0, 0), tbl_hdr.cell(0, 1)
        cL.width = Cm(9.5)
        cR.width = Cm(7.5)
        _set_cell_margins(cL, 0, 0, 0, 40)
        _set_cell_margins(cR, 0, 0, 40, 0)

        p_meta = cL.paragraphs[0]
        p_meta.paragraph_format.space_after = Pt(2)
        _add_run(p_meta, f"Nomor     : {doc_data.get('nomor_surat', '-')}\n", font_name, 11)
        _add_run(p_meta, f"Sifat        : {doc_data.get('sifat', 'Penting')}\n", font_name, 11)
        _add_run(p_meta, f"Lampiran : {doc_data.get('lampiran', '-')}\n", font_name, 11)
        _add_run(p_meta, f"Hal          : ", font_name, 11)
        _add_run(p_meta, doc_data.get("hal", "-"), font_name, 11, bold=True)

        p_tgl = cR.paragraphs[0]
        p_tgl.paragraph_format.space_after = Pt(8)
        _add_run(p_tgl, f"{doc_data.get('tempat_surat', 'Muara Wis')}, {format_tanggal_indo(doc_data.get('tanggal_surat', ''))}", font_name, 11)

        p_kpd = cR.add_paragraph()
        p_kpd.paragraph_format.space_after = Pt(2)
        _add_run(p_kpd, "Kepada Yth.\n", font_name, 11)
        _add_run(p_kpd, doc_data.get("kepada", "-"), font_name, 11)

        p_pemb = doc.add_paragraph()
        p_pemb.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p_pemb.paragraph_format.space_before = Pt(12)
        p_pemb.paragraph_format.space_after = Pt(6)
        p_pemb.paragraph_format.first_line_indent = Cm(1.0)
        _add_run(p_pemb, body.get("pembuka", ""), font_name, 11)

        if jenis == "surat_undangan":
            _add_kv_table(
                doc,
                [
                    ("Hari / Tanggal", body.get("hari_tanggal", "-")),
                    ("Pukul / Waktu", body.get("waktu", "-")),
                    ("Tempat", body.get("tempat", "-")),
                    ("Acara", body.get("acara", doc_data.get("hal", "-"))),
                ],
                font_name,
                col1_cm=3.4,
                col2_cm=0.4,
                col3_cm=12.0,
                indent_cm=1.0,
            )

        for para_txt in body.get("isi_paragraf", []):
            p_isi = doc.add_paragraph()
            p_isi.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            p_isi.paragraph_format.space_before = Pt(4)
            p_isi.paragraph_format.space_after = Pt(6)
            p_isi.paragraph_format.first_line_indent = Cm(1.0)
            _add_run(p_isi, para_txt, font_name, 11)

        if jenis == "surat_undangan" and body.get("catatan_undangan"):
            p_cat = doc.add_paragraph()
            p_cat.paragraph_format.space_after = Pt(6)
            p_cat.paragraph_format.left_indent = Cm(1.0)
            _add_run(p_cat, f"Catatan: {body.get('catatan_undangan')}", font_name, 10.5, italic=True)

        p_pen = doc.add_paragraph()
        p_pen.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p_pen.paragraph_format.first_line_indent = Cm(1.0)
        _add_run(p_pen, body.get("penutup", ""), font_name, 11)

        _add_signature_block(doc, doc_data, settings, font_name, base_url=base_url)
        _add_tembusan(doc, doc_data.get("tembusan", ""), font_name)

    elif jenis == "surat_tugas":
        p_t = doc.add_paragraph()
        p_t.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_t.paragraph_format.space_after = Pt(2)
        _add_run(p_t, "SURAT TUGAS", font_name, 13, bold=True, underline=True)
        p_n = doc.add_paragraph()
        p_n.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_n.paragraph_format.space_after = Pt(12)
        _add_run(p_n, f"NOMOR : {doc_data.get('nomor_surat', '-')}", font_name, 11, bold=True)

        dasar_list = body.get("dasar", [])
        dasar_str = "\n".join([f"{i+1}. {d}" for i, d in enumerate(dasar_list)])
        _add_kv_table(doc, [("Dasar", dasar_str)], font_name, col1_cm=2.5, col2_cm=0.4, col3_cm=14.1)

        p_m = doc.add_paragraph()
        p_m.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_m.paragraph_format.space_before = Pt(8)
        p_m.paragraph_format.space_after = Pt(8)
        _add_run(p_m, "MEMERINTAHKAN :", font_name, 11.5, bold=True)

        p_kpd = doc.add_paragraph()
        p_kpd.paragraph_format.space_after = Pt(4)
        _add_run(p_kpd, "Kepada :", font_name, 11, bold=True)

        petugas = body.get("petugas", [])
        if petugas:
            tbl_p = doc.add_table(rows=len(petugas) + 1, cols=5)
            tbl_p.alignment = WD_TABLE_ALIGNMENT.CENTER
            _set_table_grid_borders(tbl_p)
            headers = ["No", "Nama", "Pangkat / Gol.", "NIP", "Jabatan"]
            widths = [Cm(1.0), Cm(4.3), Cm(3.5), Cm(4.0), Cm(4.2)]
            for j, h in enumerate(headers):
                cell = tbl_p.cell(0, j)
                cell.width = widths[j]
                _set_cell_margins(cell, 40, 40, 40, 40)
                ph = cell.paragraphs[0]
                ph.alignment = WD_ALIGN_PARAGRAPH.CENTER
                _add_run(ph, h, font_name, 10, bold=True)
            for idx, pg in enumerate(petugas):
                vals = [str(idx + 1), pg.get("nama", ""), pg.get("pangkat", ""), pg.get("nip", ""), pg.get("jabatan", "")]
                for j, val in enumerate(vals):
                    cell = tbl_p.cell(idx + 1, j)
                    cell.width = widths[j]
                    _set_cell_margins(cell, 35, 35, 45, 45)
                    pc = cell.paragraphs[0]
                    if j == 0:
                        pc.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    _add_run(pc, val, font_name, 10)

        p_u_sp = doc.add_paragraph()
        p_u_sp.paragraph_format.space_before = Pt(8)
        p_u_sp.paragraph_format.space_after = Pt(0)
        tujuan = body.get("tujuan_tugas", [])
        tujuan_str = "\n".join([f"{i+1}. {t}" for i, t in enumerate(tujuan)])
        _add_kv_table(doc, [("Untuk", tujuan_str)], font_name, col1_cm=2.5, col2_cm=0.4, col3_cm=14.1)

        p_pen = doc.add_paragraph()
        p_pen.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p_pen.paragraph_format.space_before = Pt(8)
        p_pen.paragraph_format.first_line_indent = Cm(1.0)
        _add_run(p_pen, body.get("penutup", ""), font_name, 11)

        _add_signature_block(doc, doc_data, settings, font_name, base_url=base_url)
        _add_tembusan(doc, doc_data.get("tembusan", ""), font_name)

    elif jenis == "surat_edaran":
        p_kpd = doc.add_paragraph()
        p_kpd.paragraph_format.left_indent = Cm(9.0)
        p_kpd.paragraph_format.space_after = Pt(10)
        _add_run(p_kpd, "Yth.\n" + (doc_data.get("kepada") or "-"), font_name, 11)

        p_t = doc.add_paragraph()
        p_t.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_t.paragraph_format.space_after = Pt(2)
        _add_run(p_t, "SURAT EDARAN", font_name, 13, bold=True)
        p_n = doc.add_paragraph()
        p_n.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_n.paragraph_format.space_after = Pt(4)
        _add_run(p_n, f"NOMOR : {doc_data.get('nomor_surat', '-')}", font_name, 11, bold=True)
        p_tt = doc.add_paragraph()
        p_tt.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_tt.paragraph_format.space_after = Pt(10)
        _add_run(p_tt, f"TENTANG\n{body.get('judul_tentang', doc_data.get('hal', '').upper())}", font_name, 11.5, bold=True)

        for para_txt in body.get("isi_paragraf", []):
            p_isi = doc.add_paragraph()
            p_isi.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            p_isi.paragraph_format.first_line_indent = Cm(1.0)
            p_isi.paragraph_format.space_after = Pt(6)
            _add_run(p_isi, para_txt, font_name, 11)

        for idx, pt_txt in enumerate(body.get("poin_edaran", [])):
            p_pt = doc.add_paragraph()
            p_pt.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            p_pt.paragraph_format.left_indent = Cm(1.0)
            p_pt.paragraph_format.space_after = Pt(4)
            _add_run(p_pt, f"{idx+1}. {pt_txt}", font_name, 11)

        p_pen = doc.add_paragraph()
        p_pen.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p_pen.paragraph_format.space_before = Pt(6)
        p_pen.paragraph_format.first_line_indent = Cm(1.0)
        _add_run(p_pen, body.get("penutup", ""), font_name, 11)

        _add_signature_block(doc, doc_data, settings, font_name, base_url=base_url)
        _add_tembusan(doc, doc_data.get("tembusan", ""), font_name)

    elif jenis == "surat_keterangan":
        judul = body.get("judul_surat", "SURAT KETERANGAN")
        p_t = doc.add_paragraph()
        p_t.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_t.paragraph_format.space_after = Pt(2)
        _add_run(p_t, judul, font_name, 13, bold=True, underline=True)
        p_n = doc.add_paragraph()
        p_n.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_n.paragraph_format.space_after = Pt(12)
        _add_run(p_n, f"NOMOR : {doc_data.get('nomor_surat', '-')}", font_name, 11, bold=True)

        p_pemb = doc.add_paragraph()
        p_pemb.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p_pemb.paragraph_format.first_line_indent = Cm(1.0)
        p_pemb.paragraph_format.space_after = Pt(6)
        _add_run(p_pemb, body.get("pembuka", ""), font_name, 11)

        _add_kv_table(
            doc,
            [
                ("Nama Lengkap", body.get("pemohon_nama", "-")),
                ("NIK", body.get("pemohon_nik", "-")),
                ("Tempat / Tgl. Lahir", body.get("pemohon_ttl", "-")),
                ("Jenis Kelamin", body.get("pemohon_jk", "-")),
                ("Pekerjaan / Usaha", body.get("pemohon_pekerjaan", "-")),
                ("Alamat", body.get("pemohon_alamat", "-")),
            ],
            font_name,
            col1_cm=4.2,
            col2_cm=0.4,
            col3_cm=11.4,
            indent_cm=0.8,
        )

        p_ket = doc.add_paragraph()
        p_ket.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p_ket.paragraph_format.space_before = Pt(8)
        p_ket.paragraph_format.first_line_indent = Cm(1.0)
        _add_run(p_ket, body.get("keterangan_isi", ""), font_name, 11)

        if body.get("keperluan"):
            p_kep = doc.add_paragraph()
            p_kep.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            p_kep.paragraph_format.first_line_indent = Cm(1.0)
            _add_run(p_kep, f"Surat ini diberikan untuk keperluan: {body.get('keperluan')}.", font_name, 11)

        p_pen = doc.add_paragraph()
        p_pen.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p_pen.paragraph_format.first_line_indent = Cm(1.0)
        _add_run(p_pen, body.get("penutup", ""), font_name, 11)

        _add_signature_block(doc, doc_data, settings, font_name, base_url=base_url)

    elif jenis == "nota_dinas":
        p_t = doc.add_paragraph()
        p_t.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_t.paragraph_format.space_after = Pt(8)
        _add_run(p_t, "NOTA DINAS", font_name, 13, bold=True, underline=True)

        _add_kv_table(
            doc,
            [
                ("Yth.", body.get("kepada_internal", doc_data.get("kepada", "Camat Muara Wis"))),
                ("Dari", body.get("dari", "Sekretaris Camat Muara Wis")),
                ("Tanggal", format_tanggal_indo(doc_data.get("tanggal_surat", ""))),
                ("Nomor", doc_data.get("nomor_surat", "-")),
                ("Sifat", doc_data.get("sifat", "Penting")),
                ("Lampiran", doc_data.get("lampiran", "-")),
                ("Hal", doc_data.get("hal", "-")),
            ],
            font_name,
            col1_cm=2.8,
            col2_cm=0.4,
            col3_cm=13.8,
        )
        _add_kop_border_paragraph(doc)

        for para_txt in body.get("isi_paragraf", []):
            p_isi = doc.add_paragraph()
            p_isi.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            p_isi.paragraph_format.first_line_indent = Cm(1.0)
            p_isi.paragraph_format.space_after = Pt(6)
            _add_run(p_isi, para_txt, font_name, 11)

        p_pen = doc.add_paragraph()
        p_pen.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p_pen.paragraph_format.first_line_indent = Cm(1.0)
        _add_run(p_pen, body.get("penutup", ""), font_name, 11)

        _add_signature_block(doc, doc_data, settings, font_name, base_url=base_url)

    elif jenis == "surat_pengantar":
        p_tgl = doc.add_paragraph()
        p_tgl.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        p_tgl.paragraph_format.space_after = Pt(6)
        _add_run(p_tgl, f"{doc_data.get('tempat_surat', 'Muara Wis')}, {format_tanggal_indo(doc_data.get('tanggal_surat', ''))}", font_name, 11)

        p_kpd = doc.add_paragraph()
        p_kpd.paragraph_format.space_after = Pt(10)
        _add_run(p_kpd, "Kepada Yth.\n" + (doc_data.get("kepada") or "-"), font_name, 11)

        p_t = doc.add_paragraph()
        p_t.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_t.paragraph_format.space_after = Pt(2)
        _add_run(p_t, "SURAT PENGANTAR", font_name, 13, bold=True, underline=True)
        p_n = doc.add_paragraph()
        p_n.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_n.paragraph_format.space_after = Pt(10)
        _add_run(p_n, f"NOMOR : {doc_data.get('nomor_surat', '-')}", font_name, 11, bold=True)

        items = body.get("items", [])
        tbl_i = doc.add_table(rows=len(items) + 1, cols=4)
        tbl_i.alignment = WD_TABLE_ALIGNMENT.CENTER
        _set_table_grid_borders(tbl_i)
        headers = ["No", "Naskah Dinas / Barang yang Dikirim", "Banyaknya", "Keterangan"]
        widths = [Cm(1.2), Cm(7.5), Cm(3.3), Cm(5.0)]
        for j, h in enumerate(headers):
            cell = tbl_i.cell(0, j)
            cell.width = widths[j]
            _set_cell_margins(cell, 45, 45, 45, 45)
            ph = cell.paragraphs[0]
            ph.alignment = WD_ALIGN_PARAGRAPH.CENTER
            _add_run(ph, h, font_name, 10.5, bold=True)
        for idx, it in enumerate(items):
            vals = [str(idx + 1), it.get("naskah", ""), it.get("banyaknya", ""), it.get("keterangan", "")]
            for j, val in enumerate(vals):
                cell = tbl_i.cell(idx + 1, j)
                cell.width = widths[j]
                _set_cell_margins(cell, 40, 40, 50, 50)
                pc = cell.paragraphs[0]
                if j in (0, 2):
                    pc.alignment = WD_ALIGN_PARAGRAPH.CENTER
                _add_run(pc, val, font_name, 10.5)

        _add_signature_block(
            doc,
            doc_data,
            settings,
            font_name,
            base_url=base_url,
            left_label=f"Diterima tanggal .........................\n{body.get('penerima_jabatan', 'Penerima')},",
        )

    elif jenis == "berita_acara":
        p_t = doc.add_paragraph()
        p_t.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_t.paragraph_format.space_after = Pt(2)
        _add_run(p_t, "BERITA ACARA", font_name, 13, bold=True, underline=True)
        p_sub = doc.add_paragraph()
        p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_sub.paragraph_format.space_after = Pt(2)
        _add_run(p_sub, body.get("judul_acara", doc_data.get("hal", "").upper()), font_name, 11.5, bold=True)
        p_n = doc.add_paragraph()
        p_n.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_n.paragraph_format.space_after = Pt(10)
        _add_run(p_n, f"NOMOR : {doc_data.get('nomor_surat', '-')}", font_name, 11, bold=True)

        p_pemb = doc.add_paragraph()
        p_pemb.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p_pemb.paragraph_format.first_line_indent = Cm(1.0)
        _add_run(p_pemb, body.get("pembuka", ""), font_name, 11)

        p1_info = body.get("pihak_pertama", {})
        p2_info = body.get("pihak_kedua", {})
        for idx, (label, info) in enumerate([("PIHAK PERTAMA", p1_info), ("PIHAK KEDUA", p2_info)]):
            p_lbl = doc.add_paragraph()
            p_lbl.paragraph_format.space_before = Pt(6)
            p_lbl.paragraph_format.space_after = Pt(2)
            _add_run(p_lbl, f"{idx+1}. {label}:", font_name, 11, bold=True)
            _add_kv_table(
                doc,
                [
                    ("Nama", info.get("nama", "-")),
                    ("NIP / NIK", info.get("nip_nik", "-")),
                    ("Jabatan", info.get("jabatan", "-")),
                    ("Instansi", info.get("instansi", "-")),
                ],
                font_name,
                col1_cm=3.0,
                col2_cm=0.4,
                col3_cm=12.6,
                indent_cm=0.8,
            )

        p_sep = doc.add_paragraph()
        p_sep.paragraph_format.space_before = Pt(8)
        p_sep.paragraph_format.space_after = Pt(4)
        _add_run(p_sep, "Kedua belah pihak menyatakan sepakat atas hal-hal sebagai berikut:", font_name, 11)

        for idx, pt_txt in enumerate(body.get("poin_kesepakatan", [])):
            p_pt = doc.add_paragraph()
            p_pt.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            p_pt.paragraph_format.left_indent = Cm(0.8)
            p_pt.paragraph_format.space_after = Pt(4)
            _add_run(p_pt, f"{idx+1}. {pt_txt}", font_name, 11)

        p_pen = doc.add_paragraph()
        p_pen.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p_pen.paragraph_format.space_before = Pt(6)
        p_pen.paragraph_format.first_line_indent = Cm(1.0)
        _add_run(p_pen, body.get("penutup", ""), font_name, 11)

        _add_signature_block(
            doc,
            doc_data,
            settings,
            font_name,
            base_url=base_url,
            left_label=f"PIHAK KEDUA,\n{p2_info.get('jabatan', '')}",
            left_sub=p2_info.get("nama", "( ............................. )"),
        )

    elif jenis == "sk_camat":
        p_t = doc.add_paragraph()
        p_t.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_t.paragraph_format.space_after = Pt(2)
        _add_run(p_t, "KEPUTUSAN CAMAT MUARA WIS", font_name, 12.5, bold=True)
        p_n = doc.add_paragraph()
        p_n.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_n.paragraph_format.space_after = Pt(4)
        _add_run(p_n, f"NOMOR : {doc_data.get('nomor_surat', '-')}", font_name, 11, bold=True)
        p_tt = doc.add_paragraph()
        p_tt.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_tt.paragraph_format.space_after = Pt(8)
        _add_run(p_tt, f"TENTANG\n{body.get('judul_tentang', '')}", font_name, 11.5, bold=True)
        p_cm = doc.add_paragraph()
        p_cm.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_cm.paragraph_format.space_after = Pt(8)
        _add_run(p_cm, "CAMAT MUARA WIS,", font_name, 11.5, bold=True)

        menimbang = body.get("menimbang", [])
        men_txt = "\n".join([f"{chr(97+i)}. {m}" for i, m in enumerate(menimbang)])
        mengingat = body.get("mengingat", [])
        meng_txt = "\n".join([f"{i+1}. {m}" for i, m in enumerate(mengingat)])
        _add_kv_table(doc, [("Menimbang", men_txt), ("Mengingat", meng_txt)], font_name, col1_cm=2.8, col2_cm=0.4, col3_cm=13.8)

        p_mem = doc.add_paragraph()
        p_mem.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_mem.paragraph_format.space_before = Pt(8)
        p_mem.paragraph_format.space_after = Pt(6)
        _add_run(p_mem, "MEMUTUSKAN :", font_name, 11.5, bold=True)

        rows_d = [("Menetapkan", f"KEPUTUSAN CAMAT MUARA WIS TENTANG {body.get('judul_tentang', '')}.")]
        for d in body.get("diktum", []):
            rows_d.append((d.get("label", "KESATU"), d.get("isi", "")))
        _add_kv_table(doc, rows_d, font_name, col1_cm=2.8, col2_cm=0.4, col3_cm=13.8)

        _add_signature_block(doc, doc_data, settings, font_name, base_url=base_url, date_prefix="Ditetapkan di")
        _add_tembusan(doc, doc_data.get("tembusan", ""), font_name)

    else:  # laporan_kegiatan
        p_t = doc.add_paragraph()
        p_t.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_t.paragraph_format.space_after = Pt(4)
        _add_run(p_t, body.get("judul_laporan", doc_data.get("hal", "LAPORAN KEGIATAN").upper()), font_name, 12.5, bold=True, underline=True)
        p_n = doc.add_paragraph()
        p_n.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_n.paragraph_format.space_after = Pt(10)
        _add_run(p_n, f"NOMOR : {doc_data.get('nomor_surat', '-')}", font_name, 11, bold=True)

        sections = [
            ("A. PENDAHULUAN", body.get("pendahuluan", "")),
            ("B. DASAR PELAKSANAAN", body.get("dasar_pelaksanaan", "")),
            ("C. MAKSUD DAN TUJUAN", body.get("maksud_tujuan", "")),
            ("D. WAKTU, TEMPAT, DAN PESERTA", f"{body.get('waktu_tempat', '')}\nPeserta: {body.get('peserta', '')}"),
        ]
        for title, txt in sections:
            ps = doc.add_paragraph()
            ps.paragraph_format.space_before = Pt(6)
            ps.paragraph_format.space_after = Pt(2)
            _add_run(ps, title, font_name, 11, bold=True)
            pt = doc.add_paragraph()
            pt.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            pt.paragraph_format.left_indent = Cm(0.5)
            _add_run(pt, txt, font_name, 11)

        ps_h = doc.add_paragraph()
        ps_h.paragraph_format.space_before = Pt(6)
        ps_h.paragraph_format.space_after = Pt(2)
        _add_run(ps_h, "E. HASIL YANG DICAPAI", font_name, 11, bold=True)
        for idx, item in enumerate(body.get("hasil_kegiatan", [])):
            pi = doc.add_paragraph()
            pi.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            pi.paragraph_format.left_indent = Cm(0.8)
            pi.paragraph_format.space_after = Pt(2)
            _add_run(pi, f"{idx+1}. {item}", font_name, 11)

        for title, key in [("F. HAMBATAN DAN SARAN", "hambatan_saran"), ("G. PENUTUP", "kesimpulan")]:
            ps = doc.add_paragraph()
            ps.paragraph_format.space_before = Pt(6)
            ps.paragraph_format.space_after = Pt(2)
            _add_run(ps, title, font_name, 11, bold=True)
            pt = doc.add_paragraph()
            pt.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            pt.paragraph_format.left_indent = Cm(0.5)
            _add_run(pt, body.get(key, ""), font_name, 11)

        _add_signature_block(doc, doc_data, settings, font_name, base_url=base_url)

    _add_tte_footer(doc, doc_data, settings, font_name)

    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()
