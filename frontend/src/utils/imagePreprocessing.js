 /*
 * Image preprocessing pipeline for weighbridge slip photos.
 *
 * WHY THESE STEPS (document type = printed weighbridge slips shot on a phone):
 *  1. Downscale (cap long edge ~1600px) - phone photos are 8-12MP; OCR gains
 *     nothing from that resolution but pays a large CPU cost. Downscaling also
 *     averages out sensor noise. Effectiveness > resolution.
 *  2. Grayscale - slip text is monochrome; color channels only add noise and
 *     triple the work for every later step.
 *  3. Median denoise (3x3) - removes salt-and-pepper speckle from compression
 *     and low light WITHOUT blurring edges the way a Gaussian would, so thin
 *     printed digits stay crisp.
 *  4. Adaptive (local-mean) threshold - this is the key step. It binarizes
 *     using a per-pixel local background, which simultaneously fixes uneven
 *     lighting and GLARE GRADIENTS (a bright corner no longer washes out text)
 *     and produces the clean black-on-white image Tesseract reads best. A
 *     single global threshold fails on phone photos because lighting is uneven.
 *  5. Auto-crop borders - trims the dark/empty margins around the slip so OCR
 *     focuses on content and confidence isn't diluted by background clutter.
 *
 * DELIBERATELY NOT DONE (and why):
 *  - Full perspective correction / deskew: robust corner detection needs
 *    OpenCV-class tooling. A naive warp risks distorting text and HURTING OCR,
 *    so we keep the pipeline dependency-free and let adaptive thresholding +
 *    crop carry the load. This is a hook point if a CV lib is added later.
 */

const MAX_EDGE = 1600;
const THRESH_WINDOW = 15; // odd; local neighborhood for adaptive threshold
const THRESH_C = 10; // bias subtracted from local mean

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(new Error("Could not read file (corrupted?)"));
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () =>
        reject(new Error("Invalid or corrupted image"));
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function drawScaled(img) {
  const scale = Math.min(
    1,
    MAX_EDGE / Math.max(img.width, img.height)
  );
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);
  return { canvas, ctx, w, h };
}

// Returns a Uint8ClampedArray (length w*h) of grayscale values
// function toGray(imageData) {
//   const { data, width, height } = imageData;
//   const gray = new Uint8ClampedArray(width * height);
//   for (let i = 0, p = 0; i < data.length; i += 4, p++) {
//     gray[p] =
//       data[i] * 0.299 +
//       data[i + 1] * 0.587 +
//       data[i + 2] * 0.114;
//   }
//   return gray;
// }

// 3x3 median filter (edge-preserving denoise)
// function medianDenoise(gray, w, h) {
//   const out = new Uint8ClampedArray(gray.length);
//   const win = new Array(9);
//   for (let y = 0; y < h; y++) {
//     for (let x = 0; x < w; x++) {
//       let k = 0;
//       for (let dy = -1; dy <= 1; dy++) {
//         for (let dx = -1; dx <= 1; dx++) {
//           const ny = Math.min(h - 1, Math.max(0, y + dy));
//           const nx = Math.min(w - 1, Math.max(0, x + dx));
//           win[k++] = gray[ny * w + nx];
//         }
//       }
//       win.sort((a, b) => a - b);
//       out[y * w + x] = win[4];
//     }
//   }
//   return out;
// }

// Adaptive threshold via integral image (local mean - C).
// // Returns binary Uint8ClampedArray (0 or 255) plus the dark-pixel bbox.
// function adaptiveThreshold(gray, w, h) {
//   // integral image
//   const integral = new Float64Array((w + 1) * (h + 1));
//   for (let y = 1; y <= h; y++) {
//     let rowSum = 0;
//     for (let x = 1; x <= w; x++) {
//       rowSum += gray[(y - 1) * w + (x - 1)];
//       integral[y * (w + 1) + x] =
//         integral[(y - 1) * (w + 1) + x] + rowSum;
//     }
//   }

//   const half = Math.floor(THRESH_WINDOW / 2);
//   const bin = new Uint8ClampedArray(w * h);
//   let minX = w,
//     minY = h,
//     maxX = 0,
//     maxY = 0,
//     darkCount = 0;

//   for (let y = 0; y < h; y++) {
//     for (let x = 0; x < w; x++) {
//       const x1 = Math.max(0, x - half);
//       const y1 = Math.max(0, y - half);
//       const x2 = Math.min(w - 1, x + half);
//       const y2 = Math.min(h - 1, y + half);
//       const area = (x2 - x1 + 1) * (y2 - y1 + 1);

//       const sum =
//         integral[(y2 + 1) * (w + 1) + (x2 + 1)] -
//         integral[y1 * (w + 1) + (x2 + 1)] -
//         integral[(y2 + 1) * (w + 1) + x1] +
//         integral[y1 * (w + 1) + x1];

//       const mean = sum / area;
//       const isDark = gray[y * w + x] < mean - THRESH_C;
//       const v = isDark ? 0 : 255;
//       bin[y * w + x] = v;

//       if (isDark) {
//         darkCount++;
//         if (x < minX) minX = x;
//         if (x > maxX) maxX = x;
//         if (y < minY) minY = y;
//         if (y > maxY) maxY = y;
//       }
//     }
//   }

//   const bbox =
//     darkCount > 0
//       ? { minX, minY, maxX, maxY }
//       : { minX: 0, minY: 0, maxX: w - 1, maxY: h - 1 };

//   return { bin, bbox };
// }
 export async function preprocessImage(file) {
  const img = await loadImageFromFile(file);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  // Resize for OCR stability
  const MAX_WIDTH = 1800;
  const scale = Math.min(1, MAX_WIDTH / img.width);

  canvas.width = img.width * scale;
  canvas.height = img.height * scale;

  // Draw image
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // Light enhancement only (IMPORTANT)
  ctx.filter = "grayscale(100%) contrast(160%) brightness(105%)";
  ctx.drawImage(canvas, 0, 0);

  // Return processed image
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png", 0.95);
  });
}

export function validateImage(file) {
  const errors = [];

  // Type
  const validTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!validTypes.includes(file.type)) {
    errors.push(`Invalid type: ${file.type || "unknown"}`);
  }

  // Size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    errors.push(
      `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB > 10MB)`
    );
  }

  // Dimensions + corruption check (resolves even on failure)
  return new Promise((resolve) => {
    const reader = new FileReader();

    const finish = (extra) => {
      if (extra) errors.push(extra);
      resolve({ valid: errors.length === 0, errors });
    };

    reader.onerror = () =>
      finish("File unreadable (corrupted)");

    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () =>
        finish("Corrupted or unsupported image");
      img.onload = () => {
        if (img.width < 300 || img.height < 300) {
          errors.push(
            `Image too small (${img.width}x${img.height})`
          );
        }
        resolve({
          valid: errors.length === 0,
          errors,
          dimensions: { width: img.width, height: img.height },
        });
      };
      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
  });
}
