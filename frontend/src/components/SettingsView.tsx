import React, { useState } from 'react';
import {
  Save,
  Building2,
  UserCheck,
  Cpu,
  Users,
  Plus,
  Trash2,
  Check,
  QrCode,
  Download,
  Upload,
  Database,
} from 'lucide-react';
import { AppSettings, Pegawai } from '../types';

interface SettingsViewProps {
  settings: AppSettings;
  pegawai: Pegawai[];
  onSaveSettings: (next: AppSettings) => Promise<void>;
  onUpsertPegawai: (p: Pegawai) => Promise<void>;
  onDeletePegawai: (id: number) => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  pegawai,
  onSaveSettings,
  onUpsertPegawai,
  onDeletePegawai,
}) => {
  const [form, setForm] = useState<AppSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  const [newPegawai, setNewPegawai] = useState<Pegawai>({
    nama: '',
    nip: '',
    pangkat: '',
    jabatan: '',
    unit: '',
    is_penandatangan: false,
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveSettings(form);
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const handleAddPegawai = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPegawai.nama.trim()) return;
    await onUpsertPegawai(newPegawai);
    setNewPegawai({ nama: '', nip: '', pangkat: '', jabatan: '', unit: '', is_penandatangan: false });
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const resp = await fetch('/api/backup/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      });
      if (resp.ok) {
        window.location.reload();
      }
    } catch {
      alert('File backup JSON tidak valid.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      <form onSubmit={handleSave} className="space-y-6">
        <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Pengaturan Sistem Kecamatan Muara Wis</h2>
            <p className="text-xs text-slate-500">
              Sesuaikan Kop Surat, Data Camat, Format QR TTE, dan Mesin AI Cloud / Lokal.
            </p>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-kukar-emerald hover:bg-kukar-deep text-white text-sm font-bold transition shadow-sm"
          >
            {savedMsg ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saving ? 'Menyimpan...' : savedMsg ? 'Tersimpan!' : 'Simpan Pengaturan'}
          </button>
        </div>

        {/* Kop & Instansi */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-2.5">
            <Building2 className="w-4 h-4 text-kukar-emerald" /> Identitas Kop Surat & Penomoran
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Pemerintah Daerah</label>
              <input
                value={form.nama_pemda}
                onChange={(e) => setForm({ ...form, nama_pemda: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nama Kecamatan / Instansi</label>
              <input
                value={form.nama_instansi}
                onChange={(e) => setForm({ ...form, nama_instansi: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 font-bold"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Alamat Lengkap Kantor</label>
              <input
                value={form.alamat}
                onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Resmi</label>
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Website Resmi</label>
              <input
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Kode Pos</label>
              <input
                value={form.kode_pos}
                onChange={(e) => setForm({ ...form, kode_pos: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Format Penomoran Otomatis</label>
              <input
                value={form.format_nomor}
                onChange={(e) => setForm({ ...form, format_nomor: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono"
              />
              <span className="text-[10.5px] text-slate-400">
                Variabel: {'{kode}'}, {'{urut}'}, {'{instansi}'}, {'{romawi}'}, {'{tahun}'}
              </span>
            </div>
          </div>
        </div>

        {/* Pejabat Penandatangan */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-2.5">
            <UserCheck className="w-4 h-4 text-kukar-emerald" /> Data Camat & Sekretaris Camat (Default TTE)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-kukar-light/40 border border-kukar-emerald/20 space-y-2.5">
              <div className="font-bold text-kukar-emerald">Pejabat Utama: Camat Muara Wis</div>
              <input
                placeholder="Nama & Gelar Camat"
                value={form.camat_nama}
                onChange={(e) => setForm({ ...form, camat_nama: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 bg-white font-semibold"
              />
              <input
                placeholder="NIP Camat"
                value={form.camat_nip}
                onChange={(e) => setForm({ ...form, camat_nip: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 bg-white font-mono"
              />
              <input
                placeholder="Pangkat / Golongan"
                value={form.camat_pangkat}
                onChange={(e) => setForm({ ...form, camat_pangkat: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 bg-white"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="font-bold text-slate-700">Pejabat Pengganti (a.n. Camat): Sekretaris Camat</div>
              <input
                placeholder="Nama & Gelar Sekcam"
                value={form.sekcam_nama}
                onChange={(e) => setForm({ ...form, sekcam_nama: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 bg-white font-semibold"
              />
              <input
                placeholder="NIP Sekcam"
                value={form.sekcam_nip}
                onChange={(e) => setForm({ ...form, sekcam_nip: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 bg-white font-mono"
              />
              <input
                placeholder="Pangkat / Golongan"
                value={form.sekcam_pangkat}
                onChange={(e) => setForm({ ...form, sekcam_pangkat: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Cetak & QR TTE */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-2.5">
            <QrCode className="w-4 h-4 text-kukar-emerald" /> Pengaturan Cetak & QR Code Tanda Tangan
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Kertas Default</label>
              <select
                value={form.kertas_default}
                onChange={(e) => setForm({ ...form, kertas_default: e.target.value as 'F4' | 'A4' })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-white"
              >
                <option value="F4">F4 / Folio (215×330mm)</option>
                <option value="A4">A4 (210×297mm)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Font Default</label>
              <select
                value={form.font_default}
                onChange={(e) => setForm({ ...form, font_default: e.target.value as any })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-white"
              >
                <option value="Times New Roman">Times New Roman</option>
                <option value="Arial">Arial (Permendagri)</option>
                <option value="Bookman Old Style">Bookman Old Style</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Warna Logo Kop Surat</label>
              <select
                value={form.logo_mode}
                onChange={(e) => setForm({ ...form, logo_mode: e.target.value as 'color' | 'bw' })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-white"
              >
                <option value="color">Berwarna (Resmi Pemkab Kukar)</option>
                <option value="bw">Hitam-Putih (Monokrom Print)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Isi QR Code TTE</label>
              <select
                value={form.qr_mode}
                onChange={(e) => setForm({ ...form, qr_mode: e.target.value as any })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-white"
              >
                <option value="hybrid">URL Verifikasi Portal (Online)</option>
                <option value="offline">Teks Sertifikat Lengkap (Offline-Ready)</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 pt-1 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.show_footer_tte}
                onChange={(e) => setForm({ ...form, show_footer_tte: e.target.checked })}
                className="rounded text-kukar-emerald"
              />
              <span className="font-semibold text-slate-700">Tampilkan catatan verifikasi TTE di footer halaman</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.show_stempel}
                onChange={(e) => setForm({ ...form, show_stempel: e.target.checked })}
                className="rounded text-kukar-emerald"
              />
              <span className="font-semibold text-slate-700">Aktifkan stempel kecamatan default</span>
            </label>
          </div>
        </div>

        {/* Mesin AI Hybrid Config */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-2.5">
            <Cpu className="w-4 h-4 text-kukar-emerald" /> Konfigurasi Mesin AI (Hybrid Lokal + Cloud LLM)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Mode Mesin AI</label>
              <select
                value={form.ai_provider}
                onChange={(e) => setForm({ ...form, ai_provider: e.target.value as any })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-white font-semibold"
              >
                <option value="local">Mesin AI Lokal Tata Naskah Dinas (Gratis & Tanpa API Key)</option>
                <option value="gemini">Google Gemini API (gemini-2.5-flash)</option>
                <option value="openai">OpenAI API (gpt-4o-mini / gpt-4o)</option>
                <option value="groq">Groq Cloud (Llama 3.3 70B — Super Cepat)</option>
                <option value="openrouter">OpenRouter API</option>
                <option value="custom">Custom OpenAI-Compatible Endpoint</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">API Key (Kosongkan jika pakai Mode Lokal)</label>
              <input
                type="password"
                value={form.ai_api_key}
                onChange={(e) => setForm({ ...form, ai_api_key: e.target.value })}
                placeholder="AIza... / sk-..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono"
              />
            </div>
            {form.ai_provider !== 'local' && (
              <>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Model (Opsional)</label>
                  <input
                    value={form.ai_model}
                    onChange={(e) => setForm({ ...form, ai_model: e.target.value })}
                    placeholder="Kosongkan untuk model default terbaik"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono"
                  />
                </div>
                {form.ai_provider === 'custom' && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Base URL Endpoint</label>
                    <input
                      value={form.ai_base_url}
                      onChange={(e) => setForm({ ...form, ai_base_url: e.target.value })}
                      placeholder="https://api.example.com/v1"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </form>

      {/* Pegawai Directory */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-2.5">
          <Users className="w-4 h-4 text-kukar-emerald" /> Direktori Pegawai & Pejabat Kecamatan Muara Wis
        </div>

        <form onSubmit={handleAddPegawai} className="grid grid-cols-1 md:grid-cols-5 gap-2 text-xs">
          <input
            placeholder="Nama & Gelar"
            value={newPegawai.nama}
            onChange={(e) => setNewPegawai({ ...newPegawai, nama: e.target.value })}
            className="rounded-xl border border-slate-200 px-3 py-2"
          />
          <input
            placeholder="NIP"
            value={newPegawai.nip}
            onChange={(e) => setNewPegawai({ ...newPegawai, nip: e.target.value })}
            className="rounded-xl border border-slate-200 px-3 py-2 font-mono"
          />
          <input
            placeholder="Pangkat / Golongan"
            value={newPegawai.pangkat}
            onChange={(e) => setNewPegawai({ ...newPegawai, pangkat: e.target.value })}
            className="rounded-xl border border-slate-200 px-3 py-2"
          />
          <input
            placeholder="Jabatan"
            value={newPegawai.jabatan}
            onChange={(e) => setNewPegawai({ ...newPegawai, jabatan: e.target.value })}
            className="rounded-xl border border-slate-200 px-3 py-2"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-kukar-emerald text-white font-bold py-2 px-3 transition"
          >
            <Plus className="w-4 h-4" /> Tambah Pegawai
          </button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase">
                <th className="py-2 px-3">Nama</th>
                <th className="py-2 px-3">NIP</th>
                <th className="py-2 px-3">Pangkat/Gol</th>
                <th className="py-2 px-3">Jabatan</th>
                <th className="py-2 px-3 text-right">Hapus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pegawai.map((p) => (
                <tr key={p.id}>
                  <td className="py-2 px-3 font-semibold text-slate-900">{p.nama}</td>
                  <td className="py-2 px-3 font-mono text-slate-600">{p.nip}</td>
                  <td className="py-2 px-3 text-slate-600">{p.pangkat}</td>
                  <td className="py-2 px-3 text-slate-700">{p.jabatan}</td>
                  <td className="py-2 px-3 text-right">
                    {p.id && (
                      <button
                        type="button"
                        onClick={() => onDeletePegawai(p.id!)}
                        className="text-slate-400 hover:text-red-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Backup & Restore Arsip */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <Database className="w-4 h-4 text-kukar-emerald" /> Backup & Pulihkan Data Arsip (.JSON)
          </div>
          <p className="text-xs text-slate-500">
            Penting jika memakai hosting gratisan (Render/Koyeb Free): unduh backup arsip surat secara berkala agar data aman & bisa dipulihkan kapan saja.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <a
            href="/api/backup/export"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-kukar-emerald hover:bg-kukar-deep text-white text-xs font-bold transition"
          >
            <Download className="w-3.5 h-3.5" /> Unduh Backup
          </a>
          <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer transition">
            <Upload className="w-3.5 h-3.5" /> Pulihkan JSON
            <input type="file" accept="application/json,.json" onChange={handleImportBackup} className="hidden" />
          </label>
        </div>
      </div>
    </div>
  );
};
