/**
 * Lightweight EXIF metadata extractor for JPEG images
 * Parses essential EXIF tags: date taken, camera, GPS, dimensions, orientation
 * Uses raw ArrayBuffer parsing — no external dependencies
 */

export interface ExifData {
  dateTaken?: string
  camera?: string
  make?: string
  model?: string
  gpsLatitude?: number
  gpsLongitude?: number
  orientation?: number
  imageWidth?: number
  imageHeight?: number
  software?: string
}

// EXIF tag IDs
const TAG_ORIENTATION = 0x0112
const TAG_MAKE = 0x010f
const TAG_MODEL = 0x0110
const TAG_SOFTWARE = 0x0131
const TAG_DATE_TIME_ORIGINAL = 0x9003
const TAG_DATE_TIME = 0x0132
const TAG_IMAGE_WIDTH = 0xa002
const TAG_IMAGE_HEIGHT = 0xa003
const TAG_GPS_LATITUDE_REF = 0x0001
const TAG_GPS_LATITUDE = 0x0002
const TAG_GPS_LONGITUDE_REF = 0x0003
const TAG_GPS_LONGITUDE = 0x0004

/**
 * Read a 16-bit unsigned integer from a DataView
 */
function readUint16(view: DataView, offset: number, littleEndian: boolean): number {
  return view.getUint16(offset, littleEndian)
}

/**
 * Read a 32-bit unsigned integer from a DataView
 */
function readUint32(view: DataView, offset: number, littleEndian: boolean): number {
  return view.getUint32(offset, littleEndian)
}

/**
 * Read a string from a DataView
 */
function readString(view: DataView, offset: number, length: number): string {
  let str = ''
  for (let i = 0; i < length; i++) {
    const code = view.getUint8(offset + i)
    if (code === 0) break
    str += String.fromCharCode(code)
  }
  return str.trim()
}

/**
 * Convert GPS DMS (degrees, minutes, seconds) rational values to decimal degrees
 */
function convertGPSToDecimal(
  view: DataView,
  offset: number,
  littleEndian: boolean,
  ref: string,
): number | undefined {
  try {
    const degNum = readUint32(view, offset, littleEndian)
    const degDen = readUint32(view, offset + 4, littleEndian)
    const minNum = readUint32(view, offset + 8, littleEndian)
    const minDen = readUint32(view, offset + 12, littleEndian)
    const secNum = readUint32(view, offset + 16, littleEndian)
    const secDen = readUint32(view, offset + 20, littleEndian)

    if (degDen === 0 || minDen === 0 || secDen === 0) return undefined

    const degrees = degNum / degDen
    const minutes = minNum / minDen
    const seconds = secNum / secDen

    let decimal = degrees + minutes / 60 + seconds / 3600

    if (ref === 'S' || ref === 'W') {
      decimal = -decimal
    }

    return decimal
  } catch {
    return undefined
  }
}

/**
 * Parse IFD (Image File Directory) entries
 */
function parseIFD(
  view: DataView,
  tiffStart: number,
  ifdOffset: number,
  littleEndian: boolean,
): Map<number, { type: number; count: number; valueOffset: number }> {
  const entries = new Map<number, { type: number; count: number; valueOffset: number }>()

  try {
    const entryCount = readUint16(view, tiffStart + ifdOffset, littleEndian)

    for (let i = 0; i < entryCount; i++) {
      const entryOffset = tiffStart + ifdOffset + 2 + i * 12
      if (entryOffset + 12 > view.byteLength) break

      const tag = readUint16(view, entryOffset, littleEndian)
      const type = readUint16(view, entryOffset + 2, littleEndian)
      const count = readUint32(view, entryOffset + 4, littleEndian)
      const valueOffset = entryOffset + 8

      entries.set(tag, { type, count, valueOffset })
    }
  } catch {
    // Gracefully handle malformed IFD
  }

  return entries
}

/**
 * Get tag value based on type and count
 */
function getTagValue(
  view: DataView,
  tiffStart: number,
  entry: { type: number; count: number; valueOffset: number },
  littleEndian: boolean,
): number | string | undefined {
  const { type, count, valueOffset } = entry

  // Type sizes: 1=BYTE(1), 2=ASCII(1), 3=SHORT(2), 4=LONG(4), 5=RATIONAL(8)
  const typeSizes: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8 }
  const totalSize = (typeSizes[type] || 1) * count

  // If data fits in 4 bytes, it's stored inline; otherwise it's an offset
  const dataOffset = totalSize > 4
    ? tiffStart + readUint32(view, valueOffset, littleEndian)
    : valueOffset

  if (dataOffset < 0 || dataOffset >= view.byteLength) return undefined

  switch (type) {
    case 2: // ASCII string
      return readString(view, dataOffset, count)
    case 3: // SHORT
      return readUint16(view, dataOffset, littleEndian)
    case 4: // LONG
      return readUint32(view, dataOffset, littleEndian)
    default:
      return undefined
  }
}

/**
 * Extract EXIF metadata from a JPEG file's ArrayBuffer
 * Returns null if no EXIF data found or file is not JPEG
 */
export function extractExifData(buffer: ArrayBuffer): ExifData | null {
  try {
    const view = new DataView(buffer)

    // Verify JPEG SOI marker (FF D8)
    if (view.byteLength < 4) return null
    if (view.getUint8(0) !== 0xff || view.getUint8(1) !== 0xd8) return null

    // Find APP1 marker (FF E1) containing EXIF
    let offset = 2
    while (offset < view.byteLength - 4) {
      const marker = view.getUint8(offset)
      if (marker !== 0xff) {
        offset++
        continue
      }

      const markerType = view.getUint8(offset + 1)
      const segmentLength = view.getUint16(offset + 2)

      // APP1 marker with EXIF header
      if (markerType === 0xe1) {
        const exifHeader = readString(view, offset + 4, 4)
        if (exifHeader === 'Exif') {
          return parseExifSegment(view, offset + 10) // Skip marker(2) + length(2) + "Exif\0\0"(6)
        }
      }

      // Move to next marker
      offset += 2 + segmentLength

      // Stop at SOS marker (start of scan = end of metadata)
      if (markerType === 0xda) break
    }

    return null
  } catch {
    return null
  }
}

/**
 * Parse the EXIF TIFF structure
 */
function parseExifSegment(view: DataView, tiffStart: number): ExifData | null {
  try {
    if (tiffStart + 8 > view.byteLength) return null

    // Determine byte order (II = little-endian, MM = big-endian)
    const byteOrder = readUint16(view, tiffStart, false)
    const littleEndian = byteOrder === 0x4949 // 'II'

    // Verify TIFF magic number (42)
    const magic = readUint16(view, tiffStart + 2, littleEndian)
    if (magic !== 42) return null

    // Get IFD0 offset
    const ifd0Offset = readUint32(view, tiffStart + 4, littleEndian)

    const exif: ExifData = {}

    // Parse IFD0
    const ifd0 = parseIFD(view, tiffStart, ifd0Offset, littleEndian)

    // Make
    const makeEntry = ifd0.get(TAG_MAKE)
    if (makeEntry) {
      const val = getTagValue(view, tiffStart, makeEntry, littleEndian)
      if (typeof val === 'string') exif.make = val
    }

    // Model
    const modelEntry = ifd0.get(TAG_MODEL)
    if (modelEntry) {
      const val = getTagValue(view, tiffStart, modelEntry, littleEndian)
      if (typeof val === 'string') exif.model = val
    }

    // Orientation
    const orientEntry = ifd0.get(TAG_ORIENTATION)
    if (orientEntry) {
      const val = getTagValue(view, tiffStart, orientEntry, littleEndian)
      if (typeof val === 'number') exif.orientation = val
    }

    // Software
    const softwareEntry = ifd0.get(TAG_SOFTWARE)
    if (softwareEntry) {
      const val = getTagValue(view, tiffStart, softwareEntry, littleEndian)
      if (typeof val === 'string') exif.software = val
    }

    // DateTime
    const dateEntry = ifd0.get(TAG_DATE_TIME)
    if (dateEntry) {
      const val = getTagValue(view, tiffStart, dateEntry, littleEndian)
      if (typeof val === 'string') exif.dateTaken = val
    }

    // Camera string
    if (exif.make || exif.model) {
      const parts = [exif.make, exif.model].filter(Boolean)
      exif.camera = parts.join(' ')
    }

    // Find EXIF sub-IFD for more detailed tags
    const exifIFDPointer = ifd0.get(0x8769) // ExifIFDPointer
    if (exifIFDPointer) {
      // Re-read: for LONG type with count=1, value is inline
      const actualOffset = (() => {
        try {
          return readUint32(view, exifIFDPointer.valueOffset, littleEndian)
        } catch {
          return 0
        }
      })()

      if (actualOffset > 0) {
        const exifIFD = parseIFD(view, tiffStart, actualOffset, littleEndian)

        // DateTimeOriginal (more accurate than DateTime)
        const dtoEntry = exifIFD.get(TAG_DATE_TIME_ORIGINAL)
        if (dtoEntry) {
          const val = getTagValue(view, tiffStart, dtoEntry, littleEndian)
          if (typeof val === 'string') exif.dateTaken = val
        }

        // Image dimensions
        const widthEntry = exifIFD.get(TAG_IMAGE_WIDTH)
        if (widthEntry) {
          const val = getTagValue(view, tiffStart, widthEntry, littleEndian)
          if (typeof val === 'number') exif.imageWidth = val
        }

        const heightEntry = exifIFD.get(TAG_IMAGE_HEIGHT)
        if (heightEntry) {
          const val = getTagValue(view, tiffStart, heightEntry, littleEndian)
          if (typeof val === 'number') exif.imageHeight = val
        }
      }
    }

    // Find GPS IFD
    const gpsIFDPointer = ifd0.get(0x8825) // GPSInfoIFDPointer
    if (gpsIFDPointer) {
      const gpsIFDOffset = (() => {
        try {
          return readUint32(view, gpsIFDPointer.valueOffset, littleEndian)
        } catch {
          return 0
        }
      })()

      if (gpsIFDOffset > 0) {
        const gpsIFD = parseIFD(view, tiffStart, gpsIFDOffset, littleEndian)

        // Latitude
        const latRefEntry = gpsIFD.get(TAG_GPS_LATITUDE_REF)
        const latEntry = gpsIFD.get(TAG_GPS_LATITUDE)
        if (latRefEntry && latEntry) {
          const ref = getTagValue(view, tiffStart, latRefEntry, littleEndian)
          if (typeof ref === 'string' && latEntry.count === 3) {
            const totalSize = 8 * latEntry.count // RATIONAL = 8 bytes each
            const dataOffset = totalSize > 4
              ? tiffStart + readUint32(view, latEntry.valueOffset, littleEndian)
              : latEntry.valueOffset

            exif.gpsLatitude = convertGPSToDecimal(view, dataOffset, littleEndian, ref)
          }
        }

        // Longitude
        const lonRefEntry = gpsIFD.get(TAG_GPS_LONGITUDE_REF)
        const lonEntry = gpsIFD.get(TAG_GPS_LONGITUDE)
        if (lonRefEntry && lonEntry) {
          const ref = getTagValue(view, tiffStart, lonRefEntry, littleEndian)
          if (typeof ref === 'string' && lonEntry.count === 3) {
            const totalSize = 8 * lonEntry.count
            const dataOffset = totalSize > 4
              ? tiffStart + readUint32(view, lonEntry.valueOffset, littleEndian)
              : lonEntry.valueOffset

            exif.gpsLongitude = convertGPSToDecimal(view, dataOffset, littleEndian, ref)
          }
        }
      }
    }

    // Return null if we found nothing useful
    const hasData = exif.dateTaken || exif.camera || exif.gpsLatitude || exif.orientation
    return hasData ? exif : null
  } catch {
    return null
  }
}

/**
 * Get image dimensions using browser Image API (fallback for non-EXIF)
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(null)
      return
    }

    const url = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
      URL.revokeObjectURL(url)
    }

    img.onerror = () => {
      resolve(null)
      URL.revokeObjectURL(url)
    }

    img.src = url
  })
}
