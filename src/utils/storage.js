import { supabase } from '../supabase/client';

const BUCKETS = {
  AVATARS: 'avatars',
  BANNERS: 'banners'
};

// Extract project ref from Supabase URL for public URLs
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const projectRef = supabaseUrl?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
const STORAGE_BASE_URL = projectRef
  ? `https://${projectRef}.supabase.co/storage/v1/object/public`
  : null;

/**
 * Upload a file to Supabase Storage
 * @param {string} bucket - Bucket name
 * @param {File} file - File to upload
 * @param {string} userId - User ID for file path
 * @returns {Promise<{data: string|null, error: Error|null}>}
 */
const uploadFile = async (bucket, file, userId) => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    const filePath = fileName;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        upsert: true,
        cacheControl: '3600'
      });

    if (error) throw error;

    // Build permanent public URL
    // Format: https://project.supabase.co/storage/v1/object/public/bucket/path
    if (!STORAGE_BASE_URL) {
      throw new Error('Unable to determine storage URL');
    }

    const permanentUrl = `${STORAGE_BASE_URL}/${bucket}/${filePath}`;

    return { data: permanentUrl, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

/**
 * Upload avatar image
 * @param {File} file - Avatar image file
 * @param {string} userId - User ID
 * @returns {Promise<{data: string|null, error: Error|null}>}
 */
export const uploadAvatar = async (file, userId) => {
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { data: null, error: new Error('Invalid file type. Please upload JPEG, PNG, GIF, or WebP.') };
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return { data: null, error: new Error('File too large. Maximum size is 5MB.') };
  }

  return uploadFile(BUCKETS.AVATARS, file, userId);
};

/**
 * Upload banner image
 * @param {File} file - Banner image file
 * @param {string} userId - User ID
 * @returns {Promise<{data: string|null, error: Error|null}>}
 */
export const uploadBanner = async (file, userId) => {
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { data: null, error: new Error('Invalid file type. Please upload JPEG, PNG, GIF, or WebP.') };
  }

  // Validate file size (max 10MB for banners)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return { data: null, error: new Error('File too large. Maximum size is 10MB.') };
  }

  return uploadFile(BUCKETS.BANNERS, file, userId);
};

/**
 * Delete a file from Supabase Storage
 * @param {string} bucket - Bucket name
 * @param {string} url - Public URL of the file
 * @returns {Promise<{error: Error|null}>}
 */
export const deleteFile = async (bucket, url) => {
  try {
    // Extract path from URL
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const filePath = pathParts.slice(pathParts.indexOf(bucket) + 1).join('/');

    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    return { error };
  } catch (error) {
    return { error };
  }
};
