/**
 * Image processing utilities for client-side ultra-fast compression and optimization.
 * Utilizes hardware-accelerated ImageBitmap decoding and URL.createObjectURL
 * to turn large 15MB-30MB smartphone camera photos into light 40KB-80KB WebP/JPEG assets in milliseconds.
 */

export interface CompressionResult {
  dataUrl: string;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  width: number;
  height: number;
  format: 'webp' | 'jpeg' | 'svg' | 'png';
  savedPercentage: number;
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Ultra-fast image compressor using native ImageBitmap or ObjectURL
 */
export async function compressImageDetailed(
  file: File,
  maxWidth = 960,
  maxHeight = 720,
  quality = 0.78
): Promise<CompressionResult> {
  const originalSize = file.size;

  // Basic validation
  if (!file.type.startsWith('image/')) {
    throw new Error('O arquivo selecionado não é uma imagem válida.');
  }

  // Preserve SVG directly
  if (file.type === 'image/svg+xml') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        resolve({
          dataUrl,
          originalSizeBytes: originalSize,
          compressedSizeBytes: originalSize,
          width: 0,
          height: 0,
          format: 'svg',
          savedPercentage: 0
        });
      };
      reader.onerror = () => reject(new Error('Erro ao ler SVG'));
      reader.readAsDataURL(file);
    });
  }

  // Calculate target dimensions keeping aspect ratio
  const calculateDimensions = (w: number, h: number) => {
    let width = w;
    let height = h;
    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.max(1, Math.round(width * ratio));
      height = Math.max(1, Math.round(height * ratio));
    }
    return { width, height };
  };

  // Method A: Modern createImageBitmap with native downsampling (fastest, hardware accelerated)
  if (typeof window !== 'undefined' && 'createImageBitmap' in window) {
    try {
      // First get original size quickly
      const initialBitmap = await createImageBitmap(file);
      const { width: targetW, height: targetH } = calculateDimensions(
        initialBitmap.width,
        initialBitmap.height
      );
      initialBitmap.close();

      // Native hardware downscale during decode if supported
      let scaledBitmap: ImageBitmap;
      try {
        scaledBitmap = await createImageBitmap(file, {
          resizeWidth: targetW,
          resizeHeight: targetH,
          resizeQuality: 'medium'
        });
      } catch {
        scaledBitmap = await createImageBitmap(file);
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d', { alpha: false });

      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.drawImage(scaledBitmap, 0, 0, targetW, targetH);
        scaledBitmap.close();

        // Prefer modern WebP (30-40% smaller than JPEG), fallback to JPEG
        let dataUrl = '';
        let format: 'webp' | 'jpeg' = 'webp';

        try {
          dataUrl = canvas.toDataURL('image/webp', quality);
          if (!dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', quality);
            format = 'jpeg';
          }
        } catch {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
          format = 'jpeg';
        }

        // Approximate size from base64 string length
        const base64Length = dataUrl.length - (dataUrl.indexOf(',') + 1);
        const compressedSize = Math.round((base64Length * 3) / 4);
        const savedPercentage = originalSize > 0 
          ? Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100))
          : 0;

        return {
          dataUrl,
          originalSizeBytes: originalSize,
          compressedSizeBytes: compressedSize,
          width: targetW,
          height: targetH,
          format,
          savedPercentage
        };
      }
    } catch (err) {
      console.warn('createImageBitmap failed, falling back to URL.createObjectURL', err);
    }
  }

  // Method B: URL.createObjectURL (faster than FileReader by avoiding base64 conversion)
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const { width: targetW, height: targetH } = calculateDimensions(img.width, img.height);

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Contexto 2D não disponível'));
        return;
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetW, targetH);
      ctx.drawImage(img, 0, 0, targetW, targetH);

      let dataUrl = '';
      let format: 'webp' | 'jpeg' = 'webp';
      try {
        dataUrl = canvas.toDataURL('image/webp', quality);
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
          format = 'jpeg';
        }
      } catch {
        dataUrl = canvas.toDataURL('image/jpeg', quality);
        format = 'jpeg';
      }

      const base64Length = dataUrl.length - (dataUrl.indexOf(',') + 1);
      const compressedSize = Math.round((base64Length * 3) / 4);
      const savedPercentage = originalSize > 0
        ? Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100))
        : 0;

      resolve({
        dataUrl,
        originalSizeBytes: originalSize,
        compressedSizeBytes: compressedSize,
        width: targetW,
        height: targetH,
        format,
        savedPercentage
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Falha ao decodificar arquivo de imagem.'));
    };

    img.src = objectUrl;
  });
}

/**
 * Standard compressImageFile returning dataUrl string directly
 */
export async function compressImageFile(
  file: File,
  maxWidth = 960,
  maxHeight = 720,
  quality = 0.78
): Promise<string> {
  const result = await compressImageDetailed(file, maxWidth, maxHeight, quality);
  return result.dataUrl;
}
