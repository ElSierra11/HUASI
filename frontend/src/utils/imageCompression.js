/**
 * imageCompression.js
 * Utilidad de compresión de imágenes del lado del cliente usando Canvas nativo.
 * No requiere dependencias externas; funciona en cualquier navegador moderno.
 *
 * Exports:
 *  - compressImage(file, options?) — Promise<File>
 *  - getImageDimensions(file)      — Promise<{width, height}>
 */

/**
 * @typedef {Object} CompressOptions
 * @property {number} [maxWidthOrHeight=1920]  Dimensión máxima en px (ancho o alto)
 * @property {number} [quality=0.82]           Calidad JPEG/WebP (0–1)
 * @property {number} [maxSizeKB=800]          Tamaño máximo del archivo resultante en KB
 * @property {'image/jpeg'|'image/webp'} [outputType='image/jpeg']  Tipo MIME de salida
 */

const DEFAULT_OPTIONS = {
  maxWidthOrHeight: 1920,
  quality: 0.82,
  maxSizeKB: 800,
  outputType: 'image/jpeg',
};

/**
 * Obtiene las dimensiones de una imagen desde un File/Blob.
 * @param {File|Blob} file
 * @returns {Promise<{width: number, height: number}>}
 */
export function getImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen.'));
    };
    img.src = url;
  });
}

/**
 * Redimensiona y comprime una imagen usando Canvas.
 *
 * @param {File} file               Archivo de imagen original
 * @param {CompressOptions} [opts]  Opciones de compresión
 * @returns {Promise<File>}         Archivo comprimido (puede ser menor que el original)
 */
export async function compressImage(file, opts = {}) {
  const options = { ...DEFAULT_OPTIONS, ...opts };

  // Si el archivo ya es más pequeño que el límite, devolverlo tal cual
  if (file.size <= options.maxSizeKB * 1024) return file;

  // Solo comprimir imágenes
  if (!file.type.startsWith('image/')) {
    console.warn('[compressImage] El archivo no es una imagen:', file.type);
    return file;
  }

  const { width: origW, height: origH } = await getImageDimensions(file);

  // Calcular nuevo tamaño manteniendo aspect ratio
  let newW = origW;
  let newH = origH;
  const maxDim = options.maxWidthOrHeight;

  if (origW > maxDim || origH > maxDim) {
    if (origW >= origH) {
      newW = maxDim;
      newH = Math.round((origH / origW) * maxDim);
    } else {
      newH = maxDim;
      newW = Math.round((origW / origH) * maxDim);
    }
  }

  // Dibujar en canvas con el nuevo tamaño
  const canvas = document.createElement('canvas');
  canvas.width = newW;
  canvas.height = newH;
  const ctx = canvas.getContext('2d');

  // Fondo blanco para imágenes con transparencia convertidas a JPEG
  if (options.outputType === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, newW, newH);
  }

  const url = URL.createObjectURL(file);
  await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { ctx.drawImage(img, 0, 0, newW, newH); resolve(); };
    img.onerror = reject;
    img.src = url;
  });
  URL.revokeObjectURL(url);

  // Comprimir iterativamente hasta alcanzar el tamaño objetivo
  let quality = options.quality;
  let blob = await canvasToBlob(canvas, options.outputType, quality);

  while (blob.size > options.maxSizeKB * 1024 && quality > 0.3) {
    quality = Math.max(quality - 0.08, 0.3);
    blob = await canvasToBlob(canvas, options.outputType, quality);
  }

  // Mantener el nombre original con la nueva extensión
  const ext = options.outputType === 'image/webp' ? 'webp' : 'jpg';
  const baseName = file.name.replace(/\.[^.]+$/, '');
  const compressedFile = new File([blob], `${baseName}.${ext}`, {
    type: options.outputType,
    lastModified: Date.now(),
  });

  // Si la compresión empeoró el archivo (raro), devolver el original
  return compressedFile.size < file.size ? compressedFile : file;
}

/**
 * Convierte un canvas a Blob de forma promisificada.
 * @param {HTMLCanvasElement} canvas
 * @param {string} type
 * @param {number} quality
 * @returns {Promise<Blob>}
 */
function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('canvasToBlob: no se pudo generar el blob'));
      },
      type,
      quality
    );
  });
}
