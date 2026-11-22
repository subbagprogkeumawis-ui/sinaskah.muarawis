import React, { useState } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  RefreshCw,
  Users,
  Stamp,
  UserCheck,
  MapPin,
} from 'lucide-react';
import {
  AppSettings,
  DOC_TYPES,
  DocumentType,
  KlasifikasiItem,
  Pegawai,
  SuratDocument,
} from '../types';

interface DocumentFormProps {
  doc: SuratDocument;
  onChange: (next: SuratDocument) => void;
  onTypeChange: (jenis: DocumentType) => void;
  settings: AppSettings;
  pegawai: Pegawai[];
  desaList: string[];
  klasifikasi: KlasifikasiItem[];
  onRefreshNumber: (kode: string, tanggal: string) => void;
  onPolishText: (text: string) => Promise<string>;
}

export const DocumentForm: React.FC<DocumentFormProps> = ({
  doc,
  onChange,
  onTypeChange,
  settings,
  pegawai,
  desaList,
  klasifikasi,
  onRefreshNumber,
  onPolishText,
}) => {
  const [polishingKey, setPolishingKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'umum' | 'isi' | 'ttd'>('umum');

  const body = doc.body || {};

  const setField = <K extends keyof SuratDocument>(key: K, value: SuratDocument[K]) => {
    onChange({ ...doc, [key]: value });
  };

  const setBodyField = (key: string, value: any) => {
    onChange({ ...doc, body: { ...body, [key]: value } });
  };

  const handlePolish = async (key: string, currentVal: string, setter: (val: string) => void) => {
    if (!currentVal.trim()) return;
    setPolishingKey(key);
    try {
      const polished = await onPolishText(currentVal);
      setter(polished);
    } finally {
      setPolishingKey(null);
    }
  };

  const handleSignerPreset = (mode: 'camat' | 'sekcam' | 'custom', person?: Pegawai) => {
    if (mode === 'camat') {
      onChange({
        ...doc,
        atas_nama: '',
        penandatangan_nama: settings.camat_nama,
        penandatangan_nip: settings.camat_nip,
        penandatangan_pangkat: settings.camat_pangkat,
        penandatangan_jabatan: settings.camat_jabatan,
      });
    } else if (mode === 'sekcam') {
      onChange({
        ...doc,
        atas_nama: 'a.n. Camat Muara Wis',
        penandatangan_nama: settings.sekcam_nama,
        penandatangan_nip: settings.sekcam_nip,
        penandatangan_pangkat: settings.sekcam_pangkat,
        penandatangan_jabatan: settings.sekcam_jabatan,
      });
    } else if (person) {
      const isCamat = person.jabatan.toLowerCase().includes('camat') && !person.jabatan.toLowerCase().includes('sekretaris');
      onChange({
        ...doc,
        atas_nama: isCamat ? '' : 'a.n. Camat Muara Wis',
        penandatangan_nama: person.nama,
        penandatangan_nip: person.nip,
        penandatangan_pangkat: person.pangkat,
        penandatangan_jabatan: person.jabatan,
      });
    }
  };

  const renderPolishBtn = (key: string, val: string, setter: (v: string) => void) => (
    <button
      type="button"
      onClick={() => handlePolish(key, val, setter)}
      disabled={polishingKey === key || !val?.trim()}
      className="inline-flex items-center gap-1 text-[11px] font-semibold text-kukar-emerald hover:text-kukar-deep bg-kukar-light/80 hover:bg-kukar-light px-2 py-0.5 rounded-md transition disabled:opacity-40"
      title="Rapikan menjadi bahasa dinas baku (EYD V & Permendagri)"
    >
      <Sparkles className="w-3 h-3" />
      {polishingKey === key ? 'Merapikan...' : 'Sempurnakan AI'}
    </button>
  );

  const renderStringListEditor = (label: string, key: string, list: string[], placeholder: string) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-700">{label}</label>
        <button
          type="button"
          onClick={() => setBodyField(key, [...list, ''])}
          className="inline-flex items-center gap-1 text-xs font-semibold text-kukar-emerald hover:underline"
        >
          <Plus className="w-3.5 h-3.5" /> Tambah Baris
        </button>
      </div>
      {list.map((item, idx) => (
        <div key={idx} className="flex gap-1.5 items-start">
          <span className="text-xs font-semibold text-slate-400 pt-2 w-5 text-right">{idx + 1}.</span>
          <textarea
            rows={2}
            value={item}
            placeholder={placeholder}
            onChange={(e) => {
              const next = [...list];
              next[idx] = e.target.value;
              setBodyField(key, next);
            }}
            className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-kukar-emerald focus:outline-none focus:ring-1 focus:ring-kukar-emerald"
          />
          <div className="flex flex-col gap-1">
            {renderPolishBtn(`${key}_${idx}`, item, (v) => {
              const next = [...list];
              next[idx] = v;
              setBodyField(key, next);
            })}
            <button
              type="button"
              onClick={() => setBodyField(key, list.filter((_, i) => i !== idx))}
              className="p-1 text-slate-400 hover:text-red-600 self-end"
              title="Hapus"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Sub-tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50/70">
        {[
          { id: 'umum', label: '1. Identitas & Nomor' },
          { id: 'isi', label: '2. Isi & Redaksi' },
          { id: 'ttd', label: '3. QR TTE & Cetak' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id as any)}
            className={`flex-1 py-2.5 px-3 text-xs font-bold border-b-2 transition ${
              activeTab === t.id
                ? 'border-kukar-emerald text-kukar-emerald bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">
        {activeTab === 'umum' && (
          <>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Naskah Dinas / Dokumen</label>
              <select
                value={doc.jenis_dokumen}
                onChange={(e) => onTypeChange(e.target.value as DocumentType)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold bg-white focus:border-kukar-emerald focus:outline-none"
              >
                {DOC_TYPES.map((dt) => (
                  <option key={dt.id} value={dt.id}>
                    {dt.label} — {dt.desc}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kode Klasifikasi Arsip</label>
                <select
                  value={doc.kode_klasifikasi}
                  onChange={(e) => {
                    const k = e.target.value;
                    setField('kode_klasifikasi', k);
                    onRefreshNumber(k, doc.tanggal_surat);
                  }}
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs bg-white focus:border-kukar-emerald focus:outline-none"
                >
                  {klasifikasi.map((kl) => (
                    <option key={kl.kode} value={kl.kode}>
                      {kl.kode} — {kl.nama}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Surat</label>
                <input
                  type="date"
                  value={doc.tanggal_surat}
                  onChange={(e) => setField('tanggal_surat', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs focus:border-kukar-emerald focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">Nomor Surat Resmi</label>
                <button
                  type="button"
                  onClick={() => onRefreshNumber(doc.kode_klasifikasi, doc.tanggal_surat)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-kukar-emerald hover:underline"
                >
                  <RefreshCw className="w-3 h-3" /> Nomor Otomatis
                </button>
              </div>
              <input
                type="text"
                value={doc.nomor_surat}
                onChange={(e) => setField('nomor_surat', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono font-semibold focus:border-kukar-emerald focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sifat Surat</label>
                <select
                  value={doc.sifat}
                  onChange={(e) => setField('sifat', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs bg-white focus:border-kukar-emerald focus:outline-none"
                >
                  <option value="Biasa">Biasa</option>
                  <option value="Penting">Penting</option>
                  <option value="Segera">Segera</option>
                  <option value="Rahasia">Rahasia</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Lampiran</label>
                <input
                  type="text"
                  value={doc.lampiran}
                  onChange={(e) => setField('lampiran', e.target.value)}
                  placeholder="- atau 1 (satu) berkas"
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs focus:border-kukar-emerald focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Perihal / Judul Surat</label>
              <input
                type="text"
                value={doc.hal}
                onChange={(e) => setField('hal', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium focus:border-kukar-emerald focus:outline-none"
              />
            </div>

            {['surat_dinas', 'surat_undangan', 'surat_edaran', 'surat_pengantar', 'nota_dinas'].includes(
              doc.jenis_dokumen
            ) && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">Kepada Yth. (Tujuan Surat)</label>
                  <button
                    type="button"
                    onClick={() =>
                      setField(
                        'kepada',
                        `Kepala Desa se-Kecamatan Muara Wis\n(${desaList
                          .map((d) => d.replace('Desa ', ''))
                          .join(', ')})\ndi -\n    Tempat`
                      )
                    }
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-kukar-emerald hover:underline"
                  >
                    <MapPin className="w-3 h-3" /> Isi 7 Kades Muara Wis
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={doc.kepada}
                  onChange={(e) => setField('kepada', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-kukar-emerald focus:outline-none"
                />
              </div>
            )}
          </>
        )}

        {activeTab === 'isi' && (
          <div className="space-y-4">
            {/* SURAT DINAS / UNDANGAN */}
            {(doc.jenis_dokumen === 'surat_dinas' || doc.jenis_dokumen === 'surat_undangan') && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">Paragraf Pembuka</label>
                    {renderPolishBtn('pembuka', body.pembuka || '', (v) => setBodyField('pembuka', v))}
                  </div>
                  <textarea
                    rows={3}
                    value={body.pembuka || ''}
                    onChange={(e) => setBodyField('pembuka', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-kukar-emerald focus:outline-none"
                  />
                </div>

                {doc.jenis_dokumen === 'surat_undangan' && (
                  <div className="bg-kukar-light/40 border border-kukar-emerald/20 rounded-xl p-3 space-y-2.5">
                    <div className="text-xs font-bold text-kukar-emerald">Detail Jadwal Undangan</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Hari / Tanggal</label>
                        <input
                          type="text"
                          value={body.hari_tanggal || ''}
                          onChange={(e) => setBodyField('hari_tanggal', e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Waktu (WITA)</label>
                        <input
                          type="text"
                          value={body.waktu || ''}
                          onChange={(e) => setBodyField('waktu', e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Tempat</label>
                      <input
                        type="text"
                        value={body.tempat || ''}
                        onChange={(e) => setBodyField('tempat', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Acara</label>
                      <input
                        type="text"
                        value={body.acara || ''}
                        onChange={(e) => setBodyField('acara', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Catatan (opsional)</label>
                      <input
                        type="text"
                        value={body.catatan_undangan || ''}
                        onChange={(e) => setBodyField('catatan_undangan', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-white"
                      />
                    </div>
                  </div>
                )}

                {renderStringListEditor(
                  'Paragraf Isi Tambahan',
                  'isi_paragraf',
                  body.isi_paragraf || [],
                  'Tulis isi surat...'
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Paragraf Penutup</label>
                  <textarea
                    rows={2}
                    value={body.penutup || ''}
                    onChange={(e) => setBodyField('penutup', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-kukar-emerald focus:outline-none"
                  />
                </div>
              </>
            )}

            {/* SURAT TUGAS */}
            {doc.jenis_dokumen === 'surat_tugas' && (
              <>
                {renderStringListEditor('Dasar Penugasan', 'dasar', body.dasar || [], 'Dasar hukum / surat...')}

                <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/70">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-kukar-emerald" /> Daftar Pegawai Ditugaskan
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setBodyField('petugas', [
                          ...(body.petugas || []),
                          { nama: '', pangkat: '', nip: '', jabatan: '' },
                        ])
                      }
                      className="text-xs font-semibold text-kukar-emerald hover:underline inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah Manual
                    </button>
                  </div>

                  {/* Quick select from directory */}
                  <div className="flex flex-wrap gap-1">
                    {pegawai.map((pg) => (
                      <button
                        key={pg.id || pg.nip}
                        type="button"
                        onClick={() => {
                          const exists = (body.petugas || []).some((x: any) => x.nip === pg.nip);
                          if (!exists) {
                            setBodyField('petugas', [
                              ...(body.petugas || []),
                              { nama: pg.nama, pangkat: pg.pangkat, nip: pg.nip, jabatan: pg.jabatan },
                            ]);
                          }
                        }}
                        className="text-[10.5px] bg-white border border-slate-200 hover:border-kukar-emerald hover:text-kukar-emerald px-2 py-0.5 rounded-full transition"
                      >
                        + {pg.nama.split(',')[0]}
                      </button>
                    ))}
                  </div>

                  {(body.petugas || []).map((pg: any, idx: number) => (
                    <div key={idx} className="bg-white rounded-lg border border-slate-200 p-2 space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-slate-500">Pegawai #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setBodyField(
                              'petugas',
                              (body.petugas || []).filter((_: any, i: number) => i !== idx)
                            )
                          }
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          placeholder="Nama & Gelar"
                          value={pg.nama}
                          onChange={(e) => {
                            const next = [...(body.petugas || [])];
                            next[idx] = { ...pg, nama: e.target.value };
                            setBodyField('petugas', next);
                          }}
                          className="rounded border border-slate-200 px-2 py-1 text-xs"
                        />
                        <input
                          placeholder="NIP"
                          value={pg.nip}
                          onChange={(e) => {
                            const next = [...(body.petugas || [])];
                            next[idx] = { ...pg, nip: e.target.value };
                            setBodyField('petugas', next);
                          }}
                          className="rounded border border-slate-200 px-2 py-1 text-xs"
                        />
                        <input
                          placeholder="Pangkat / Golongan"
                          value={pg.pangkat}
                          onChange={(e) => {
                            const next = [...(body.petugas || [])];
                            next[idx] = { ...pg, pangkat: e.target.value };
                            setBodyField('petugas', next);
                          }}
                          className="rounded border border-slate-200 px-2 py-1 text-xs"
                        />
                        <input
                          placeholder="Jabatan"
                          value={pg.jabatan}
                          onChange={(e) => {
                            const next = [...(body.petugas || [])];
                            next[idx] = { ...pg, jabatan: e.target.value };
                            setBodyField('petugas', next);
                          }}
                          className="rounded border border-slate-200 px-2 py-1 text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {renderStringListEditor('Untuk (Uraian Tugas)', 'tujuan_tugas', body.tujuan_tugas || [], 'Uraian tugas...')}
              </>
            )}

            {/* SURAT EDARAN */}
            {doc.jenis_dokumen === 'surat_edaran' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Tentang (Kapital)</label>
                  <input
                    type="text"
                    value={body.judul_tentang || ''}
                    onChange={(e) => setBodyField('judul_tentang', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold uppercase"
                  />
                </div>
                {renderStringListEditor('Paragraf Pengantar', 'isi_paragraf', body.isi_paragraf || [], 'Pengantar...')}
                {renderStringListEditor('Poin Edaran / Imbauan', 'poin_edaran', body.poin_edaran || [], 'Poin edaran...')}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Penutup</label>
                  <textarea
                    rows={2}
                    value={body.penutup || ''}
                    onChange={(e) => setBodyField('penutup', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
              </>
            )}

            {/* SURAT KETERANGAN / PATEN */}
            {doc.jenis_dokumen === 'surat_keterangan' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Surat (PATEN)</label>
                  <select
                    value={body.judul_surat || 'SURAT KETERANGAN'}
                    onChange={(e) => setBodyField('judul_surat', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold bg-white"
                  >
                    <option value="SURAT KETERANGAN">SURAT KETERANGAN</option>
                    <option value="SURAT KETERANGAN USAHA">SURAT KETERANGAN USAHA</option>
                    <option value="SURAT KETERANGAN DOMISILI">SURAT KETERANGAN DOMISILI</option>
                    <option value="SURAT KETERANGAN TIDAK MAMPU">SURAT KETERANGAN TIDAK MAMPU</option>
                    <option value="SURAT REKOMENDASI">SURAT REKOMENDASI</option>
                  </select>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                  <div className="text-xs font-bold text-slate-700">Data Identitas Pemohon / Warga</div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      placeholder="Nama Lengkap"
                      value={body.pemohon_nama || ''}
                      onChange={(e) => setBodyField('pemohon_nama', e.target.value)}
                      className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-white"
                    />
                    <input
                      placeholder="NIK (16 digit)"
                      value={body.pemohon_nik || ''}
                      onChange={(e) => setBodyField('pemohon_nik', e.target.value)}
                      className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-white"
                    />
                    <input
                      placeholder="Tempat, Tgl Lahir"
                      value={body.pemohon_ttl || ''}
                      onChange={(e) => setBodyField('pemohon_ttl', e.target.value)}
                      className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-white"
                    />
                    <input
                      placeholder="Jenis Kelamin"
                      value={body.pemohon_jk || ''}
                      onChange={(e) => setBodyField('pemohon_jk', e.target.value)}
                      className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-white"
                    />
                  </div>
                  <input
                    placeholder="Pekerjaan / Bidang Usaha"
                    value={body.pemohon_pekerjaan || ''}
                    onChange={(e) => setBodyField('pemohon_pekerjaan', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-white"
                  />
                  <input
                    placeholder="Alamat Lengkap (RT / Desa / Kecamatan)"
                    value={body.pemohon_alamat || ''}
                    onChange={(e) => setBodyField('pemohon_alamat', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-white"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">Isi Keterangan / Rekomendasi</label>
                    {renderPolishBtn('ket_isi', body.keterangan_isi || '', (v) => setBodyField('keterangan_isi', v))}
                  </div>
                  <textarea
                    rows={3}
                    value={body.keterangan_isi || ''}
                    onChange={(e) => setBodyField('keterangan_isi', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Keperluan</label>
                  <input
                    type="text"
                    value={body.keperluan || ''}
                    onChange={(e) => setBodyField('keperluan', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
              </>
            )}

            {/* NOTA DINAS */}
            {doc.jenis_dokumen === 'nota_dinas' && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Yth. (Internal)</label>
                    <input
                      type="text"
                      value={body.kepada_internal || ''}
                      onChange={(e) => setBodyField('kepada_internal', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Dari</label>
                    <input
                      type="text"
                      value={body.dari || ''}
                      onChange={(e) => setBodyField('dari', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                    />
                  </div>
                </div>
                {renderStringListEditor('Isi Nota Dinas', 'isi_paragraf', body.isi_paragraf || [], 'Paragraf...')}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Penutup</label>
                  <textarea
                    rows={2}
                    value={body.penutup || ''}
                    onChange={(e) => setBodyField('penutup', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
              </>
            )}

            {/* SURAT PENGANTAR */}
            {doc.jenis_dokumen === 'surat_pengantar' && (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-700">Daftar Naskah / Berkas Dikirim</label>
                    <button
                      type="button"
                      onClick={() =>
                        setBodyField('items', [
                          ...(body.items || []),
                          { naskah: '', banyaknya: '1 (satu) Berkas', keterangan: '' },
                        ])
                      }
                      className="text-xs font-semibold text-kukar-emerald hover:underline inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah Baris
                    </button>
                  </div>
                  {(body.items || []).map((it: any, idx: number) => (
                    <div key={idx} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-[11px] font-bold text-slate-500">Item #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setBodyField(
                              'items',
                              (body.items || []).filter((_: any, i: number) => i !== idx)
                            )
                          }
                          className="text-red-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <input
                        placeholder="Nama Naskah / Barang"
                        value={it.naskah}
                        onChange={(e) => {
                          const next = [...(body.items || [])];
                          next[idx] = { ...it, naskah: e.target.value };
                          setBodyField('items', next);
                        }}
                        className="w-full rounded border border-slate-200 px-2 py-1 text-xs bg-white"
                      />
                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          placeholder="Banyaknya"
                          value={it.banyaknya}
                          onChange={(e) => {
                            const next = [...(body.items || [])];
                            next[idx] = { ...it, banyaknya: e.target.value };
                            setBodyField('items', next);
                          }}
                          className="rounded border border-slate-200 px-2 py-1 text-xs bg-white"
                        />
                        <input
                          placeholder="Keterangan"
                          value={it.keterangan}
                          onChange={(e) => {
                            const next = [...(body.items || [])];
                            next[idx] = { ...it, keterangan: e.target.value };
                            setBodyField('items', next);
                          }}
                          className="rounded border border-slate-200 px-2 py-1 text-xs bg-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Jabatan Penerima (Kolom Tanda Terima)</label>
                  <input
                    type="text"
                    value={body.penerima_jabatan || ''}
                    onChange={(e) => setBodyField('penerima_jabatan', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
              </>
            )}

            {/* BERITA ACARA */}
            {doc.jenis_dokumen === 'berita_acara' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Berita Acara</label>
                  <input
                    type="text"
                    value={body.judul_acara || ''}
                    onChange={(e) => setBodyField('judul_acara', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kalimat Pembuka</label>
                  <textarea
                    rows={2}
                    value={body.pembuka || ''}
                    onChange={(e) => setBodyField('pembuka', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
                {['pihak_pertama', 'pihak_kedua'].map((pk) => {
                  const info = body[pk] || {};
                  return (
                    <div key={pk} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                      <div className="text-xs font-bold text-slate-700 uppercase">
                        {pk === 'pihak_pertama' ? 'Pihak Pertama' : 'Pihak Kedua'}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          placeholder="Nama"
                          value={info.nama || ''}
                          onChange={(e) => setBodyField(pk, { ...info, nama: e.target.value })}
                          className="rounded border border-slate-200 px-2 py-1 text-xs bg-white"
                        />
                        <input
                          placeholder="NIP / NIK"
                          value={info.nip_nik || ''}
                          onChange={(e) => setBodyField(pk, { ...info, nip_nik: e.target.value })}
                          className="rounded border border-slate-200 px-2 py-1 text-xs bg-white"
                        />
                        <input
                          placeholder="Jabatan"
                          value={info.jabatan || ''}
                          onChange={(e) => setBodyField(pk, { ...info, jabatan: e.target.value })}
                          className="rounded border border-slate-200 px-2 py-1 text-xs bg-white"
                        />
                        <input
                          placeholder="Instansi / Desa"
                          value={info.instansi || ''}
                          onChange={(e) => setBodyField(pk, { ...info, instansi: e.target.value })}
                          className="rounded border border-slate-200 px-2 py-1 text-xs bg-white"
                        />
                      </div>
                    </div>
                  );
                })}
                {renderStringListEditor('Poin Kesepakatan / Uraian', 'poin_kesepakatan', body.poin_kesepakatan || [], 'Uraian...')}
              </>
            )}

            {/* SK CAMAT */}
            {doc.jenis_dokumen === 'sk_camat' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tentang (Judul SK Kapital)</label>
                  <textarea
                    rows={2}
                    value={body.judul_tentang || ''}
                    onChange={(e) => setBodyField('judul_tentang', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold uppercase"
                  />
                </div>
                {renderStringListEditor('Menimbang (a, b, c...)', 'menimbang', body.menimbang || [], 'bahwa...')}
                {renderStringListEditor('Mengingat (1, 2, 3...)', 'mengingat', body.mengingat || [], 'Undang-Undang...')}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-700">Diktum (KESATU, KEDUA, ...)</label>
                    <button
                      type="button"
                      onClick={() =>
                        setBodyField('diktum', [
                          ...(body.diktum || []),
                          { label: `DIKTUM ${(body.diktum || []).length + 1}`, isi: '' },
                        ])
                      }
                      className="text-xs font-semibold text-kukar-emerald hover:underline inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah Diktum
                    </button>
                  </div>
                  {(body.diktum || []).map((d: any, idx: number) => (
                    <div key={idx} className="flex gap-1.5 items-start">
                      <input
                        value={d.label}
                        onChange={(e) => {
                          const next = [...(body.diktum || [])];
                          next[idx] = { ...d, label: e.target.value };
                          setBodyField('diktum', next);
                        }}
                        className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-bold"
                      />
                      <textarea
                        rows={2}
                        value={d.isi}
                        onChange={(e) => {
                          const next = [...(body.diktum || [])];
                          next[idx] = { ...d, isi: e.target.value };
                          setBodyField('diktum', next);
                        }}
                        className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setBodyField(
                            'diktum',
                            (body.diktum || []).filter((_: any, i: number) => i !== idx)
                          )
                        }
                        className="text-red-500 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* LAPORAN KEGIATAN */}
            {doc.jenis_dokumen === 'laporan_kegiatan' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Laporan</label>
                  <input
                    type="text"
                    value={body.judul_laporan || ''}
                    onChange={(e) => setBodyField('judul_laporan', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold uppercase"
                  />
                </div>
                {[
                  ['Pendahuluan', 'pendahuluan'],
                  ['Dasar Pelaksanaan', 'dasar_pelaksanaan'],
                  ['Maksud & Tujuan', 'maksud_tujuan'],
                  ['Waktu & Tempat', 'waktu_tempat'],
                  ['Peserta', 'peserta'],
                ].map(([lbl, key]) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">{lbl}</label>
                    <textarea
                      rows={2}
                      value={body[key] || ''}
                      onChange={(e) => setBodyField(key, e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs"
                    />
                  </div>
                ))}
                {renderStringListEditor('Hasil yang Dicapai', 'hasil_kegiatan', body.hasil_kegiatan || [], 'Hasil...')}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hambatan & Saran</label>
                  <textarea
                    rows={2}
                    value={body.hambatan_saran || ''}
                    onChange={(e) => setBodyField('hambatan_saran', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Penutup / Kesimpulan</label>
                  <textarea
                    rows={2}
                    value={body.kesimpulan || ''}
                    onChange={(e) => setBodyField('kesimpulan', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tembusan (opsional)</label>
              <textarea
                rows={2}
                value={doc.tembusan}
                onChange={(e) => setField('tembusan', e.target.value)}
                placeholder="1. Bupati Kutai Kartanegara...&#10;2. Arsip."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
              />
            </div>
          </div>
        )}

        {activeTab === 'ttd' && (
          <div className="space-y-4">
            <div className="bg-kukar-light/50 border border-kukar-emerald/20 rounded-xl p-3 space-y-2.5">
              <div className="text-xs font-bold text-kukar-emerald flex items-center gap-1.5">
                <UserCheck className="w-4 h-4" /> Pilih Pejabat Penandatangan (QR TTE)
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSignerPreset('camat')}
                  className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold border transition ${
                    !doc.atas_nama && doc.penandatangan_nip === settings.camat_nip
                      ? 'bg-kukar-emerald text-white border-kukar-emerald'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-kukar-emerald'
                  }`}
                >
                  Camat ({settings.camat_nama.split(',')[0]})
                </button>
                <button
                  type="button"
                  onClick={() => handleSignerPreset('sekcam')}
                  className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold border transition ${
                    doc.atas_nama && doc.penandatangan_nip === settings.sekcam_nip
                      ? 'bg-kukar-emerald text-white border-kukar-emerald'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-kukar-emerald'
                  }`}
                >
                  a.n. Camat (Sekretaris Camat)
                </button>
              </div>
              <select
                value=""
                onChange={(e) => {
                  const found = pegawai.find((p) => String(p.id) === e.target.value);
                  if (found) handleSignerPreset('custom', found);
                }}
                className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-white"
              >
                <option value="">-- Atau pilih pejabat lain dari direktori --</option>
                {pegawai.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.jabatan} — {p.nama}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Atas Nama (opsional)</label>
                <input
                  type="text"
                  value={doc.atas_nama}
                  placeholder="Kosongkan jika Camat langsung"
                  onChange={(e) => setField('atas_nama', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Jabatan Penandatangan</label>
                <input
                  type="text"
                  value={doc.penandatangan_jabatan}
                  onChange={(e) => setField('penandatangan_jabatan', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Penandatangan</label>
                <input
                  type="text"
                  value={doc.penandatangan_nama}
                  onChange={(e) => setField('penandatangan_nama', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pangkat / Golongan</label>
                <input
                  type="text"
                  value={doc.penandatangan_pangkat}
                  onChange={(e) => setField('penandatangan_pangkat', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">NIP Penandatangan</label>
                <input
                  type="text"
                  value={doc.penandatangan_nip}
                  onChange={(e) => setField('penandatangan_nip', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tempat Ditetapkan</label>
                <input
                  type="text"
                  value={doc.tempat_surat}
                  onChange={(e) => setField('tempat_surat', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                />
              </div>
            </div>

            <div className="border-t border-slate-200 pt-3 grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ukuran Kertas Cetak</label>
                <select
                  value={doc.kertas}
                  onChange={(e) => setField('kertas', e.target.value as 'F4' | 'A4')}
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-semibold bg-white"
                >
                  <option value="F4">F4 / Folio (215 × 330 mm)</option>
                  <option value="A4">A4 (210 × 297 mm)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Huruf (Font)</label>
                <select
                  value={doc.font_family}
                  onChange={(e) => setField('font_family', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs bg-white"
                >
                  <option value="Times New Roman">Times New Roman (Standar)</option>
                  <option value="Arial">Arial (Permendagri 1/2023)</option>
                  <option value="Bookman Old Style">Bookman Old Style (SK/Peraturan)</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition">
              <input
                type="checkbox"
                checked={doc.show_stempel}
                onChange={(e) => setField('show_stempel', e.target.checked)}
                className="rounded text-kukar-emerald focus:ring-kukar-emerald"
              />
              <Stamp className="w-4 h-4 text-indigo-700" />
              <div>
                <div className="text-xs font-bold text-slate-800">Tampilkan Cap / Stempel Basah Kecamatan</div>
                <div className="text-[11px] text-slate-500">
                  Opsional: menambahkan stempel digital Kecamatan Muara Wis di atas blok QR TTE.
                </div>
              </div>
            </label>
          </div>
        )}
      </div>
    </div>
  );
};
