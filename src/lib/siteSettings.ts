export interface SiteSettings {
  siteTitle: string;
  siteDescription: string;
  siteKeywords: string;
  brandName: string;
  brandSubtitle: string;
  logoUrl: string;
  footerCopyright: string;
  footerDisclaimer: string;
  whatsappNumber: string;
  instagramUsername: string;
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  siteTitle: 'Antara Psychology — Sistem Psikotes Online',
  siteDescription: 'Sistem asesmen psikotes klinis komprehensif, tenang, dan terpercaya dari Antara Psychology.',
  siteKeywords: 'psikotes, antara psychology, kesehatan mental, konseling, pemeriksaan psikologi',
  brandName: 'Antara Psychology',
  brandSubtitle: 'Sistem Psikotes & Pemeriksaan Klinis',
  logoUrl: '/logo.png',
  footerCopyright: `Antara Psychology © ${new Date().getFullYear()} — Layanan Psikotes & Asesmen Psikologi Klinis`,
  footerDisclaimer: 'Kuesioner ini digunakan untuk kepentingan evaluasi psikologis klinis terstruktur. Seluruh data peserta dijamin kerahasiaannya sesuai standar kode etik psikologi.',
  whatsappNumber: '0851-3976-7220',
  instagramUsername: 'antarapsychology',
};

const SETTINGS_KEY = 'antara_site_settings';

export function getSiteSettings(): SiteSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return { ...DEFAULT_SITE_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {
    // fallback
  }
  return DEFAULT_SITE_SETTINGS;
}

export function saveSiteSettings(settings: SiteSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    applySeoSettings(settings);
    window.dispatchEvent(new CustomEvent('antara_settings_updated', { detail: settings }));
  } catch (err) {
    console.error('Failed to save site settings', err);
  }
}

export function applySeoSettings(settings: SiteSettings): void {
  if (typeof document === 'undefined') return;

  // Title
  document.title = settings.siteTitle;

  // Description meta
  let metaDesc = document.querySelector('meta[name="description"]');
  if (!metaDesc) {
    metaDesc = document.createElement('meta');
    metaDesc.setAttribute('name', 'description');
    document.head.appendChild(metaDesc);
  }
  metaDesc.setAttribute('content', settings.siteDescription);

  // Keywords meta
  let metaKeywords = document.querySelector('meta[name="keywords"]');
  if (!metaKeywords) {
    metaKeywords = document.createElement('meta');
    metaKeywords.setAttribute('name', 'keywords');
    document.head.appendChild(metaKeywords);
  }
  metaKeywords.setAttribute('content', settings.siteKeywords);
}
