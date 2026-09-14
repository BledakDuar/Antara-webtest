-- ==============================================================================
-- ANTARA PSYCHOLOGY — SUPABASE PRODUCTION DATABASE SCHEMA
-- Skema PostgreSQL untuk Asesmen Psikotes & Realtime Live Monitor
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABEL ALAT TES (Modular untuk instrumen DASS-42)
CREATE TABLE IF NOT EXISTS public.test_tools (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    instructions TEXT,
    disclaimer TEXT,
    default_has_timer BOOLEAN DEFAULT FALSE,
    default_timer_minutes INTEGER DEFAULT 45,
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    scoring_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABEL SESI TES
CREATE TABLE IF NOT EXISTS public.test_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    test_tool_id VARCHAR(50) REFERENCES public.test_tools(id) ON DELETE RESTRICT,
    test_date DATE NOT NULL DEFAULT CURRENT_DATE,
    participant_quota INTEGER NOT NULL DEFAULT 10,
    has_timer BOOLEAN NOT NULL DEFAULT FALSE,
    timer_minutes INTEGER,
    examination_purpose TEXT DEFAULT 'Pemeriksaan profil kesehatan mental dan kondisi emosional individu.',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABEL TOKEN PESERTA
CREATE TABLE IF NOT EXISTS public.tokens (
    token VARCHAR(30) PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES public.test_sessions(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'BELUM_DIGUNAKAN'
        CHECK (status IN ('BELUM_DIGUNAKAN', 'SEDANG_MENGERJAKAN', 'SELESAI')),
    client_biodata JSONB,
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    scores JSONB,
    notes_conclusion TEXT DEFAULT '',
    started_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    last_saved_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeks performa query realtime
CREATE INDEX IF NOT EXISTS idx_tokens_session_id ON public.tokens(session_id);
CREATE INDEX IF NOT EXISTS idx_tokens_status ON public.tokens(status);

-- 5. TABEL DAFTAR EMAIL ADMIN TEROTORISASI (GOOGLE OAUTH / EMAIL ADMIN)
CREATE TABLE IF NOT EXISTS public.admin_whitelist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. AKTIFKAN SUPABASE REALTIME
-- Memastikan tabel tokens dan test_sessions memancarkan WebSocket change events ke dashboard admin
ALTER PUBLICATION supabase_realtime ADD TABLE public.tokens;
ALTER PUBLICATION supabase_realtime ADD TABLE public.test_sessions;

-- 7. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.test_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_whitelist ENABLE ROW LEVEL SECURITY;

-- Policy test_tools (Publik dapat membaca alat tes)
CREATE POLICY "Public test_tools read" ON public.test_tools
    FOR SELECT USING (true);

-- Policy test_sessions (Publik dapat membaca sesi untuk verifikasi token)
CREATE POLICY "Public test_sessions read" ON public.test_sessions
    FOR SELECT USING (true);
CREATE POLICY "Admin test_sessions all" ON public.test_sessions
    FOR ALL USING (true);

-- Policy tokens (Publik dapat mencari & update token miliknya secara realtime)
CREATE POLICY "Public tokens select" ON public.tokens
    FOR SELECT USING (true);
CREATE POLICY "Public tokens update" ON public.tokens
    FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Admin tokens all" ON public.tokens
    FOR ALL USING (true);

-- Policy admin_whitelist (Publik dapat mengecek status email)
CREATE POLICY "Public admin_whitelist read" ON public.admin_whitelist
    FOR SELECT USING (true);

-- 8. DATA AWAL (SEED): INSTRUMEN DASS-42
INSERT INTO public.test_tools (id, name, instructions, disclaimer, default_has_timer, default_timer_minutes)
VALUES (
    'DASS',
    'Depression Anxiety Stress Scales (DASS-42)',
    'Kuesioner ini terdiri dari berbagai pernyataan yang mungkin sesuai dengan pengalaman Bapak/Ibu/Saudara dalam menghadapi situasi hidup sehari-hari. Terdapat empat pilihan jawaban yang disediakan untuk setiap pernyataan yaitu : 0 = Tidak sesuai sama sekali, 1 = Sesuai sampai tingkat tertentu (kadang-kadang), 2 = Sesuai batas yang dapat dipertimbangkan (lumayan sering), 3 = Sangat sesuai (sering sekali). Isilah sesuai keadaan diri satu minggu belakangan.',
    'Hasil dari kuesioner DASS ini bukan merupakan DIAGNOSA, tetapi hanya mengukur kondisi emosional negatif yang dirasakan selama satu minggu belakangan.',
    FALSE,
    30
) ON CONFLICT (id) DO UPDATE SET
    instructions = EXCLUDED.instructions,
    disclaimer = EXCLUDED.disclaimer;
