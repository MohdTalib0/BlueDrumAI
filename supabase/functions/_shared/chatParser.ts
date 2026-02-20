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
 * Parse Android SMS backup (CSV format)
 * Format: "date","address","body","type","read","status"
 */
function parseAndroidSMS(text: string): ParsedChat {
  const lines = text.split('\n').filter((line) => line.trim().length > 0)
  const messages: ChatMessage[] = []
  const participants = new Set<string>()
  const dates: string[] = []

  for (const line of lines) {
    if (line.includes('"date","address"')) continue

    const match = line.match(/"([^"]+)","([^"]+)","([^"]+)","(\d+)","(\d+)","(\d+)"/)
    if (match) {
      const [, dateStr, address, body] = match
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

  const fromMatch = text.match(/^From:\s*(.+)$/m)
  const toMatch = text.match(/^To:\s*(.+)$/m)
  const dateMatch = text.match(/^Date:\s*(.+)$/m)
  const subjectMatch = text.match(/^Subject:\s*(.+)$/m)

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

  const patterns = [
    /^(.+?):\s*(.+)$/,
    /^\[(.+?)\]\s*(.+?):\s*(.+)$/,
    /^(.+?)\s*-\s*(.+?):\s*(.+)$/,
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
          sender = match[1].trim()
          message = match[2].trim()
        } else if (match.length === 4) {
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
 * Parse universal chat (auto-detect platform and route to correct parser)
 */
export function parseUniversalChat(text: string, platform?: PlatformType): { parsedChat: ParsedChat; metadata: PlatformMetadata } {
  const metadata = platform ? { platform, confidence: 1, detectedFormat: platform } : detectPlatform(text)

  let parsedChat: ParsedChat

  switch (metadata.platform) {
    case 'whatsapp':
      parsedChat = parseWhatsAppChat(text)
      break

    case 'sms_android':
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
      try {
        parsedChat = parseWhatsAppChat(text)
        if (parsedChat.totalMessages === 0) {
          parsedChat = parseManualText(text)
          metadata.platform = 'manual'
          metadata.confidence = 0.5
        }
      } catch {
        parsedChat = parseManualText(text)
        metadata.platform = 'manual'
        metadata.confidence = 0.5
      }
      break
  }

  return { parsedChat, metadata }
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

