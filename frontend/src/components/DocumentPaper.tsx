import React from 'react';
import { AppSettings, SuratDocument } from '../types';
import { formatTanggalIndo, getPaperDimensions } from '../utils/formatters';

interface DocumentPaperProps {
  doc: SuratDocument;
  settings: AppSettings;
  zoom?: number;
}

const StempelKecamatanSVG: React.FC<{ pemda: string; instansi: string }> = ({ pemda, instansi }) => (
  <svg
    viewBox="0 0 180 180"
    className="w-[106px] h-[106px] pointer-events-none select-none opacity-80 -rotate-12"
    style={{ mixBlendMode: 'multiply' }}
  >
    <defs>
      <path id="topArc" d="M 26,90 A 64,64 0 1,1 154,90" />
      <path id="botArc" d="M 152,95 A 62,62 0 0,1 28,95" />
    </defs>
    <circle cx="90" cy="90" r="82" fill="none" stroke="#3B2F8F" strokeWidth="3.2" />
    <circle cx="90" cy="90" r="76" fill="none" stroke="#3B2F8F" strokeWidth="1.2" />
    <circle cx="90" cy="90" r="50" fill="none" stroke="#3B2F8F" strokeWidth="1.8" />

    <text fill="#3B2F8F" fontSize="8.8" fontWeight="700" letterSpacing="0.8">
      <textPath href="#topArc" startOffset="50%" textAnchor="middle">
        {pemda.replace('PEMERINTAH ', 'PEMERINTAH ')}
      </textPath>
    </text>

    <text fill="#3B2F8F" fontSize="9.5" fontWeight="800" letterSpacing="1.2">
      <textPath href="#botArc" startOffset="50%" textAnchor="middle">
        KUTAI KARTANEGARA
      </textPath>
    </text>

    <line x1="38" y1="73" x2="142" y2="73" stroke="#3B2F8F" strokeWidth="1.2" />
    <line x1="38" y1="107" x2="142" y2="107" stroke="#3B2F8F" strokeWidth="1.2" />

    <text x="90" y="88" textAnchor="middle" fill="#3B2F8F" fontSize="10.5" fontWeight="800" letterSpacing="0.6">
      KECAMATAN
    </text>
    <text x="90" y="101" textAnchor="middle" fill="#3B2F8F" fontSize="11.5" fontWeight="800" letterSpacing="0.8">
      {instansi.replace('KECAMATAN ', '')}
    </text>

    <text x="27" y="94" textAnchor="middle" fill="#3B2F8F" fontSize="11">★</text>
    <text x="153" y="94" textAnchor="middle" fill="#3B2F8F" fontSize="11">★</text>
  </svg>
);

export const DocumentPaper: React.FC<DocumentPaperProps> = ({ doc, settings, zoom = 1 }) => {
  const { widthMm, heightMm } = getPaperDimensions(doc.kertas || settings.kertas_default || 'F4');
  const fontFamily =
    doc.font_family === 'Arial'
      ? 'Arial, Helvetica, sans-serif'
      : doc.font_family === 'Bookman Old Style'
      ? '"Bookman Old Style", Georgia, serif'
      : '"Times New Roman", Times, Georgia, serif';

  const body = doc.body || {};
  const logoSrc = `/api/logo/${settings.logo_mode === 'bw' ? 'bw' : 'color'}`;
  const tanggalFormatted = formatTanggalIndo(doc.tanggal_surat);
  const shortHash = (doc.hash_sha256 || '000000000000').slice(0, 12).toUpperCase();

  const renderSignature = (leftContent?: React.ReactNode, datePrefix?: string) => (
    <div className="mt-7 grid grid-cols-2 gap-6 items-start break-inside-avoid">
      <div className="text-[11pt] leading-[1.35]">{leftContent || <div />}</div>
      <div className="relative text-[11pt] leading-[1.35] pl-4">
        {doc.show_stempel && (
          <div className="absolute -left-10 top-6 z-10">
            <StempelKecamatanSVG pemda={settings.nama_pemda} instansi={settings.nama_instansi} />
          </div>
        )}
        {datePrefix ? (
          <div className="mb-1">
            <div>
              {datePrefix} {doc.tempat_surat || settings.tempat_surat}
            </div>
            <div>Pada tanggal {tanggalFormatted}</div>
          </div>
        ) : (
          <div className="mb-1">
            {doc.tempat_surat || settings.tempat_surat}, {tanggalFormatted}
          </div>
        )}
        <div className="font-bold">
          {doc.atas_nama ? (
            <>
              <div>{doc.atas_nama}</div>
              <div>{doc.penandatangan_jabatan},</div>
            </>
          ) : (
            <div>{doc.penandatangan_jabatan || settings.camat_jabatan},</div>
          )}
        </div>

        <div className="my-2 flex items-center gap-2.5">
          {doc.qr_data_url ? (
            <img
              src={doc.qr_data_url}
              alt="QR TTE Camat"
              className="w-[82px] h-[82px] border border-slate-200 rounded-sm bg-white p-0.5"
            />
          ) : (
            <div className="w-[82px] h-[82px] border border-dashed border-slate-400 flex items-center justify-center text-[8pt] text-slate-500">
              QR TTE
            </div>
          )}
          <div className="text-[7.5pt] leading-[1.25] text-slate-600 max-w-[140px]">
            <div className="font-semibold text-slate-800">Ditandatangani secara elektronik</div>
            <div>Kode: {doc.kode_verifikasi}</div>
            <div>Hash: {shortHash}</div>
          </div>
        </div>

        <div className="font-bold underline underline-offset-2">
          {doc.penandatangan_nama || settings.camat_nama}
        </div>
        <div className="text-[10.5pt]">{doc.penandatangan_pangkat || settings.camat_pangkat}</div>
        <div className="text-[10.5pt]">NIP. {doc.penandatangan_nip || settings.camat_nip}</div>
      </div>
    </div>
  );

  const renderTembusan = () => {
    if (!doc.tembusan || !doc.tembusan.trim()) return null;
    return (
      <div className="mt-6 text-[10pt] leading-[1.35] break-inside-avoid">
        <div className="font-bold">Tembusan disampaikan kepada Yth.:</div>
        <div className="pl-3 whitespace-pre-line">{doc.tembusan}</div>
      </div>
    );
  };

  return (
    <div
      className="print-wrapper flex justify-center"
      style={{
        transform: zoom !== 1 ? `scale(${zoom})` : undefined,
        transformOrigin: 'top center',
        marginBottom: zoom < 1 ? `-${(1 - zoom) * heightMm * 3.5}px` : undefined,
      }}
    >
      <div
        className="print-sheet relative bg-white text-black shadow-[0_10px_40px_rgba(15,23,42,0.12)] border border-slate-200 flex flex-col justify-between"
        style={{
          width: `${widthMm}mm`,
          minHeight: `${heightMm}mm`,
          padding: '14mm 20mm 16mm 24mm',
          fontFamily,
          fontSize: '11pt',
          lineHeight: 1.45,
        }}
      >
        <div>
          {/* KOP SURAT */}
          {doc.jenis_dokumen !== 'nota_dinas' ? (
            <header className="mb-4">
              <div className="flex items-center gap-4 pb-2">
                <div className="w-[74px] flex-shrink-0 flex justify-center">
                  <img src={logoSrc} alt="Lambang Kab. Kutai Kartanegara" className="w-[68px] h-auto object-contain" />
                </div>
                <div className="flex-1 text-center leading-tight">
                  <div className="text-[12.5pt] font-bold tracking-wide uppercase">
                    {settings.nama_pemda}
                  </div>
                  <div className="text-[16.5pt] font-extrabold tracking-wider uppercase mt-0.5">
                    {settings.nama_instansi}
                  </div>
                  <div className="text-[9pt] mt-0.5">
                    {settings.alamat} {settings.kode_pos}
                  </div>
                  <div className="text-[9pt]">
                    Pos-el : {settings.email} &nbsp;&nbsp; Laman : {settings.website}
                  </div>
                </div>
              </div>
              <div className="border-t-[3px] border-black pt-[2px]">
                <div className="border-t border-black" />
              </div>
            </header>
          ) : (
            <header className="mb-3 text-center">
              <div className="text-[11.5pt] font-bold uppercase">{settings.nama_pemda}</div>
              <div className="text-[12.5pt] font-extrabold uppercase pb-2">{settings.nama_instansi}</div>
              <div className="border-t-[2.5px] border-black pt-[2px]">
                <div className="border-t border-black" />
              </div>
            </header>
          )}

          {/* BODY BY DOCUMENT TYPE */}
          {(doc.jenis_dokumen === 'surat_dinas' || doc.jenis_dokumen === 'surat_undangan') && (
            <div>
              <div className="grid grid-cols-12 gap-4 mb-5 text-[11pt] leading-[1.4]">
                <div className="col-span-7">
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr>
                        <td className="w-[78px] align-top">Nomor</td>
                        <td className="w-[14px] align-top">:</td>
                        <td className="align-top">{doc.nomor_surat}</td>
                      </tr>
                      <tr>
                        <td className="align-top">Sifat</td>
                        <td className="align-top">:</td>
                        <td className="align-top">{doc.sifat}</td>
                      </tr>
                      <tr>
                        <td className="align-top">Lampiran</td>
                        <td className="align-top">:</td>
                        <td className="align-top">{doc.lampiran || '-'}</td>
                      </tr>
                      <tr>
                        <td className="align-top">Hal</td>
                        <td className="align-top">:</td>
                        <td className="align-top font-bold">{doc.hal}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="col-span-5 pl-2">
                  <div className="mb-3">
                    {doc.tempat_surat || settings.tempat_surat}, {tanggalFormatted}
                  </div>
                  <div>Kepada Yth.</div>
                  <div className="whitespace-pre-line">{doc.kepada}</div>
                </div>
              </div>

              <div className="space-y-3 text-justify">
                {body.pembuka && <p className="indent-8">{body.pembuka}</p>}

                {doc.jenis_dokumen === 'surat_undangan' && (
                  <div className="pl-8 my-2">
                    <table className="w-full border-collapse">
                      <tbody>
                        <tr>
                          <td className="w-[125px] py-0.5 align-top">Hari / Tanggal</td>
                          <td className="w-[16px] py-0.5 align-top">:</td>
                          <td className="py-0.5 align-top font-semibold">{body.hari_tanggal || '-'}</td>
                        </tr>
                        <tr>
                          <td className="py-0.5 align-top">Pukul / Waktu</td>
                          <td className="py-0.5 align-top">:</td>
                          <td className="py-0.5 align-top">{body.waktu || '-'}</td>
                        </tr>
                        <tr>
                          <td className="py-0.5 align-top">Tempat</td>
                          <td className="py-0.5 align-top">:</td>
                          <td className="py-0.5 align-top">{body.tempat || '-'}</td>
                        </tr>
                        <tr>
                          <td className="py-0.5 align-top">Acara</td>
                          <td className="py-0.5 align-top">:</td>
                          <td className="py-0.5 align-top font-semibold">{body.acara || doc.hal}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {(body.isi_paragraf || []).map((p: string, i: number) => (
                  <p key={i} className="indent-8">
                    {p}
                  </p>
                ))}

                {doc.jenis_dokumen === 'surat_undangan' && body.catatan_undangan && (
                  <p className="pl-8 italic text-[10.5pt]">Catatan: {body.catatan_undangan}</p>
                )}

                {body.penutup && <p className="indent-8">{body.penutup}</p>}
              </div>

              {renderSignature()}
              {renderTembusan()}
            </div>
          )}

          {doc.jenis_dokumen === 'surat_tugas' && (
            <div>
              <div className="text-center mb-4">
                <div className="text-[13pt] font-bold underline underline-offset-4">SURAT TUGAS</div>
                <div className="text-[11pt] font-bold mt-0.5">NOMOR : {doc.nomor_surat}</div>
              </div>

              <table className="w-full border-collapse mb-3">
                <tbody>
                  <tr>
                    <td className="w-[75px] align-top font-bold">Dasar</td>
                    <td className="w-[14px] align-top">:</td>
                    <td className="align-top">
                      <ol className="list-decimal pl-5 space-y-1 text-justify">
                        {(body.dasar || []).map((d: string, i: number) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ol>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="text-center font-bold my-3 tracking-wide">MEMERINTAHKAN :</div>

              <div className="font-bold mb-1.5">Kepada :</div>
              <table className="w-full border-collapse border border-black text-[10pt] mb-4">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-black px-2 py-1 text-center w-9">No</th>
                    <th className="border border-black px-2 py-1 text-left">Nama</th>
                    <th className="border border-black px-2 py-1 text-left">Pangkat / Gol.</th>
                    <th className="border border-black px-2 py-1 text-left">NIP</th>
                    <th className="border border-black px-2 py-1 text-left">Jabatan</th>
                  </tr>
                </thead>
                <tbody>
                  {(body.petugas || []).map((pg: any, idx: number) => (
                    <tr key={idx}>
                      <td className="border border-black px-2 py-1 text-center">{idx + 1}</td>
                      <td className="border border-black px-2 py-1 font-semibold">{pg.nama}</td>
                      <td className="border border-black px-2 py-1">{pg.pangkat}</td>
                      <td className="border border-black px-2 py-1">{pg.nip}</td>
                      <td className="border border-black px-2 py-1">{pg.jabatan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <table className="w-full border-collapse mb-3">
                <tbody>
                  <tr>
                    <td className="w-[75px] align-top font-bold">Untuk</td>
                    <td className="w-[14px] align-top">:</td>
                    <td className="align-top">
                      <ol className="list-decimal pl-5 space-y-1 text-justify">
                        {(body.tujuan_tugas || []).map((t: string, i: number) => (
                          <li key={i}>{t}</li>
                        ))}
                      </ol>
                    </td>
                  </tr>
                </tbody>
              </table>

              {body.penutup && <p className="indent-8 text-justify mt-3">{body.penutup}</p>}
              {renderSignature()}
              {renderTembusan()}
            </div>
          )}

          {doc.jenis_dokumen === 'surat_edaran' && (
            <div>
              <div className="ml-auto w-[52%] mb-4 text-[11pt]">
                <div>Yth.</div>
                <div className="whitespace-pre-line">{doc.kepada}</div>
              </div>
              <div className="text-center mb-4">
                <div className="text-[13pt] font-bold">SURAT EDARAN</div>
                <div className="text-[11pt] font-bold">NOMOR : {doc.nomor_surat}</div>
                <div className="text-[11pt] font-bold mt-2 uppercase">TENTANG</div>
                <div className="text-[11.5pt] font-bold uppercase max-w-[90%] mx-auto">
                  {body.judul_tentang || doc.hal}
                </div>
              </div>
              <div className="space-y-3 text-justify">
                {(body.isi_paragraf || []).map((p: string, i: number) => (
                  <p key={i} className="indent-8">
                    {p}
                  </p>
                ))}
                <ol className="list-decimal pl-10 space-y-1.5">
                  {(body.poin_edaran || []).map((pt: string, i: number) => (
                    <li key={i}>{pt}</li>
                  ))}
                </ol>
                {body.penutup && <p className="indent-8">{body.penutup}</p>}
              </div>
              {renderSignature()}
              {renderTembusan()}
            </div>
          )}

          {doc.jenis_dokumen === 'surat_keterangan' && (
            <div>
              <div className="text-center mb-5">
                <div className="text-[13pt] font-bold underline underline-offset-4 uppercase">
                  {body.judul_surat || 'SURAT KETERANGAN'}
                </div>
                <div className="text-[11pt] font-bold mt-0.5">NOMOR : {doc.nomor_surat}</div>
              </div>
              <p className="indent-8 text-justify mb-3">{body.pembuka}</p>
              <table className="w-full border-collapse ml-6 mb-4">
                <tbody>
                  {[
                    ['Nama Lengkap', body.pemohon_nama],
                    ['NIK', body.pemohon_nik],
                    ['Tempat / Tgl. Lahir', body.pemohon_ttl],
                    ['Jenis Kelamin', body.pemohon_jk],
                    ['Pekerjaan / Usaha', body.pemohon_pekerjaan],
                    ['Alamat', body.pemohon_alamat],
                  ].map(([k, v], i) => (
                    <tr key={i}>
                      <td className="w-[165px] py-0.5 align-top">{k}</td>
                      <td className="w-[14px] py-0.5 align-top">:</td>
                      <td className={`py-0.5 align-top pr-6 ${i === 0 ? 'font-bold' : ''}`}>{v || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="space-y-3 text-justify">
                <p className="indent-8">{body.keterangan_isi}</p>
                {body.keperluan && (
                  <p className="indent-8">
                    Surat ini diberikan untuk keperluan: <span className="font-semibold">{body.keperluan}</span>.
                  </p>
                )}
                <p className="indent-8">{body.penutup}</p>
              </div>
              {renderSignature()}
            </div>
          )}

          {doc.jenis_dokumen === 'nota_dinas' && (
            <div>
              <div className="text-center text-[13pt] font-bold underline underline-offset-4 mb-4">
                NOTA DINAS
              </div>
              <table className="w-full border-collapse mb-3">
                <tbody>
                  {[
                    ['Yth.', body.kepada_internal || doc.kepada],
                    ['Dari', body.dari || 'Sekretaris Camat Muara Wis'],
                    ['Tanggal', tanggalFormatted],
                    ['Nomor', doc.nomor_surat],
                    ['Sifat', doc.sifat],
                    ['Lampiran', doc.lampiran || '-'],
                    ['Hal', doc.hal],
                  ].map(([k, v], i) => (
                    <tr key={i}>
                      <td className="w-[100px] py-0.5 align-top">{k}</td>
                      <td className="w-[14px] py-0.5 align-top">:</td>
                      <td className={`py-0.5 align-top ${k === 'Hal' ? 'font-bold' : ''}`}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t-2 border-black mb-4" />
              <div className="space-y-3 text-justify">
                {(body.isi_paragraf || []).map((p: string, i: number) => (
                  <p key={i} className="indent-8">
                    {p}
                  </p>
                ))}
                {body.penutup && <p className="indent-8">{body.penutup}</p>}
              </div>
              {renderSignature()}
            </div>
          )}

          {doc.jenis_dokumen === 'surat_pengantar' && (
            <div>
              <div className="text-right mb-3">
                {doc.tempat_surat || settings.tempat_surat}, {tanggalFormatted}
              </div>
              <div className="mb-5">
                <div>Kepada Yth.</div>
                <div className="whitespace-pre-line">{doc.kepada}</div>
              </div>
              <div className="text-center mb-4">
                <div className="text-[13pt] font-bold underline underline-offset-4">SURAT PENGANTAR</div>
                <div className="text-[11pt] font-bold mt-0.5">NOMOR : {doc.nomor_surat}</div>
              </div>
              <table className="w-full border-collapse border border-black text-[10.5pt] mb-4">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-black px-2 py-1.5 text-center w-10">No</th>
                    <th className="border border-black px-2 py-1.5 text-left">Naskah Dinas / Barang yang Dikirim</th>
                    <th className="border border-black px-2 py-1.5 text-center w-36">Banyaknya</th>
                    <th className="border border-black px-2 py-1.5 text-left w-48">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {(body.items || []).map((it: any, idx: number) => (
                    <tr key={idx}>
                      <td className="border border-black px-2 py-2 text-center align-top">{idx + 1}</td>
                      <td className="border border-black px-2 py-2 align-top">{it.naskah}</td>
                      <td className="border border-black px-2 py-2 text-center align-top">{it.banyaknya}</td>
                      <td className="border border-black px-2 py-2 align-top">{it.keterangan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {renderSignature(
                <div className="pt-1 text-center pr-6">
                  <div>Diterima tanggal ...............................</div>
                  <div className="mt-1">{body.penerima_jabatan || 'Penerima'},</div>
                  <div className="h-20" />
                  <div className="font-bold">( ................................................ )</div>
                </div>
              )}
            </div>
          )}

          {doc.jenis_dokumen === 'berita_acara' && (
            <div>
              <div className="text-center mb-4">
                <div className="text-[13pt] font-bold underline underline-offset-4">BERITA ACARA</div>
                <div className="text-[11.5pt] font-bold uppercase mt-0.5">
                  {body.judul_acara || doc.hal}
                </div>
                <div className="text-[11pt] font-bold mt-0.5">NOMOR : {doc.nomor_surat}</div>
              </div>
              <p className="indent-8 text-justify mb-3">{body.pembuka}</p>

              {[
                ['1. PIHAK PERTAMA', body.pihak_pertama || {}],
                ['2. PIHAK KEDUA', body.pihak_kedua || {}],
              ].map(([title, info]: any, idx) => (
                <div key={idx} className="mb-3">
                  <div className="font-bold mb-1">{title}:</div>
                  <table className="w-full border-collapse ml-6">
                    <tbody>
                      {[
                        ['Nama', info.nama],
                        ['NIP / NIK', info.nip_nik],
                        ['Jabatan', info.jabatan],
                        ['Instansi', info.instansi],
                      ].map(([k, v], i) => (
                        <tr key={i}>
                          <td className="w-[115px] py-0.5 align-top">{k}</td>
                          <td className="w-[14px] py-0.5 align-top">:</td>
                          <td className="py-0.5 align-top">{v || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}

              <div className="mt-3 mb-2">Kedua belah pihak menyatakan sepakat atas hal-hal sebagai berikut:</div>
              <ol className="list-decimal pl-8 space-y-1.5 text-justify mb-3">
                {(body.poin_kesepakatan || []).map((pt: string, i: number) => (
                  <li key={i}>{pt}</li>
                ))}
              </ol>
              <p className="indent-8 text-justify">{body.penutup}</p>
              {renderSignature(
                <div className="pt-5 text-center pr-6">
                  <div className="font-bold">PIHAK KEDUA,</div>
                  <div>{body.pihak_kedua?.jabatan || ''}</div>
                  <div className="h-[88px]" />
                  <div className="font-bold underline underline-offset-2">
                    {body.pihak_kedua?.nama || '( ............................... )'}
                  </div>
                </div>
              )}
              {(body.saksi || []).length > 0 && (
                <div className="mt-5 text-[10pt]">
                  <div className="font-bold">Saksi-saksi:</div>
                  {(body.saksi || []).map((s: string, i: number) => (
                    <div key={i}>{s}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {doc.jenis_dokumen === 'sk_camat' && (
            <div>
              <div className="text-center mb-4">
                <div className="text-[12pt] font-bold uppercase">KEPUTUSAN CAMAT MUARA WIS</div>
                <div className="text-[11pt] font-bold mt-0.5">NOMOR : {doc.nomor_surat}</div>
                <div className="text-[11pt] font-bold mt-2 uppercase">TENTANG</div>
                <div className="text-[11pt] font-bold uppercase max-w-[92%] mx-auto">
                  {body.judul_tentang || doc.hal}
                </div>
                <div className="text-[11pt] font-bold mt-3 uppercase">CAMAT MUARA WIS,</div>
              </div>

              <table className="w-full border-collapse text-justify">
                <tbody>
                  <tr>
                    <td className="w-[100px] align-top py-1 font-semibold">Menimbang</td>
                    <td className="w-[14px] align-top py-1">:</td>
                    <td className="align-top py-1">
                      <ol className="list-[lower-alpha] pl-5 space-y-1">
                        {(body.menimbang || []).map((m: string, i: number) => (
                          <li key={i}>{m}</li>
                        ))}
                      </ol>
                    </td>
                  </tr>
                  <tr>
                    <td className="align-top py-1 font-semibold">Mengingat</td>
                    <td className="align-top py-1">:</td>
                    <td className="align-top py-1">
                      <ol className="list-decimal pl-5 space-y-1">
                        {(body.mengingat || []).map((m: string, i: number) => (
                          <li key={i}>{m}</li>
                        ))}
                      </ol>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="text-center font-bold my-3 tracking-wider">MEMUTUSKAN :</div>

              <table className="w-full border-collapse text-justify">
                <tbody>
                  <tr>
                    <td className="w-[100px] align-top py-1 font-semibold">Menetapkan</td>
                    <td className="w-[14px] align-top py-1">:</td>
                    <td className="align-top py-1 font-semibold uppercase">
                      KEPUTUSAN CAMAT MUARA WIS TENTANG {body.judul_tentang || doc.hal}.
                    </td>
                  </tr>
                  {(body.diktum || []).map((d: any, i: number) => (
                    <tr key={i}>
                      <td className="align-top py-1 font-semibold">{d.label}</td>
                      <td className="align-top py-1">:</td>
                      <td className="align-top py-1">{d.isi}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {renderSignature(undefined, 'Ditetapkan di')}
              {renderTembusan()}
            </div>
          )}

          {doc.jenis_dokumen === 'laporan_kegiatan' && (
            <div>
              <div className="text-center mb-4">
                <div className="text-[12.5pt] font-bold underline underline-offset-4 uppercase">
                  {body.judul_laporan || doc.hal}
                </div>
                <div className="text-[11pt] font-bold mt-0.5">NOMOR : {doc.nomor_surat}</div>
              </div>
              <div className="space-y-3 text-justify">
                <div>
                  <div className="font-bold">A. PENDAHULUAN</div>
                  <p className="pl-4">{body.pendahuluan}</p>
                </div>
                <div>
                  <div className="font-bold">B. DASAR PELAKSANAAN</div>
                  <p className="pl-4">{body.dasar_pelaksanaan}</p>
                </div>
                <div>
                  <div className="font-bold">C. MAKSUD DAN TUJUAN</div>
                  <p className="pl-4">{body.maksud_tujuan}</p>
                </div>
                <div>
                  <div className="font-bold">D. WAKTU, TEMPAT, DAN PESERTA</div>
                  <p className="pl-4">{body.waktu_tempat}</p>
                  <p className="pl-4">Peserta: {body.peserta}</p>
                </div>
                <div>
                  <div className="font-bold">E. HASIL YANG DICAPAI</div>
                  <ol className="list-decimal pl-9 space-y-1">
                    {(body.hasil_kegiatan || []).map((h: string, i: number) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ol>
                </div>
                <div>
                  <div className="font-bold">F. HAMBATAN DAN SARAN</div>
                  <p className="pl-4">{body.hambatan_saran}</p>
                </div>
                <div>
                  <div className="font-bold">G. PENUTUP</div>
                  <p className="pl-4">{body.kesimpulan}</p>
                </div>
              </div>
              {renderSignature()}
            </div>
          )}
        </div>

        {/* FOOTER VERIFIKASI TTE ELEKTRONIK */}
        {settings.show_footer_tte && (
          <footer className="mt-8 pt-2 border-t border-slate-300 text-[7.5pt] leading-[1.3] text-slate-600 flex items-center justify-between gap-4 break-inside-avoid">
            <div>
              Dokumen ini sah dan telah ditandatangani secara elektronik (TTE) oleh {doc.penandatangan_jabatan || settings.camat_jabatan}.
              Pindai QR Code atau verifikasi kode di portal resmi Kecamatan Muara Wis.
            </div>
            <div className="font-mono text-[7.5pt] font-semibold text-slate-800 whitespace-nowrap">
              {doc.kode_verifikasi} • {shortHash}
            </div>
          </footer>
        )}
      </div>
    </div>
  );
};
