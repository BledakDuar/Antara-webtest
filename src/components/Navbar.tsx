import React, { useState, useEffect } from 'react';
import { getSiteSettings, SiteSettings } from '../lib/siteSettings';

interface NavbarProps {
  currentView?: string;
  onNavigateAdmin?: () => void;
  onNavigateHome?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView = 'TOKEN_ENTRY',
  onNavigateAdmin,
  onNavigateHome,
}) => {
  const [settings, setSettings] = useState<SiteSettings>(getSiteSettings());

  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e.detail) {
        setSettings(e.detail);
      } else {
        setSettings(getSiteSettings());
      }
    };
    window.addEventListener('antara_settings_updated', handleUpdate);
    return () => window.removeEventListener('antara_settings_updated', handleUpdate);
  }, []);

  // Sembunyikan shortcut admin pada tampilan klien untuk menjaga privasi & fokus klinis
  const isClientView = ['TOKEN_ENTRY', 'BIODATA', 'TEST', 'COMPLETION', 'CLIENT_DOWNLOAD'].includes(currentView);

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-colors">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <button
          onClick={onNavigateHome}
          className="flex items-center gap-3 text-left group focus:outline-none"
        >
          {/* Logo Gambar PNG Resmi Antara Psychology - Desain Bulat */}
          <div className="w-10 h-10 rounded-full bg-white border border-slate-200/90 p-0.5 flex items-center justify-center overflow-hidden shadow-xs group-hover:border-purple-300 transition-colors">
            <img
              src={settings.logoUrl || '/logo.png'}
              alt={settings.brandName}
              className="w-full h-full object-contain rounded-full"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 tracking-tight text-[16px]">
                {settings.brandName}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-none">
              {settings.brandSubtitle}
            </p>
          </div>
        </button>

        {/* Right Area: Hanya tampilkan tombol navigasi jika BUKAN tampilan klien */}
        {!isClientView && onNavigateAdmin && (
          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateAdmin}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <span>Portal Admin</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
