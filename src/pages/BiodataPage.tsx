import React, { useState, useEffect, useMemo } from 'react';
import { User, Calendar, MapPin, Briefcase, GraduationCap, ArrowRight, ArrowLeft } from 'lucide-react';
import { TokenRecord, TestSession, ClientBiodata, Gender, Education } from '../types';
import { saveClientBiodata } from '../lib/supabaseClient';

interface BiodataPageProps {
  tokenRecord: TokenRecord;
  session: TestSession;
  onBiodataSubmitted: (updatedToken: TokenRecord) => void;
  onBack: () => void;
}

export function calculateDetailedAge(birthDateStr: string, examDateStr: string): string {
  if (!birthDateStr || !examDateStr) return '';
  const birth = new Date(birthDateStr);
  const exam = new Date(examDateStr);
  if (isNaN(birth.getTime()) || isNaN(exam.getTime()) || exam < birth) {
    return '';
  }

  let years = exam.getFullYear() - birth.getFullYear();
  let months = exam.getMonth() - birth.getMonth();
  let days = exam.getDate() - birth.getDate();

  if (days < 0) {
    months -= 1;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years < 0) return '';
  return `${years} tahun ${months} bulan`;
}

export const BiodataPage: React.FC<BiodataPageProps> = ({
  tokenRecord,
  session,
  onBiodataSubmitted,
  onBack,
}) => {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const [fullName, setFullName] = useState(tokenRecord.client_biodata?.fullName || '');
  const [gender, setGender] = useState<Gender>(tokenRecord.client_biodata?.gender || 'Laki-laki');
  const [examDate, setExamDate] = useState(tokenRecord.client_biodata?.examDate || todayStr);
  const [birthPlace, setBirthPlace] = useState(tokenRecord.client_biodata?.birthPlace || '');
  const [birthDate, setBirthDate] = useState(tokenRecord.client_biodata?.birthDate || '');
  const [lastEducation, setLastEducation] = useState<Education>(
    tokenRecord.client_biodata?.lastEducation || 'S1'
  );
  const [occupation, setOccupation] = useState(tokenRecord.client_biodata?.occupation || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Dynamic real-time calculation of age
  const calculatedAge = useMemo(() => {
    return calculateDetailedAge(birthDate, examDate);
  }, [birthDate, examDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      setValidationError('Silakan masukkan Nama Lengkap Anda.');
      return;
    }
    if (!birthPlace.trim()) {
      setValidationError('Silakan masukkan Tempat Lahir Anda.');
      return;
    }
    if (!birthDate) {
      setValidationError('Silakan pilih Tanggal Lahir Anda.');
      return;
    }
    if (!occupation.trim()) {
      setValidationError('Silakan isi Pekerjaan atau Status Anda saat ini.');
      return;
    }

    setIsSubmitting(true);
    setValidationError(null);

    const biodata: ClientBiodata = {
      fullName: fullName.trim(),
      gender,
      examDate,
      birthPlace: birthPlace.trim(),
      birthDate,
      calculatedAge: calculatedAge || '-',
      lastEducation,
      occupation: occupation.trim(),
    };

    try {
      const result = await saveClientBiodata(tokenRecord.token, biodata);
      if (!result.success) {
        setValidationError(result.error || 'Gagal menyimpan biodata.');
        setIsSubmitting(false);
        return;
      }

      const updatedToken: TokenRecord = {
        ...tokenRecord,
        client_biodata: biodata,
        status: 'SEDANG_MENGERJAKAN',
      };

      onBiodataSubmitted(updatedToken);
    } catch {
      setValidationError('Terjadi kesalahan koneksi saat menyimpan biodata.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 py-10 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        {/* Top navigation back */}
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Verifikasi Token</span>
        </button>

        {/* Card Header Info */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-200/80">
                Sesi: {session.title}
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-2">
                Formulir Data Diri Peserta
              </h2>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block font-mono">Kode Token</span>
              <span className="text-xs sm:text-sm font-mono font-semibold text-slate-700 bg-white px-2.5 py-1 rounded border border-slate-200">
                {tokenRecord.token}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
            {/* Field: Nama Lengkap */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Nama Lengkap <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Masukkan nama lengkap sesuai identitas resmi"
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-800 placeholder-slate-400 bg-slate-50/50 hover:bg-white transition"
                  required
                />
              </div>
            </div>

            {/* Field: Jenis Kelamin */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Jenis Kelamin <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(['Laki-laki', 'Perempuan'] as Gender[]).map((g) => {
                  const isChecked = gender === g;
                  return (
                    <label
                      key={g}
                      className={`flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border cursor-pointer select-none transition-all text-sm font-medium ${
                        isChecked
                          ? 'border-purple-600 bg-purple-50/50 text-purple-900 shadow-xs'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="gender"
                        value={g}
                        checked={isChecked}
                        onChange={() => setGender(g)}
                        className="sr-only"
                      />
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isChecked ? 'border-purple-600 bg-white' : 'border-slate-300'
                        }`}
                      >
                        {isChecked && <div className="w-2 h-2 rounded-full bg-purple-600" />}
                      </div>
                      <span>{g}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Row: Tanggal Pemeriksaan & Tempat Lahir */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Tanggal Pemeriksaan <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <input
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-800 bg-slate-50/50 hover:bg-white transition"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Tempat Lahir <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={birthPlace}
                    onChange={(e) => setBirthPlace(e.target.value)}
                    placeholder="Contoh: Jakarta"
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-800 placeholder-slate-400 bg-slate-50/50 hover:bg-white transition"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Row: Tanggal Lahir & Usia (Dihitung Otomatis) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Tanggal Lahir <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    max={examDate}
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-800 bg-slate-50/50 hover:bg-white transition"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Usia <span className="text-slate-400 font-normal lowercase">(otomatis terhitung)</span>
                </label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={calculatedAge ? calculatedAge : 'Pilih tanggal lahir'}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-100 text-slate-700 font-medium cursor-not-allowed select-none"
                />
              </div>
            </div>

            {/* Row: Pendidikan Terakhir & Pekerjaan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Pendidikan Terakhir <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <select
                    value={lastEducation}
                    onChange={(e) => setLastEducation(e.target.value as Education)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-800 bg-slate-50/50 hover:bg-white transition appearance-none cursor-pointer"
                  >
                    <option value="SD">SD</option>
                    <option value="SMP">SMP</option>
                    <option value="SMA/SMK">SMA / SMK</option>
                    <option value="D3">Diploma (D3)</option>
                    <option value="S1">Sarjana (S1)</option>
                    <option value="S2">Magister (S2)</option>
                    <option value="S3">Doktoral (S3)</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Pekerjaan / Instansi <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    placeholder="Contoh: Mahasiswa / Karyawan Swasta"
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-800 placeholder-slate-400 bg-slate-50/50 hover:bg-white transition"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Error Message */}
            {validationError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm">
                {validationError}
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-purple-700 hover:bg-purple-800 active:bg-purple-900 text-white font-medium text-sm transition shadow-sm hover:shadow"
              >
                {isSubmitting ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Lanjut ke Instruksi Tes</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
