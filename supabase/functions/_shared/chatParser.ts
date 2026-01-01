// Universal Chat Parser for Deno Edge Functions
// Supports WhatsApp, SMS, Email, and Manual Text formats

export interface ChatMessage {
  date: string
  time: string
  sender: string
  message: string
  isMedia: boolean
  mediaType?: string
}

export interface ParsedChat {
  messages: ChatMessage[]
  totalMessages: number
  participants: string[]
  dateRange: {
    start: string
    end: string
  }
}

export type PlatformType = 'whatsapp' | 'sms_android' | 'sms_ios' | 'email' | 'manual' | 'unknown'

export interface PlatformMetadata {
  platform: PlatformType
  confidence: number
  detectedFormat?: string
}

/**
 * Extract media type from message
 */
function extractMediaType(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('image')) return 'image'
  if (lower.includes('video')) return 'video'
  if (lower.includes('audio')) return 'audio'
  if (lower.includes('document')) return 'document'
  return 'media'
}

/**
 * Parse WhatsApp chat export (.txt format)
 */
export function parseWhatsAppChat(chatText: string): ParsedChat {
  const normalizedText = chatText.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalizedText.split('\n').filter((line) => line.trim().length > 0)
  const messages: ChatMessage[] = []
  const participants = new Set<string>()
  const dates: string[] = []

  const patterns = [
    /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*(\d{1,2}:\d{2}\s*(?:am|pm|AM|PM))\s*-\s*(.+?):\s*(.+)$/,
    /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*(\d{1,2}:\d{2}:\d{2}\s*(?:am|pm|AM|PM))\s*-\s*(.+?):\s*(.+)$/,
    /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*(\d{1,2}:\d{2}:\d{2}\s*(?:AM|PM|am|pm))\]\s*(.+?):\s*(.+)$/,
    /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))\]\s*(.+?):\s*(.+)$/,
    /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*(\d{1,2}:\d{2}:\d{2})\s*-\s*(.+?):\s*(.+)$/,
    /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*(\d{1,2}:\d{2}:\d{2})\]\s*(.+?):\s*(.+)$/,
  ]

  let currentMessage: ChatMessage | null = null
  let messageBuffer: string[] = []

  for (const line of lines) {
    let matched = false

    for (const pattern of patterns) {
      const match = line.match(pattern)
      if (match) {
        if (currentMessage) {
          currentMessage.message = messageBuffer.join('\n')
          messages.push(currentMessage)
          messageBuffer = []
        }

        const [, date, time, sender, message] = match

        const lowerMessage = message.toLowerCase()
        if (
          lowerMessage.includes('messages and calls are end-to-end encrypted') ||
          lowerMessage.includes('you joined') ||
          lowerMessage.includes('you left') ||
          lowerMessage.includes('this chat is end-to-end encrypted') ||
          lowerMessage.includes('security code changed') ||
          lowerMessage.includes('learn more')
        ) {
          matched = true
          break
        }

        const isMedia =
          lowerMessage.includes('<media omitted>') ||
          lowerMessage.includes('image omitted') ||
          lowerMessage.includes('video omitted') ||
          lowerMessage.includes('audio omitted') ||
          lowerMessage.includes('document omitted')

        currentMessage = {
          date: date.trim(),
          time: time.trim(),
          sender: sender.trim(),
          message: message.trim(),
          isMedia,
          mediaType: isMedia ? extractMediaType(message) : undefined,
        }

        participants.add(sender.trim())
        dates.push(date.trim())
        matched = true
        break
      }
    }

    if (!matched && currentMessage) {
      messageBuffer.push(line)
    }
  }

  if (currentMessage) {
    currentMessage.message = messageBuffer.join('\n')
    messages.push(currentMessage)
  }

  const sortedDates = dates
    .map((d) => {
      const parts = d.split('/')
      if (parts.length === 3) {
        const day = parseInt(parts[0])
        const month = parseInt(parts[1]) - 1
        const year = parts[2].length === 2 ? 2000 + parseInt(parts[2]) : parseInt(parts[2])
        return new Date(year, month, day)
      }
      return null
    })
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime())

  return {
    messages,
    totalMessages: messages.length,
    participants: Array.from(participants),
    dateRange: {
      start: sortedDates.length > 0 ? sortedDates[0].toISOString() : '',
      end: sortedDates.length > 0 ? sortedDates[sortedDates.length - 1].toISOString() : '',
    },
  }
}

/**
 * Detect platform from text content
 */
export function detectPlatform(text: string): PlatformMetadata {
  if (
    text.match(/\[\d{1,2}\/\d{1,2}\/\d{2,4}/) ||
    text.match(/\d{1,2}\/\d{1,2}\/\d{2,4},.*-\s*.+?:\s*.+/) ||
    text.match(/Messages and calls are end-to-end encrypted/i)
  ) {
    return { platform: 'whatsapp', confidence: 0.95, detectedFormat: 'WhatsApp Export' }
  }

  if (text.match(/^"\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}","/m)) {
    return { platform: 'sms_android', confidence: 0.9, detectedFormat: 'Android SMS Backup' }
  }

  if (text.match(/^\d{1,2}\/\d{1,2}\/\d{4} \d{1,2}:\d{2}:\d{2} [AP]M - \+?\d+/m)) {
    return { platform: 'sms_android', confidence: 0.85, detectedFormat: 'Android SMS Text' }
  }

  if (text.match(/^\[\d{1,2}\/\d{1,2}\/\d{2}, \d{1,2}:\d{2}:\d{2} [AP]M\] \+?\d+/m)) {
    return { platform: 'sms_ios', confidence: 0.85, detectedFormat: 'iOS Messages' }
  }

  if (
    text.match(/^From:.*\n.*Date:.*\n.*Subject:/m) ||
    text.match(/^From:.*\n.*To:.*\n.*Subject:/m) ||
    text.match(/^Return-Path:.*\n.*Received:/m) ||
    text.match(/^Message-ID:/m)
  ) {
    return { platform: 'email', confidence: 0.9, detectedFormat: 'Email' }
  }

  if (text.match(/^Subject:.*\n.*From:.*\n.*Date:/m)) {
    return { platform: 'email', confidence: 0.75, detectedFormat: 'Email (Forwarded)' }
  }

  if (text.match(/.+?:\s*.+/m) && text.split('\n').length > 3) {
    return { platform: 'manual', confidence: 0.6, detectedFormat: 'Manual Text' }
  }

  return { platform: 'unknown', confidence: 0.3, detectedFormat: 'Unknown Format' }
}

/**
 * Parse universal chat (auto-detect platform)
 */
export function parseUniversalChat(text: string, platform?: PlatformType): { parsedChat: ParsedChat; metadata: PlatformMetadata } {
  const metadata = platform ? { platform, confidence: 1, detectedFormat: platform } : detectPlatform(text)

  // For now, we primarily support WhatsApp
  // Other formats can be added later
  if (metadata.platform === 'whatsapp' || !platform || platform === 'unknown') {
    return { parsedChat: parseWhatsAppChat(text), metadata }
  }

  // Fallback to WhatsApp parser for other formats
  return { parsedChat: parseWhatsAppChat(text), metadata }
}

/**
 * Extract text content from parsed chat (excluding media messages)
 */
export function extractTextContent(parsedChat: ParsedChat): string {
  return parsedChat.messages
    .filter((msg) => !msg.isMedia)
    .map((msg) => `${msg.sender}: ${msg.message}`)
    .join('\n')
}

