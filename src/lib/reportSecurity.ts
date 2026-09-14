/**
 * reportSecurity.ts
 * Utilitas Enkripsi & Keamanan Tautan Download Laporan PDF Klien
 * Antara Psychology
 */

const SECURITY_SECRET = 'AntaraPsychology_ClinicalVault_v1_SecretSalt_2026';

function base64UrlEncode(str: string): string {
  try {
    const binary = unescape(encodeURIComponent(str));
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch {
    return btoa(str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
}

function base64UrlDecode(str: string): string {
  try {
    let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) {
      b64 += '=';
    }
    const binary = atob(b64);
    return decodeURIComponent(escape(binary));
  } catch {
    let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) {
      b64 += '=';
    }
    return atob(b64);
  }
}

// XOR transformation cipher with key stream
function xorTransform(input: string, key: string): string {
  let output = '';
  for (let i = 0; i < input.length; i++) {
    const charCode = input.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    output += String.fromCharCode(charCode);
  }
  return output;
}

// Checksum hash for integrity validation (prevent tampering)
function computeSignature(payload: string): string {
  const combined = `${payload}:${SECURITY_SECRET}`;
  let h1 = 0xdeadbeef;
  let h2 = 0x41c64e6d;
  for (let i = 0; i < combined.length; i++) {
    const ch = combined.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/**
 * Komputasi hash satu arah token untuk verifikasi tanpa menyimpan plaintext token di URL
 */
export function computeSecureTokenHash(token: string): string {
  const clean = token.trim().toUpperCase().replace(/^ANT-?/i, '');
  const salt = `${SECURITY_SECRET}_TokenVerifierSalt_2026`;
  let h1 = 0x811c9dc5;
  let h2 = 0xcbf29ce4;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 16777619);
    h2 = Math.imul(h2 ^ ch, 1099511628);
  }
  for (let i = 0; i < salt.length; i++) {
    const ch = salt.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 16777619);
    h2 = Math.imul(h2 ^ ch, 1099511628);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `${(h1 >>> 0).toString(36)}-${(h2 >>> 0).toString(36)}`;
}

export interface EncryptedReportPayload {
  token?: string;
  tokenHash?: string;
  sessionId: string;
  issuedAt: number;
}

/**
 * Membuat token referensi download terenkripsi dan tahan tamper
 */
export function encryptReportDownloadRef(token: string, sessionId: string): string {
  const cleanToken = token.trim().toUpperCase();
  const tokenHash = computeSecureTokenHash(cleanToken);
  const payloadData = JSON.stringify({
    th: tokenHash,
    s: sessionId,
    iat: Date.now(),
  });

  const cipher = xorTransform(payloadData, SECURITY_SECRET);
  const encoded = base64UrlEncode(cipher);
  const sig = computeSignature(encoded);

  return `sec_${encoded}.${sig}`;
}

/**
 * Memverifikasi dan mendekripsi referensi download dari URL
 */
export function decryptReportDownloadRef(encryptedRef: string): EncryptedReportPayload | null {
  if (!encryptedRef || !encryptedRef.startsWith('sec_')) {
    return null;
  }

  const raw = encryptedRef.slice(4);
  const dotIdx = raw.lastIndexOf('.');
  if (dotIdx === -1) return null;

  const encoded = raw.substring(0, dotIdx);
  const sig = raw.substring(dotIdx + 1);

  // Validasi keaslian signature
  if (computeSignature(encoded) !== sig) {
    console.warn('Tampered or corrupted download reference signature');
    return null;
  }

  try {
    const cipher = base64UrlDecode(encoded);
    const jsonStr = xorTransform(cipher, SECURITY_SECRET);
    const parsed = JSON.parse(jsonStr);

    if (!parsed || (!parsed.th && !parsed.t) || !parsed.s) {
      return null;
    }

    // Validasi masa berlaku tautan (maksimal 60 hari)
    const MAX_AGE_MS = 60 * 24 * 60 * 60 * 1000;
    if (parsed.iat && Date.now() - parsed.iat > MAX_AGE_MS) {
      console.warn('Download reference has expired');
      return null;
    }

    return {
      token: parsed.t,
      tokenHash: parsed.th,
      sessionId: parsed.s,
      issuedAt: parsed.iat || Date.now(),
    };
  } catch (err) {
    console.error('Failed to decrypt report reference:', err);
    return null;
  }
}

/**
 * Menghasilkan link download lengkap terenkripsi untuk dibagikan ke klien
 */
export function generateEncryptedDownloadUrl(token: string, sessionId: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const encryptedRef = encryptReportDownloadRef(token, sessionId);
  return `${origin}/?download=${encodeURIComponent(encryptedRef)}`;
}

/**
 * Template pesan WhatsApp untuk membagikan link download PDF ke klien
 */
export function generateShareWhatsAppPdfMessage(
  clientName: string,
  downloadUrl: string
): string {
  const name = clientName ? clientName.trim() : 'Peserta';
  return (
    `Halo ${name},\n\n` +
    `Hasil Laporan Asesmen Mental Health Check Up Anda dari Antara Psychology telah siap.\n\n` +
    `Silakan buka tautan terenkripsi berikut untuk mengunduh laporan PDF resmi Anda:\n` +
    `${downloadUrl}\n\n` +
    `🔒 Catatan Keamanan: Untuk menjaga kerahasiaan data medis/klinis Anda, silakan masukkan Kode Token unik pemeriksaan Anda saat mengakses tautan di atas.\n\n` +
    `Salam,\n` +
    `Tim Antara Psychology`
  );
}
