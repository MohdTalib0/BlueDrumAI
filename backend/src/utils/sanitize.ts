/**
 * Sanitization utilities for user input
 * Prevents prompt injection and other attacks
 */

/**
 * Sanitize text input to prevent prompt injection attacks
 */
export function sanitizeForPrompt(input: string): string {
  if (!input || typeof input !== 'string') return ''
  
  return input
    // Remove common prompt injection patterns
    .replace(/ignore\s+(previous|above|all)\s+instructions?/gi, '')
    .replace(/forget\s+(previous|above|all)\s+instructions?/gi, '')
    .replace(/disregard\s+(previous|above|all)\s+instructions?/gi, '')
    .replace(/system\s*:/gi, '')
    .replace(/user\s*:/gi, '')
    .replace(/assistant\s*:/gi, '')
    .replace(/human\s*:/gi, '')
    .replace(/\[INST\]/gi, '')
    .replace(/\[\/INST\]/gi, '')
    .replace(/<\|im_start\|>/gi, '')
    .replace(/<\|im_end\|>/gi, '')
    // Remove code blocks that could be used for injection
    .replace(/```[\s\S]*?```/g, '')
    // Remove potential command execution attempts
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim()
    // Enforce max length
    .slice(0, 2000)
}

/**
 * Sanitize answers object to prevent prompt injection
 */
export function sanitizeAnswers(answers: Record<string, string | string[]>): Record<string, string | string[]> {
  const sanitized: Record<string, string | string[]> = {}
  
  for (const [key, value] of Object.entries(answers)) {
    // Sanitize key (prevent object injection)
    const sanitizedKey = String(key).replace(/[^a-zA-Z0-9_]/g, '').slice(0, 64)
    if (!sanitizedKey) continue
    
    if (Array.isArray(value)) {
      // Sanitize each array element
      sanitized[sanitizedKey] = value
        .map((v) => sanitizeForPrompt(String(v)))
        .filter((v) => v.length > 0)
        .slice(0, 20) // Limit array size
    } else {
      sanitized[sanitizedKey] = sanitizeForPrompt(String(value))
    }
  }
  
  return sanitized
}

/**
 * Sanitize email address (basic validation + sanitization)
 */
export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase().slice(0, 254)
}

/**
 * Validate and sanitize manual input
 */
export function sanitizeManualInput(input: string | undefined | null): string | null {
  if (!input || typeof input !== 'string') return null
  return sanitizeForPrompt(input) || null
}

