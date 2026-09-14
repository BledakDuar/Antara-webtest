import React, { useState, useEffect } from 'react';
import { X, Printer, Download, CheckCircle2, AlertCircle, Sparkles, FileDown } from 'lucide-react';
import { TokenRecord, TestSession } from '../types';
import { generateClinicalPdfReport, downloadClinicalPdfReport, formatDateIndo } from '../lib/pdfGenerator';

interface ClinicalReportPdfViewProps {
  tokenRecord: TokenRecord;
  session: TestSession;
  onClose: () => void;
}

export const ClinicalReportPdfView: React.FC<ClinicalReportPdfViewProps> = ({
  tokenRecord,
  session,
  onClose,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const bio = tokenRecord.client_biodata;
  const scores = tokenRecord.scores;
  const clientName = bio?.fullName?.trim() || 'Peserta';
  const downloadTitle = `Mental Health Check Up - ${clientName}.pdf`;

  // Generate preview PDF via pdf-lib overlay on mount
  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;

    async function loadPdf() {
      try {
        const { blob } = await generateClinicalPdfReport(tokenRecord, session);
        if (active) {
          createdUrl = URL.createObjectURL(blob);
          setPdfPreviewUrl(createdUrl);
        }
      } catch (err: any) {
        console.error('Error generating PDF preview:', err);
        if (active) {
          setErrorMessage(err.message || 'Gagal menghasilkan pratinjau PDF.');
        }
      }
    }

    loadPdf();

    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [tokenRecord, session]);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      await downloadClinicalPdfReport(tokenRecord, session);
    } catch (err: any) {
      alert('Gagal mendownload PDF: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    // Set document title temporarily so browser print to PDF saves as the requested filename
    const oldTitle = document.title;
    document.title = `Mental Health Check Up - ${clientName}`;
    window.print();
    setTimeout(() => {
      document.title = oldTitle;
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      {/* Top Floating Control Bar (Hidden on print) */}
      <div className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800 text-white px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-xl print:hidden">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded border border-emerald-800">
            Laporan Mental Health Check Up
          </span>
          <span className="text-xs sm:text-sm font-medium text-slate-300 hidden sm:inline">
            {clientName} &bull; <span className="font-mono text-purple-400">{tokenRecord.token}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 active:bg-purple-900 text-white text-xs font-semibold transition shadow-md disabled:opacity-50"
            title={`Download PDF: ${downloadTitle}`}
          >
            <FileDown className="w-4 h-4" />
            <span>{isGenerating ? 'Memproses...' : 'Download PDF'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition border border-slate-700"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak</span>
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition ml-2"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Preview Content */}
      <div className="flex-1 py-8 px-4 flex flex-col items-center gap-6 print:p-0">
        {/* If PDF preview is ready, show embedded native PDF viewer */}
        {pdfPreviewUrl ? (
          <div className="w-full max-w-4xl h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-800 print:hidden">
            <iframe
              src={pdfPreviewUrl}
              className="w-full h-full border-0"
              title={downloadTitle}
            />
          </div>
        ) : errorMessage ? (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
            {errorMessage}
          </div>
        ) : (
          <div className="text-white text-xs flex items-center gap-2 py-20">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Menyiapkan pratinjau PDF Canva resmi...</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* DOM PRINT VIEW FALLBACK (Untuk window.print()) */}
        {/* ========================================================================= */}
        <div className="hidden print:block w-full">
          {/* Page 1 */}
          <div className="pdf-page bg-white min-h-screen p-12 flex flex-col justify-between">
            <div className="flex justify-between items-center border-b pb-4">
              <span className="font-bold text-lg text-[#55674D]">ANTARA Psychology</span>
              <span className="border-2 border-rose-600 px-3 py-0.5 font-bold text-rose-600 text-xs">
                RAHASIA
              </span>
            </div>
            <div className="my-auto space-y-4">
              <h1 className="text-4xl font-extrabold text-[#55674D]">
                Laporan Mental Health Check Up
              </h1>
              <div className="w-48 h-2 bg-[#C69C4D]" />
              <p className="text-sm font-semibold text-slate-700 pt-6">
                Tanggal Pemeriksaan: {formatDateIndo(bio?.examDate || session.test_date)}
              </p>
              <p className="text-xs text-slate-600">Peserta: {clientName}</p>
            </div>
            <div className="flex justify-between text-xs text-slate-500 border-t pt-4">
              <span>@antarapsychology</span>
              <span>0851-3976-7220</span>
            </div>
          </div>

          {/* Page 2 */}
          <div className="pdf-page bg-white min-h-screen p-12 flex flex-col justify-between">
            <div className="flex justify-between items-center border-b pb-4">
              <span className="font-bold text-lg text-[#55674D]">ANTARA Psychology</span>
              <span className="border-2 border-rose-600 px-3 py-0.5 font-bold text-rose-600 text-xs">
                RAHASIA
              </span>
            </div>
            <div className="space-y-8 my-auto">
              <div>
                <h3 className="text-sm font-bold text-[#55674D] uppercase mb-2">IDENTITAS DIRI</h3>
                <table className="w-full border text-xs">
                  <tbody>
                    <tr className="border-b">
                      <td className="p-2 w-48 font-semibold bg-slate-50">Nama</td>
                      <td className="p-2">{bio?.fullName || '-'}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-semibold bg-slate-50">Tempat/Tanggal Lahir</td>
                      <td className="p-2">{bio?.birthPlace || '-'}, {formatDateIndo(bio?.birthDate)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-semibold bg-slate-50">Pendidikan Terakhir</td>
                      <td className="p-2">{bio?.lastEducation || '-'}</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-semibold bg-slate-50">Pekerjaan</td>
                      <td className="p-2">{bio?.occupation || '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div>
                <h3 className="text-sm font-bold text-[#55674D] uppercase mb-2">TUJUAN PEMERIKSAAN</h3>
                <div className="border p-4 rounded text-xs bg-slate-50 leading-relaxed">
                  {session.examination_purpose || 'Pemeriksaan profil kesehatan mental dan kondisi emosional individu.'}
                </div>
              </div>
            </div>
            <div className="flex justify-between text-xs text-slate-500 border-t pt-4">
              <span>@antarapsychology</span>
              <span>0851-3976-7220</span>
            </div>
          </div>

          {/* Page 3 */}
          <div className="pdf-page bg-white min-h-screen p-12 flex flex-col justify-between">
            <div className="flex justify-between items-center border-b pb-4">
              <span className="font-bold text-lg text-[#55674D]">ANTARA Psychology</span>
              <span className="border-2 border-rose-600 px-3 py-0.5 font-bold text-rose-600 text-xs">
                RAHASIA
              </span>
            </div>
            <div className="space-y-6 my-auto">
              <div>
                <h3 className="text-sm font-bold text-[#55674D] uppercase mb-2">HASIL PEMERIKSAAN</h3>
                <table className="w-full border text-xs">
                  <tbody>
                    <tr className="border-b">
                      <td className="p-2 w-48 font-semibold bg-slate-50">Stres</td>
                      <td className="p-2 font-bold">{scores ? `${scores.stress.score} (Kategori: ${scores.stress.level})` : '-'}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-semibold bg-slate-50">Depresi</td>
                      <td className="p-2 font-bold">{scores ? `${scores.depression.score} (Kategori: ${scores.depression.level})` : '-'}</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-semibold bg-slate-50">Kecemasan</td>
                      <td className="p-2 font-bold">{scores ? `${scores.anxiety.score} (Kategori: ${scores.anxiety.level})` : '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div>
                <h3 className="text-sm font-bold text-[#55674D] uppercase mb-2">KESIMPULAN DAN REKOMENDASI</h3>
                <div className="border p-4 rounded text-xs bg-slate-50 leading-relaxed whitespace-pre-line">
                  {tokenRecord.notes_conclusion || 'Berdasarkan hasil pemeriksaan penapisan psikometrik, peserta menunjukkan profil kondisi emosional yang telah direkapitulasi di atas. Rekomendasi lanjutan dapat dikoordinasikan lebih mendalam melalui sesi konseling klinis bersama Tim Psikolog Antara Psychology.'}
                </div>
              </div>

              {/* Kotak Penutup dari screenshot gambar 4 */}
              <div className="border border-slate-300 p-4 rounded bg-[#FAF7F2] text-xs space-y-2">
                <p className="font-bold uppercase tracking-wider text-slate-800">PENUTUP</p>
                <p className="text-slate-700 leading-relaxed">
                  Hasil dari kuesioner ini <strong>bukan merupakan DIAGNOSA</strong>, tetapi hanya mengukur kondisi emosional negatif yang dirasakan selama satu minggu belakangan.
                </p>
                <p className="text-slate-600 leading-relaxed font-semibold">
                  Hasil akan diberitahukan lebih lanjut oleh Tim Antara Psychology.
                </p>
              </div>
            </div>
            <div className="flex justify-between text-xs text-slate-500 border-t pt-4">
              <span>@antarapsychology</span>
              <span>0851-3976-7220</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
