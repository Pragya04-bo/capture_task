 // =====================
// IMAGE PREPROCESSING
// =====================

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () =>
      reject(new Error("Could not read image"));

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => resolve(img);

      img.onerror = () =>
        reject(new Error("Invalid image"));

      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
  });
}
 export async function preprocessImage(file) {
  return file;
}

// =====================
// IMAGE VALIDATION
// =====================

export function validateImage(file) {
  const errors = [];

  const validTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  if (!validTypes.includes(file.type)) {
    errors.push(`Invalid type: ${file.type}`);
  }

  const MAX_SIZE = 10 * 1024 * 1024;

  if (file.size > MAX_SIZE) {
    errors.push(
      `File too large (${(
        file.size /
        1024 /
        1024
      ).toFixed(2)} MB)`
    );
  }

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onerror = () => {
      errors.push("Unable to read file");

      resolve({
        valid: false,
        errors,
      });
    };

    reader.onload = (e) => {
      const img = new Image();

      img.onerror = () => {
        errors.push(
          "Corrupted or unsupported image"
        );

        resolve({
          valid: false,
          errors,
        });
      };

      img.onload = () => {
        if (
          img.width < 300 ||
          img.height < 300
        ) {
          errors.push(
            `Image too small (${img.width}x${img.height})`
          );
        }

        resolve({
          valid: errors.length === 0,
          errors,
          dimensions: {
            width: img.width,
            height: img.height,
          },
        });
      };

      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
  });
}