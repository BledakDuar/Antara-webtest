# 📘 PANDUAN LENGKAP DEPLOYMENT & PENGATURAN PRODUKSI
## Antara Psychology — Sistem Asesmen Psikotes & Live Monitor Realtime

Panduan ini memandu Anda langkah demi langkah untuk:
1. Menyiapkan Database Supabase (PostgreSQL, Realtime, & RLS).
2. Mengatur Login Terbatas Google OAuth (Hanya akun Google tertentu yang bisa masuk).
3. Melakukan Push & Deploy ke GitHub Repository.
4. Melakukan Deploy ke Netlify (Free Tier) dengan Custom Domain / Subdomain.
5. Cara Memasang / Mengubah Preview Profil Instagram di Halaman Klien.

---

## 📑 DAFTAR ISI
1. [Langkah 1: Setup Database Supabase](#langkah-1-setup-database-supabase)
2. [Langkah 2: Konfigurasi Login Terbatas Akun Google (Google OAuth)](#langkah-2-konfigurasi-login-terbatas-akun-google)
3. [Langkah 3: Deploy Kode ke GitHub](#langkah-3-deploy-kode-ke-github)
4. [Langkah 4: Deploy ke Netlify (Free Tier)](#langkah-4-deploy-ke-netlify)
5. [Langkah 5: Cara Menyesuaikan Preview Profil Instagram Klien](#langkah-5-cara-menyesuaikan-preview-profil-instagram)

---

## 1. LANGKAH 1: SETUP DATABASE SUPABASE

### A. Buat Proyek Baru di Supabase
1. Buka [https://supabase.com](https://supabase.com) dan login / sign up.
2. Klik tombol **"New Project"**.
3. Isi:
   - **Name**: `Antara Psychology Psikotes`
   - **Database Password**: Buat password kuat (catat password ini).
   - **Region**: Pilih **Singapore (`ap-southeast-1`)** untuk kecepatan terbaik dari Indonesia.
   - **Pricing Plan**: Free Tier.
4. Klik **"Create new project"** dan tunggu 1–2 menit sampai proyek siap.

### B. Jalankan Skrip SQL Schema
1. Di menu sidebar kiri Supabase, klik **SQL Editor** (ikon terminal/dokumen).
2. Klik **"New Query"**.
3. Buka file `supabase/schema.sql` di proyek ini, atau salin seluruh isi SQL di bawah ini dan tempel ke editor query Supabase:

```sql
-- ==============================================================================
-- ANTARA PSYCHOLOGY — SUPABASE PRODUCTION DATABASE SCHEMA
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABEL ALAT TES
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

-- 2. TABEL SESI TES
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

-- 3. TABEL TOKEN PESERTA
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

CREATE INDEX IF NOT EXISTS idx_tokens_session_id ON public.tokens(session_id);
CREATE INDEX IF NOT EXISTS idx_tokens_status ON public.tokens(status);

-- 4. TABEL WHITELIST EMAIL ADMIN
CREATE TABLE IF NOT EXISTS public.admin_whitelist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. AKTIFKAN SUPABASE REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.tokens;
ALTER PUBLICATION supabase_realtime ADD TABLE public.test_sessions;

-- 6. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.test_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_whitelist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public test_tools read" ON public.test_tools FOR SELECT USING (true);
CREATE POLICY "Public test_sessions read" ON public.test_sessions FOR SELECT USING (true);
CREATE POLICY "Admin test_sessions all" ON public.test_sessions FOR ALL USING (true);

CREATE POLICY "Public tokens select" ON public.tokens FOR SELECT USING (true);
CREATE POLICY "Public tokens update" ON public.tokens FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Admin tokens all" ON public.tokens FOR ALL USING (true);
CREATE POLICY "Public admin_whitelist read" ON public.admin_whitelist FOR SELECT USING (true);

-- 7. DATA AWAL INSTRUMEN DASS-42
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
```
4. Klik tombol **"Run"** (ikon Play) di pojok kanan bawah editor query. Pastikan muncul pesan `Success. No rows returned`.

### C. Salin Kredensial API Supabase
1. Di sidebar kiri Supabase, klik **Project Settings** (ikon gerigi) &rarr; pilih menu **API**.
2. Di bagian **Project URL**, salin nilai URL (contoh: `https://xyzabc123.supabase.co`).
3. Di bagian **Project API Keys**, salin nilai **`anon` `public`** key (panjang string diawali `eyJ...`).

---

## 2. LANGKAH 2: KONFIGURASI LOGIN TERBATAS AKUN GOOGLE

Aplikasi sudah dilengkapi tombol **"Masuk dengan Akun Google"** dan **Whitelist Email Security Gate**. Jika ada akun Google asing mencoba login, sistem otomatis menolaknya dan langsung me-logout akun tersebut.

### A. Buat OAuth Client ID di Google Cloud Console
1. Buka [https://console.cloud.google.com/](https://console.cloud.google.com/).
2. Buat proyek baru atau pilih proyek yang sudah ada.
3. Di menu kiri, buka **APIs & Services** &rarr; **OAuth consent screen**:
   - User Type: Pilih **External**.
   - App name: `Antara Psychology Admin Portal`.
   - User support email & Developer contact: Masukkan email Anda.
   - Klik **Save and Continue** sampai selesai.
4. Buka **APIs & Services** &rarr; **Credentials**:
   - Klik **"+ CREATE CREDENTIALS"** &rarr; pilih **"OAuth client ID"**.
   - Application type: **Web application**.
   - Name: `Supabase Auth Antara`.
   - Di bagian **Authorized redirect URIs**, klik **"+ ADD URI"** dan masukkan:
     ```text
     https://<ID-PROYEK-SUPABASE-ANDA>.supabase.co/auth/v1/callback
     ```
     *(Ganti `<ID-PROYEK-SUPABASE-ANDA>` dengan ID proyek Supabase Anda dari Langkah 1)*.
   - Klik **Create**.
   - Simpan **Client ID** dan **Client Secret** yang muncul.

### B. Aktifkan Google Provider di Supabase
1. Buka dashboard Supabase Anda.
2. Di menu kiri, klik **Authentication** &rarr; **Providers**.
3. Cari provider **Google** dan klik untuk membuka pengaturannya:
   - Centang **"Enable Google provider"**.
   - Masukkan **Client ID** dan **Client Secret** dari Google Cloud.
   - Klik **Save**.

### C. Batasi Hanya Email Tertentu yang Boleh Menjadi Admin
Di Netlify Environment Variables (atau file `.env`), tentukan variabel:
```env
VITE_ALLOWED_ADMIN_EMAILS=admin@antarapsychology.com,fadhil@gmail.com
```
> [!IMPORTANT]
> Pisahkan dengan koma jika ada beberapa email admin. Siapapun yang mencoba masuk menggunakan akun Google di luar daftar tersebut otomatis **ditolak dan dikeluarkan secara instan**.

---

## 3. LANGKAH 3: DEPLOY KODE KE GITHUB

Jalankan perintah berikut di terminal komputer Anda (folder `D:\Project Fadhil\Psikotest`):

```powershell
# 1. Buka direktori proyek
cd "D:\Project Fadhil\Psikotest"

# 2. Inisialisasi Git
git init

# 3. Tambahkan seluruh file ke staging (file rahasia .env dan node_modules sudah otomatis diabaikan oleh .gitignore)
git add .

# 4. Buat commit pertama
git commit -m "feat: Production ready Antara Psychology psychological assessment app"

# 5. Ganti branch default menjadi main
git branch -M main

# 6. Hubungkan ke GitHub Repository Anda (Ganti URL dengan repo Anda di github.com)
git remote add origin https://github.com/USERNAME-ANDA/antara-psychology-psikotes.git

# 7. Push ke GitHub
git push -u origin main
```

---

## 4. LANGKAH 4: DEPLOY KE NETLIFY (FREE TIER)

### A. Hubungkan Repositori GitHub ke Netlify
1. Buka [https://app.netlify.com](https://app.netlify.com) dan login (bisa login via GitHub).
2. Klik tombol **"Add new site"** &rarr; **"Import an existing project"**.
3. Pilih **GitHub** dan berikan izin akses ke repositori `antara-psychology-psikotes`.
4. Pengaturan Build (*Build Settings*):
   - **Base directory**: *(kosongkan)*
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   *(Netlify sudah otomatis membaca konfigurasi redirect SPA dari file `netlify.toml` yang telah kami sediakan)*.

### B. Masukkan Environment Variables di Netlify
Sebelum klik deploy (atau via menu **Site configuration** &rarr; **Environment variables**), tambahkan 3 variabel berikut:

| Key | Nilai |
|---|---|
| `VITE_SUPABASE_URL` | URL Supabase Anda (misal `https://xyzabc.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Kunci Anon Public Supabase Anda (`eyJ...`) |
| `VITE_ALLOWED_ADMIN_EMAILS` | Email Google admin yang diizinkan (misal `admin@antarapsychology.com,fadhil@gmail.com`) |

5. Klik **"Deploy site"**. Dalam waktu ~1 menit, website Anda sudah aktif secara global di Netlify (misal `https://antara-psychology.netlify.app`).
6. *(Opsional)* Di menu **Domain management**, Anda dapat menghubungkan domain kustom sendiri (contoh: `psikotes.antarapsychology.com`).

---

## 5. LANGKAH 5: CARA MENYESUAIKAN PREVIEW PROFIL INSTAGRAM

Di halaman depan klien ([TokenEntryPage.tsx](file:///D:/Project%20Fadhil/Psikotest/src/pages/TokenEntryPage.tsx)), terdapat seksi khusus **Update & Edukasi Instagram**.

### Cara 1: Mengubah Akun Instagram via Admin Panel (Mudah & Cepat)
1. Buka dashboard admin (`/admin`).
2. Klik tombol **"Pengaturan"** (ikon gerigi di kanan atas).
3. Pilih tab **"Header & Footer"**.
4. Ubah kolom **"Akun Instagram"** (misal: `antarapsychology`).
5. Klik **"Simpan Pengaturan"**.
   - Tautan tombol "Kunjungi IG" dan handle username `@antarapsychology` di halaman klien otomatis berubah secara realtime!

### Cara 2: Mengubah / Memperbarui Konten Kartu Edukasi Instagram
Kartu postingan didefinisikan pada array `INSTAGRAM_POSTS` di file `src/pages/TokenEntryPage.tsx` (baris 30). Anda dapat mengubah judul, kategori, ringkasan materi, serta menempelkan link langsung ke postingan Instagram tertentu:
```typescript
const INSTAGRAM_POSTS = [
  {
    id: 1,
    category: 'Edukasi Emosi',
    title: 'Mengenali Perbedaan Antara Stres Wajar vs Kelelahan Mental (Burnout)',
    snippet: 'Kapan rasa lelah tidak lagi sekadar butuh tidur, melainkan jeda dan penanganan profesional?',
    date: '2 hari lalu',
    likes: 348,
    comments: 24,
    link: 'https://www.instagram.com/p/KODE_POST_IG_ANDA/',
  },
  // Tambahkan atau ubah postingan lainnya di sini
];
```

### Cara 3: Menggunakan Widget Live Feed Instagram Otomatis
Jika Anda ingin foto-foto Instagram terbaru dari profil Antara Psychology tampil secara otomatis tanpa input manual:
1. Daftarkan akun gratis di layanan feed widget seperti **Behold.so**, **Elfsight**, atau **SnapWidget**.
2. Hubungkan akun Instagram `@antarapsychology`.
3. Dapatkan kode iframe / embed script.
4. Anda cukup memasukkan elemen iframe tersebut ke dalam seksi Instagram di [TokenEntryPage.tsx](file:///D:/Project%20Fadhil/Psikotest/src/pages/TokenEntryPage.tsx).
