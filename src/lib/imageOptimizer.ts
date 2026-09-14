/**
 * Image Optimizer Utility
 * Kompresi dan konversi cerdas di browser (Client-Side)
 * Mengoptimalkan file logo ke format WebP / SVG / PNG tanpa mengurangi ketajaman
 */

export interface OptimizedImageResult {
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  reductionPercentage: number;
  format: 'webp' | 'png' | 'svg';
  width: number;
  height: number;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Mengompresi dan mengonversi file gambar yang diunggah
 * - SVG: Dipertahankan sebagai vektor asli beresolusi tak terbatas (Data URL)
 * - PNG / JPG / WebP: Di-resize ke resolusi retina optimal (maks 400x400px) dan dikonversi ke WebP tajam
 */
export async function optimizeUploadedLogo(
  file: File,
  maxDimension = 400
): Promise<OptimizedImageResult> {
  const originalSize = file.size;

  // 1. Jika file SVG, pertahankan format vektor lossless
  if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        resolve({
          dataUrl,
          originalSize,
          compressedSize: dataUrl.length,
          reductionPercentage: 0,
          format: 'svg',
          width: maxDimension,
          height: maxDimension,
        });
      };
      reader.onerror = () => reject(new Error('Gagal membaca file SVG.'));
      reader.readAsDataURL(file);
    });
  }

  // 2. Untuk file raster (PNG, JPG, WebP), lakukan kompresi via Canvas
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          let { width, height } = img;

          // Skala proporsional mempertahankan aspect ratio
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('Canvas context 2D tidak didukung pada browser ini.');
          }

          // Kualitas resampling gambar tertinggi
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Gambar ulang pada canvas
          ctx.drawImage(img, 0, 0, width, height);

          // Coba konversi ke format modern WebP dengan kualitas tinggi (0.92)
          let dataUrl = canvas.toDataURL('image/webp', 0.92);
          let format: 'webp' | 'png' = 'webp';

          // Fallback ke PNG jika WebP tidak didukung browser atau menghasilkan output aneh
          if (!dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/png');
            format = 'png';
          }

          // Hitung estimasi ukuran Base64 dalam byte (3/4 dari panjang string dataURL)
          const compressedSize = Math.round((dataUrl.length * 3) / 4);
          const reductionPercentage = Math.max(
            0,
            Math.round(((originalSize - compressedSize) / originalSize) * 100)
          );

          resolve({
            dataUrl,
            originalSize,
            compressedSize,
            reductionPercentage,
            format,
            width,
            height,
          });
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => reject(new Error('Gagal memproses gambar. Pastikan format file valid.'));
      img.src = event.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.readAsDataURL(file);
  });
}
