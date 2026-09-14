import React, { useEffect } from 'react';
import { CheckCircle, ShieldCheck, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { TokenRecord, TestSession } from '../types';

interface CompletionPageProps {
  tokenRecord: TokenRecord;
  session: TestSession;
  onDone: () => void;
}

export const CompletionPage: React.FC<CompletionPageProps> = ({
  tokenRecord,
  session,
  onDone,
}) => {
  useEffect(() => {
    try {
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.6 },
        colors: ['#7C3AED', '#A78BFA', '#DDD6FE', '#C4B5FD'],
      });
    } catch {
      // canvas-confetti fallback
    }
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg text-center space-y-6">
        {/* Success Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-600 shadow-sm animate-in zoom-in-50 duration-300">
          <CheckCircle className="w-10 h-10" />
        </div>

        <div className="space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
            Pemeriksaan Selesai
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-2">
            Terima Kasih, {tokenRecord.client_biodata?.fullName || 'Peserta'}
          </h1>
          <p className="text-sm font-semibold text-purple-900 bg-purple-50/90 border border-purple-200 px-4 py-2.5 rounded-xl max-w-md mx-auto leading-relaxed shadow-2xs">
            Hasil akan diberitahukan lebih lanjut oleh Tim Antara Psychology.
          </p>
          <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
            Seluruh butir kuesioner Anda telah berhasil dikirim dan tersimpan dengan aman di sistem Antara Psychology.
          </p>
        </div>

        {/* Info Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 text-left space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs">
            <span className="text-slate-500">Kode Token:</span>
            <span className="font-mono font-bold text-slate-800">{tokenRecord.token}</span>
          </div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs">
            <span className="text-slate-500">Sesi Asesmen:</span>
            <span className="font-medium text-slate-800">{session.title}</span>
          </div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs">
            <span className="text-slate-500">Waktu Pengiriman:</span>
            <span className="font-medium text-slate-800">
              {tokenRecord.submitted_at
                ? new Date(tokenRecord.submitted_at).toLocaleString('id-ID', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })
                : new Date().toLocaleDateString('id-ID')}
            </span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-600 leading-relaxed flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <p>
              Hasil dari kuesioner ini <strong>bukan merupakan DIAGNOSA tunggal</strong>, melainkan indikator kondisi emosional negatif selama satu minggu belakangan yang akan dianalisis secara komprehensif oleh tim psikolog.
            </p>
          </div>
        </div>

        {/* WhatsApp Confirmation Action */}
        {(() => {
          const namaLengkap = tokenRecord.client_biodata?.fullName || 'Peserta';
          const kodeToken = tokenRecord.token;
          const namaSesi = session.title;
          const tgl = session.test_date || (tokenRecord.submitted_at
            ? new Date(tokenRecord.submitted_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
            : new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }));
          const waMessage = `[ *JANGAN EDIT PESAN INI* ]\n\nHalo saya ${namaLengkap}, saya ingin mengkonfirmasi bahwa telah selesai mengisi kuesioner dengan ${kodeToken}-${namaSesi}-${tgl}.`;
          const waUrl = `https://api.whatsapp.com/send?phone=6285139767220&text=${encodeURIComponent(waMessage)}`;

          return (
            <div className="pt-2 space-y-2">
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-semibold text-sm shadow-sm hover:shadow-md transition"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                </svg>
                <span>Konfirmasi ke WhatsApp Admin Antara</span>
              </a>
              <p className="text-[11px] text-slate-400 text-center">
                Kirim pesan konfirmasi resmi ke WhatsApp Antara Psychology (+62851-3976-7220)
              </p>
            </div>
          );
        })()}

        <div>
          <button
            onClick={onDone}
            className="inline-flex items-center gap-2 py-3 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium transition shadow-xs hover:shadow"
          >
            <span>Kembali ke Halaman Depan</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
