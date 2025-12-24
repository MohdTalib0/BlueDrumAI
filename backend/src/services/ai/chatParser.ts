/**
 * WhatsApp Chat Parser
 * Parses exported WhatsApp chat files (.txt format)
 */

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

/**
 * Parse WhatsApp chat export (.txt format)
 * Format examples:
 * - [DD/MM/YYYY, HH:MM:SS AM/PM] Sender: Message
 * - [DD/MM/YYYY, HH:MM:SS AM/PM] Sender: <Media omitted>
 * - [DD/MM/YYYY, HH:MM:SS AM/PM] Sender: image omitted
 */
export function parseWhatsAppChat(chatText: string): ParsedChat {
  // Normalize line endings and split
  const normalizedText = chatText.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalizedText.split('\n').filter((line) => line.trim().length > 0)
  const messages: ChatMessage[] = []
  const participants = new Set<string>()
  const dates: string[] = []
  
  console.log(`[Chat Parser] Processing ${lines.length} lines`)

  // Regex patterns for different WhatsApp export formats
  // Order matters - most common formats first
  const patterns = [
    // Format without brackets (most common): DD/MM/YYYY, HH:MM am/pm - Sender: Message
    // Example: "29/09/2024, 11:21 am - Suhaib 2: The growth of AI..."
    /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*(\d{1,2}:\d{2}\s*(?:am|pm|AM|PM))\s*-\s*(.+?):\s*(.+)$/,
    // Format without brackets with seconds: DD/MM/YYYY, HH:MM:SS am/pm - Sender: Message
    /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*(\d{1,2}:\d{2}:\d{2}\s*(?:am|pm|AM|PM))\s*-\s*(.+?):\s*(.+)$/,
    // Format with brackets: [DD/MM/YYYY, HH:MM:SS AM/PM] Sender: Message
    /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*(\d{1,2}:\d{2}:\d{2}\s*(?:AM|PM|am|pm))\]\s*(.+?):\s*(.+)$/,
    // Format with brackets without seconds: [DD/MM/YYYY, HH:MM AM/PM] Sender: Message
    /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))\]\s*(.+?):\s*(.+)$/,
    // 24-hour format without brackets: DD/MM/YYYY, HH:MM:SS - Sender: Message
    /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*(\d{1,2}:\d{2}:\d{2})\s*-\s*(.+?):\s*(.+)$/,
    // 24-hour format with brackets: [DD/MM/YYYY, HH:MM:SS] Sender: Message
    /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*(\d{1,2}:\d{2}:\d{2})\]\s*(.+?):\s*(.+)$/,
  ]
  
  // Debug: Log first few lines to help troubleshoot
  if (lines.length > 0) {
    console.log(`[Chat Parser] First line sample: "${lines[0].substring(0, 100)}"`)
  }

  let currentMessage: ChatMessage | null = null
  let messageBuffer: string[] = []

  let matchedCount = 0
  let skippedCount = 0

  for (const line of lines) {
    let matched = false

    for (const pattern of patterns) {
      const match = line.match(pattern)
      if (match) {
        // Save previous message if exists
        if (currentMessage) {
          currentMessage.message = messageBuffer.join('\n')
          messages.push(currentMessage)
          messageBuffer = []
        }

        const [, date, time, sender, message] = match
        
        // Skip system messages (common WhatsApp system messages)
        const lowerMessage = message.toLowerCase()
        if (
          lowerMessage.includes('messages and calls are end-to-end encrypted') ||
          lowerMessage.includes('you joined') ||
          lowerMessage.includes('you left') ||
          lowerMessage.includes('this chat is end-to-end encrypted') ||
          lowerMessage.includes('security code changed') ||
          lowerMessage.includes('learn more')
        ) {
          skippedCount++
          matched = true // Mark as matched to skip, but don't add to messages
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
        matchedCount++
        break
      }
    }

    if (!matched && currentMessage) {
      // Continuation of previous message (multi-line)
      messageBuffer.push(line)
    } else if (!matched && !currentMessage) {
      // Skip lines that don't match any pattern (might be system messages or corrupted)
      skippedCount++
      continue
    }
  }
  
  console.log(`[Chat Parser] Matched ${matchedCount} messages, skipped ${skippedCount} lines`)

  // Add last message
  if (currentMessage) {
    currentMessage.message = messageBuffer.join('\n')
    messages.push(currentMessage)
  }

  // Parse date range
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
 * Extract text content from parsed chat (excluding media messages)
 */
export function extractTextContent(parsedChat: ParsedChat): string {
  return parsedChat.messages
    .filter((msg) => !msg.isMedia)
    .map((msg) => `${msg.sender}: ${msg.message}`)
    .join('\n')
}

