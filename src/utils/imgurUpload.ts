import { compressImage } from './imageUpload';

const IMGUR_API_URL = 'https://api.imgur.com/3/image';
const IMGUR_CLIENT_ID = import.meta.env.VITE_IMGUR_CLIENT_ID;

export interface ImgurUploadResponse {
  url: string;
  deleteHash: string; // For deletion later
}

/**
 * Upload image to Imgur
 */
export async function uploadToImgur(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<ImgurUploadResponse> {
  if (!IMGUR_CLIENT_ID) {
    throw new Error('Imgur Client ID not configured. Please add VITE_IMGUR_CLIENT_ID to your .env file.');
  }

  try {
    // Compress image first
    onProgress?.(25);
    const compressedBlob = await compressImage(file);

    // Convert to base64
    onProgress?.(50);
    const base64 = await blobToBase64(compressedBlob);
    const base64Data = base64.split(',')[1]; // Remove data:image/jpeg;base64, prefix

    onProgress?.(75);

    // Upload to Imgur
    const response = await fetch(IMGUR_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Client-ID ${IMGUR_CLIENT_ID}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Data,
        type: 'base64',
      }),
    });

    onProgress?.(100);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Imgur upload failed: ${errorData.data?.error || response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error('Imgur upload failed');
    }

    return {
      url: data.data.link,
      deleteHash: data.data.deletehash,
    };
  } catch (error) {
    console.error('Imgur upload error:', error);
    throw error;
  }
}

/**
 * Delete image from Imgur (requires delete hash)
 */
export async function deleteFromImgur(deleteHash: string): Promise<void> {
  if (!IMGUR_CLIENT_ID) {
    throw new Error('Imgur Client ID not configured');
  }

  try {
    const response = await fetch(`${IMGUR_API_URL}/${deleteHash}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Client-ID ${IMGUR_CLIENT_ID}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Imgur deletion failed: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Imgur deletion error:', error);
    throw error;
  }
}

/**
 * Convert Blob to base64
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
