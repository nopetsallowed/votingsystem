interface ImageUploadOptions {
  maxDimension?: number;
  quality?: number;
  maxFileSize?: number;
}

const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the selected image."));
    reader.readAsDataURL(file);
  });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not prepare the selected image."));
    };

    image.src = url;
  });
}

export async function prepareImageUpload(file: File, options: ImageUploadOptions = {}) {
  const maxFileSize = options.maxFileSize ?? DEFAULT_MAX_FILE_SIZE;
  if (!file.type.startsWith("image/")) {
    throw new Error("Please upload an image file.");
  }

  if (file.size > maxFileSize) {
    throw new Error("Image must be 5MB or smaller.");
  }

  if (file.type === "image/svg+xml") {
    return readFileAsDataUrl(file);
  }

  const maxDimension = options.maxDimension ?? 720;
  const quality = options.quality ?? 0.82;
  const image = await loadImage(file);
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    return readFileAsDataUrl(file);
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", quality);
}
