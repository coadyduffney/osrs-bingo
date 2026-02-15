import { compressImage } from './imageUpload';

export interface ImgBBUploadResponse {
  url: string;
  deleteUrl: string;
}

/**
 * Upload an image to ImgBB
 * Free tier: 100 uploads per hour, unlimited storage
 * API Documentation: https://api.imgbb.com/
 */
export async function uploadToImgBB(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<ImgBBUploadResponse> {
  // Use the define'd value from vite.config.ts
  const apiKey = (window as any).__VITE_IMGBB_API_KEY__ || import.meta.env.VITE_IMGBB_API_KEY;

  console.log('ImgBB API Key loaded:', apiKey ? 'yes' : 'NO');

  if (!apiKey) {
    throw new Error(
      'ImgBB API key not configured. Please set VITE_IMGBB_API_KEY in your .env file.',
    );
  }

  try {
    // Compress the image first
    onProgress?.(25);
    const compressedBlob = await compressImage(file);

    // Convert to base64 (ImgBB accepts base64)
    onProgress?.(50);
    const base64 = await blobToBase64(compressedBlob);
    // Remove the data:image/...;base64, prefix
    const base64Data = base64.split(',')[1];

    // Upload to ImgBB
    onProgress?.(75);
    const formData = new FormData();
    formData.append('image', base64Data);

    const response = await fetch(
      `https://api.imgbb.com/1/upload?key=${apiKey}`,
      {
        method: 'POST',
        body: formData,
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `ImgBB upload failed: ${errorData.error?.message || response.statusText}`,
      );
    }

    const data = await response.json();
    onProgress?.(100);

    return {
      url: data.data.url,
      deleteUrl: data.data.delete_url,
    };
  } catch (error) {
    console.error('ImgBB upload error:', error);
    throw new Error(
      `Failed to upload image to ImgBB: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Delete an image from ImgBB (optional - uses delete URL)
 */
export async function deleteFromImgBB(deleteUrl: string): Promise<void> {
  try {
    // ImgBB provides a delete URL that can be visited to delete the image
    // This is typically done via browser, not API
    // For programmatic deletion, you'd need to parse the delete URL
    console.log('To delete this image, visit:', deleteUrl);
  } catch (error) {
    console.error('ImgBB delete error:', error);
    throw error;
  }
}

/**
 * Convert a Blob to base64 string
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
