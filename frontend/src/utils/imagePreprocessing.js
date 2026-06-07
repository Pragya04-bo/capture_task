export async function preprocessImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = img.width;
        canvas.height = img.height;

        // Draw original image
        ctx.drawImage(img, 0, 0);

        // Get image data
        const imageData = ctx.getImageData(
          0,
          0,
          canvas.width,
          canvas.height
        );
        const data = imageData.data;

        // Apply contrast enhancement (1.5x)
        const contrast = 1.5;
        const intercept = 128 * (1 - contrast);

        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, data[i] * contrast + intercept); // R
          data[i + 1] = Math.min(255, data[i + 1] * contrast + intercept); // G
          data[i + 2] = Math.min(255, data[i + 2] * contrast + intercept); // B
        }

        // Convert to grayscale
        for (let i = 0; i < data.length; i += 4) {
          const gray =
            data[i] * 0.299 +
            data[i + 1] * 0.587 +
            data[i + 2] * 0.114;
          data[i] = gray;
          data[i + 1] = gray;
          data[i + 2] = gray;
        }

        ctx.putImageData(imageData, 0, 0);

        canvas.toBlob(
          (blob) => {
            resolve(blob);
          },
          "image/png",
          0.95
        );
      };

      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = e.target.result;
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function validateImage(file) {
  const errors = [];

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    errors.push(
      `File too large (${(
        file.size /
        1024 /
        1024
      ).toFixed(1)}MB > 10MB)`
    );
  }

  // Check file type
  const validTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];
  if (!validTypes.includes(file.type)) {
    errors.push(`Invalid type: ${file.type}`);
  }

  // Check image dimensions
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        if (img.width < 300 || img.height < 300) {
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