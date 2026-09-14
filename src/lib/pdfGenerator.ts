import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont, Color } from 'pdf-lib';
import { TokenRecord, TestSession } from '../types';

export function formatDateIndo(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

interface JustifyOptions {
  startX: number;
  startY: number;
  targetWidth: number;
  fontSize: number;
  lineHeight: number;
  font: PDFFont;
  color: Color;
}

/**
 * Menggambar teks dalam format rata kanan-kiri (Justify) di atas PDF
 * Memenuhi seluruh lebar kolom targetWidth tanpa meninggalkan celah kosong di kanan
 */
function drawJustifiedParagraph(
  page: PDFPage,
  text: string,
  options: JustifyOptions
): number {
  const {
    startX,
    startY,
    targetWidth,
    fontSize,
    lineHeight,
    font,
    color,
  } = options;

  let currentY = startY;
  const spaceW = font.widthOfTextAtSize(' ', fontSize);
  const paragraphs = text.split('\n');

  for (const para of paragraphs) {
    if (!para.trim()) {
      currentY -= lineHeight * 0.7;
      continue;
    }
    const words = para.trim().split(/\s+/);
    const lines: string[][] = [];
    let currentLine: string[] = [];
    let currentLineWidth = 0;

    for (const word of words) {
      const wordW = font.widthOfTextAtSize(word, fontSize);
      const needed = currentLine.length === 0 ? wordW : spaceW + wordW;
      if (currentLine.length > 0 && currentLineWidth + needed > targetWidth) {
        lines.push(currentLine);
        currentLine = [word];
        currentLineWidth = wordW;
      } else {
        currentLine.push(word);
        currentLineWidth += needed;
      }
    }
    if (currentLine.length > 0) lines.push(currentLine);

    lines.forEach((lineWords, lineIdx) => {
      const isLastLine = lineIdx === lines.length - 1;
      if (!isLastLine && lineWords.length > 1) {
        let totalWordsW = 0;
        lineWords.forEach((w) => (totalWordsW += font.widthOfTextAtSize(w, fontSize)));
        const gap = (targetWidth - totalWordsW) / (lineWords.length - 1);
        let curX = startX;
        for (const w of lineWords) {
          page.drawText(w, {
            x: curX,
            y: currentY,
            size: fontSize,
            font,
            color,
          });
          curX += font.widthOfTextAtSize(w, fontSize) + gap;
        }
      } else {
        let curX = startX;
        for (const w of lineWords) {
          page.drawText(w, {
            x: curX,
            y: currentY,
            size: fontSize,
            font,
            color,
          });
          curX += font.widthOfTextAtSize(w, fontSize) + spaceW;
        }
      }
      currentY -= lineHeight;
    });
  }

  return currentY;
}

export async function generateClinicalPdfReport(
  tokenRecord: TokenRecord,
  session: TestSession
): Promise<{ pdfBytes: Uint8Array; blob: Blob; filename: string }> {
  const bio = tokenRecord.client_biodata;
  const scores = tokenRecord.scores;
  const clientName = bio?.fullName?.trim() || 'Peserta';
  const cleanFilename = `Mental Health Check Up - ${clientName}.pdf`;

  // Fetch template Canva dengan cache-buster untuk menjamin versi 4 halaman terbaru
  const response = await fetch(`/template_laporan.pdf?t=${Date.now()}`);
  if (!response.ok) {
    throw new Error('Gagal memuat template PDF Canva (/template_laporan.pdf).');
  }
  const templateBytes = await response.arrayBuffer();

  const doc = await PDFDocument.load(templateBytes);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await doc.embedFont(StandardFonts.HelveticaOblique);

  // Palet Warna Elegan Antara Psychology
  const darkBrown = rgb(0.4118, 0.3216, 0.2353); // #69523C
  const textColor = rgb(0.2, 0.2, 0.2);
  const highlightColor = rgb(0.1, 0.1, 0.1);
  const mutedText = rgb(0.38, 0.35, 0.32);

  const pages = doc.getPages();

  // =========================================================================
  // HALAMAN 1: COVER
  // =========================================================================
  if (pages[0]) {
    const page1 = pages[0];
    const examDateFormatted = formatDateIndo(bio?.examDate || session.test_date);

    page1.drawText(examDateFormatted, {
      x: 65,
      y: 295,
      size: 13,
      font: fontBold,
      color: textColor,
    });
  }

  // =========================================================================
  // HALAMAN 2: IDENTITAS DIRI & TUJUAN PEMERIKSAAN
  // =========================================================================
  if (pages[1]) {
    const page2 = pages[1];

    // Kolom kanan Identitas Diri (x = 278, lebar maksimum sel = 260pt)
    const namaText = bio?.fullName || '-';
    const ttlText = `${bio?.birthPlace || '-'}, ${formatDateIndo(bio?.birthDate)}`;
    const pendidikanText = bio?.lastEducation || '-';
    const pekerjaanText = bio?.occupation || '-';

    // Auto-fit ukuran font nama agar selalu pas di batas kolom
    let namaFontSize = 13;
    const maxNameWidth = 260;
    while (
      namaFontSize > 8.5 &&
      fontBold.widthOfTextAtSize(namaText, namaFontSize) > maxNameWidth
    ) {
      namaFontSize -= 0.5;
    }

    // Baris 1: Nama (Ukuran font lebih besar & auto-scaling)
    page2.drawText(namaText, {
      x: 278,
      y: 548,
      size: namaFontSize,
      font: fontBold,
      color: highlightColor,
    });

    // Baris 2: Tempat / Tanggal Lahir (Ukuran lebih besar 11pt)
    page2.drawText(ttlText, {
      x: 278,
      y: 499,
      size: 11,
      font: fontRegular,
      color: textColor,
    });

    // Baris 3: Pendidikan Terakhir (Ukuran lebih besar 11pt)
    page2.drawText(pendidikanText, {
      x: 278,
      y: 449,
      size: 11,
      font: fontRegular,
      color: textColor,
    });

    // Baris 4: Pekerjaan (Ukuran lebih besar 11pt)
    page2.drawText(pekerjaanText, {
      x: 278,
      y: 399,
      size: 11,
      font: fontRegular,
      color: textColor,
    });

    // Kotak Tujuan Pemeriksaan (Ukuran lebih besar 12pt, mode justify, tidak sebesar judul)
    const purposeText =
      session.examination_purpose ||
      'Pemeriksaan profil kesehatan mental dan kondisi emosional individu guna memetakan dinamika psikologis secara objektif dan komprehensif.';

    drawJustifiedParagraph(page2, purposeText, {
      startX: 65,
      startY: 265,
      targetWidth: 465,
      fontSize: 12,
      lineHeight: 18,
      font: fontRegular,
      color: textColor,
    });
  }

  // =========================================================================
  // HALAMAN 3: HASIL PEMERIKSAAN & KESIMPULAN/REKOMENDASI
  // =========================================================================
  if (pages[2]) {
    const page3 = pages[2];

    const stresText = scores
      ? `${scores.stress.score}  (Kategori: ${scores.stress.level})`
      : '-';
    const depresiText = scores
      ? `${scores.depression.score}  (Kategori: ${scores.depression.level})`
      : '-';
    const kecemasanText = scores
      ? `${scores.anxiety.score}  (Kategori: ${scores.anxiety.level})`
      : '-';

    // Baris 1: Stres
    page3.drawText(stresText, {
      x: 278,
      y: 565,
      size: 11,
      font: fontBold,
      color: highlightColor,
    });

    // Baris 2: Depresi
    page3.drawText(depresiText, {
      x: 278,
      y: 516,
      size: 11,
      font: fontBold,
      color: highlightColor,
    });

    // Baris 3: Kecemasan
    page3.drawText(kecemasanText, {
      x: 278,
      y: 466,
      size: 11,
      font: fontBold,
      color: highlightColor,
    });

    // Kotak Kesimpulan dan Rekomendasi (Font 11.5pt, Mode Justify memenuhi lebar 465pt)
    const notesText =
      tokenRecord.notes_conclusion ||
      'Berdasarkan hasil pemeriksaan penapisan psikometrik, peserta menunjukkan profil kondisi emosional yang telah direkapitulasi di atas. Rekomendasi lanjutan dapat dikoordinasikan lebih mendalam melalui sesi konseling klinis bersama Tim Psikolog Antara Psychology.';

    drawJustifiedParagraph(page3, notesText, {
      startX: 65,
      startY: 330,
      targetWidth: 465,
      fontSize: 11.5,
      lineHeight: 17,
      font: fontRegular,
      color: textColor,
    });
  }

  // =========================================================================
  // HALAMAN 4: HALAMAN PENUTUP (RESMI, BERSIH, SESUAI DESAIN ACUAN)
  // =========================================================================
  let page4 = pages[3];
  if (!page4 && pages[2]) {
    const [copiedPage] = await doc.copyPages(doc, [2]);
    page4 = doc.addPage(copiedPage);
  }

  if (page4) {
    // Teks Paragraf 1 dengan kata 'bukan merupakan DIAGNOSA' dicetak BOLD
    const p1Words = [
      { text: 'Hasil', bold: false },
      { text: 'dari', bold: false },
      { text: 'kuesioner', bold: false },
      { text: 'ini', bold: false },
      { text: 'bukan', bold: true },
      { text: 'merupakan', bold: true },
      { text: 'DIAGNOSA,', bold: true },
      { text: 'tetapi', bold: false },
      { text: 'hanya', bold: false },
      { text: 'mengukur', bold: false },
      { text: 'kondisi', bold: false },
      { text: 'emosional', bold: false },
      { text: 'negatif', bold: false },
      { text: 'yang', bold: false },
      { text: 'dirasakan', bold: false },
      { text: 'selama', bold: false },
      { text: 'satu', bold: false },
      { text: 'minggu', bold: false },
      { text: 'belakangan.', bold: false },
    ];

    let p4Y = 560; // Mulai di bawah lengkungan gelombang atas
    const p4TargetW = 465;
    const fontSizeP1 = 11.5;
    const spaceW = fontRegular.widthOfTextAtSize(' ', fontSizeP1);

    // Pembagian baris teks campuran reguler dan tebal
    const p1Lines: { text: string; bold: boolean }[][] = [];
    let curLine: { text: string; bold: boolean }[] = [];
    let curLineW = 0;

    for (const item of p1Words) {
      const f = item.bold ? fontBold : fontRegular;
      const w = f.widthOfTextAtSize(item.text, fontSizeP1);
      const needed = curLine.length === 0 ? w : spaceW + w;
      if (curLine.length > 0 && curLineW + needed > p4TargetW) {
        p1Lines.push(curLine);
        curLine = [item];
        curLineW = w;
      } else {
        curLine.push(item);
        curLineW += needed;
      }
    }
    if (curLine.length > 0) p1Lines.push(curLine);

    // Gambar Paragraf 1 (mode justify)
    p1Lines.forEach((line, idx) => {
      const isLast = idx === p1Lines.length - 1;
      let lineW = 0;
      line.forEach((it) => {
        const f = it.bold ? fontBold : fontRegular;
        lineW += f.widthOfTextAtSize(it.text, fontSizeP1);
      });
      const gap =
        !isLast && line.length > 1 ? (p4TargetW - lineW) / (line.length - 1) : spaceW;
      let curX = 65;
      for (const it of line) {
        const f = it.bold ? fontBold : fontRegular;
        page4.drawText(it.text, {
          x: curX,
          y: p4Y,
          size: fontSizeP1,
          font: f,
          color: it.bold ? highlightColor : textColor,
        });
        curX += f.widthOfTextAtSize(it.text, fontSizeP1) + gap;
      }
      p4Y -= 19;
    });

    p4Y -= 14;

    // Teks Paragraf 2 (Tanpa kalimat "Terima kasih sudah mengisi kuesioner ini")
    const p2Text =
      'Hasil akan diberitahukan lebih lanjut oleh Tim Antara Psychology.';

    p4Y = drawJustifiedParagraph(page4, p2Text, {
      startX: 65,
      startY: p4Y,
      targetWidth: p4TargetW,
      fontSize: 11.5,
      lineHeight: 19,
      font: fontBold,
      color: darkBrown,
    });

    p4Y -= 14;

    // Garis Pemisah Halus
    page4.drawLine({
      start: { x: 65, y: p4Y },
      end: { x: 530, y: p4Y },
      thickness: 0.8,
      color: rgb(0.85, 0.82, 0.78),
    });

    p4Y -= 18;

    // Teks Paragraf 3: Kerahasiaan & Panduan Klinis (Oblique, Justified)
    // Berhenti di atas Y = 390 (di atas batas kolom, memberikan ruang bebas ke footer)
    const p3Text =
      'Laporan ini bersifat rahasia dan hanya diperuntukkan bagi pihak yang berkepentingan langsung dengan hasil pemeriksaan. Interpretasi hasil tes ini didasarkan pada data yang diperoleh pada saat pemeriksaan berlangsung dan hendaknya dipadukan dengan informasi psikologis lainnya untuk pengambilan keputusan klinis atau konseling yang komprehensif.';

    drawJustifiedParagraph(page4, p3Text, {
      startX: 65,
      startY: p4Y,
      targetWidth: p4TargetW,
      fontSize: 9.5,
      lineHeight: 15.5,
      font: fontOblique,
      color: mutedText,
    });
  }

  const pdfBytes = await doc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });

  return {
    pdfBytes,
    blob,
    filename: cleanFilename,
  };
}

export async function downloadClinicalPdfReport(
  tokenRecord: TokenRecord,
  session: TestSession
): Promise<void> {
  const { blob, filename } = await generateClinicalPdfReport(tokenRecord, session);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
