import React, { useState } from 'react';
import {
  Search,
  Printer,
  FileDown,
  ShieldCheck,
  Trash2,
  FolderOpen,
  FileText,
  Filter,
} from 'lucide-react';
import { DOC_TYPES, SuratDocument } from '../types';
import { formatTanggalIndo } from '../utils/formatters';

interface AgendaViewProps {
  documents: SuratDocument[];
  onOpenInStudio: (doc: SuratDocument) => void;
  onPrintDoc: (doc: SuratDocument) => void;
  onDownloadDocx: (doc: SuratDocument) => void;
  onVerifyCode: (kode: string) => void;
  onDeleteDoc: (id: number) => void;
}

export const AgendaView: React.FC<AgendaViewProps> = ({
  documents,
  onOpenInStudio,
  onPrintDoc,
  onDownloadDocx,
  onVerifyCode,
  onDeleteDoc,
}) => {
  const [search, setSearch] = useState('');
  const [jenisFilter, setJenisFilter] = useState('all');

  const filtered = documents.filter((d) => {
    if (jenisFilter !== 'all' && d.jenis_dokumen !== jenisFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      d.nomor_surat.toLowerCase().includes(q) ||
      d.hal.toLowerCase().includes(q) ||
      d.kepada.toLowerCase().includes(q) ||
      d.kode_verifikasi.toLowerCase().includes(q) ||
      d.penandatangan_nama.toLowerCase().includes(q)
    );
  });

  const getJenisLabel = (id: string) => DOC_TYPES.find((t) => t.id === id)?.short || id;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-5">
      {/* Header stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-kukar-light text-kukar-emerald flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Total Naskah Terdaftar</div>
            <div className="text-2xl font-extrabold text-slate-900">{documents.length} Dokumen</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Bertanda Tangan Elektronik (QR)</div>
            <div className="text-2xl font-extrabold text-slate-900">
              {documents.filter((d) => d.status === 'ditandatangani').length} Sah
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-kukar-goldlight text-amber-700 flex items-center justify-center font-extrabold text-sm">
            F4/A4
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Penomoran Terakhir</div>
            <div className="text-sm font-bold text-slate-900 font-mono truncate max-w-[230px]">
              {documents[0]?.nomor_surat || '-'}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nomor surat, perihal, tujuan, kode QR..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-kukar-emerald focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={jenisFilter}
            onChange={(e) => setJenisFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold bg-white focus:border-kukar-emerald focus:outline-none"
          >
            <option value="all">Semua Jenis Dokumen</option>
            {DOC_TYPES.map((dt) => (
              <option key={dt.id} value={dt.id}>
                {dt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Nomor & Kode QR</th>
                <th className="py-3 px-4">Jenis</th>
                <th className="py-3 px-4">Perihal & Tujuan</th>
                <th className="py-3 px-4">Tanggal & Penandatangan</th>
                <th className="py-3 px-4 text-right">Aksi Cepat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-sm">
                    Belum ada dokumen yang cocok dengan pencarian Anda.
                  </td>
                </tr>
              ) : (
                filtered.map((doc) => (
                  <tr key={doc.id || doc.kode_verifikasi} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 align-top">
                      <div className="font-mono text-xs font-bold text-slate-900">{doc.nomor_surat}</div>
                      <button
                        type="button"
                        onClick={() => onVerifyCode(doc.kode_verifikasi)}
                        className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-kukar-emerald bg-kukar-light px-2 py-0.5 rounded-full hover:underline"
                      >
                        <ShieldCheck className="w-3 h-3" /> {doc.kode_verifikasi}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 align-top">
                      <span className="inline-block text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                        {getJenisLabel(doc.jenis_dokumen)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 align-top max-w-md">
                      <div className="font-semibold text-slate-900 text-xs md:text-sm leading-snug">
                        {doc.hal}
                      </div>
                      {doc.kepada && (
                        <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                          Kepada: {doc.kepada.replace(/\n/g, ' ')}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 align-top">
                      <div className="text-xs font-semibold text-slate-800">
                        {formatTanggalIndo(doc.tanggal_surat)}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{doc.penandatangan_nama}</div>
                    </td>
                    <td className="py-3.5 px-4 align-top text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onOpenInStudio(doc)}
                          className="p-2 rounded-lg text-slate-600 hover:text-kukar-emerald hover:bg-kukar-light transition"
                          title="Buka & Edit di Studio"
                        >
                          <FolderOpen className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onPrintDoc(doc)}
                          className="p-2 rounded-lg text-slate-600 hover:text-kukar-emerald hover:bg-kukar-light transition"
                          title="Cetak Otomatis"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDownloadDocx(doc)}
                          className="p-2 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition"
                          title="Unduh Word (.docx)"
                        >
                          <FileDown className="w-4 h-4" />
                        </button>
                        {doc.id && (
                          <button
                            type="button"
                            onClick={() => onDeleteDoc(doc.id!)}
                            className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                            title="Hapus dari Agenda"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
