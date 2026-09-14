import React, { useState, useEffect } from 'react';
import { KeyRound, ArrowRight, AlertCircle, Shield, Heart, MessageCircle, ExternalLink } from 'lucide-react';
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


// Sample recent Instagram post updates from @antarapsychology
const INSTAGRAM_POSTS = [
  {
    id: 1,
    category: 'Edukasi Emosi',
    title: 'Mengenali Perbedaan Antara Stres Wajar vs Kelelahan Mental (Burnout)',
    snippet: 'Kapan rasa lelah tidak lagi sekadar butuh tidur, melainkan jeda dan penanganan profesional?',
    date: '2 hari lalu',
    likes: 348,
    comments: 24,
    link: 'https://www.instagram.com/antarapsychology/',
  },
  {
    id: 2,
    category: 'Self-Care Klinis',
    title: '5 Langkah Praktis Mengurai Rasa Cemas yang Datang Tiba-Tiba',
    snippet: 'Teknik grounding 5-4-3-2-1 dan pernapasan diafragma yang dapat Anda lakukan di mana saja.',
    date: '5 hari lalu',
    likes: 512,
    comments: 41,
    link: 'https://www.instagram.com/antarapsychology/',
  },
  {
    id: 3,
    category: 'Konseling & Tes',
    title: 'Mengapa Pemeriksaan Kesehatan Mental Berkala Penting Bagi Mahasiswa & Pekerja?',
    snippet: 'Mengetahui kondisi emosional dini membantu kita mengambil keputusan hidup dengan lebih jernih.',
    date: '1 minggu lalu',
    likes: 429,
    comments: 32,
    link: 'https://www.instagram.com/antarapsychology/',
  },
];

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
          'Token ini sudah digunakan dan tes telah selesai dikirim. Terima kasih atas partisipasi Anda.'
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

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 sm:py-16">
      <div className="w-full max-w-xl">
        {/* Intro Branding Header (Tanpa Bintang/AI Generik) */}
        <div className="text-center mb-8">
          {/* Logo Gambar PNG/WebP Resmi Antara Psychology - Desain Bulat */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white border-2 border-slate-200/90 p-1 shadow-sm mb-4 overflow-hidden">
            <img
              src={settings.logoUrl || '/logo.png'}
              alt={settings.brandName}
              className="w-full h-full object-contain rounded-full"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-2">
            Antara Psychology
          </h1>
          <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            Selamat datang di sistem asesmen psikotes online. Masukkan kode token unik pemeriksaan Anda di bawah ini.
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="tokenInput"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2"
              >
                Kode Token
              </label>
              <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-slate-50/50 hover:bg-white focus-within:bg-white focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-100 transition duration-150">
                <div className="flex items-center gap-1.5 pl-3.5 pr-3 bg-slate-100/90 border-r border-slate-200 text-slate-700 font-mono font-bold text-base select-none shrink-0">
                  <KeyRound className="w-4 h-4 text-slate-400" />
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
                  placeholder="7K9P"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full px-4 py-3 text-slate-800 placeholder-slate-300 font-mono text-base sm:text-lg uppercase tracking-widest bg-transparent focus:outline-none"
                />
              </div>
            </div>

            {/* Error message alert */}
            {errorMessage && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm animate-in fade-in-50 duration-200">
                <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                <p className="leading-snug">{errorMessage}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !tokenInput.trim()}
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 active:bg-purple-900 text-white font-medium text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow"
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
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span>Kerahasiaan data terlindungi standar privasi klinis</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SEKSI UPDATE INSTAGRAM ANTARA PSYCHOLOGY */}
        {/* ========================================================================= */}
        <div className="mt-12 pt-8 border-t border-slate-200/80">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-xs">
                <InstagramIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span>@{settings.instagramUsername || 'antarapsychology'}</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Update & Edukasi Kesehatan Mental Terkini
                </p>
              </div>
            </div>

            <a
              href={`https://www.instagram.com/${settings.instagramUsername || 'antarapsychology'}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-medium text-slate-700 transition shadow-xs hover:border-slate-300"
            >
              <span>Kunjungi IG</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </div>

          {/* Grid Feed Postingan */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {INSTAGRAM_POSTS.map((post) => (
              <a
                key={post.id}
                href={post.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-white rounded-xl border border-slate-200 p-4 transition-all duration-150 hover:border-purple-300 hover:shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] text-purple-700 font-semibold mb-2">
                    <span className="bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                      {post.category}
                    </span>
                    <span className="text-slate-400 font-normal">{post.date}</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 group-hover:text-purple-700 transition line-clamp-2 mb-1.5">
                    {post.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 line-clamp-3 leading-relaxed">
                    {post.snippet}
                  </p>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3 text-rose-500" />
                      {post.likes}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3 text-slate-400" />
                      {post.comments}
                    </span>
                  </div>
                  <span className="text-purple-600 font-medium group-hover:underline">
                    Baca post &rarr;
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
