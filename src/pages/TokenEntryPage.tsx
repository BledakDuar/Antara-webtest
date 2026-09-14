import React, { useState, useEffect } from 'react';
import { KeyRound, ArrowRight, AlertCircle, Shield, ExternalLink, Link2 } from 'lucide-react';
import { validateToken } from '../lib/supabaseClient';
import { TokenRecord, TestSession } from '../types';
import { getSiteSettings, SiteSettings } from '../lib/siteSettings';

const InstagramIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

interface TokenEntryPageProps {
  onTokenVerified: (tokenRecord: TokenRecord, session: TestSession) => void;
  initialToken?: string;
}

export const TokenEntryPage: React.FC<TokenEntryPageProps> = ({
  onTokenVerified,
  initialToken = '',
}) => {
  const [tokenInput, setTokenInput] = useState<string>(initialToken);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [settings, setSettings] = useState<SiteSettings>(getSiteSettings());

  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e.detail) setSettings(e.detail);
      else setSettings(getSiteSettings());
    };
    window.addEventListener('antara_settings_updated', handleUpdate);
    return () => window.removeEventListener('antara_settings_updated', handleUpdate);
  }, []);

  // Auto-fill from URL query param if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      const suffix = urlToken.trim().toUpperCase().replace(/^ANT-?/i, '').slice(0, 4);
      setTokenInput(suffix);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawSuffix = tokenInput.trim().toUpperCase().replace(/^ANT-?/i, '').replace(/[^A-Z0-9]/g, '');

    if (!rawSuffix) {
      setErrorMessage('Silakan masukkan 4 karakter kode token unik Anda.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const fullToken = `ANT-${rawSuffix}`;

    try {
      let result = await validateToken(fullToken);

      // Fallback check in case token in DB is stored without ANT- prefix
      if ((result.error || !result.tokenRecord) && rawSuffix.length > 0) {
        const fallbackResult = await validateToken(rawSuffix);
        if (fallbackResult.tokenRecord && fallbackResult.session) {
          result = fallbackResult;
        }
      }

      if (result.error || !result.tokenRecord || !result.session) {
        setErrorMessage(result.error || 'Kode token tidak valid atau tidak ditemukan.');
        setIsLoading(false);
        return;
      }

      if (result.tokenRecord.status === 'SELESAI') {
        setErrorMessage(
          'Token ini sudah expired karena tes telah selesai dikerjakan secara lengkap. Token tidak dapat digunakan lagi untuk masuk ke sesi tes.'
        );
        setIsLoading(false);
        return;
      }

      onTokenVerified(result.tokenRecord, result.session);
    } catch {
      setErrorMessage('Terjadi kendala saat memeriksa token. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  // Load Behold Instagram Widget Script
  useEffect(() => {
    if ((window as any)._bhldScript) return;
    (window as any)._bhldScript = true;
    const d = document,
      s = d.createElement('script');
    s.type = 'module';
    s.src = 'https://w.behold.so/widget.js';
    setTimeout(() => {
      d.head.append(s);
    }, 0);
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 sm:py-14">
      <div className="w-full max-w-md">
        {/* Intro Branding Header (Tanpa Bintang/AI Generik) */}
        <div className="text-center mb-6">
          {/* Logo Gambar PNG/WebP Resmi Antara Psychology - Desain Bulat */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white border-2 border-slate-200/90 p-1 shadow-sm mb-3.5 overflow-hidden">
            <img
              src={settings.logoUrl || '/logo.png'}
              alt={settings.brandName}
              className="w-full h-full object-contain rounded-full"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-1.5">
            Antara Psychology
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
            Selamat datang di sistem asesmen psikotes online. Masukkan kode token unik pemeriksaan Anda di bawah ini.
          </p>
        </div>

        {/* Card Form: Ramping & Rapi */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-5 sm:p-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="tokenInput"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5"
              >
                Kode Token
              </label>
              <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-slate-50/50 hover:bg-white focus-within:bg-white focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-100 transition duration-150">
                <div className="flex items-center gap-1.5 pl-3 pr-2.5 bg-slate-100/90 border-r border-slate-200 text-slate-700 font-mono font-bold text-sm sm:text-base select-none shrink-0">
                  <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                  <span>ANT-</span>
                </div>
                <input
                  id="tokenInput"
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
                  className="w-full px-3 py-2.5 text-slate-800 placeholder-slate-300 font-mono text-base sm:text-lg uppercase tracking-widest bg-transparent focus:outline-none"
                />
              </div>
            </div>

            {/* Error message alert */}
            {errorMessage && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs animate-in fade-in-50 duration-200">
                <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                <p className="leading-snug">{errorMessage}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !tokenInput.trim()}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 active:bg-purple-900 text-white font-medium text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs hover:shadow"
            >
              {isLoading ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Mulai Pemeriksaan</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Clinical Assurance Note */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span>Kerahasiaan data terlindungi standar privasi klinis</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SEKSI UPDATE INSTAGRAM ANTARA PSYCHOLOGY VIA BEHOLD WIDGET */}
        {/* ========================================================================= */}
        <div className="mt-10 pt-8 border-t border-slate-200/80">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3.5 mb-4 bg-slate-50/80 p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-start gap-3 min-w-0">
              {/* Logo Profil Instagram Asli Antara Psychology - Desain Bulat */}
              <div className="relative shrink-0">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full p-[2px] bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 shadow-xs">
                  <div className="w-full h-full rounded-full bg-white p-0.5 overflow-hidden flex items-center justify-center">
                    <img
                      src={settings.logoUrl || '/logo.png'}
                      alt="Antara Psychology"
                      className="w-full h-full object-contain rounded-full"
                    />
                  </div>
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">
                    Antara Psychology
                  </h3>
                  <span className="text-[11px] font-medium text-slate-400">
                    @{settings.instagramUsername || 'antarapsychology'}
                  </span>
                </div>

                {/* Bio Asli Akun Instagram Antara Psychology */}
                <div className="text-[11px] text-slate-600 mt-1 leading-snug space-y-0.5">
                  <p className="font-medium text-slate-700">Every Growth Starts in Between</p>
                  <p className="text-slate-500">Layanan Psikologi Online/Offline</p>
                </div>

                <div className="mt-1.5 flex items-center gap-1 text-[11px]">
                  <Link2 className="w-3 h-3 text-purple-600 shrink-0" />
                  <a
                    href="https://lynk.id/antarapsychology"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-purple-700 hover:text-purple-800 hover:underline transition-colors"
                  >
                    lynk.id/antarapsychology
                  </a>
                </div>
              </div>
            </div>

            <a
              href={`https://www.instagram.com/${settings.instagramUsername || 'antarapsychology'}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-700 transition shadow-xs hover:border-slate-300 shrink-0 self-start sm:self-auto"
            >
              <InstagramIcon className="w-3.5 h-3.5 text-rose-500" />
              <span>Kunjungi IG</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </div>

          {/* Behold Instagram Live Widget */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-2.5 sm:p-4 shadow-xs overflow-hidden min-h-[160px]">
            <behold-widget feed-id="Ur2tDnmvlaZShOv51QJm"></behold-widget>
          </div>
        </div>
      </div>
    </div>
  );
};
