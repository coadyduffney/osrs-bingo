import { storage } from '../config/firebase';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { uploadToImgBB } from './imgbbUpload';

/**
 * Compress and resize an image file before upload
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1920,
  quality: number = 0.85,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Calculate new dimensions
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          quality,
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
  });
}

/**
 * Upload verification image to Firebase Storage
 * Path: task-verifications/{eventId}/{taskId}/{teamId}/{timestamp}_{userId}.jpg
 */
export async function uploadVerificationImage(
  file: File,
  eventId: string,
  taskId: string,
  teamId: string,
  userId: string,
  onProgress?: (progress: number) => void,
): Promise<{ url: string; path: string }> {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('Image must be smaller than 10MB');
    }

    // Compress image
    const compressedBlob = await compressImage(file);

    // Generate unique filename
    const timestamp = Date.now();
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filename = `${timestamp}_${userId}.${extension}`;

    // Create storage path
    const storagePath = `task-verifications/${eventId}/${taskId}/${teamId}/${filename}`;
    const storageRef = ref(storage, storagePath);

    // Upload file
    const uploadTask = uploadBytesResumable(storageRef, compressedBlob, {
      contentType: 'image/jpeg',
    });

    // Return promise that resolves with download URL
    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Progress callback
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress?.(progress);
        },
        (error) => {
          // Error callback
          console.error('Upload error:', error);
          reject(new Error(`Upload failed: ${error.message}`));
        },
        async () => {
          // Success callback
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({
              url: downloadURL,
              path: storagePath,
            });
          } catch (error) {
            reject(error);
          }
        },
      );
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

/**
 * Delete verification image from Firebase Storage
 */
export async function deleteVerificationImage(
  storagePath: string,
): Promise<void> {
  try {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
  } catch (error: any) {
    // Ignore if file doesn't exist
    if (error.code !== 'storage/object-not-found') {
      console.error('Error deleting image:', error);
      throw error;
    }
  }
}

/**
 * Validate image file
 */
export function validateImageFile(file: File): {
  valid: boolean;
  error?: string;
} {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'File must be an image' };
  }

  // Check file size (10MB max)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: 'Image must be smaller than 10MB' };
  }

  // Check file type (allow common formats)
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ];
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Image must be JPG, PNG, GIF, or WebP' };
  }

  return { valid: true };
}

/**
 * Generate a thumbnail preview URL from a File
 */
export function generatePreviewUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Upload verification image with ImgBB
 * Uses ImgBB as the image hosting service
 */
export async function uploadVerificationImageWithFallback(
  file: File,
  _eventId: string,
  _taskId: string,
  _teamId: string,
  _userId: string,
  onProgress?: (progress: number) => void,
): Promise<{ url: string; path: string; provider: 'imgbb' }> {
  console.log('🖼️ Starting image upload process...');
  console.log('File details:', {
    name: file.name,
    type: file.type,
    size: file.size,
    sizeInMB: (file.size / 1024 / 1024).toFixed(2) + 'MB',
  });

  // Check if ImgBB API key is configured
  const imgbbApiKey = import.meta.env.VITE_IMGBB_API_KEY;
  
  console.log('🔑 Checking ImgBB API key configuration...');
  console.log('API Key present:', imgbbApiKey ? '✅ Yes' : '❌ No');
  console.log('API Key length:', imgbbApiKey ? imgbbApiKey.length : 0);
  console.log('API Key preview:', imgbbApiKey ? `${imgbbApiKey.substring(0, 8)}...` : 'undefined');
  console.log('Environment mode:', import.meta.env.MODE);
  console.log('All VITE env vars:', Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')));

  if (!imgbbApiKey) {
    console.error('❌ ImgBB API key is not configured!');
    throw new Error('Image upload not configured. ImgBB API key is missing.');
  }

  console.log('✅ ImgBB API key found, proceeding with upload...');

  try {
    console.log('📤 Calling ImgBB upload function...');
    const result = await uploadToImgBB(file, onProgress);
    
    console.log('✅ ImgBB upload successful!');
    console.log('Upload result:', {
      url: result.url,
      deleteUrl: result.deleteUrl ? `${result.deleteUrl.substring(0, 30)}...` : 'none',
    });
    
    return {
      url: result.url,
      path: `imgbb:${result.deleteUrl}`,
      provider: 'imgbb',
    };
  } catch (error: any) {
    console.error('❌ ImgBB upload failed with error:', error);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      response: error.response?.data,
    });
    throw new Error(`Image upload failed: ${error.message || 'Unknown error'}`);
  }
}
