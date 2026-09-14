import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { TokenRecord, TestSession, ClientBiodata, DassResult, TestSessionWithTokens } from '../types';

const DEFAULT_SUPABASE_URL = 'https://hjlycxcuwdaqqcoohkgm.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqbHljeGN1d2RhcXFjb29oa2dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzNzczMzcsImV4cCI6MjEwNDk1MzMzN30.wSDdso_ZSND4RgW_jJKeNbV9s3pu81yfbpJeu2o6a7U';

const envUrl =
  (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_SUPABASE_URL) ||
  DEFAULT_SUPABASE_URL;
const envKey =
  (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_SUPABASE_ANON_KEY) ||
  DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  envUrl &&
  envKey &&
  envUrl !== 'https://your-project-id.supabase.co' &&
  !envUrl.includes('your-project-id')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(envUrl, envKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

// ============================================================================
// LOCAL STORAGE FALLBACK REPOSITORY (SIMULATED REALTIME VIA BROADCAST CHANNEL)
// ============================================================================
const LOCAL_SESSIONS_KEY = 'antara_psychology_sessions';
const LOCAL_TOKENS_KEY = 'antara_psychology_tokens';
const channel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('antara_realtime_sync')
  : null;

function getInitialLocalData(): { sessions: TestSession[]; tokens: TokenRecord[] } {
  const defaultSessions: TestSession[] = [
    {
      id: 'a0000000-0000-0000-0000-000000000001',
      title: 'Pengecekan Mahasiswa - 14-09-2026',
      test_tool_id: 'DASS',
      test_date: new Date().toISOString().split('T')[0],
      participant_quota: 5,
      has_timer: false,
      timer_minutes: null,
      examination_purpose: 'Pemeriksaan profil kesehatan mental dan kondisi emosional individu.',
      created_at: new Date().toISOString(),
    },
  ];

  const defaultTokens: TokenRecord[] = [
    {
      token: 'ANT-7K9P',
      session_id: 'a0000000-0000-0000-0000-000000000001',
      status: 'BELUM_DIGUNAKAN',
      client_biodata: null,
      answers: {},
      scores: null,
      started_at: null,
      submitted_at: null,
      last_saved_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      token: 'ANT-3M2X',
      session_id: 'a0000000-0000-0000-0000-000000000001',
      status: 'BELUM_DIGUNAKAN',
      client_biodata: null,
      answers: {},
      scores: null,
      started_at: null,
      submitted_at: null,
      last_saved_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      token: 'ANT-8R5W',
      session_id: 'a0000000-0000-0000-0000-000000000001',
      status: 'BELUM_DIGUNAKAN',
      client_biodata: null,
      answers: {},
      scores: null,
      started_at: null,
      submitted_at: null,
      last_saved_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      token: 'ANT-9Q1Z',
      session_id: 'a0000000-0000-0000-0000-000000000001',
      status: 'BELUM_DIGUNAKAN',
      client_biodata: null,
      answers: {},
      scores: null,
      started_at: null,
      submitted_at: null,
      last_saved_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      token: 'ANT-2V4K',
      session_id: 'a0000000-0000-0000-0000-000000000001',
      status: 'BELUM_DIGUNAKAN',
      client_biodata: null,
      answers: {},
      scores: null,
      started_at: null,
      submitted_at: null,
      last_saved_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
  ];

  try {
    const rawSessions = localStorage.getItem(LOCAL_SESSIONS_KEY);
    const rawTokens = localStorage.getItem(LOCAL_TOKENS_KEY);
    return {
      sessions: rawSessions ? JSON.parse(rawSessions) : defaultSessions,
      tokens: rawTokens ? JSON.parse(rawTokens) : defaultTokens,
    };
  } catch {
    return { sessions: defaultSessions, tokens: defaultTokens };
  }
}

function saveLocalData(sessions: TestSession[], tokens: TokenRecord[]) {
  try {
    localStorage.setItem(LOCAL_SESSIONS_KEY, JSON.stringify(sessions));
    localStorage.setItem(LOCAL_TOKENS_KEY, JSON.stringify(tokens));
    if (channel) {
      channel.postMessage({ type: 'DATA_UPDATED', timestamp: Date.now() });
    }
  } catch (err) {
    console.error('Failed to save to localStorage', err);
  }
}

// Generate random unique token: ANT-XXXX
export function generateRandomTokenCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let randomPart = '';
  for (let i = 0; i < 4; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ANT-${randomPart}`;
}

// ============================================================================
// API SERVICE METHODS (DUAL-MODE: SUPABASE REALTIME OR LOCAL STORAGE)
// ============================================================================

export async function validateToken(tokenCode: string): Promise<{
  tokenRecord?: TokenRecord;
  session?: TestSession;
  error?: string;
}> {
  const cleanCode = tokenCode.trim().toUpperCase();

  // 1. Coba validasi dari Supabase jika terkonfigurasi
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: tokenData, error: tokenErr } = await supabase
        .from('tokens')
        .select('*')
        .eq('token', cleanCode)
        .single();

      if (!tokenErr && tokenData) {
        const { data: sessionData, error: sessionErr } = await supabase
          .from('test_sessions')
          .select('*')
          .eq('id', tokenData.session_id)
          .single();

        if (!sessionErr && sessionData) {
          return { tokenRecord: tokenData as TokenRecord, session: sessionData as TestSession };
        }
      }
    } catch (e: any) {
      console.warn('Supabase validateToken kendala, beralih ke penyimpanan lokal:', e);
    }
  }

  // 2. Fallback mulus ke penyimpanan lokal (agar token seperti ANT-3M2X, ANT-8R5W dll selalu bisa diakses)
  const { sessions, tokens } = getInitialLocalData();
  const tokenRecord = tokens.find((t) => t.token === cleanCode);
  if (tokenRecord) {
    const session = sessions.find((s) => s.id === tokenRecord.session_id);
    if (session) {
      return { tokenRecord, session };
    }
  }

  return { error: 'Kode token tidak valid atau tidak ditemukan. Mohon periksa kembali kode token Anda.' };
}

export async function saveClientBiodata(
  tokenCode: string,
  biodata: ClientBiodata
): Promise<{ success: boolean; error?: string }> {
  const cleanCode = tokenCode.trim().toUpperCase();

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('tokens')
        .update({
          client_biodata: biodata,
          status: 'SEDANG_MENGERJAKAN',
          started_at: new Date().toISOString(),
          last_saved_at: new Date().toISOString(),
        })
        .eq('token', cleanCode);
    } catch (e: any) {
      console.warn('Supabase saveClientBiodata fallback:', e);
    }
  }

  // Sinkronisasi selalu ke penyimpanan lokal
  const { sessions, tokens } = getInitialLocalData();
  const updatedTokens = tokens.map((t) => {
    if (t.token === cleanCode) {
      return {
        ...t,
        client_biodata: biodata,
        status: 'SEDANG_MENGERJAKAN' as const,
        started_at: t.started_at || new Date().toISOString(),
        last_saved_at: new Date().toISOString(),
      };
    }
    return t;
  });

  saveLocalData(sessions, updatedTokens);
  return { success: true };
}

export async function autosaveAnswers(
  tokenCode: string,
  answers: Record<number, number>
): Promise<{ success: boolean; error?: string }> {
  const cleanCode = tokenCode.trim().toUpperCase();

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('tokens')
        .update({
          answers,
          last_saved_at: new Date().toISOString(),
        })
        .eq('token', cleanCode);
    } catch (e: any) {
      console.warn('Supabase autosaveAnswers fallback:', e);
    }
  }

  // Sinkronisasi selalu ke penyimpanan lokal
  const { sessions, tokens } = getInitialLocalData();
  const updatedTokens = tokens.map((t) => {
    if (t.token === cleanCode) {
      return {
        ...t,
        answers,
        last_saved_at: new Date().toISOString(),
      };
    }
    return t;
  });

  saveLocalData(sessions, updatedTokens);
  return { success: true };
}

export async function submitDassAnswers(
  tokenCode: string,
  answers: Record<number, number>,
  scores: DassResult
): Promise<{ success: boolean; error?: string }> {
  const cleanCode = tokenCode.trim().toUpperCase();
  const now = new Date().toISOString();

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('tokens')
        .update({
          answers,
          scores,
          status: 'SELESAI',
          submitted_at: now,
          last_saved_at: now,
        })
        .eq('token', cleanCode);
    } catch (e: any) {
      console.warn('Supabase submitDassAnswers fallback:', e);
    }
  }

  // Sinkronisasi selalu ke penyimpanan lokal
  const { sessions, tokens } = getInitialLocalData();
  const updatedTokens = tokens.map((t) => {
    if (t.token === cleanCode) {
      return {
        ...t,
        answers,
        scores,
        status: 'SELESAI' as const,
        submitted_at: now,
        last_saved_at: now,
      };
    }
    return t;
  });

  saveLocalData(sessions, updatedTokens);
  return { success: true };
}

export async function getAllSessions(): Promise<TestSessionWithTokens[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: sessions, error: sessErr } = await supabase
        .from('test_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (sessErr) throw sessErr;

      const { data: tokens, error: tokErr } = await supabase
        .from('tokens')
        .select('*')
        .order('created_at', { ascending: true });

      if (tokErr) throw tokErr;

      return (sessions || []).map((s) => ({
        ...s,
        tokens: (tokens || []).filter((t) => t.session_id === s.id),
      }));
    } catch (e) {
      console.error('Error fetching sessions from Supabase:', e);
    }
  }

  // Local fallback
  const { sessions, tokens } = getInitialLocalData();
  return sessions.map((s) => ({
    ...s,
    tokens: tokens.filter((t) => t.session_id === s.id),
  }));
}

export async function createNewSession(data: {
  title: string;
  test_tool_id: 'DASS';
  test_date: string;
  participant_quota: number;
  has_timer: boolean;
  timer_minutes: number | null;
  examination_purpose?: string;
}): Promise<{ session?: TestSession; tokens?: TokenRecord[]; error?: string }> {
  const sessionId = crypto.randomUUID();
  const generatedTokens: TokenRecord[] = [];

  for (let i = 0; i < data.participant_quota; i++) {
    generatedTokens.push({
      token: generateRandomTokenCode(),
      session_id: sessionId,
      status: 'BELUM_DIGUNAKAN',
      client_biodata: null,
      answers: {},
      scores: null,
      notes_conclusion: '',
      started_at: null,
      submitted_at: null,
      last_saved_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });
  }

  const newSession: TestSession = {
    id: sessionId,
    title: data.title,
    test_tool_id: data.test_tool_id,
    test_date: data.test_date,
    participant_quota: data.participant_quota,
    has_timer: data.has_timer,
    timer_minutes: data.timer_minutes,
    examination_purpose: data.examination_purpose || 'Pemeriksaan profil kesehatan mental dan kondisi emosional individu.',
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { error: sessErr } = await supabase.from('test_sessions').insert([newSession]);
      if (!sessErr) {
        await supabase.from('tokens').insert(generatedTokens);
      }
    } catch (e: any) {
      console.warn('Supabase createNewSession fallback:', e);
    }
  }

  // Selalu simpan juga ke LocalStorage untuk keandalan maksimal
  const { sessions, tokens } = getInitialLocalData();
  saveLocalData([newSession, ...sessions], [...generatedTokens, ...tokens]);
  return { session: newSession, tokens: generatedTokens };
}

export async function addTokensToSession(
  sessionId: string,
  count: number = 1
): Promise<{ newTokens: TokenRecord[]; error?: string }> {
  const generatedTokens: TokenRecord[] = [];

  for (let i = 0; i < count; i++) {
    generatedTokens.push({
      token: generateRandomTokenCode(),
      session_id: sessionId,
      status: 'BELUM_DIGUNAKAN',
      client_biodata: null,
      answers: {},
      scores: null,
      notes_conclusion: '',
      started_at: null,
      submitted_at: null,
      last_saved_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });
  }

  // 1. Supabase sync jika aktif
  if (isSupabaseConfigured && supabase) {
    try {
      const { error: tokErr } = await supabase.from('tokens').insert(generatedTokens);
      if (!tokErr) {
        const { data: currSess } = await supabase
          .from('test_sessions')
          .select('participant_quota')
          .eq('id', sessionId)
          .single();

        if (currSess) {
          await supabase
            .from('test_sessions')
            .update({ participant_quota: (currSess.participant_quota || 0) + count })
            .eq('id', sessionId);
        }
      }
    } catch (e: any) {
      console.warn('Supabase addTokensToSession fallback:', e);
    }
  }

  // 2. LocalStorage sync selalu diperbarui
  const { sessions, tokens } = getInitialLocalData();
  const updatedSessions = sessions.map((s) =>
    s.id === sessionId
      ? { ...s, participant_quota: (s.participant_quota || 0) + count }
      : s
  );
  const updatedTokens = [...tokens, ...generatedTokens];
  saveLocalData(updatedSessions, updatedTokens);

  return { newTokens: generatedTokens };
}

export async function updateTokenNotes(
  tokenCode: string,
  notes: string
): Promise<{ success: boolean; error?: string }> {
  const cleanCode = tokenCode.trim().toUpperCase();

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('tokens')
        .update({
          notes_conclusion: notes,
          last_saved_at: new Date().toISOString(),
        })
        .eq('token', cleanCode);
    } catch (e: any) {
      console.warn('Supabase updateTokenNotes fallback:', e);
    }
  }

  // Sinkronisasi selalu ke penyimpanan lokal
  const { sessions, tokens } = getInitialLocalData();
  const updatedTokens = tokens.map((t) => {
    if (t.token === cleanCode) {
      return {
        ...t,
        notes_conclusion: notes,
        last_saved_at: new Date().toISOString(),
      };
    }
    return t;
  });

  saveLocalData(sessions, updatedTokens);
  return { success: true };
}

// Subscribe to realtime token changes for a session
export function subscribeToSessionTokens(
  sessionId: string,
  onUpdate: () => void
): () => void {
  if (isSupabaseConfigured && supabase) {
    const channelInstance = supabase
      .channel(`session-tokens-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tokens',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelInstance);
    };
  }

  // Local fallback via BroadcastChannel or storage event
  const handleMessage = () => {
    onUpdate();
  };

  if (channel) {
    channel.addEventListener('message', handleMessage);
  }
  window.addEventListener('storage', handleMessage);

  return () => {
    if (channel) {
      channel.removeEventListener('message', handleMessage);
    }
    window.removeEventListener('storage', handleMessage);
  };
}
