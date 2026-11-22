import React, { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, Search, QrCode, CheckCircle2, FileText } from 'lucide-react';
import { DOC_TYPES, SuratDocument } from '../types';
import { formatTanggalIndo } from '../utils/formatters';

interface VerifyViewProps {
  initialCode?: string;
  documents: SuratDocument[];
}

export const VerifyView: React.FC<VerifyViewProps> = ({ initialCode = '', documents }) => {
  const [kode, setKode] = useState(initialCode || documents[0]?.kode_verifikasi || 'MW-2026-0001');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const runVerify = async (targetKode: string) => {
    if (!targetKode.trim()) return;
    setLoading(true);
    try {
      const resp = await fetch(`/api/verify/${encodeURIComponent(targetKode.trim())}`);
      const data = await resp.json();
      setResult(data);
    } catch {
      setResult({ valid: false, message: 'Gagal menghubungi server verifikasi.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCode) {
      setKode(initialCode);
      runVerify(initialCode);
    } else if (kode) {
      runVerify(kode);
    }
  }, [initialCode]);

  const jenisLabel = (id: string) => DOC_TYPES.find((t) => t.id === id)?.label || id;

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-kukar-emerald text-white flex items-center justify-center">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">
              Portal Verifikasi Tanda Tangan Elektronik (TTE)
            </h2>
            <p className="text-xs text-slate-500">
              Pemerintah Kabupaten Kutai Kartanegara — Kecamatan Muara Wis
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            runVerify(kode);
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={kode}
              onChange={(e) => setKode(e.target.value)}
              placeholder="Masukkan Kode Verifikasi (contoh: MW-2026-0001)"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 font-mono text-sm font-semibold focus:border-kukar-emerald focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-kukar-emerald hover:bg-kukar-deep text-white font-bold text-sm transition disabled:opacity-50"
          >
            {loading ? 'Memeriksa...' : 'Verifikasi'}
          </button>
        </form>

        {documents.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500">Uji cepat dokumen tersimpan:</span>
            {documents.slice(0, 5).map((d) => (
              <button
                key={d.kode_verifikasi}
                type="button"
                onClick={() => {
                  setKode(d.kode_verifikasi);
                  runVerify(d.kode_verifikasi);
                }}
                className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 hover:bg-kukar-light hover:text-kukar-emerald transition"
              >
                {d.kode_verifikasi}
              </button>
            ))}
          </div>
        )}
      </div>

      {result && (
        <div
          className={`rounded-2xl border-2 p-6 shadow-sm ${
            result.valid
              ? 'bg-white border-emerald-500/40'
              : 'bg-red-50/40 border-red-300'
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                result.valid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {result.valid ? <ShieldCheck className="w-7 h-7" /> : <ShieldAlert className="w-7 h-7" />}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-xs font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                    result.valid ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {result.valid ? 'DOKUMEN ASLI & TERVERIFIKASI' : 'TIDAK TERVERIFIKASI'}
                </span>
                {result.short_hash && (
                  <span className="text-xs font-mono text-slate-500">SHA-256: {result.short_hash}</span>
                )}
              </div>

              {result.valid ? (
                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs">
                    <div>
                      <div className="text-slate-500">Instansi Penerbit</div>
                      <div className="font-bold text-slate-900 mt-0.5">
                        {result.instansi} — {result.pemda}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">Jenis & Nomor Dokumen</div>
                      <div className="font-bold text-slate-900 mt-0.5 font-mono">
                        {jenisLabel(result.jenis_dokumen)} • {result.nomor_surat}
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <div className="text-slate-500">Perihal / Judul Dokumen</div>
                      <div className="font-bold text-slate-900 mt-0.5 text-sm">{result.hal}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Tanggal Ditetapkan</div>
                      <div className="font-semibold text-slate-900 mt-0.5">
                        {result.tempat_surat}, {formatTanggalIndo(result.tanggal_surat)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">Penandatangan Elektronik</div>
                      <div className="font-bold text-slate-900 mt-0.5">
                        {result.penandatangan_nama} ({result.penandatangan_pangkat})
                      </div>
                      <div className="text-slate-600 font-mono">
                        {result.penandatangan_jabatan} • NIP. {result.penandatangan_nip}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    Integritas isi dokumen terjamin oleh sidik jari kriptografi SHA-256 dan belum mengalami perubahan.
                  </div>
                </div>
              ) : (
                <div className="mt-2 text-sm text-red-700 font-medium">
                  {result.message || 'Dokumen tidak ditemukan atau tanda tangan tidak valid.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
