import { DassQuestion, DassResult, DassScoreLevel, DassDimensionScore } from '../types';

export const DASS_OPTIONS = [
  { value: 0, label: '0', description: 'Tidak sesuai dengan saya sama sekali, atau tidak pernah.' },
  { value: 1, label: '1', description: 'Sesuai dengan saya sampai tingkat tertentu, atau kadang kadang.' },
  { value: 2, label: '2', description: 'Sesuai dengan saya sampai batas yang dapat dipertimbangkan, atau lumayan sering.' },
  { value: 3, label: '3', description: 'Sangat sesuai dengan saya, atau sering sekali.' },
];

export const DASS_SCALE_INDICES = {
  depression: [3, 5, 10, 13, 16, 17, 21, 24, 26, 31, 34, 37, 38, 42],
  anxiety: [2, 4, 7, 9, 15, 19, 20, 23, 25, 28, 30, 36, 40, 41],
  stress: [1, 6, 8, 11, 12, 14, 18, 22, 27, 29, 32, 33, 35, 39],
};

export const DASS_QUESTIONS: DassQuestion[] = [
  { id: 1, text: 'Saya merasa bahwa diri saya menjadi marah karena hal-hal sepele.', scale: 'stress' },
  { id: 2, text: 'Saya merasa bibir saya sering kering.', scale: 'anxiety' },
  { id: 3, text: 'Saya sama sekali tidak dapat merasakan perasaan positif.', scale: 'depression' },
  { id: 4, text: 'Saya mengalami kesulitan bernafas (misalnya : seringkali terengah-engah atau tidak dapat bernafas padahal tidak melakukan aktivitas fisik sebelumnya).', scale: 'anxiety' },
  { id: 5, text: 'Saya sepertinya tidak kuat lagi untuk melakukan suatu kegiatan.', scale: 'depression' },
  { id: 6, text: 'Saya cenderung bereaksi berlebihan terhadap suatu situasi.', scale: 'stress' },
  { id: 7, text: 'Saya merasa goyah (misalnya : kaki terasa mau ’copot’).', scale: 'anxiety' },
  { id: 8, text: 'Saya merasa sulit untuk bersantai.', scale: 'stress' },
  { id: 9, text: 'Saya menemukan diri saya berada dalam situasi yang membuat saya merasa sangat cemas dan saya akan merasa sangat lega jika semua ini berakhir.', scale: 'anxiety' },
  { id: 10, text: 'Saya merasa tidak ada hal yang dapat diharapkan di masa depan.', scale: 'depression' },
  { id: 11, text: 'Saya menemukan diri saya mudah merasa kesal.', scale: 'stress' },
  { id: 12, text: 'Saya merasa telah menghabiskan banyak energi untuk merasa cemas.', scale: 'stress' },
  { id: 13, text: 'Saya merasa sedih dan tertekan.', scale: 'depression' },
  { id: 14, text: 'Saya menemukan diri saya menjadi tidak sabar ketika mengalami penundaan (misalnya : kemacetan lalu lintas, menunggu sesuatu).', scale: 'stress' },
  { id: 15, text: 'Saya merasa lemas seperti mau pingsan.', scale: 'anxiety' },
  { id: 16, text: 'Saya merasa saya kehilangan minat akan segala hal.', scale: 'depression' },
  { id: 17, text: 'Saya merasa bahwa saya tidak berharga sebagai seorang manusia.', scale: 'depression' },
  { id: 18, text: 'Saya merasa bahwa saya mudah tersinggung.', scale: 'stress' },
  { id: 19, text: 'Saya berkeringat secara berlebihan (misalnya : tangan berkeringat), padahal temperatur tidak panas atau tidak melakukan aktivitas fisik sebelumnya.', scale: 'anxiety' },
  { id: 20, text: 'Saya merasa takut tanpa alasan yang jelas.', scale: 'anxiety' },
  { id: 21, text: 'Saya merasa bahwa hidup tidak bermanfaat.', scale: 'depression' },
  { id: 22, text: 'Saya merasa sulit untuk beristirahat.', scale: 'stress' },
  { id: 23, text: 'Saya mengalami kesulitan dalam menelan.', scale: 'anxiety' },
  { id: 24, text: 'Saya tidak dapat merasakan kenikmatan dari berbagai hal yang saya lakukan.', scale: 'depression' },
  { id: 25, text: 'Saya menyadari kegiatan jantung, walaupun saya tidak sehabis melakukan aktivitas fisik (misalnya : merasa detak jantung meningkat atau melemah).', scale: 'anxiety' },
  { id: 26, text: 'Saya merasa putus asa dan sedih.', scale: 'depression' },
  { id: 27, text: 'Saya merasa bahwa saya sangat mudah marah.', scale: 'stress' },
  { id: 28, text: 'Saya merasa saya hampir panik.', scale: 'anxiety' },
  { id: 29, text: 'Saya merasa sulit untuk tenang setelah sesuatu membuat saya kesal.', scale: 'stress' },
  { id: 30, text: 'Saya takut bahwa saya akan ‘terhambat’ oleh tugas- tugas sepele yang tidak biasa saya lakukan.', scale: 'anxiety' },
  { id: 31, text: 'Saya tidak merasa antusias dalam hal apapun.', scale: 'depression' },
  { id: 32, text: 'Saya sulit untuk sabar dalam menghadapi gangguan terhadap hal yang sedang saya lakukan.', scale: 'stress' },
  { id: 33, text: 'Saya sedang merasa gelisah.', scale: 'stress' },
  { id: 34, text: 'Saya merasa bahwa saya tidak berharga.', scale: 'depression' },
  { id: 35, text: 'Saya tidak dapat memaklumi hal apapun yang menghalangi saya untuk menyelesaikan hal yang sedang saya lakukan.', scale: 'stress' },
  { id: 36, text: 'Saya merasa sangat ketakutan.', scale: 'anxiety' },
  { id: 37, text: 'Saya melihat tidak ada harapan untuk masa depan.', scale: 'depression' },
  { id: 38, text: 'Saya merasa bahwa hidup tidak berarti.', scale: 'depression' },
  { id: 39, text: 'Saya menemukan diri saya mudah gelisah.', scale: 'stress' },
  { id: 40, text: 'Saya merasa khawatir dengan situasi dimana saya mungkin menjadi panik dan mempermalukan diri sendiri.', scale: 'anxiety' },
  { id: 41, text: 'Saya merasa gemetar (misalnya : pada tangan).', scale: 'anxiety' },
  { id: 42, text: 'Saya merasa sulit untuk meningkatkan inisiatif dalam melakukan sesuatu.', scale: 'depression' },
];

export const DASS_INSTRUCTIONS = {
  title: 'KUESIONER',
  subtitle: 'INSTRUKSI:',
  intro: 'Kuesioner ini terdiri dari berbagai pernyataan yang mungkin sesuai dengan pengalaman Bapak/Ibu/Saudara dalam menghadapi situasi hidup sehari-hari. Terdapat empat pilihan jawaban yang disediakan untuk setiap pernyataan yaitu :',
  scales: [
    { code: '0', text: 'Tidak sesuai dengan saya sama sekali, atau tidak pernah.' },
    { code: '1', text: 'Sesuai dengan saya sampai tingkat tertentu, atau kadang kadang.' },
    { code: '2', text: 'Sesuai dengan saya sampai batas yang dapat dipertimbangkan, atau lumayan sering.' },
    { code: '3', text: 'Sangat sesuai dengan saya, atau sering sekali.' },
  ],
  periodNote: 'Selanjutnya, Bapak/Ibu/Saudara diminta untuk menjawab dengan cara memilih pada salah satu alternatif jawaban yang paling sesuai dengan pengalaman Bapak/Ibu/Saudara selama satu minggu belakangan ini.',
  disclaimerNote: 'Tidak ada jawaban yang benar ataupun salah, karena itu isilah sesuai dengan keadaan diri Bapak/Ibu/Saudara yang sesungguhnya, yaitu berdasarkan jawaban pertama yang terlintas dalam pikiran Bapak/Ibu/Saudara.',
  closingDisclaimer: 'Hasil dari kuesioner ini bukan merupakan DIAGNOSA, tetapi hanya mengukur kondisi emosional negatif yang dirasakan selama satu minggu belakangan.',
  closingFollowUp: 'Hasil akan diberitahukan lebih lanjut oleh Tim Antara Psychology.',
};

/**
 * Norma dan Interpretasi DASS-42 (Sesuai Referensi Antara Psychology 2021)
 * 1. Normal:
 *    - Depresi: 0-9
 *    - Kecemasan: 0-7
 *    - Stres: 0-14
 * 2. Ringan:
 *    - Depresi: 10-13
 *    - Kecemasan: 8-9
 *    - Stres: 15-18
 * 3. Sedang:
 *    - Depresi: 14-20
 *    - Kecemasan: 10-14
 *    - Stres: 19-25
 * 4. Berat / Parah:
 *    - Depresi: 21-27
 *    - Kecemasan: 15-19
 *    - Stres: 26-33
 * 5. Sangat Berat / Sangat Parah:
 *    - Depresi: 28+
 *    - Kecemasan: 20+
 *    - Stres: 34+
 */

export function getDepressionLevel(score: number): DassScoreLevel {
  if (score <= 9) return 'Normal';
  if (score <= 13) return 'Ringan';
  if (score <= 20) return 'Sedang';
  if (score <= 27) return 'Parah';
  return 'Sangat Parah';
}

export function getAnxietyLevel(score: number): DassScoreLevel {
  if (score <= 7) return 'Normal';
  if (score <= 9) return 'Ringan';
  if (score <= 14) return 'Sedang';
  if (score <= 19) return 'Parah';
  return 'Sangat Parah';
}

export function getStressLevel(score: number): DassScoreLevel {
  if (score <= 14) return 'Normal';
  if (score <= 18) return 'Ringan';
  if (score <= 25) return 'Sedang';
  if (score <= 33) return 'Parah';
  return 'Sangat Parah';
}

export function calculateDassScores(answers: Record<number, number>): DassResult {
  let depScore = 0;
  let anxScore = 0;
  let strScore = 0;

  for (const qId of DASS_SCALE_INDICES.depression) {
    depScore += answers[qId] ?? 0;
  }
  for (const qId of DASS_SCALE_INDICES.anxiety) {
    anxScore += answers[qId] ?? 0;
  }
  for (const qId of DASS_SCALE_INDICES.stress) {
    strScore += answers[qId] ?? 0;
  }

  const maxScore = 42; // 14 items * 3

  const depression: DassDimensionScore = {
    score: depScore,
    level: getDepressionLevel(depScore),
    maxScore,
  };

  const anxiety: DassDimensionScore = {
    score: anxScore,
    level: getAnxietyLevel(anxScore),
    maxScore,
  };

  const stress: DassDimensionScore = {
    score: strScore,
    level: getStressLevel(strScore),
    maxScore,
  };

  return { depression, anxiety, stress };
}

export const SEVERITY_COLORS: Record<DassScoreLevel, { bg: string; text: string; border: string }> = {
  'Normal': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'Ringan': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'Sedang': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  'Parah': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  'Sangat Parah': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
};
