import React, { useState, useEffect } from 'react';
import { ArrowLeft, AlertCircle, ShieldCheck } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { getSiteSettings, SiteSettings } from '../../lib/siteSettings';

interface AdminLoginPageProps {
  onLoginSuccess: () => void;
  onBackToHome: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onLoginSuccess,
  onBackToHome,
}) => {
  const [settings, setSettings] = useState<SiteSettings>(getSiteSettings());
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const handleUpdate = () => {
      setSettings(getSiteSettings());
    };
    window.addEventListener('antara_settings_updated', handleUpdate);
    return () => window.removeEventListener('antara_settings_updated', handleUpdate);
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/admin`,
          },
        });

        if (error) {
          setErrorMsg(error.message || 'Gagal memulai login dengan Google.');
          setIsLoading(false);
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Gagal masuk dengan Google.');
        setIsLoading(false);
      }
    } else {
      setErrorMsg(
        'Koneksi Supabase belum terkonfigurasi. Pastikan variabel VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY telah aktif.'
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Back Link */}
        <button
          onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Halaman Peserta</span>
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border-2 border-slate-200/90 shadow-sm bg-white p-1.5 overflow-hidden mb-4">
            <img
              src={settings.logoUrl || '/logo.png'}
              alt={settings.brandName || 'Antara Psychology Logo'}
              className="w-full h-full object-contain rounded-full"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">
            Portal Administrator
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Masuk untuk memantau sesi tes, token peserta, dan hasil asesmen klinis secara realtime.
          </p>
        </div>

        {/* Form Card (Google OAuth Only) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-5">
          <div className="text-center space-y-2 pb-2">
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-purple-50 text-purple-700 border border-purple-100 mb-1">
              <ShieldCheck className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">
              Autentikasi Terbatas Google
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
              Akses khusus untuk administrator resmi Antara Psychology yang terdaftar pada sistem whitelist.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full inline-flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 text-sm font-medium transition shadow-xs disabled:opacity-50"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-slate-300 border-t-purple-600 rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Masuk dengan Akun Google</span>
              </>
            )}
          </button>

          <div className="pt-2 text-center">
            <span className="text-[11px] text-slate-400">
              Terlindungi enkripsi Supabase OAuth & Google Security
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
