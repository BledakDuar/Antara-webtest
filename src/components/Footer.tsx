import React, { useState, useEffect } from 'react';
import { getSiteSettings, SiteSettings } from '../lib/siteSettings';

export const Footer: React.FC = () => {
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

  return (
    <footer className="mt-auto border-t border-slate-200/80 bg-white py-8 print:hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center text-xs text-slate-500 space-y-2">
        <p className="font-semibold text-slate-800">{settings.footerCopyright}</p>
        <p className="text-slate-400 max-w-xl mx-auto leading-relaxed">
          {settings.footerDisclaimer}
        </p>
      </div>
    </footer>
  );
};
