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
