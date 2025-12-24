/**
 * Storage service for Supabase file uploads
 * Handles file uploads to Supabase Storage buckets
 */

import { supabaseAdmin } from '../supabase'
import { FileMetadata } from '../utils/metadataExtractor'

export interface UploadResult {
  fileUrl: string
  filePath: string
  metadata: FileMetadata
}

/**
 * Upload file to Supabase Storage
 * @param bucket - Storage bucket name (e.g., 'vault-files')
 * @param filePath - Path within bucket (e.g., 'user-id/filename.jpg')
 * @param fileBuffer - File buffer to upload
 * @param mimeType - MIME type of the file
 * @returns Upload result with file URL
 */
export async function uploadToStorage(
  bucket: string,
  filePath: string,
  fileBuffer: Buffer,
  mimeType: string,
): Promise<{ fileUrl: string; filePath: string }> {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(filePath, fileBuffer, {
      contentType: mimeType,
      upsert: false, // Don't overwrite existing files
    })

  if (error) {
    throw new Error(`Failed to upload file to storage: ${error.message}`)
  }

  // For private buckets, generate signed URL (valid for 1 year)
  // Signed URLs are required for private buckets
  const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(data.path, 31536000) // 1 year expiry (in seconds)

  if (signedUrlError || !signedUrlData) {
    // Fallback: try public URL (for public buckets)
    const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(data.path)
    return {
      fileUrl: urlData.publicUrl,
      filePath: data.path,
    }
  }

  return {
    fileUrl: signedUrlData.signedUrl,
    filePath: data.path,
  }
}

/**
 * Delete file from Supabase Storage
 */
export async function deleteFromStorage(bucket: string, filePath: string): Promise<void> {
  const { error } = await supabaseAdmin.storage.from(bucket).remove([filePath])

  if (error) {
    throw new Error(`Failed to delete file from storage: ${error.message}`)
  }
}

/**
 * Generate signed URL for a file in private bucket
 * @param bucket - Storage bucket name
 * @param filePath - Path to file within bucket
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Signed URL
 */
export async function getSignedUrl(
  bucket: string,
  filePath: string,
  expiresIn: number = 3600,
): Promise<string> {
  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(filePath, expiresIn)

  if (error || !data) {
    throw new Error(`Failed to generate signed URL: ${error?.message || 'Unknown error'}`)
  }

  return data.signedUrl
}

/**
 * Generate unique file path for user
 * Format: {userId}/{timestamp}-{random}-{filename}
 */
export function generateFilePath(userId: string, filename: string, bucket?: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
  return `${userId}/${timestamp}-${random}-${sanitizedFilename}`
}

