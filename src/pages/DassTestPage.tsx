import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Send, CheckCircle2, Cloud, AlertCircle, HelpCircle, FileText } from 'lucide-react';
import { TokenRecord, TestSession } from '../types';
import { DASS_QUESTIONS, DASS_INSTRUCTIONS, calculateDassScores } from '../data/dassData';
import { autosaveAnswers, submitDassAnswers } from '../lib/supabaseClient';
import { DassRadioGroup } from '../components/ui/DassRadioGroup';
import { TimerBanner } from '../components/TimerBanner';

interface DassTestPageProps {
  tokenRecord: TokenRecord;
  session: TestSession;
  onTestSubmitted: (updatedToken: TokenRecord) => void;
}

export const DassTestPage: React.FC<DassTestPageProps> = ({
  tokenRecord,
  session,
  onTestSubmitted,
}) => {
  // Load existing answers if available
  const [answers, setAnswers] = useState<Record<number, number>>(tokenRecord.answers || {});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('saved');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unansweredList, setUnansweredList] = useState<number[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Debounced autosave ref
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const answeredCount = useMemo(() => {
    return Object.keys(answers).length;
  }, [answers]);

  const progressPercentage = Math.round((answeredCount / DASS_QUESTIONS.length) * 100);

  // Trigger debounced autosave whenever answers change
  const handleAnswerChange = useCallback(
    (questionId: number, score: number) => {
      setAnswers((prev) => {
        const next = { ...prev, [questionId]: score };
        setSaveStatus('saving');

        if (autosaveTimeoutRef.current) {
          clearTimeout(autosaveTimeoutRef.current);
        }

        autosaveTimeoutRef.current = setTimeout(async () => {
          try {
            await autosaveAnswers(tokenRecord.token, next);
            setSaveStatus('saved');
          } catch {
            setSaveStatus('idle');
          }
        }, 600);

        return next;
      });

      // Clear from unanswered list if present
      setUnansweredList((prev) => prev.filter((id) => id !== questionId));
    },
    [tokenRecord.token]
  );

  // Handle final submission
  const executeSubmit = async (forced = false) => {
    // Check if all 42 are answered
    const unanswered: number[] = [];
    for (const q of DASS_QUESTIONS) {
      if (answers[q.id] === undefined) {
        unanswered.push(q.id);
      }
    }

    if (unanswered.length > 0 && !forced) {
      setUnansweredList(unanswered);
      setSubmitError(
        `Masih terdapat ${unanswered.length} butir pertanyaan yang belum diisi. Mohon lengkapi seluruh pertanyaan sebelum mengirimkan kuesioner.`
      );
      // Scroll to the first unanswered question
      const firstUnansweredEl = document.getElementById(`q-${unanswered[0]}-opt-0`);
      if (firstUnansweredEl) {
        firstUnansweredEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const scores = calculateDassScores(answers);

    try {
      const result = await submitDassAnswers(tokenRecord.token, answers, scores);
      if (!result.success) {
        setSubmitError(result.error || 'Gagal mengirimkan jawaban.');
        setIsSubmitting(false);
        return;
      }

      const updatedToken: TokenRecord = {
        ...tokenRecord,
        answers,
        scores,
        status: 'SELESAI',
        submitted_at: new Date().toISOString(),
      };

      onTestSubmitted(updatedToken);
    } catch {
      setSubmitError('Terjadi kendala jaringan saat mengirim tes. Silakan coba kembali.');
      setIsSubmitting(false);
    }
  };

  // Handler for timer expiration
  const handleTimerExpired = () => {
    executeSubmit(true);
  };

  return (
    <div className="flex-1 pb-16">
      {/* Optional Timer Banner */}
      {session.has_timer && session.timer_minutes && (
        <TimerBanner totalMinutes={session.timer_minutes} onExpire={handleTimerExpired} />
      )}

      {/* Floating Mini Status / Progress Bar */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-slate-200/80 shadow-xs px-4 py-2.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-800">
              Dijawab: {answeredCount} dari {DASS_QUESTIONS.length}
            </span>
            <div className="w-24 sm:w-36 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div
                className="h-full bg-purple-600 transition-all duration-300 rounded-full"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <span className="font-medium text-slate-500">{progressPercentage}%</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Cloud className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">
              {saveStatus === 'saving' ? 'Menyimpan...' : 'Tersimpan otomatis'}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 space-y-8">
        {/* 1. KOTAK INSTRUKSI VERBATIM */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-5">
          <div className="border-b border-slate-100 pb-4">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-200 mb-2">
              <FileText className="w-3.5 h-3.5" />
              <span>Kuesioner Pemeriksaan</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {DASS_INSTRUCTIONS.title}
            </h1>
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-500 mt-1">
              {DASS_INSTRUCTIONS.subtitle}
            </p>
          </div>

          <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
            {DASS_INSTRUCTIONS.intro}
          </p>

          {/* List Skala 0 - 3 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-50/70 p-4 rounded-xl border border-slate-200/70">
            {DASS_INSTRUCTIONS.scales.map((s) => (
              <div key={s.code} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700">
                <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-purple-200">
                  {s.code}
                </span>
                <span>
                  <strong className="text-slate-900">{s.code}</strong> : {s.text}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-3 pt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <p>
              Selanjutnya, Bapak/Ibu/Saudara diminta untuk menjawab dengan cara memilih pada salah satu alternatif jawaban yang paling sesuai dengan pengalaman Bapak/Ibu/Saudara{' '}
              <strong className="text-slate-900 font-semibold underline decoration-purple-400 decoration-2">
                selama satu minggu belakangan ini
              </strong>
              .
            </p>
            <p className="bg-amber-50/60 border border-amber-200/70 p-3 rounded-lg text-amber-900">
              <strong>Tidak ada jawaban yang benar ataupun salah</strong>, karena itu{' '}
              <strong>isilah sesuai dengan keadaan diri</strong> Bapak/Ibu/Saudara yang sesungguhnya, yaitu berdasarkan{' '}
              <strong>jawaban pertama yang terlintas dalam pikiran</strong> Bapak/Ibu/Saudara.
            </p>
          </div>
        </div>

        {/* 2. DAFTAR 42 BUTIR PERTANYAAN */}
        <div className="space-y-4">
          {DASS_QUESTIONS.map((q) => {
            const isUnanswered = unansweredList.includes(q.id);
            return (
              <div
                key={q.id}
                id={`question-box-${q.id}`}
                className={isUnanswered ? 'ring-2 ring-rose-400 rounded-xl' : ''}
              >
                <DassRadioGroup
                  questionId={q.id}
                  questionText={q.text}
                  selectedValue={answers[q.id]}
                  onChange={(val) => handleAnswerChange(q.id, val)}
                  required
                />
              </div>
            );
          })}
        </div>

        {/* 3. KOTAK PENUTUP & DISCLAIMER */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm tracking-wider uppercase">
            <HelpCircle className="w-4 h-4 text-purple-600" />
            <span>PENUTUP</span>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">
            Hasil dari kuesioner ini{' '}
            <strong className="text-slate-900">bukan merupakan DIAGNOSA</strong>, tetapi hanya mengukur kondisi emosional negatif yang dirasakan selama satu minggu belakangan.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            {DASS_INSTRUCTIONS.closingFollowUp}
          </p>
        </div>

        {/* Submit Error alert */}
        {submitError && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{submitError}</p>
          </div>
        )}

        {/* Tombol Kirim Jawaban */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            {answeredCount === DASS_QUESTIONS.length ? (
              <span className="text-emerald-700 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Seluruh 42 pertanyaan telah terisi. Siap untuk dikirim.
              </span>
            ) : (
              <span>
                Tersisa {DASS_QUESTIONS.length - answeredCount} butir pertanyaan yang belum diisi.
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => executeSubmit(false)}
            disabled={isSubmitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 py-3.5 px-8 rounded-xl bg-purple-700 hover:bg-purple-800 active:bg-purple-900 text-white font-medium text-base transition shadow-sm hover:shadow disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Kirim Seluruh Jawaban</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
