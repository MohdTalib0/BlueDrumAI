/**
 * Universal Chat Parser
 * Supports multiple platforms: WhatsApp, SMS, Email, Manual Text
 */

import { parseWhatsAppChat, ParsedChat, ChatMessage } from './chatParser'

export type PlatformType = 'whatsapp' | 'sms_android' | 'sms_ios' | 'email' | 'manual' | 'unknown'

export interface PlatformMetadata {
  platform: PlatformType
  confidence: number
  detectedFormat?: string
}

/**
 * Detect platform from text content
 */
export function detectPlatform(text: string): PlatformMetadata {
  // WhatsApp patterns (most common)
  if (
    text.match(/\[\d{1,2}\/\d{1,2}\/\d{2,4}/) ||
    text.match(/\d{1,2}\/\d{1,2}\/\d{2,4},.*-\s*.+?:\s*.+/) ||
    text.match(/Messages and calls are end-to-end encrypted/i)
  ) {
    return { platform: 'whatsapp', confidence: 0.95, detectedFormat: 'WhatsApp Export' }
  }

  // Android SMS backup format (CSV-like)
  // Format: "date","address","body","type","read","status"
  if (text.match(/^"\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}","/m)) {
    return { platform: 'sms_android', confidence: 0.9, detectedFormat: 'Android SMS Backup' }
  }

  // Android SMS text format
  // Format: 12/25/2024 10:30:45 AM - +1234567890: Message text
  if (text.match(/^\d{1,2}\/\d{1,2}\/\d{4} \d{1,2}:\d{2}:\d{2} [AP]M - \+?\d+/m)) {
    return { platform: 'sms_android', confidence: 0.85, detectedFormat: 'Android SMS Text' }
  }

  // iOS SMS format
  // Format: [12/25/24, 10:30:45 AM] +1234567890: Message text
  if (text.match(/^\[\d{1,2}\/\d{1,2}\/\d{2}, \d{1,2}:\d{2}:\d{2} [AP]M\] \+?\d+/m)) {
    return { platform: 'sms_ios', confidence: 0.85, detectedFormat: 'iOS Messages' }
  }

  // Email format (forwarded or .eml)
  if (
    text.match(/^From:.*\n.*Date:.*\n.*Subject:/m) ||
    text.match(/^From:.*\n.*To:.*\n.*Subject:/m) ||
    text.match(/^Return-Path:.*\n.*Received:/m) ||
    text.match(/^Message-ID:/m)
  ) {
    return { platform: 'email', confidence: 0.9, detectedFormat: 'Email' }
  }

  // Generic email-like patterns
  if (text.match(/^Subject:.*\n.*From:.*\n.*Date:/m)) {
    return { platform: 'email', confidence: 0.75, detectedFormat: 'Email (Forwarded)' }
  }

  // Manual text with basic patterns (sender: message)
  if (text.match(/.+?:\s*.+/m) && text.split('\n').length > 3) {
    return { platform: 'manual', confidence: 0.6, detectedFormat: 'Manual Text' }
  }

  return { platform: 'unknown', confidence: 0.3, detectedFormat: 'Unknown Format' }
}

/**
 * Parse Android SMS backup (CSV format)
 */
function parseAndroidSMS(text: string): ParsedChat {
  const lines = text.split('\n').filter((line) => line.trim().length > 0)
  const messages: ChatMessage[] = []
  const participants = new Set<string>()
  const dates: string[] = []

  // CSV format: "date","address","body","type","read","status"
  for (const line of lines) {
    // Skip header
    if (line.includes('"date","address"')) continue

    // Parse CSV line
    const match = line.match(/"([^"]+)","([^"]+)","([^"]+)","(\d+)","(\d+)","(\d+)"/)
    if (match) {
      const [, dateStr, address, body, type] = match
      const date = new Date(dateStr)
      const sender = address.replace(/[<>]/g, '').trim() || 'Unknown'

      messages.push({
        date: date.toISOString().split('T')[0],
        time: date.toLocaleTimeString('en-US', { hour12: true }),
        sender,
        message: body,
        isMedia: false,
      })

      participants.add(sender)
      dates.push(date.toISOString().split('T')[0])
    }
  }

  const sortedDates = dates.sort()
  return {
    messages,
    totalMessages: messages.length,
    participants: Array.from(participants),
    dateRange: {
      start: sortedDates[0] || '',
      end: sortedDates[sortedDates.length - 1] || '',
    },
  }
}

/**
 * Parse Android SMS text format
 * Format: 12/25/2024 10:30:45 AM - +1234567890: Message text
 */
function parseAndroidSMSText(text: string): ParsedChat {
  const lines = text.split('\n').filter((line) => line.trim().length > 0)
  const messages: ChatMessage[] = []
  const participants = new Set<string>()
  const dates: string[] = []

  const pattern = /^(\d{1,2}\/\d{1,2}\/\d{4}) (\d{1,2}:\d{2}:\d{2} [AP]M) - (\+?\d+):\s*(.+)$/

  for (const line of lines) {
    const match = line.match(pattern)
    if (match) {
      const [, dateStr, timeStr, sender, message] = match
      const date = new Date(dateStr)

      messages.push({
        date: dateStr,
        time: timeStr,
        sender: sender.trim(),
        message: message.trim(),
        isMedia: false,
      })

      participants.add(sender.trim())
      dates.push(dateStr)
    }
  }

  const sortedDates = dates.sort()
  return {
    messages,
    totalMessages: messages.length,
    participants: Array.from(participants),
    dateRange: {
      start: sortedDates[0] || '',
      end: sortedDates[sortedDates.length - 1] || '',
    },
  }
}

/**
 * Parse iOS Messages format
 * Format: [12/25/24, 10:30:45 AM] +1234567890: Message text
 */
function parseIOSMessages(text: string): ParsedChat {
  const lines = text.split('\n').filter((line) => line.trim().length > 0)
  const messages: ChatMessage[] = []
  const participants = new Set<string>()
  const dates: string[] = []

  const pattern = /^\[(\d{1,2}\/\d{1,2}\/\d{2}), (\d{1,2}:\d{2}:\d{2} [AP]M)\] (\+?\d+):\s*(.+)$/

  for (const line of lines) {
    const match = line.match(pattern)
    if (match) {
      const [, dateStr, timeStr, sender, message] = match
      // Convert 2-digit year to 4-digit
      const [month, day, year] = dateStr.split('/')
      const fullYear = parseInt(year) < 50 ? 2000 + parseInt(year) : 1900 + parseInt(year)
      const fullDate = `${month}/${day}/${fullYear}`

      messages.push({
        date: fullDate,
        time: timeStr,
        sender: sender.trim(),
        message: message.trim(),
        isMedia: false,
      })

      participants.add(sender.trim())
      dates.push(fullDate)
    }
  }

  const sortedDates = dates.sort()
  return {
    messages,
    totalMessages: messages.length,
    participants: Array.from(participants),
    dateRange: {
      start: sortedDates[0] || '',
      end: sortedDates[sortedDates.length - 1] || '',
    },
  }
}

/**
 * Parse email (forwarded or .eml format)
 */
function parseEmail(text: string): ParsedChat {
  const messages: ChatMessage[] = []
  const participants = new Set<string>()
  const dates: string[] = []

  // Extract email headers
  const fromMatch = text.match(/^From:\s*(.+)$/m)
  const toMatch = text.match(/^To:\s*(.+)$/m)
  const dateMatch = text.match(/^Date:\s*(.+)$/m)
  const subjectMatch = text.match(/^Subject:\s*(.+)$/m)

  // Extract body (after first blank line or after headers)
  const bodyMatch = text.match(/\n\n(.+)$/s) || text.match(/^Subject:.*\n\n(.+)$/s)
  const body = bodyMatch ? bodyMatch[1].trim() : text

  if (fromMatch || toMatch || dateMatch) {
    const sender = fromMatch ? fromMatch[1].replace(/[<>]/g, '').trim() : 'Unknown'
    const recipient = toMatch ? toMatch[1].replace(/[<>]/g, '').trim() : 'Unknown'
    const dateStr = dateMatch ? dateMatch[1].trim() : new Date().toISOString()
    const subject = subjectMatch ? subjectMatch[1].trim() : ''

    const date = new Date(dateStr)
    const formattedDate = date.toISOString().split('T')[0]
    const formattedTime = date.toLocaleTimeString('en-US', { hour12: true })

    // Create message with subject as part of body
    const fullMessage = subject ? `Subject: ${subject}\n\n${body}` : body

    messages.push({
      date: formattedDate,
      time: formattedTime,
      sender,
      message: fullMessage,
      isMedia: false,
    })

    participants.add(sender)
    if (recipient !== 'Unknown') participants.add(recipient)
    dates.push(formattedDate)
  } else {
    // Fallback: treat entire text as email body
    const date = new Date()
    messages.push({
      date: date.toISOString().split('T')[0],
      time: date.toLocaleTimeString('en-US', { hour12: true }),
      sender: 'Unknown',
      message: body,
      isMedia: false,
    })
    dates.push(date.toISOString().split('T')[0])
  }

  const sortedDates = dates.sort()
  return {
    messages,
    totalMessages: messages.length,
    participants: Array.from(participants),
    dateRange: {
      start: sortedDates[0] || '',
      end: sortedDates[sortedDates.length - 1] || '',
    },
  }
}

/**
 * Parse manual text (flexible format detection)
 * Tries to extract sender: message patterns
 */
function parseManualText(text: string): ParsedChat {
  const lines = text.split('\n').filter((line) => line.trim().length > 0)
  const messages: ChatMessage[] = []
  const participants = new Set<string>()
  const dates: string[] = []

  // Try various patterns
  const patterns = [
    // Pattern 1: Sender: Message (simple)
    /^(.+?):\s*(.+)$/,
    // Pattern 2: [Date] Sender: Message
    /^\[(.+?)\]\s*(.+?):\s*(.+)$/,
    // Pattern 3: Date - Sender: Message
    /^(.+?)\s*-\s*(.+?):\s*(.+)$/,
    // Pattern 4: Sender (Date): Message
    /^(.+?)\s*\((.+?)\):\s*(.+)$/,
  ]

  let currentDate = new Date().toISOString().split('T')[0]

  for (const line of lines) {
    let matched = false

    for (const pattern of patterns) {
      const match = line.match(pattern)
      if (match) {
        let sender: string
        let message: string
        let dateStr: string | undefined

        if (match.length === 3) {
          // Pattern 1: Sender: Message
          sender = match[1].trim()
          message = match[2].trim()
        } else if (match.length === 4) {
          // Pattern 2 or 3: [Date] Sender: Message or Date - Sender: Message
          if (match[1].includes('/') || match[1].includes('-')) {
            dateStr = match[1].trim()
            sender = match[2].trim()
            message = match[3].trim()
          } else {
            sender = match[1].trim()
            dateStr = match[2].trim()
            message = match[3].trim()
          }
        } else {
          continue
        }

        if (dateStr) {
          try {
            const parsedDate = new Date(dateStr)
            if (!isNaN(parsedDate.getTime())) {
              currentDate = parsedDate.toISOString().split('T')[0]
            }
          } catch {
            // Keep current date
          }
        }

        messages.push({
          date: currentDate,
          time: new Date().toLocaleTimeString('en-US', { hour12: true }),
          sender,
          message,
          isMedia: false,
        })

        participants.add(sender)
        dates.push(currentDate)
        matched = true
        break
      }
    }

    // If no pattern matched, treat as continuation of previous message
    if (!matched && messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      lastMessage.message += '\n' + line.trim()
    }
  }

  const sortedDates = dates.sort()
  return {
    messages,
    totalMessages: messages.length,
    participants: Array.from(participants),
    dateRange: {
      start: sortedDates[0] || currentDate,
      end: sortedDates[sortedDates.length - 1] || currentDate,
    },
  }
}

/**
 * Universal parser - detects format and parses accordingly
 */
export function parseUniversalChat(text: string, platform?: PlatformType): {
  parsedChat: ParsedChat
  metadata: PlatformMetadata
} {
  const metadata = platform ? { platform, confidence: 1, detectedFormat: platform } : detectPlatform(text)

  let parsedChat: ParsedChat

  switch (metadata.platform) {
    case 'whatsapp':
      parsedChat = parseWhatsAppChat(text)
      break

    case 'sms_android':
      // Try CSV format first, then text format
      if (text.match(/^"date","address"/m)) {
        parsedChat = parseAndroidSMS(text)
      } else {
        parsedChat = parseAndroidSMSText(text)
      }
      break

    case 'sms_ios':
      parsedChat = parseIOSMessages(text)
      break

    case 'email':
      parsedChat = parseEmail(text)
      break

    case 'manual':
    case 'unknown':
    default:
      // Try WhatsApp first as fallback, then manual
      try {
        parsedChat = parseWhatsAppChat(text)
        metadata.platform = 'whatsapp'
        metadata.confidence = 0.5
      } catch {
        parsedChat = parseManualText(text)
        metadata.platform = 'manual'
      }
      break
  }

  return { parsedChat, metadata }
}

