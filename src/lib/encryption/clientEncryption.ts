/**
 * Client-side file encryption/decryption using Web Crypto API
 * Algorithm: AES-GCM with 256-bit key derived via PBKDF2
 *
 * The encryption key is deterministically derived from the user's UUID,
 * so the same user always gets the same key. The IV is random per file
 * and stored alongside the encrypted data.
 */

const SALT = new TextEncoder().encode('BlueDrumAI-VaultEncryption-v1')
const IV_LENGTH = 12
const PBKDF2_ITERATIONS = 100_000

/**
 * Derive a deterministic AES-256-GCM key from a user ID
 */
async function deriveKey(userId: string): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(userId),
    'PBKDF2',
    false,
    ['deriveKey'],
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: SALT,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/**
 * Encrypt file bytes using AES-GCM
 * Returns: Uint8Array where first 12 bytes = IV, rest = ciphertext
 */
export async function encryptFile(
  fileBytes: ArrayBuffer,
  userId: string,
): Promise<{ encrypted: Uint8Array; iv: string }> {
  const key = await deriveKey(userId)
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    fileBytes,
  )

  // Combine IV + ciphertext into a single buffer
  const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), IV_LENGTH)

  // Return both the combined bytes and the IV as base64 (for metadata storage)
  const ivBase64 = btoa(String.fromCharCode(...iv))

  return { encrypted: combined, iv: ivBase64 }
}

/**
 * Decrypt file bytes using AES-GCM
 * Expects: Uint8Array where first 12 bytes = IV, rest = ciphertext
 */
export async function decryptFile(
  encryptedBytes: ArrayBuffer,
  userId: string,
): Promise<ArrayBuffer> {
  const key = await deriveKey(userId)
  const data = new Uint8Array(encryptedBytes)

  // Extract IV from first 12 bytes
  const iv = data.slice(0, IV_LENGTH)
  const ciphertext = data.slice(IV_LENGTH)

  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext,
  )
}

/**
 * Compute SHA-256 hash of file bytes
 * Returns hex-encoded hash string
 */
export async function computeFileHash(fileBytes: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', fileBytes)
  const hashArray = new Uint8Array(hashBuffer)
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
