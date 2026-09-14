import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  RefreshCw,
  Clock,
  Calendar,
  CheckCircle2,
  Copy,
  Check,
  FileSpreadsheet,
  Eye,
  LogOut,
  X,
  Radio,
  FileText,
  Printer,
  Save,
  Wand2,
  Settings,
  Globe,
  Layout,
  FileDown,
  Image as ImageIcon,
  Upload,
  RotateCcw,
} from 'lucide-react';
import {
  getAllSessions,
  createNewSession,
  subscribeToSessionTokens,
  updateTokenNotes,
} from '../../lib/supabaseClient';
import { TestSessionWithTokens, TokenRecord } from '../../types';
import { SEVERITY_COLORS, DASS_QUESTIONS } from '../../data/dassData';
import { ClinicalReportPdfView } from '../../components/ClinicalReportPdfView';
import { downloadClinicalPdfReport } from '../../lib/pdfGenerator';
import { getSiteSettings, saveSiteSettings, SiteSettings, DEFAULT_SITE_SETTINGS } from '../../lib/siteSettings';
import {
  optimizeUploadedLogo,
  formatFileSize,
  OptimizedImageResult,
} from '../../lib/imageOptimizer';

interface AdminDashboardPageProps {
  onLogout: () => void;
  onNavigateHome: () => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  onLogout,
}) => {
  const [sessions, setSessions] = useState<TestSessionWithTokens[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Modals
  const [isNewSessionModalOpen, setIsNewSessionModalOpen] = useState(false);
  const [detailToken, setDetailToken] = useState<TokenRecord | null>(null);
  const [isTokenListModalOpen, setIsTokenListModalOpen] = useState(false);
  const [pdfReportToken, setPdfReportToken] = useState<TokenRecord | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Settings State
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(getSiteSettings());
  const [activeSettingsTab, setActiveSettingsTab] = useState<'seo' | 'appearance' | 'logo'>('seo');
  const [settingsSavedToast, setSettingsSavedToast] = useState(false);
  const [isOptimizingLogo, setIsOptimizingLogo] = useState(false);
  const [logoOptimizeStats, setLogoOptimizeStats] = useState<OptimizedImageResult | null>(null);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);

  // Detail Modal Notes State
  const [notesInput, setNotesInput] = useState<string>('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSaveSuccess, setNotesSaveSuccess] = useState(false);

  // New Session Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formQuota, setFormQuota] = useState(10);
  const [formHasTimer, setFormHasTimer] = useState(false);
  const [formTimerMinutes, setFormTimerMinutes] = useState(30);
  const [formPurpose, setFormPurpose] = useState(
    'Pemeriksaan profil kesehatan mental dan kondisi emosional individu.'
  );
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  // Fetch all sessions
  const fetchSessions = useCallback(async () => {
    try {
      const data = await getAllSessions();
      setSessions(data);
      if (data.length > 0 && !selectedSessionId) {
        setSelectedSessionId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  }, [selectedSessionId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Realtime subscription to tokens of the selected session
  useEffect(() => {
    if (!selectedSessionId) return;

    const unsubscribe = subscribeToSessionTokens(selectedSessionId, () => {
      // Refresh session data seamlessly
      getAllSessions().then((data) => setSessions(data));
    });

    return () => {
      unsubscribe();
    };
  }, [selectedSessionId]);

  // Selected session object
  const currentSession = useMemo(() => {
    return sessions.find((s) => s.id === selectedSessionId) || sessions[0] || null;
  }, [sessions, selectedSessionId]);

  // When detail modal opens, sync notesInput
  useEffect(() => {
    if (detailToken) {
      setNotesInput(detailToken.notes_conclusion || '');
      setNotesSaveSuccess(false);
    }
  }, [detailToken]);

  // Stats calculation
  const stats = useMemo(() => {
    if (!currentSession) {
      return { total: 0, waiting: 0, inProgress: 0, completed: 0 };
    }
    const tokens = currentSession.tokens || [];
    return {
      total: tokens.length,
      waiting: tokens.filter((t) => t.status === 'BELUM_DIGUNAKAN').length,
      inProgress: tokens.filter((t) => t.status === 'SEDANG_MENGERJAKAN').length,
      completed: tokens.filter((t) => t.status === 'SELESAI').length,
    };
  }, [currentSession]);

  // Copy token link helper
  const handleCopyLink = (token: string) => {
    const origin = window.location.origin;
    const link = `${origin}/?token=${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  // WhatsApp Share Helper
  const handleShareWhatsApp = (token: string, name?: string) => {
    const origin = window.location.origin;
    const link = `${origin}/?token=${token}`;
    const greeting = name ? `Halo ${name}` : 'Halo';
    const text = encodeURIComponent(
      `${greeting}, berikut adalah tautan akses kuesioner pemeriksaan Antara Psychology Anda:\n\n${link}\n\nSilakan klik tautan di atas untuk memulai pemeriksaan.`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  // Telegram Share Helper
  const handleShareTelegram = (token: string, name?: string) => {
    const origin = window.location.origin;
    const link = `${origin}/?token=${token}`;
    const text = encodeURIComponent(
      `Tautan Kuesioner Pemeriksaan Antara Psychology (${token}): ${link}`
    );
    window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${text}`, '_blank');
  };

  // Create new session handler
  const handleCreateSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    setIsCreatingSession(true);
    try {
      const result = await createNewSession({
        title: formTitle.trim(),
        test_tool_id: 'DASS',
        test_date: formDate,
        participant_quota: Number(formQuota),
        has_timer: formHasTimer,
        timer_minutes: formHasTimer ? Number(formTimerMinutes) : null,
        examination_purpose: formPurpose.trim(),
      });

      if (result.session) {
        setIsNewSessionModalOpen(false);
        setFormTitle('');
        await fetchSessions();
        setSelectedSessionId(result.session.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreatingSession(false);
    }
  };

  // Save participant notes/recommendations
  const handleSaveNotes = async () => {
    if (!detailToken) return;
    setIsSavingNotes(true);
    setNotesSaveSuccess(false);

    try {
      const res = await updateTokenNotes(detailToken.token, notesInput);
      if (res.success) {
        setNotesSaveSuccess(true);
        const updated = { ...detailToken, notes_conclusion: notesInput };
        setDetailToken(updated);
        setSessions((prev) =>
          prev.map((s) => ({
            ...s,
            tokens: s.tokens.map((t) => (t.token === detailToken.token ? updated : t)),
          }))
        );
        setTimeout(() => setNotesSaveSuccess(false), 2500);
      }
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Save Site Settings
  const handleSaveSiteSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveSiteSettings(siteSettings);
    setSettingsSavedToast(true);
    setTimeout(() => setSettingsSavedToast(false), 2500);
  };

  // Handle Logo Upload and Client-Side Optimization
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsOptimizingLogo(true);
    setLogoUploadError(null);
    try {
      const result = await optimizeUploadedLogo(file, 400);
      setLogoOptimizeStats(result);
      setSiteSettings((prev) => ({
        ...prev,
        logoUrl: result.dataUrl,
      }));
    } catch (err: any) {
      setLogoUploadError(err.message || 'Gagal memproses gambar logo.');
    } finally {
      setIsOptimizingLogo(false);
      e.target.value = '';
    }
  };

  const handleResetLogo = () => {
    setSiteSettings((prev) => ({
      ...prev,
      logoUrl: DEFAULT_SITE_SETTINGS.logoUrl,
    }));
    setLogoOptimizeStats(null);
    setLogoUploadError(null);
  };

  // Generate automated psychological draft recommendation
  const handleGenerateDraftRecommendation = () => {
    if (!detailToken || !detailToken.scores) return;
    const { depression, anxiety, stress } = detailToken.scores;

    let draft = `Berdasarkan hasil pengukuran kuesioner, diperoleh profil kondisi emosional sebagai berikut:\n`;
    draft += `1. Tingkat Stres berada pada kategori "${stress.level}" (skor: ${stress.score}).\n`;
    draft += `2. Tingkat Depresi berada pada kategori "${depression.level}" (skor: ${depression.score}).\n`;
    draft += `3. Tingkat Kecemasan berada pada kategori "${anxiety.level}" (skor: ${anxiety.score}).\n\n`;

    const isHigh =
      depression.level === 'Parah' ||
      depression.level === 'Sangat Parah' ||
      anxiety.level === 'Parah' ||
      anxiety.level === 'Sangat Parah' ||
      stress.level === 'Parah' ||
      stress.level === 'Sangat Parah';

    if (isHigh) {
      draft += `Rekomendasi:\nDisarankan bagi peserta untuk menjadwalkan sesi konseling atau konsultasi lanjutan bersama Psikolog Klinis Antara Psychology guna mendapatkan evaluasi komprehensif, eksplorasi faktor pemicu stres, serta panduan regulasi emosi terarah.`;
    } else if (
      depression.level === 'Sedang' ||
      anxiety.level === 'Sedang' ||
      stress.level === 'Sedang'
    ) {
      draft += `Rekomendasi:\nPeserta disarankan untuk menjaga keseimbangan ritme kerja/akademik dan istirahat, menerapkan teknik relaksasi rutin, serta berkonsultasi secara berkala jika gejala emosional negatif menetap atau mengganggu produktivitas sehari-hari.`;
    } else {
      draft += `Rekomendasi:\nKondisi emosional peserta secara umum berada dalam rentang adaptif (normal/ringan). Pertahankan pola hidup sehat, manajemen waktu yang seimbang, dan ruang self-care positif.`;
    }

    setNotesInput(draft);
  };

  // Export CSV handler
  const handleExportCSV = () => {
    if (!currentSession) return;

    const headers = [
      'No',
      'Token',
      'Status',
      'Nama Lengkap',
      'Jenis Kelamin',
      'Tanggal Pemeriksaan',
      'Tempat Lahir',
      'Tanggal Lahir',
      'Usia',
      'Pendidikan Terakhir',
      'Pekerjaan',
      'Jumlah Jawaban Terisi',
      'Skor Depresi',
      'Tingkat Depresi',
      'Skor Kecemasan',
      'Tingkat Kecemasan',
      'Skor Stres',
      'Tingkat Stres',
      'Kesimpulan & Rekomendasi',
      'Waktu Submit',
    ];

    const rows = currentSession.tokens.map((t, idx) => {
      const bio = t.client_biodata;
      const scores = t.scores;
      const answeredCount = Object.keys(t.answers || {}).length;

      return [
        idx + 1,
        t.token,
        t.status,
        `"${bio?.fullName || '-'}"`,
        `"${bio?.gender || '-'}"`,
        `"${bio?.examDate || '-'}"`,
        `"${bio?.birthPlace || '-'}"`,
        `"${bio?.birthDate || '-'}"`,
        `"${bio?.calculatedAge || '-'}"`,
        `"${bio?.lastEducation || '-'}"`,
        `"${bio?.occupation || '-'}"`,
        answeredCount,
        scores?.depression?.score ?? '-',
        scores?.depression?.level ?? '-',
        scores?.anxiety?.score ?? '-',
        scores?.anxiety?.level ?? '-',
        scores?.stress?.score ?? '-',
        scores?.stress?.level ?? '-',
        `"${(t.notes_conclusion || '').replace(/"/g, '""')}"`,
        t.submitted_at ? `"${new Date(t.submitted_at).toLocaleString('id-ID')}"` : '-',
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Rekap_Mental_Health_Checkup_${currentSession.title.replace(/\s+/g, '_')}_${currentSession.test_date}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 bg-slate-50/50 pb-16">
      {/* Top Admin Sub-bar */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Dashboard Admin
            </span>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Pilih Sesi:</span>
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="text-xs font-medium py-1.5 px-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300 focus:bg-white transition cursor-pointer"
              >
                {sessions.map((s) => {
                  const hasDate = /\d{2,4}[-/.]\d{1,2}[-/.]\d{2,4}/.test(s.title);
                  return (
                    <option key={s.id} value={s.id}>
                      {hasDate ? s.title : `${s.title} (${s.test_date})`}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition shadow-2xs"
              title="Pengaturan SEO, Header, dan Footer"
            >
              <Settings className="w-3.5 h-3.5 text-purple-600" />
              <span>Pengaturan Web & SEO</span>
            </button>

            <button
              onClick={() => setIsNewSessionModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-medium transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Mulai Sesi Baru</span>
            </button>

            <button
              onClick={() => fetchSessions()}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
              title="Refresh Data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-medium transition"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-400" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Session Header Card */}
        {currentSession ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                    Alat Tes: {currentSession.test_tool_id}
                  </span>
                  {currentSession.has_timer && (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Timer: {currentSession.timer_minutes} Menit
                    </span>
                  )}
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                  {currentSession.title}
                </h1>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Tanggal: {currentSession.test_date} &bull; Tujuan:{' '}
                  <span className="italic text-slate-700">
                    {currentSession.examination_purpose ||
                      'Pemeriksaan profil kesehatan mental dan kondisi emosional individu.'}
                  </span>
                </p>
              </div>

              {/* Action Buttons for this session */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setIsTokenListModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>Daftar Token & Bagikan</span>
                </button>
                <button
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition shadow-xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Ekspor Excel/CSV</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5">
              <div className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-100">
                <p className="text-[11px] text-slate-500 font-medium">Total Kuota Token</p>
                <p className="text-xl font-bold text-slate-900 mt-1">{stats.total} Peserta</p>
              </div>
              <div className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-100">
                <p className="text-[11px] text-slate-500 font-medium">Belum Digunakan</p>
                <p className="text-xl font-bold text-slate-600 mt-1">{stats.waiting}</p>
              </div>
              <div className="bg-amber-50/60 rounded-xl p-3.5 border border-amber-200/60">
                <div className="flex items-center gap-1.5 text-[11px] text-amber-800 font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  <span>Sedang Mengerjakan</span>
                </div>
                <p className="text-xl font-bold text-amber-900 mt-1">{stats.inProgress}</p>
              </div>
              <div className="bg-emerald-50/60 rounded-xl p-3.5 border border-emerald-200/60">
                <p className="text-[11px] text-emerald-800 font-medium">Selesai Dikerjakan</p>
                <p className="text-xl font-bold text-emerald-900 mt-1">{stats.completed}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8">
            <p className="text-slate-500 text-sm">Belum ada sesi tes yang dibuat.</p>
            <button
              onClick={() => setIsNewSessionModalOpen(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-purple-700 text-white rounded-xl text-xs font-medium"
            >
              <Plus className="w-4 h-4" />
              Buat Sesi Pertama
            </button>
          </div>
        )}

        {/* Realtime Live Monitor Table */}
        {currentSession && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-purple-600 animate-pulse" />
                <h2 className="text-sm font-bold text-slate-900">
                  Live Token Monitor (Realtime Sync)
                </h2>
              </div>
              <span className="text-[11px] text-slate-400">
                Data otomatis tersinkron saat peserta mengisi biodata atau jawaban
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4">Kode Token</th>
                    <th className="py-3 px-4">Bagikan Link</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Nama Peserta</th>
                    <th className="py-3 px-4 text-center">Progress</th>
                    <th className="py-3 px-4">Hasil Pengukuran</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentSession.tokens.map((tokenRecord, index) => {
                    const answeredCount = Object.keys(tokenRecord.answers || {}).length;
                    const scores = tokenRecord.scores;
                    const bio = tokenRecord.client_biodata;

                    let statusBadge = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                        Belum Digunakan
                      </span>
                    );

                    if (tokenRecord.status === 'SEDANG_MENGERJAKAN') {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                          Sedang Mengerjakan
                        </span>
                      );
                    } else if (tokenRecord.status === 'SELESAI') {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Selesai
                        </span>
                      );
                    }

                    return (
                      <tr
                        key={tokenRecord.token}
                        className="hover:bg-slate-50/60 transition-colors"
                      >
                        <td className="py-3.5 px-4 text-center text-slate-400 font-medium">
                          {index + 1}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                          <div className="flex items-center gap-1.5">
                            <span>{tokenRecord.token}</span>
                            <button
                              onClick={() => handleCopyLink(tokenRecord.token)}
                              className="text-slate-400 hover:text-purple-600 transition"
                              title="Salin tautan langsung"
                            >
                              {copiedToken === tokenRecord.token ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Direct Share to WhatsApp & Telegram */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() =>
                                handleShareWhatsApp(tokenRecord.token, bio?.fullName)
                              }
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-medium transition"
                              title="Bagikan Tautan ke WhatsApp"
                            >
                              <svg
                                className="w-3.5 h-3.5 fill-current text-emerald-600"
                                viewBox="0 0 24 24"
                              >
                                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.699c.981.536 1.771.84 2.796.841h.005c3.181 0 5.767-2.586 5.768-5.766 0-3.18-2.586-5.827-5.773-5.827zm3.376 8.21c-.149.42-.871.78-1.209.829-.338.049-.78.075-2.227-.521-1.745-.722-2.883-2.493-2.97-2.61-.088-.117-.704-.937-.704-1.787 0-.85.441-1.267.599-1.442.158-.175.347-.219.463-.219.116 0 .232.001.332.006.105.006.246-.04.385.292.143.342.49 1.196.533 1.284.043.088.072.19.014.307-.058.117-.087.19-.174.292-.087.102-.183.228-.261.307-.088.087-.18.181-.077.357.102.175.454.748.974 1.212.671.597 1.236.782 1.411.87.175.088.277.073.379-.044.103-.117.439-.511.556-.687.117-.175.234-.146.394-.088.16.058 1.02.481 1.195.569.175.088.292.131.335.204.044.073.044.423-.105.843z" />
                              </svg>
                              <span>WA</span>
                            </button>

                            <button
                              onClick={() =>
                                handleShareTelegram(tokenRecord.token, bio?.fullName)
                              }
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-[11px] font-medium transition"
                              title="Bagikan Tautan ke Telegram"
                            >
                              <svg
                                className="w-3.5 h-3.5 fill-current text-sky-600"
                                viewBox="0 0 24 24"
                              >
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                              </svg>
                              <span>TG</span>
                            </button>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">{statusBadge}</td>
                        <td className="py-3.5 px-4">
                          {bio?.fullName ? (
                            <div>
                              <span className="font-semibold text-slate-900 block">
                                {bio.fullName}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {bio.gender} &bull; {bio.calculatedAge || '-'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">&mdash;</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="font-semibold text-slate-700">
                              {answeredCount} / 42
                            </span>
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden border border-slate-200">
                              <div
                                className="h-full bg-purple-600 rounded-full"
                                style={{ width: `${(answeredCount / 42) * 100}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {scores ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`px-2 py-0.5 rounded border text-[10px] font-medium ${
                                  SEVERITY_COLORS[scores.stress.level].bg
                                } ${SEVERITY_COLORS[scores.stress.level].text} ${
                                  SEVERITY_COLORS[scores.stress.level].border
                                }`}
                                title={`Stres: ${scores.stress.score}`}
                              >
                                S: {scores.stress.score} ({scores.stress.level})
                              </span>

                              <span
                                className={`px-2 py-0.5 rounded border text-[10px] font-medium ${
                                  SEVERITY_COLORS[scores.depression.level].bg
                                } ${SEVERITY_COLORS[scores.depression.level].text} ${
                                  SEVERITY_COLORS[scores.depression.level].border
                                }`}
                                title={`Depresi: ${scores.depression.score}`}
                              >
                                D: {scores.depression.score} ({scores.depression.level})
                              </span>

                              <span
                                className={`px-2 py-0.5 rounded border text-[10px] font-medium ${
                                  SEVERITY_COLORS[scores.anxiety.level].bg
                                } ${SEVERITY_COLORS[scores.anxiety.level].text} ${
                                  SEVERITY_COLORS[scores.anxiety.level].border
                                }`}
                                title={`Kecemasan: ${scores.anxiety.score}`}
                              >
                                A: {scores.anxiety.score} ({scores.anxiety.level})
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">&mdash;</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1">
                          {bio && (
                            <button
                              onClick={() => setDetailToken(tokenRecord)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] font-medium transition"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Detail & Laporan</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: PENGATURAN WEBSITE & SEO */}
      {/* ========================================================================= */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-purple-600" />
                <h3 className="font-bold text-slate-900 text-base">Pengaturan Website & SEO</h3>
              </div>
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs Selector */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
              <button
                type="button"
                onClick={() => setActiveSettingsTab('seo')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  activeSettingsTab === 'seo'
                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Pengaturan SEO</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSettingsTab('appearance')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  activeSettingsTab === 'appearance'
                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Layout className="w-3.5 h-3.5" />
                <span>Header & Footer</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSettingsTab('logo')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  activeSettingsTab === 'logo'
                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Ganti Logo & Kompresi</span>
              </button>
            </div>

            <form onSubmit={handleSaveSiteSettings} className="space-y-4">
              {activeSettingsTab === 'seo' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Judul Halaman (Browser Title)
                    </label>
                    <input
                      type="text"
                      value={siteSettings.siteTitle}
                      onChange={(e) =>
                        setSiteSettings({ ...siteSettings, siteTitle: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 text-slate-800"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Deskripsi Meta (SEO Description)
                    </label>
                    <textarea
                      rows={3}
                      value={siteSettings.siteDescription}
                      onChange={(e) =>
                        setSiteSettings({ ...siteSettings, siteDescription: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 text-slate-800 leading-relaxed"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Kata Kunci (SEO Keywords)
                    </label>
                    <input
                      type="text"
                      value={siteSettings.siteKeywords}
                      onChange={(e) =>
                        setSiteSettings({ ...siteSettings, siteKeywords: e.target.value })
                      }
                      placeholder="Pisahkan dengan koma"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 text-slate-800"
                    />
                  </div>
                </div>
              )}

              {activeSettingsTab === 'appearance' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Nama Brand
                      </label>
                      <input
                        type="text"
                        value={siteSettings.brandName}
                        onChange={(e) =>
                          setSiteSettings({ ...siteSettings, brandName: e.target.value })
                        }
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 text-slate-800"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Subtitle Header
                      </label>
                      <input
                        type="text"
                        value={siteSettings.brandSubtitle}
                        onChange={(e) =>
                          setSiteSettings({ ...siteSettings, brandSubtitle: e.target.value })
                        }
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 text-slate-800"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Teks Copyright Footer
                    </label>
                    <input
                      type="text"
                      value={siteSettings.footerCopyright}
                      onChange={(e) =>
                        setSiteSettings({ ...siteSettings, footerCopyright: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Teks Penjelas / Kerahasiaan Footer
                    </label>
                    <textarea
                      rows={2}
                      value={siteSettings.footerDisclaimer}
                      onChange={(e) =>
                        setSiteSettings({ ...siteSettings, footerDisclaimer: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 text-slate-800 leading-relaxed"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Nomor WhatsApp
                      </label>
                      <input
                        type="text"
                        value={siteSettings.whatsappNumber}
                        onChange={(e) =>
                          setSiteSettings({ ...siteSettings, whatsappNumber: e.target.value })
                        }
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Akun Instagram
                      </label>
                      <input
                        type="text"
                        value={siteSettings.instagramUsername}
                        onChange={(e) =>
                          setSiteSettings({ ...siteSettings, instagramUsername: e.target.value })
                        }
                        placeholder="antarapsychology"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeSettingsTab === 'logo' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-center gap-5">
                    {/* Circular Logo Preview */}
                    <div className="flex flex-col items-center gap-1.5 shrink-0">
                      <div className="w-24 h-24 rounded-full border-2 border-slate-200/90 shadow-sm bg-white p-2 overflow-hidden flex items-center justify-center">
                        <img
                          src={siteSettings.logoUrl || '/logo.png'}
                          alt="Logo Preview"
                          className="w-full h-full object-contain rounded-full"
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        Pratinjau Bulat
                      </span>
                    </div>

                    <div className="flex-1 text-center sm:text-left space-y-2">
                      <h4 className="text-xs font-bold text-slate-900">
                        Manajemen Logo & Kompresi Otomatis
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Pilih file logo baru (PNG, JPG, WebP, SVG). Gambar akan otomatis dikonversi ke format super ringan (WebP / SVG / PNG) dan di-resize ke resolusi retina optimal sehingga website tetap cepat dan jernih tanpa pecah.
                      </p>

                      <div className="flex flex-wrap items-center gap-2 pt-1 justify-center sm:justify-start">
                        <label
                          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-purple-700 hover:bg-purple-800 text-white cursor-pointer shadow-xs transition ${
                            isOptimizingLogo ? 'opacity-50 pointer-events-none' : ''
                          }`}
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{isOptimizingLogo ? 'Mengompresi...' : 'Unggah & Kompres Logo'}</span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                            className="hidden"
                            onChange={handleLogoUpload}
                            disabled={isOptimizingLogo}
                          />
                        </label>

                        <button
                          type="button"
                          onClick={handleResetLogo}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Gunakan Logo Default</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Optimization Feedback Stats */}
                  {logoOptimizeStats && (
                    <div className="p-3.5 rounded-xl bg-emerald-50/90 border border-emerald-200 text-emerald-900 text-xs space-y-2">
                      <div className="flex items-center justify-between font-semibold">
                        <span className="flex items-center gap-1.5 text-emerald-800">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          Logo Berhasil Dikompresi & Dioptimalkan!
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                          Format: {logoOptimizeStats.format.toUpperCase()}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1 text-slate-600">
                        <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                          <div className="text-[10px] text-slate-400 uppercase">Ukuran Asli</div>
                          <div className="font-semibold text-slate-700">{formatFileSize(logoOptimizeStats.originalSize)}</div>
                        </div>
                        <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                          <div className="text-[10px] text-slate-400 uppercase">Ukuran Kompresi</div>
                          <div className="font-semibold text-emerald-700">{formatFileSize(logoOptimizeStats.compressedSize)}</div>
                        </div>
                        <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                          <div className="text-[10px] text-slate-400 uppercase">Penghematan</div>
                          <div className="font-semibold text-emerald-700">
                            {logoOptimizeStats.reductionPercentage > 0 ? `Hemat ${logoOptimizeStats.reductionPercentage}%` : 'Lossless Vector'}
                          </div>
                        </div>
                        <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                          <div className="text-[10px] text-slate-400 uppercase">Resolusi Optimal</div>
                          <div className="font-semibold text-slate-700">{logoOptimizeStats.width} × {logoOptimizeStats.height} px</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {logoUploadError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                      <X className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{logoUploadError}</span>
                    </div>
                  )}

                  <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100 text-[11px] text-purple-900 leading-relaxed">
                    <strong>Catatan:</strong> Border logo di seluruh tampilan aplikasi (Navbar, Halaman Peserta, Halaman Admin) otomatis memakai desain lingkaran bulat (<em>rounded-full</em>) dengan border halus. Klik tombol <strong>Simpan Pengaturan</strong> di bawah untuk menerapkan logo baru secara permanen.
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                {settingsSavedToast ? (
                  <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    Pengaturan berhasil disimpan!
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400">
                    Pengaturan otomatis berlaku di seluruh halaman.
                  </span>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSiteSettings(DEFAULT_SITE_SETTINGS);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Reset Default
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-medium transition shadow-xs"
                  >
                    Simpan Pengaturan
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: MULAI SESI BARU */}
      {/* ========================================================================= */}
      {isNewSessionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Buat Sesi Psikotes Baru</h3>
              <button
                onClick={() => setIsNewSessionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSessionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nama / Judul Sesi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Contoh: Pengecekan Mahasiswa Angkatan 2026"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 text-slate-800 bg-slate-50/50 hover:bg-white transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tujuan Pemeriksaan (Akan Tercantum di Laporan PDF)
                </label>
                <textarea
                  rows={2}
                  value={formPurpose}
                  onChange={(e) => setFormPurpose(e.target.value)}
                  placeholder="Contoh: Pemeriksaan profil kesehatan mental dan kondisi emosional individu."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 text-slate-800 bg-slate-50/50 hover:bg-white transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Tanggal Tes <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 text-slate-800 bg-slate-50/50 hover:bg-white transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Kuota Peserta <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={formQuota}
                    onChange={(e) => setFormQuota(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 text-slate-800 bg-slate-50/50 hover:bg-white transition"
                    required
                  />
                </div>
              </div>

              {/* Timer Toggle */}
              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formHasTimer}
                    onChange={(e) => setFormHasTimer(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    Gunakan Batasan Waktu (Timer Pengerjaan)
                  </span>
                </label>

                {formHasTimer && (
                  <div className="mt-3 pl-6">
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Durasi Waktu Pengerjaan (Menit):
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="180"
                      value={formTimerMinutes}
                      onChange={(e) => setFormTimerMinutes(Number(e.target.value))}
                      className="w-32 px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-800"
                    />
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewSessionModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isCreatingSession}
                  className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-medium transition shadow-xs disabled:opacity-50"
                >
                  {isCreatingSession ? 'Membuat...' : 'Generate Sesi & Token'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DETAIL RESPONDEN & BREAKDOWN SKOR */}
      {/* ========================================================================= */}
      {detailToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-3xl w-full max-h-[92vh] overflow-y-auto p-6 space-y-6">
            {/* Modal Header: Judul Laporan Mental Health Check Up */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#55674D] bg-[#F4F1EA] px-2.5 py-1 rounded border border-[#E6DEC8]">
                  Laporan Mental Health Check Up
                </span>
                <h3 className="font-extrabold text-slate-900 text-xl mt-2">
                  {detailToken.client_biodata?.fullName || 'Detail Responden'}
                </h3>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 font-mono">
                  <span>Token: {detailToken.token}</span>
                  <span>&bull;</span>
                  <span>Sesi: {currentSession?.title}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Instant Direct Download Button */}
                <button
                  onClick={() => {
                    if (currentSession) downloadClinicalPdfReport(detailToken, currentSession);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition shadow-xs"
                  title={`Unduh file: Mental Health Check Up - ${detailToken.client_biodata?.fullName || 'Peserta'}.pdf`}
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>

                <button
                  onClick={() => setDetailToken(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Identitas Diri */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Identitas Diri
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl text-xs text-slate-700 border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[11px]">Jenis Kelamin</span>
                  <span className="font-medium">{detailToken.client_biodata?.gender || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Usia Terhitung</span>
                  <span className="font-medium">{detailToken.client_biodata?.calculatedAge || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Tempat, Tanggal Lahir</span>
                  <span className="font-medium">
                    {detailToken.client_biodata?.birthPlace || '-'},{' '}
                    {detailToken.client_biodata?.birthDate || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Pendidikan Terakhir</span>
                  <span className="font-medium">{detailToken.client_biodata?.lastEducation || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Pekerjaan</span>
                  <span className="font-medium">{detailToken.client_biodata?.occupation || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Tanggal Pemeriksaan</span>
                  <span className="font-medium">{detailToken.client_biodata?.examDate || '-'}</span>
                </div>
              </div>
            </div>

            {/* Tujuan Pemeriksaan */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Tujuan Pemeriksaan
              </h4>
              <div className="bg-[#FAF7F2] border border-[#EBE3D5] rounded-xl p-3.5 text-xs text-slate-700 leading-relaxed">
                {currentSession?.examination_purpose ||
                  'Pemeriksaan profil kesehatan mental dan kondisi emosional individu.'}
              </div>
            </div>

            {/* Hasil Pemeriksaan 3 Dimensi */}
            {detailToken.scores ? (
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Hasil Pengukuran 3 Dimensi
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Stres */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-1.5">
                    <p className="text-xs font-bold text-slate-800">Skala Stres</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-slate-900">
                        {detailToken.scores.stress.score}
                      </span>
                      <span className="text-xs text-slate-400">/ 42</span>
                    </div>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold ${
                        SEVERITY_COLORS[detailToken.scores.stress.level].bg
                      } ${SEVERITY_COLORS[detailToken.scores.stress.level].text}`}
                    >
                      {detailToken.scores.stress.level}
                    </span>
                  </div>

                  {/* Depresi */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-1.5">
                    <p className="text-xs font-bold text-slate-800">Skala Depresi</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-slate-900">
                        {detailToken.scores.depression.score}
                      </span>
                      <span className="text-xs text-slate-400">/ 42</span>
                    </div>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold ${
                        SEVERITY_COLORS[detailToken.scores.depression.level].bg
                      } ${SEVERITY_COLORS[detailToken.scores.depression.level].text}`}
                    >
                      {detailToken.scores.depression.level}
                    </span>
                  </div>

                  {/* Kecemasan */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-1.5">
                    <p className="text-xs font-bold text-slate-800">Skala Kecemasan</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-slate-900">
                        {detailToken.scores.anxiety.score}
                      </span>
                      <span className="text-xs text-slate-400">/ 42</span>
                    </div>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold ${
                        SEVERITY_COLORS[detailToken.scores.anxiety.level].bg
                      } ${SEVERITY_COLORS[detailToken.scores.anxiety.level].text}`}
                    >
                      {detailToken.scores.anxiety.level}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Peserta belum menyelesaikan kuesioner.</p>
            )}

            {/* SEKSI KESIMPULAN DAN REKOMENDASI (Dapat diisi & disimpan) */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#55674D] uppercase tracking-wider">
                  Kesimpulan dan Rekomendasi (Tercantum di PDF)
                </h4>
                <button
                  type="button"
                  onClick={handleGenerateDraftRecommendation}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-[11px] font-medium transition"
                  title="Buat draf rekomendasi klinis otomatis berdasarkan skor"
                >
                  <Wand2 className="w-3 h-3" />
                  <span>Draf Rekomendasi Otomatis</span>
                </button>
              </div>

              <textarea
                rows={5}
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                placeholder="Tuliskan catatan kesimpulan psikologis dan rekomendasi tindakan/konseling untuk peserta ini..."
                className="w-full p-3.5 text-xs rounded-xl border border-slate-300 text-slate-800 bg-[#FAF7F2] focus:bg-white transition leading-relaxed"
              />

              <div className="flex items-center justify-between pt-1">
                {notesSaveSuccess ? (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
                    <Check className="w-3.5 h-3.5" />
                    Kesimpulan & rekomendasi berhasil disimpan.
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400">
                    Catatan ini akan langsung tampil pada halaman 3 laporan PDF resmi.
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-medium transition shadow-xs disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingNotes ? 'Menyimpan...' : 'Simpan Kesimpulan'}</span>
                </button>
              </div>
            </div>

            {/* Answer Item Audit */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Rincian Jawaban Butir Soal (1 - 42)
              </h4>
              <div className="grid grid-cols-6 sm:grid-cols-7 gap-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100 max-h-36 overflow-y-auto">
                {DASS_QUESTIONS.map((q) => {
                  const val = detailToken.answers[q.id];
                  return (
                    <div
                      key={q.id}
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-center"
                      title={`${q.id}. ${q.text}`}
                    >
                      <span className="block text-[10px] text-slate-400">No. {q.id}</span>
                      <span className="font-bold text-xs text-purple-700">
                        {val !== undefined ? val : '-'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center border-t border-slate-100">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (currentSession) downloadClinicalPdfReport(detailToken, currentSession);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition shadow-xs"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Download PDF Langsung</span>
                </button>
              </div>

              <button
                onClick={() => setDetailToken(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-medium hover:bg-slate-800"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DAFTAR TOKEN & BAGIKAN */}
      {/* ========================================================================= */}
      {isTokenListModalOpen && currentSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Daftar Token & Bagikan ke Peserta
                </h3>
                <p className="text-xs text-slate-500">Sesi: {currentSession.title}</p>
              </div>
              <button
                onClick={() => setIsTokenListModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {currentSession.tokens.map((t, idx) => {
                return (
                  <div
                    key={t.token}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 text-slate-400 font-mono text-center">
                        {idx + 1}.
                      </span>
                      <span className="font-mono font-bold text-purple-700 bg-white px-2 py-0.5 rounded border border-purple-200">
                        {t.token}
                      </span>
                      <span className="text-slate-600 truncate max-w-xs">
                        {t.client_biodata?.fullName || '(Belum digunakan)'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* WhatsApp Button */}
                      <button
                        onClick={() =>
                          handleShareWhatsApp(t.token, t.client_biodata?.fullName)
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-medium transition"
                      >
                        <svg
                          className="w-3 h-3 fill-current text-emerald-600"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.699c.981.536 1.771.84 2.796.841h.005c3.181 0 5.767-2.586 5.768-5.766 0-3.18-2.586-5.827-5.773-5.827zm3.376 8.21c-.149.42-.871.78-1.209.829-.338.049-.78.075-2.227-.521-1.745-.722-2.883-2.493-2.97-2.61-.088-.117-.704-.937-.704-1.787 0-.85.441-1.267.599-1.442.158-.175.347-.219.463-.219.116 0 .232.001.332.006.105.006.246-.04.385.292.143.342.49 1.196.533 1.284.043.088.072.19.014.307-.058.117-.087.19-.174.292-.087.102-.183.228-.261.307-.088.087-.18.181-.077.357.102.175.454.748.974 1.212.671.597 1.236.782 1.411.87.175.088.277.073.379-.044.103-.117.439-.511.556-.687.117-.175.234-.146.394-.088.16.058 1.02.481 1.195.569.175.088.292.131.335.204.044.073.044.423-.105.843z" />
                        </svg>
                        <span>WhatsApp</span>
                      </button>

                      {/* Telegram Button */}
                      <button
                        onClick={() =>
                          handleShareTelegram(t.token, t.client_biodata?.fullName)
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-[11px] font-medium transition"
                      >
                        <svg
                          className="w-3 h-3 fill-current text-sky-600"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                        </svg>
                        <span>Telegram</span>
                      </button>

                      {/* Copy Link */}
                      <button
                        onClick={() => handleCopyLink(t.token)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-slate-200 hover:border-purple-300 text-slate-700 text-[11px] transition"
                        title="Salin tautan"
                      >
                        {copiedToken === t.token ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cetak Halaman
              </button>
              <button
                onClick={() => setIsTokenListModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-purple-700 text-white text-xs font-medium hover:bg-purple-800"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PRATINJAU & CETAK LAPORAN PDF RESMI CANVA */}
      {/* ========================================================================= */}
      {pdfReportToken && currentSession && (
        <ClinicalReportPdfView
          tokenRecord={pdfReportToken}
          session={currentSession}
          onClose={() => setPdfReportToken(null)}
        />
      )}
    </div>
  );
};
