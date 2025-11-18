// File size limits
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB

// Supported file types
export const SUPPORTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
export const SUPPORTED_AUDIO_TYPES = ['audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/wav'];

// Convert file to base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove data URL prefix to get only base64 data
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Convert file to data URL (includes type prefix)
export const fileToDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Validate image file
export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported file type. Supported types: ${SUPPORTED_IMAGE_TYPES.join(', ')}`,
    };
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds ${MAX_IMAGE_SIZE / 1024 / 1024}MB limit`,
    };
  }

  return { valid: true };
};

// Validate audio file
export const validateAudioFile = (file: File): { valid: boolean; error?: string } => {
  if (!SUPPORTED_AUDIO_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported file type. Supported types: ${SUPPORTED_AUDIO_TYPES.join(', ')}`,
    };
  }

  if (file.size > MAX_AUDIO_SIZE) {
    return {
      valid: false,
      error: `File size exceeds ${MAX_AUDIO_SIZE / 1024 / 1024}MB limit`,
    };
  }

  return { valid: true };
};

// Format file size for display
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

// Get file extension
export const getFileExtension = (filename: string): string => {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2);
};

// Create thumbnail for image
export const createImageThumbnail = (
  file: File,
  maxWidth: number = 200,
  maxHeight: number = 200
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL(file.type));
        } else {
          reject(new Error('Failed to get canvas context'));
        }
      };

      img.onerror = reject;
      img.src = e.target?.result as string;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
