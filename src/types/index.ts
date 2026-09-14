export type TestToolId = 'DASS';

export type TokenStatus = 'BELUM_DIGUNAKAN' | 'SEDANG_MENGERJAKAN' | 'SELESAI';

export type Gender = 'Laki-laki' | 'Perempuan';

export type Education =
  | 'SD'
  | 'SMP'
  | 'SMA/SMK'
  | 'D3'
  | 'S1'
  | 'Profesi'
  | 'Sarjana Profesi'
  | 'Magister Profesi'
  | 'S2'
  | 'S3'
  | 'Lainnya';

export interface ClientBiodata {
  fullName: string;
  gender: Gender;
  examDate: string; // YYYY-MM-DD
  birthPlace: string;
  birthDate: string; // YYYY-MM-DD
  calculatedAge: string; // e.g. "25 tahun 8 bulan"
  lastEducation: Education;
  occupation: string;
}

export type DassScaleType = 'depression' | 'anxiety' | 'stress';

export interface DassQuestion {
  id: number;
  text: string;
  scale: DassScaleType;
}

export type DassScoreLevel = 'Normal' | 'Ringan' | 'Sedang' | 'Parah' | 'Sangat Parah';

export interface DassDimensionScore {
  score: number;
  level: DassScoreLevel;
  maxScore: number;
}

export interface DassResult {
  depression: DassDimensionScore;
  anxiety: DassDimensionScore;
  stress: DassDimensionScore;
}

export interface TestSession {
  id: string;
  title: string;
  test_tool_id: TestToolId;
  test_date: string;
  participant_quota: number;
  has_timer: boolean;
  timer_minutes: number | null;
  examination_purpose?: string;
  created_at: string;
}

export interface TokenRecord {
  token: string;
  session_id: string;
  status: TokenStatus;
  client_biodata: ClientBiodata | null;
  answers: Record<number, number>; // { [question_id]: score (0..3) }
  scores: DassResult | null;
  notes_conclusion?: string; // Kesimpulan & Rekomendasi psikolog
  started_at: string | null;
  submitted_at: string | null;
  last_saved_at: string;
  created_at: string;
}


export interface TestSessionWithTokens extends TestSession {
  tokens: TokenRecord[];
}
