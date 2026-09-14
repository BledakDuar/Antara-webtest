import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { TokenEntryPage } from './pages/TokenEntryPage';
import { BiodataPage } from './pages/BiodataPage';
import { DassTestPage } from './pages/DassTestPage';
import { CompletionPage } from './pages/CompletionPage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { TokenRecord, TestSession } from './types';
import { validateToken, isSupabaseConfigured, supabase } from './lib/supabaseClient';

type AppView =
  | 'TOKEN_ENTRY'
  | 'BIODATA'
  | 'TEST'
  | 'COMPLETION'
  | 'ADMIN_LOGIN'
  | 'ADMIN_DASHBOARD';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('TOKEN_ENTRY');
  const [activeTokenRecord, setActiveTokenRecord] = useState<TokenRecord | null>(null);
  const [activeSession, setActiveSession] = useState<TestSession | null>(null);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  // Listen for Supabase Auth state & Google OAuth redirects with whitelist check
  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      const client = supabase;
      const verifyAllowedAdmin = async (userEmail?: string) => {
        if (!userEmail) return false;
        const DEFAULT_ALLOWED_EMAILS = 'growntap@gmail.com,antarapsy.team@gmail.com';
        const allowedRaw =
          ((import.meta.env.VITE_ALLOWED_ADMIN_EMAILS as string) || DEFAULT_ALLOWED_EMAILS);
        const allowedList = allowedRaw
          .split(',')
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean);

        // If whitelist is defined, only permit listed emails
        if (allowedList.length > 0 && !allowedList.includes(userEmail.toLowerCase())) {
          await client.auth.signOut();
          setIsAdminLoggedIn(false);
          alert(`Akses Ditolak: Akun Google (${userEmail}) bukan email administrator yang diizinkan.`);
          return false;
        }
        return true;
      };

      const handleAdminEntry = () => {
        setIsAdminLoggedIn(true);
        setCurrentView('ADMIN_DASHBOARD');
        // Clean URL hash and ensure clean /admin path
        if (window.location.hash.includes('access_token') || !window.location.pathname.startsWith('/admin')) {
          window.history.replaceState({}, document.title, '/admin');
        }
      };

      client.auth.getSession().then(async ({ data: { session } }) => {
        if (session?.user?.email) {
          const allowed = await verifyAllowedAdmin(session.user.email);
          if (allowed) {
            handleAdminEntry();
          }
        }
      });

      const { data: authListener } = client.auth.onAuthStateChange(
        async (event, session) => {
          if (session?.user?.email) {
            const allowed = await verifyAllowedAdmin(session.user.email);
            if (allowed) {
              handleAdminEntry();
            }
          } else if (event === 'SIGNED_OUT') {
            setIsAdminLoggedIn(false);
          }
        }
      );

      return () => {
        authListener.subscription.unsubscribe();
      };
    }
  }, []);

  // Restore session or URL routing on initial load
  useEffect(() => {
    const pathname = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    const urlToken = searchParams.get('token');

    // If returning from Google OAuth callback (hash contains access_token)
    if (window.location.hash.includes('access_token')) {
      // Handled by auth listener above
      return;
    }

    // Admin path detection
    if (pathname.startsWith('/admin')) {
      setCurrentView(isAdminLoggedIn ? 'ADMIN_DASHBOARD' : 'ADMIN_LOGIN');
      return;
    }

    // Direct token parameter check: Cukup paste ke kolom input di TOKEN_ENTRY, jangan langsung masuk ke biodata
    if (urlToken) {
      setCurrentView('TOKEN_ENTRY');
      return;
    }

    // Try restoring from sessionStorage
    const savedToken = sessionStorage.getItem('antara_active_token');
    if (savedToken) {
      validateToken(savedToken).then((res) => {
        if (res.tokenRecord && res.session) {
          setActiveTokenRecord(res.tokenRecord);
          setActiveSession(res.session);
          if (res.tokenRecord.status === 'SELESAI') {
            setCurrentView('COMPLETION');
          } else if (res.tokenRecord.status === 'SEDANG_MENGERJAKAN') {
            setCurrentView('TEST');
          } else {
            setCurrentView('BIODATA');
          }
        }
      });
    }
  }, [isAdminLoggedIn]);

  // Handlers for user flow
  const handleTokenVerified = (tokenRecord: TokenRecord, session: TestSession) => {
    setActiveTokenRecord(tokenRecord);
    setActiveSession(session);
    sessionStorage.setItem('antara_active_token', tokenRecord.token);

    if (tokenRecord.status === 'SEDANG_MENGERJAKAN') {
      setCurrentView('TEST');
    } else {
      setCurrentView('BIODATA');
    }
  };

  const handleBiodataSubmitted = (updatedToken: TokenRecord) => {
    setActiveTokenRecord(updatedToken);
    setCurrentView('TEST');
  };

  const handleTestSubmitted = (updatedToken: TokenRecord) => {
    setActiveTokenRecord(updatedToken);
    setCurrentView('COMPLETION');
  };

  const handleDone = () => {
    sessionStorage.removeItem('antara_active_token');
    setActiveTokenRecord(null);
    setActiveSession(null);
    setCurrentView('TOKEN_ENTRY');
    window.history.pushState({}, '', '/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-antara-bg text-antara-body selection:bg-purple-100 selection:text-purple-900">
      <Navbar
        currentView={currentView}
        onNavigateAdmin={() => {
          if (isAdminLoggedIn) {
            setCurrentView('ADMIN_DASHBOARD');
          } else {
            setCurrentView('ADMIN_LOGIN');
          }
          window.history.pushState({}, '', '/admin');
        }}
        onNavigateHome={() => {
          setCurrentView('TOKEN_ENTRY');
          window.history.pushState({}, '', '/');
        }}
      />

      <main className="flex-1 flex flex-col">
        {currentView === 'TOKEN_ENTRY' && (
          <TokenEntryPage onTokenVerified={handleTokenVerified} />
        )}

        {currentView === 'BIODATA' && activeTokenRecord && activeSession && (
          <BiodataPage
            tokenRecord={activeTokenRecord}
            session={activeSession}
            onBiodataSubmitted={handleBiodataSubmitted}
            onBack={() => setCurrentView('TOKEN_ENTRY')}
          />
        )}

        {currentView === 'TEST' && activeTokenRecord && activeSession && (
          <DassTestPage
            tokenRecord={activeTokenRecord}
            session={activeSession}
            onTestSubmitted={handleTestSubmitted}
          />
        )}

        {currentView === 'COMPLETION' && activeTokenRecord && activeSession && (
          <CompletionPage
            tokenRecord={activeTokenRecord}
            session={activeSession}
            onDone={handleDone}
          />
        )}

        {currentView === 'ADMIN_LOGIN' && (
          <AdminLoginPage
            onLoginSuccess={() => {
              setIsAdminLoggedIn(true);
              setCurrentView('ADMIN_DASHBOARD');
            }}
            onBackToHome={() => {
              setCurrentView('TOKEN_ENTRY');
              window.history.pushState({}, '', '/');
            }}
          />
        )}

        {currentView === 'ADMIN_DASHBOARD' && (
          <AdminDashboardPage
            onLogout={async () => {
              if (isSupabaseConfigured && supabase) {
                await supabase.auth.signOut();
              }
              setIsAdminLoggedIn(false);
              setCurrentView('TOKEN_ENTRY');
              window.history.pushState({}, '', '/');
            }}
            onNavigateHome={() => {
              setCurrentView('TOKEN_ENTRY');
              window.history.pushState({}, '', '/');
            }}
          />
        )}
      </main>

      <Footer />
    </div>
  );
};

export default App;
