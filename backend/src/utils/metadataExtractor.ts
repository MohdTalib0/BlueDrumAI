/**
 * Metadata extraction utilities
 * Extracts EXIF data, file info, and other metadata from uploaded files
 */

import { createHash } from 'crypto'

export interface FileMetadata {
  filename: string
  mimeType: string
  size: number
  hash: string // SHA-256 hash
  uploadedAt: string // ISO timestamp
  exif?: {
    dateTaken?: string
    location?: {
      latitude?: number
      longitude?: number
    }
    camera?: {
      make?: string
      model?: string
    }
  }
}

/**
 * Generate SHA-256 hash of file buffer
 */
export function generateFileHash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

/**
 * Extract basic metadata from file
 */
export function extractBasicMetadata(
  file: Express.Multer.File,
  buffer: Buffer,
): Omit<FileMetadata, 'exif'> {
  return {
    filename: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    hash: generateFileHash(buffer),
    uploadedAt: new Date().toISOString(),
  }
}

/**
 * Extract EXIF data from image files
 * Note: For MVP, we'll extract basic info. Full EXIF parsing can be added later with exifr or similar
 */
export async function extractExifData(
  buffer: Buffer,
  mimeType: string,
): Promise<FileMetadata['exif']> {
  // Only process image files
  if (!mimeType.startsWith('image/')) {
    return undefined
  }

  // For MVP, return basic structure
  // TODO: Add full EXIF parsing with exifr or similar library
  // This would extract:
  // - Date taken (DateTimeOriginal)
  // - GPS coordinates (GPSLatitude, GPSLongitude)
  // - Camera make/model (Make, Model)
  
  return {
    // Placeholder - will be enhanced with actual EXIF library
    dateTaken: new Date().toISOString(),
  }
}

/**
 * Extract full metadata including EXIF
 */
export async function extractMetadata(
  file: Express.Multer.File,
  buffer: Buffer,
): Promise<FileMetadata> {
  const basic = extractBasicMetadata(file, buffer)
  const exif = await extractExifData(buffer, file.mimetype)

  return {
    ...basic,
    ...(exif && { exif }),
  }
}

