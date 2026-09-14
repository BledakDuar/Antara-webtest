import React, { useState, useEffect, useMemo } from 'react';
import { ShieldCheck, FileDown, AlertCircle, ArrowLeft, CheckCircle2, Lock, KeyRound } from 'lucide-react';
import { decryptReportDownloadRef } from '../lib/reportSecurity';
import { validateToken } from '../lib/supabaseClient';
import { downloadClinicalPdfReport } from '../lib/pdfGenerator';
import { TokenRecord, TestSession } from '../types';
import { getSiteSettings, SiteSettings } from '../lib/siteSettings';

interface ClientDownloadPageProps {
  encryptedRef: string;
  onNavigateHome: () => void;
}

export const ClientDownloadPage: React.FC<ClientDownloadPageProps> = ({
  encryptedRef,
  onNavigateHome,
}) => {
  const [tokenInput, setTokenInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [verifiedData, setVerifiedData] = useState<{
    tokenRecord: TokenRecord;
    session: TestSession;
  } | null>(null);
  const [settings, setSettings] = useState<SiteSettings>(getSiteSettings());

  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e.detail) setSettings(e.detail);
      else setSettings(getSiteSettings());
    };
    window.addEventListener('antara_settings_updated', handleUpdate);
    return () => window.removeEventListener('antara_settings_updated', handleUpdate);
  }, []);

  // Dekripsi referensi dari tautan URL
  const payload = useMemo(() => {
    return decryptReportDownloadRef(encryptedRef);
  }, [encryptedRef]);

  // Handle Cooldown Timer
  const isInCooldown = Boolean(cooldownUntil && Date.now() < cooldownUntil);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payload) return;

    if (isInCooldown) {
      const remainingSec = Math.ceil(((cooldownUntil || 0) - Date.now()) / 1000);
      setErrorMessage(`Terlalu banyak percobaan gagal. Silakan tunggu ${remainingSec} detik sebelum mencoba kembali.`);
      return;
    }

    const cleanInput = tokenInput.trim().toUpperCase().replace(/^ANT-?/i, '').replace(/[^A-Z0-9]/g, '');
    const targetSuffix = payload.token.toUpperCase().replace(/^ANT-?/i, '').replace(/[^A-Z0-9]/g, '');

    if (!cleanInput) {
      setErrorMessage('Silakan masukkan 4 karakter kode token unik Anda.');
      return;
    }

    // Verifikasi apakah token yang dimasukkan cocok dengan enkripsi dokumen
    if (cleanInput !== targetSuffix) {
      const nextFailed = failedAttempts + 1;
      setFailedAttempts(nextFailed);

      if (nextFailed >= 5) {
        const cooldown = Date.now() + 60 * 1000;
        setCooldownUntil(cooldown);
        setErrorMessage('Terlalu banyak percobaan yang salah. Akses ditahan selama 60 detik demi keamanan dokumen klinis Anda.');
      } else {
        setErrorMessage(
          `Kode token tidak cocok dengan arsip laporan ini (Sisa percobaan: ${5 - nextFailed}). Pastikan Anda memasukkan kode token unik yang digunakan saat tes.`
        );
      }
      return;
    }

    // Token Cocok! Ambil data lengkap token dan sesi
    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const fullTokenCode = `ANT-${cleanInput}`;
      const res = await validateToken(fullTokenCode);

      if (res.tokenRecord && res.session) {
        setVerifiedData({
          tokenRecord: res.tokenRecord,
          session: res.session,
        });

        // Unduh PDF langsung secara otomatis begitu terverifikasi
        setIsDownloading(true);
        try {
          await downloadClinicalPdfReport(res.tokenRecord, res.session);
        } catch (downloadErr) {
          console.error('Download error:', downloadErr);
        } finally {
          setIsDownloading(false);
        }
      } else {
        setErrorMessage(res.error || 'Data laporan tidak ditemukan di server.');
      }
    } catch {
      setErrorMessage('Terjadi kendala jaringan saat memverifikasi dokumen. Silakan coba kembali.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleManualDownload = async () => {
    if (!verifiedData) return;
    setIsDownloading(true);
    try {
      await downloadClinicalPdfReport(verifiedData.tokenRecord, verifiedData.session);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 sm:py-16">
      <div className="w-full max-w-md">
        {/* Back Link */}
        <button
          onClick={onNavigateHome}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Halaman Beranda</span>
        </button>

        {/* Invalid or Tampered Link Alert */}
        {!payload ? (
          <div className="bg-white rounded-2xl border border-rose-200 shadow-sm p-6 sm:p-8 text-center space-y-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-rose-50 border border-rose-100 text-rose-600 mb-1">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Tautan Unduhan Tidak Valid</h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Tautan download ini telah kedaluwarsa, tidak lengkap, atau telah dimodifikasi demi menjaga keamanan dokumen medis.
            </p>
            <p className="text-xs text-slate-400">
              Silakan hubungi Administrator Antara Psychology melalui WhatsApp (+62851-3976-7220) untuk mendapatkan tautan resmi yang valid.
            </p>
            <div className="pt-2">
              <button
                onClick={onNavigateHome}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold transition"
              >
                Ke Halaman Utama
              </button>
            </div>
          </div>
        ) : verifiedData ? (
          /* Success Verified View */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 text-center space-y-5 animate-in zoom-in-95 duration-200">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 shadow-xs mb-1">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Akses Terverifikasi
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-2">
                Laporan Hasil Siap Diunduh
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Laporan resmi pemeriksaan mental health check up Anda telah dibuat dalam format PDF standar dokumen klinis.
              </p>
            </div>

            {/* Recipient Card */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 text-left space-y-2 text-xs">
              <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                <span className="text-slate-500">Nama Lengkap:</span>
                <span className="font-bold text-slate-800">
                  {verifiedData.tokenRecord.client_biodata?.fullName || 'Peserta'}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                <span className="text-slate-500">Sesi Asesmen:</span>
                <span className="font-medium text-slate-700">{verifiedData.session.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Kode Token:</span>
                <span className="font-mono font-bold text-purple-700">
                  {verifiedData.tokenRecord.token}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-2">
              <button
                onClick={handleManualDownload}
                disabled={isDownloading}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm transition shadow-sm hover:shadow disabled:opacity-50"
              >
                {isDownloading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <FileDown className="w-4 h-4" />
                    <span>Unduh Laporan PDF Resmi</span>
                  </>
                )}
              </button>

              <button
                onClick={onNavigateHome}
                className="w-full inline-flex items-center justify-center py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-600 transition"
              >
                Selesai & Ke Halaman Utama
              </button>
            </div>
          </div>
        ) : (
          /* Form Input Verifikasi Token */
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-5">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-purple-50 border border-purple-100 text-purple-700 mb-1">
                <Lock className="w-7 h-7" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Unduh Laporan Asesmen
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Untuk menjamin kerahasiaan hasil pemeriksaan psikologis Anda, silakan masukkan kode token unik Anda untuk membuka akses file PDF.
              </p>
            </div>

            {/* Security Assurance Banner */}
            <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#EBE3D5] text-[11px] text-[#55674D] flex items-center gap-2 leading-relaxed">
              <ShieldCheck className="w-4 h-4 text-[#55674D] shrink-0" />
              <span>
                Dokumen ini dilindungi enkripsi end-to-end standar privasi klinis Antara Psychology.
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="clientTokenInput"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5"
                >
                  Kode Token Pemeriksaan Anda
                </label>
                <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-slate-50/50 hover:bg-white focus-within:bg-white focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-100 transition duration-150">
                  <div className="flex items-center gap-1.5 pl-3 pr-2.5 bg-slate-100/90 border-r border-slate-200 text-slate-700 font-mono font-bold text-sm sm:text-base select-none shrink-0">
                    <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                    <span>ANT-</span>
                  </div>
                  <input
                    id="clientTokenInput"
                    type="text"
                    maxLength={4}
                    value={tokenInput}
                    onChange={(e) => {
                      let val = e.target.value.toUpperCase().replace(/\s+/g, '');
                      val = val.replace(/^ANT-?/i, '');
                      val = val.replace(/[^A-Z0-9]/g, '').slice(0, 4);
                      setTokenInput(val);
                      setErrorMessage(null);
                    }}
                    placeholder="0000"
                    autoComplete="off"
                    spellCheck={false}
                    disabled={isVerifying || isInCooldown}
                    className="w-full px-3 py-2.5 text-slate-800 placeholder-slate-300 font-mono text-base sm:text-lg uppercase tracking-widest bg-transparent focus:outline-none disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs animate-in fade-in-50 duration-200">
                  <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                  <p className="leading-snug">{errorMessage}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isVerifying || !tokenInput.trim() || isInCooldown}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 active:bg-purple-900 text-white font-medium text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs hover:shadow"
              >
                {isVerifying ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verifikasi & Buka Laporan</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
