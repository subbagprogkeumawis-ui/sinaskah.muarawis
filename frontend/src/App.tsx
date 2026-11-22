import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  Printer,
  FileDown,
  Save,
  BookOpen,
  QrCode,
  Settings,
  Wand2,
  FilePlus2,
  ZoomIn,
  ZoomOut,
  CheckCircle2,
  Stamp,
  Cpu,
} from 'lucide-react';
import {
  AppSettings,
  DOC_TYPES,
  DocumentType,
  KlasifikasiItem,
  Pegawai,
  QUICK_PROMPTS,
  SuratDocument,
} from './types';
import { createBlankDocument, getDefaultBodyForType } from './utils/formatters';
import { DocumentPaper } from './components/DocumentPaper';
import { DocumentForm } from './components/DocumentForm';
import { AgendaView } from './components/AgendaView';
import { VerifyView } from './components/VerifyView';
import { SettingsView } from './components/SettingsView';

type NavTab = 'studio' | 'agenda' | 'verify' | 'settings';

export default function App() {
  const [tab, setTab] = useState<NavTab>('studio');
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [pegawai, setPegawai] = useState<Pegawai[]>([]);
  const [desaList, setDesaList] = useState<string[]>([]);
  const [klasifikasi, setKlasifikasi] = useState<KlasifikasiItem[]>([]);
  const [documents, setDocuments] = useState<SuratDocument[]>([]);

  const [doc, setDoc] = useState<SuratDocument | null>(null);
  const [prompt, setPrompt] = useState('');
  const [forcedJenis, setForcedJenis] = useState<DocumentType | 'auto'>('auto');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [zoom, setZoom] = useState(0.78);
  const [verifyCode, setVerifyCode] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const qrTimerRef = useRef<number | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const refreshDocuments = useCallback(async () => {
    const resp = await fetch('/api/documents');
    if (resp.ok) {
      const list = await resp.json();
      setDocuments(list);
      return list as SuratDocument[];
    }
    return [];
  }, []);

  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/verifikasi/')) {
      const code = decodeURIComponent(path.replace('/verifikasi/', '').split('/')[0] || '');
      if (code) {
        setVerifyCode(code);
        setTab('verify');
      }
    }

    (async () => {
      const [metaRes, docsList] = await Promise.all([fetch('/api/meta'), refreshDocuments()]);
      if (metaRes.ok) {
        const meta = await metaRes.json();
        setSettings(meta.settings);
        setPegawai(meta.pegawai);
        setDesaList(meta.desa);
        setKlasifikasi(meta.klasifikasi);
        if (docsList.length > 0) {
          setDoc(docsList[0]);
        } else {
          setDoc(createBlankDocument('surat_undangan', meta.settings));
        }
      }
    })();
  }, [refreshDocuments]);

  // Dynamic @page print dimensions for F4 vs A4
  useEffect(() => {
    if (!doc) return;
    const isA4 = doc.kertas === 'A4';
    const w = isA4 ? '210mm' : '215mm';
    const h = isA4 ? '297mm' : '330mm';
    let styleEl = document.getElementById('print-page-style') as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'print-page-style';
      document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = `@media print { @page { size: ${w} ${h}; margin: 14mm 20mm 16mm 24mm; } }`;
  }, [doc?.kertas]);

  // Debounced live QR refresh whenever document content changes
  const scheduleQrRefresh = useCallback((nextDoc: SuratDocument) => {
    if (qrTimerRef.current) window.clearTimeout(qrTimerRef.current);
    qrTimerRef.current = window.setTimeout(async () => {
      try {
        const resp = await fetch('/api/qr/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            document: nextDoc,
            base_url: window.location.origin,
          }),
        });
        if (resp.ok) {
          const qr = await resp.json();
          setDoc((curr) =>
            curr
              ? {
                  ...curr,
                  hash_sha256: qr.hash_sha256,
                  qr_data_url: qr.qr_data_url,
                  qr_payload: qr.qr_payload,
                }
              : curr
          );
        }
      } catch {
        // ignore transient preview errors
      }
    }, 350);
  }, []);

  const handleDocChange = (nextDoc: SuratDocument) => {
    setDoc(nextDoc);
    scheduleQrRefresh(nextDoc);
  };

  const handleTypeChange = (jenis: DocumentType) => {
    if (!doc || !settings) return;
    const nextDoc: SuratDocument = {
      ...doc,
      jenis_dokumen: jenis,
      body: getDefaultBodyForType(jenis, settings),
    };
    handleDocChange(nextDoc);
  };

  const handleRefreshNumber = async (kode: string, tanggal: string) => {
    if (!doc) return;
    const resp = await fetch(`/api/next-number?kode=${encodeURIComponent(kode)}&tanggal=${encodeURIComponent(tanggal)}`);
    if (resp.ok) {
      const data = await resp.json();
      handleDocChange({
        ...doc,
        kode_klasifikasi: kode,
        nomor_urut: data.nomor_urut,
        nomor_surat: data.nomor_surat,
      });
    }
  };

  const handleGenerateAI = async (customPrompt?: string, customJenis?: DocumentType | 'auto') => {
    const p = (customPrompt ?? prompt).trim();
    if (!p) {
      showToast('Ketik perintah surat terlebih dahulu atau pilih contoh cepat.');
      return;
    }
    setGenerating(true);
    try {
      const resp = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: p,
          jenis_dokumen: customJenis ?? forcedJenis,
          base_url: window.location.origin,
        }),
      });
      if (resp.ok) {
        const generated: SuratDocument = await resp.json();
        setDoc(generated);
        showToast(generated.ai_note || 'Naskah dinas berhasil dibuat oleh Mesin AI!');
      } else {
        showToast('Gagal menghasilkan dokumen AI.');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handlePolishText = async (text: string): Promise<string> => {
    const resp = await fetch('/api/ai/polish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (resp.ok) {
      const data = await resp.json();
      showToast('Bahasa disempurnakan sesuai standar Tata Naskah Dinas.');
      return data.text;
    }
    return text;
  };

  const handleSaveDoc = async (): Promise<SuratDocument | null> => {
    if (!doc) return null;
    setSaving(true);
    try {
      const resp = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...doc,
          kode_verifikasi: doc.kode_verifikasi?.includes('DRAFT') ? null : doc.kode_verifikasi,
        }),
      });
      if (resp.ok) {
        const saved: SuratDocument = await resp.json();
        setDoc(saved);
        await refreshDocuments();
        showToast(`Dokumen tersimpan di Buku Agenda (${saved.kode_verifikasi})`);
        return saved;
      }
    } finally {
      setSaving(false);
    }
    return null;
  };

  const handleDownloadDocx = async (targetDoc?: SuratDocument) => {
    const d = targetDoc || doc;
    if (!d) return;
    setExporting(true);
    try {
      const resp = await fetch('/api/export/docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document: d, base_url: window.location.origin }),
      });
      if (resp.ok) {
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeName = (d.hal || 'Surat_Muara_Wis').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 45);
        a.download = `${d.jenis_dokumen}_${safeName}.docx`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('File Word (.docx) dengan Kop Surat & QR TTE berhasil diunduh!');
      }
    } finally {
      setExporting(false);
    }
  };

  const handleAutoPrint = async (targetDoc?: SuratDocument) => {
    if (targetDoc) {
      setDoc(targetDoc);
      setTab('studio');
      setTimeout(() => window.print(), 250);
      return;
    }
    // Save unsaved draft automatically before printing so QR verification code is valid & recorded!
    if (doc && !doc.id) {
      await handleSaveDoc();
    }
    setTimeout(() => window.print(), 150);
  };

  const handleSaveSettings = async (next: AppSettings) => {
    const resp = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    });
    if (resp.ok) {
      const updated = await resp.json();
      setSettings(updated);
      if (doc) scheduleQrRefresh(doc);
      showToast('Pengaturan berhasil disimpan.');
    }
  };

  const handleUpsertPegawai = async (p: Pegawai) => {
    const resp = await fetch('/api/pegawai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p),
    });
    if (resp.ok) {
      const listRes = await fetch('/api/pegawai');
      if (listRes.ok) setPegawai(await listRes.json());
      showToast('Data pegawai berhasil disimpan.');
    }
  };

  const handleDeletePegawai = async (id: number) => {
    await fetch(`/api/pegawai/${id}`, { method: 'DELETE' });
    setPegawai((prev) => prev.filter((p) => p.id !== id));
    showToast('Pegawai dihapus.');
  };

  const handleDeleteDocument = async (id: number) => {
    await fetch(`/api/documents/${id}`, { method: 'DELETE' });
    await refreshDocuments();
    showToast('Dokumen dihapus dari Buku Agenda.');
  };

  if (!settings || !doc) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F2F5F3]">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 border-4 border-kukar-emerald border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Memuat Sistem AI Kecamatan Muara Wis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#EEF2EF]">
      {/* TOP NAVBAR */}
      <header className="no-print sticky top-0 z-30 bg-kukar-emerald text-white shadow-md">
        <div className="max-w-[1600px] mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-sm">
              <img src="/api/logo/color" alt="Logo Kukar" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm md:text-base font-extrabold tracking-tight leading-none">
                  SI-NASKAH AI
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-kukar-gold text-slate-950">
                  <Cpu className="w-3 h-3" /> {settings.ai_provider === 'local' ? 'Hybrid Lokal' : settings.ai_provider.toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-emerald-100/90 mt-0.5">
                Kecamatan Muara Wis • Kabupaten Kutai Kartanegara
              </p>
            </div>
          </div>

          <nav className="flex items-center gap-1 bg-kukar-deep/60 p-1 rounded-xl">
            {[
              { id: 'studio', label: 'Studio AI & Cetak', icon: Wand2 },
              { id: 'agenda', label: `Buku Agenda (${documents.length})`, icon: BookOpen },
              { id: 'verify', label: 'Verifikasi QR TTE', icon: QrCode },
              { id: 'settings', label: 'Pengaturan', icon: Settings },
            ].map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id as NavTab)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    active ? 'bg-white text-kukar-emerald shadow-sm' : 'text-emerald-100 hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* TOAST */}
      {toast && (
        <div className="no-print fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* MAIN CONTENT */}
      {tab === 'studio' && (
        <main className="flex-1 max-w-[1600px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 p-4 md:p-5 items-start">
          {/* LEFT PANEL: AI ENGINE + EDITOR */}
          <div className="no-print lg:col-span-5 space-y-4">
            {/* AI PROMPT CARD */}
            <div className="bg-gradient-to-br from-kukar-emerald to-kukar-deep rounded-2xl p-4 text-white shadow-lg border border-emerald-700/40">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-kukar-gold text-slate-950 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-extrabold leading-tight">Mesin AI Pembuat Surat Otomatis</h2>
                    <p className="text-[11px] text-emerald-100/80">
                      Ketik perintah singkat — AI menyusun naskah, nomor & QR TTE Camat.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const blank = createBlankDocument(doc.jenis_dokumen, settings);
                    handleDocChange(blank);
                    handleRefreshNumber(blank.kode_klasifikasi, blank.tanggal_surat);
                    showToast('Lembar dokumen baru siap disusun.');
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-bold bg-white/15 hover:bg-white/25 px-2.5 py-1.5 rounded-lg transition"
                  title="Buat dokumen kosong baru"
                >
                  <FilePlus2 className="w-3.5 h-3.5" /> Baru
                </button>
              </div>

              <textarea
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleGenerateAI();
                  }
                }}
                placeholder="Contoh: Buatkan surat undangan rakor ketahanan pangan untuk seluruh Kepala Desa se-Kecamatan Muara Wis hari Rabu jam 09.00 WITA di Aula Kantor Camat..."
                className="w-full rounded-xl bg-white/95 text-slate-900 placeholder:text-slate-400 px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-kukar-gold"
              />

              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <select
                  value={forcedJenis}
                  onChange={(e) => setForcedJenis(e.target.value as any)}
                  className="rounded-xl bg-white/15 border border-white/20 text-white text-xs font-semibold px-2.5 py-2 focus:outline-none [&>option]:text-slate-900"
                >
                  <option value="auto">Deteksi Jenis Otomatis (AI)</option>
                  {DOC_TYPES.map((dt) => (
                    <option key={dt.id} value={dt.id}>
                      {dt.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleGenerateAI()}
                  disabled={generating}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-kukar-gold hover:bg-amber-400 text-slate-950 font-extrabold text-xs py-2 px-4 transition shadow disabled:opacity-60"
                >
                  <Sparkles className="w-4 h-4" />
                  {generating ? 'Menyusun Naskah...' : 'Generate Surat AI'}
                </button>
              </div>

              {/* Quick Prompt Chips */}
              <div className="mt-3 pt-2.5 border-t border-white/15">
                <div className="text-[10.5px] font-semibold text-emerald-100/80 mb-1.5">
                  Contoh Perintah Cepat Kecamatan Muara Wis:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_PROMPTS.map((qp) => (
                    <button
                      key={qp.label}
                      type="button"
                      onClick={() => {
                        setPrompt(qp.prompt);
                        setForcedJenis(qp.jenis);
                        handleGenerateAI(qp.prompt, qp.jenis);
                      }}
                      className="text-[10.5px] font-semibold bg-white/10 hover:bg-white/20 border border-white/15 px-2.5 py-1 rounded-full transition text-left"
                    >
                      {qp.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* STRUCTURED EDITOR */}
            <DocumentForm
              doc={doc}
              onChange={handleDocChange}
              onTypeChange={handleTypeChange}
              settings={settings}
              pegawai={pegawai}
              desaList={desaList}
              klasifikasi={klasifikasi}
              onRefreshNumber={handleRefreshNumber}
              onPolishText={handlePolishText}
            />
          </div>

          {/* RIGHT PANEL: ACTION BAR + LIVE PRINT PAPER */}
          <div className="lg:col-span-7 space-y-3">
            {/* ACTION TOOLBAR */}
            <div className="no-print sticky top-[74px] z-20 bg-white/95 backdrop-blur rounded-2xl border border-slate-200 p-2.5 shadow-sm flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-xl bg-slate-100 p-0.5 text-xs font-bold">
                  {(['F4', 'A4'] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => handleDocChange({ ...doc, kertas: sz })}
                      className={`px-2.5 py-1.5 rounded-lg transition ${
                        doc.kertas === sz ? 'bg-white text-kukar-emerald shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>

                <div className="inline-flex items-center gap-1 bg-slate-100 rounded-xl px-2 py-1 text-xs font-bold text-slate-700">
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.max(0.55, +(z - 0.1).toFixed(2)))}
                    className="p-0.5 hover:text-kukar-emerald"
                    title="Perkecil"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-10 text-center">{Math.round(zoom * 100)}%</span>
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.min(1.1, +(z + 0.1).toFixed(2)))}
                    className="p-0.5 hover:text-kukar-emerald"
                    title="Perbesar"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleDocChange({ ...doc, show_stempel: !doc.show_stempel })}
                  className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-xl border transition ${
                    doc.show_stempel
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                  title="Tampilkan / Sembunyikan Stempel Kecamatan"
                >
                  <Stamp className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Stempel</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    if (doc.id) {
                      setVerifyCode(doc.kode_verifikasi);
                      setTab('verify');
                    } else {
                      handleSaveDoc().then((saved) => {
                        if (saved) {
                          setVerifyCode(saved.kode_verifikasi);
                          setTab('verify');
                        }
                      });
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition"
                  title="Cek QR Verifikasi"
                >
                  <QrCode className="w-3.5 h-3.5 text-kukar-emerald" />
                  <span className="hidden xl:inline">Uji QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveDoc()}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-kukar-emerald/30 bg-kukar-light hover:bg-emerald-100 text-kukar-emerald text-xs font-bold transition"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? 'Menyimpan...' : 'Simpan Agenda'}
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadDocx()}
                  disabled={exporting}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  {exporting ? 'Membuat...' : 'Word (.docx)'}
                </button>

                <button
                  type="button"
                  onClick={() => handleAutoPrint()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-kukar-emerald hover:bg-kukar-deep text-white text-xs font-extrabold transition shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  Cetak Otomatis
                </button>
              </div>
            </div>

            {/* LIVE PAPER PREVIEW */}
            <div className="overflow-x-auto pb-8 pt-2">
              <DocumentPaper doc={doc} settings={settings} zoom={zoom} />
            </div>
          </div>
        </main>
      )}

      {tab === 'agenda' && (
        <div className="no-print flex-1">
          <AgendaView
            documents={documents}
            onOpenInStudio={(selected) => {
              setDoc(selected);
              setTab('studio');
            }}
            onPrintDoc={(selected) => handleAutoPrint(selected)}
            onDownloadDocx={(selected) => handleDownloadDocx(selected)}
            onVerifyCode={(code) => {
              setVerifyCode(code);
              setTab('verify');
            }}
            onDeleteDoc={handleDeleteDocument}
          />
        </div>
      )}

      {tab === 'verify' && (
        <div className="no-print flex-1">
          <VerifyView initialCode={verifyCode} documents={documents} />
        </div>
      )}

      {tab === 'settings' && (
        <div className="no-print flex-1">
          <SettingsView
            settings={settings}
            pegawai={pegawai}
            onSaveSettings={handleSaveSettings}
            onUpsertPegawai={handleUpsertPegawai}
            onDeletePegawai={handleDeletePegawai}
          />
        </div>
      )}

      {/* Hidden paper container during print when user triggers print from Agenda */}
      {tab !== 'studio' && (
        <div className="hidden print:block">
          <DocumentPaper doc={doc} settings={settings} zoom={1} />
        </div>
      )}
    </div>
  );
}
