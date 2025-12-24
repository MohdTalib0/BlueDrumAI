import express from 'express'
import multer from 'multer'
import { requireAuth, getUserId } from '../middleware/auth'
import { supabaseAdmin } from '../supabase'
import { uploadToStorage, generateFilePath } from '../services/storage'
import { logAuditEvent } from '../middleware/auditLogger'
import { parseWhatsAppChat, extractTextContent } from '../services/ai/chatParser'
import { parseUniversalChat, PlatformType } from '../services/ai/universalChatParser'
import { analyzeChatWithAI } from '../services/ai'
import { generateChatAnalysisPDF } from '../services/chatAnalysisPDF'

const router = express.Router()

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size for chat exports
  },
  fileFilter: (_req, file, cb) => {
    // Allow text files, CSV files (SMS backups), and .eml files (emails)
    const allowedMimes = ['text/plain', 'text/csv', 'message/rfc822']
    const allowedExtensions = ['.txt', '.csv', '.eml']
    const hasValidMime = allowedMimes.includes(file.mimetype)
    const hasValidExt = allowedExtensions.some((ext) => file.originalname.toLowerCase().endsWith(ext))

    if (hasValidMime || hasValidExt) {
      cb(null, true)
    } else {
      cb(new Error('Only .txt, .csv, or .eml files are allowed'))
    }
  },
})

/**
 * POST /api/analyze/text
 * Analyze text directly (manual paste)
 */
router.post('/text', requireAuth, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { text, platform } = req.body

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text content is required' })
    }

    if (text.length > 500000) {
      // ~500KB limit for text
      return res.status(400).json({ error: 'Text content is too large (max 500KB)' })
    }

    console.log(`[Chat Analysis] Analyzing text for user ${userId}, size: ${text.length} chars`)

    // Parse chat using universal parser
    const { parsedChat, metadata } = parseUniversalChat(text, platform as PlatformType | undefined)
    console.log(
      `[Chat Analysis] Parsed ${parsedChat.totalMessages} messages from ${parsedChat.participants.length} participants (Platform: ${metadata.platform})`
    )

    if (parsedChat.totalMessages === 0) {
      return res.status(400).json({
        error: 'Could not parse any messages from text. Please ensure the format is correct.',
        hint: 'Try formatting as: Sender: Message or [Date] Sender: Message',
      })
    }

    // Extract text content for analysis
    const textContent = extractTextContent(parsedChat)

    // Prepare sample messages for AI context
    const sampleMessages = parsedChat.messages
      .slice(-20)
      .map((msg) => ({
        sender: msg.sender,
        message: msg.message,
        date: `${msg.date} ${msg.time}`,
      }))

    // Analyze with AI
    console.log(`[Chat Analysis] Sending to AI for analysis...`)
    const analysisResult = await analyzeChatWithAI(
      {
        chatText: textContent,
        participants: parsedChat.participants,
        totalMessages: parsedChat.totalMessages,
        dateRange: parsedChat.dateRange,
        sampleMessages,
      },
      userId,
      undefined // Will be set after insert
    )
    const riskAnalysis = analysisResult.response
    console.log(
      `[Chat Analysis] AI Analysis complete - Risk score: ${riskAnalysis.riskScore}, Red flags: ${riskAnalysis.redFlags.length}, Tokens: ${analysisResult.usage.inputTokens + analysisResult.usage.outputTokens} (${analysisResult.usage.provider})`
    )

    // Save analysis to database (no file URL for text-only)
    const { data, error } = await supabaseAdmin
      .from('chat_analyses')
      .insert({
        user_id: userId,
        chat_export_url: null, // No file for text-only
        risk_score: riskAnalysis.riskScore,
        red_flags: riskAnalysis.redFlags,
        keywords_detected: riskAnalysis.keywordsDetected,
        analysis_text: riskAnalysis.summary,
        recommendations: riskAnalysis.recommendations || [],
        patterns_detected: riskAnalysis.patternsDetected || [],
        platform: metadata.platform,
      })
      .select()
      .single()

    if (error) {
      console.error('[Chat Analysis] Error saving analysis:', error)
      return res.status(500).json({ error: 'Failed to save analysis', details: error.message })
    }

    // Log audit event
    await logAuditEvent(req, 'create', 'chat_analysis', data.id, {
      after: {
        analysis_id: data.id,
        risk_score: riskAnalysis.riskScore,
        red_flags_count: riskAnalysis.redFlags.length,
        platform: metadata.platform,
      },
    })

    res.json({
      success: true,
      analysis: {
        id: data.id,
        riskScore: riskAnalysis.riskScore,
        redFlags: riskAnalysis.redFlags,
        keywordsDetected: riskAnalysis.keywordsDetected,
        summary: riskAnalysis.summary,
        recommendations: riskAnalysis.recommendations || [],
        patternsDetected: riskAnalysis.patternsDetected || [],
        chatStats: {
          totalMessages: parsedChat.totalMessages,
          participants: parsedChat.participants,
          dateRange: parsedChat.dateRange,
        },
        platform: metadata.platform,
        platformMetadata: metadata,
        createdAt: data.created_at,
      },
    })
  } catch (err: any) {
    console.error('[Chat Analysis] Error:', err)
    next(err)
  }
})

/**
 * POST /api/analyze/chat
 * Upload and analyze chat file (WhatsApp, SMS, Email, etc.)
 */
router.post(
  '/chat',
  requireAuth,
  upload.single('chatFile'),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const userId = getUserId(req)
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' })
      }

      // Get platform from query param or detect automatically
      const platformParam = req.query.platform as PlatformType | undefined

      // Convert buffer to string
      const chatText = req.file.buffer.toString('utf-8')

      if (!chatText || chatText.trim().length === 0) {
        return res.status(400).json({ error: 'Chat file is empty' })
      }

      console.log(`[Chat Analysis] Analyzing chat for user ${userId}, size: ${chatText.length} chars`)

      // Parse chat using universal parser
      const { parsedChat, metadata } = parseUniversalChat(chatText, platformParam)
      console.log(
        `[Chat Analysis] Parsed ${parsedChat.totalMessages} messages from ${parsedChat.participants.length} participants (Platform: ${metadata.platform}, Confidence: ${metadata.confidence})`
      )

      if (parsedChat.totalMessages === 0) {
        // Show first few lines for debugging
        const sampleLines = chatText.split('\n').slice(0, 5).filter((l) => l.trim().length > 0)
        return res.status(400).json({ 
          error: `Could not parse any messages from ${metadata.detectedFormat || 'file'}. Please ensure the format is correct.`,
          hint: metadata.platform === 'unknown' 
            ? 'Try selecting the correct platform manually or use Manual Text option to paste the conversation.'
            : `Detected format: ${metadata.detectedFormat}. If incorrect, try selecting the platform manually.`,
          detectedPlatform: metadata.platform,
          sampleLines: sampleLines.slice(0, 3) // Show first 3 non-empty lines
        })
      }

      // Extract text content for analysis
      const textContent = extractTextContent(parsedChat)

      // Prepare sample messages for AI context (last 20 messages)
      const sampleMessages = parsedChat.messages
        .slice(-20)
        .map((msg) => ({
          sender: msg.sender,
          message: msg.message,
          date: `${msg.date} ${msg.time}`,
        }))

      // Analyze with AI
      console.log(`[Chat Analysis] Sending to AI for analysis...`)
      const analysisResult = await analyzeChatWithAI(
        {
          chatText: textContent,
          participants: parsedChat.participants,
          totalMessages: parsedChat.totalMessages,
          dateRange: parsedChat.dateRange,
          sampleMessages,
        },
        userId,
        undefined // Will be set after insert
      )
      const riskAnalysis = analysisResult.response
      console.log(
        `[Chat Analysis] AI Analysis complete - Risk score: ${riskAnalysis.riskScore}, Red flags: ${riskAnalysis.redFlags.length}, Tokens: ${analysisResult.usage.inputTokens + analysisResult.usage.outputTokens} (${analysisResult.usage.provider})`
      )

      // Upload chat file to storage
      const filePath = generateFilePath(userId, req.file.originalname)
      const { fileUrl } = await uploadToStorage('chat-exports', filePath, req.file.buffer, 'text/plain')

      // Save analysis to database
      const { data, error } = await supabaseAdmin
        .from('chat_analyses')
        .insert({
          user_id: userId,
          chat_export_url: fileUrl,
          risk_score: riskAnalysis.riskScore,
          red_flags: riskAnalysis.redFlags,
          keywords_detected: riskAnalysis.keywordsDetected,
          analysis_text: riskAnalysis.summary,
          recommendations: riskAnalysis.recommendations || [],
          patterns_detected: riskAnalysis.patternsDetected || [],
          platform: metadata.platform, // Store platform metadata
        })
        .select()
        .single()

      if (error) {
        console.error('[Chat Analysis] Error saving analysis:', error)
        return res.status(500).json({ error: 'Failed to save analysis', details: error.message })
      }

      // Log audit event
      await logAuditEvent(req, 'create', 'chat_analysis', data.id, {
        after: {
          analysis_id: data.id,
          risk_score: riskAnalysis.riskScore,
          red_flags_count: riskAnalysis.redFlags.length,
          platform: metadata.platform,
        },
      })

      res.json({
        success: true,
        analysis: {
          id: data.id,
          riskScore: riskAnalysis.riskScore,
          redFlags: riskAnalysis.redFlags,
          keywordsDetected: riskAnalysis.keywordsDetected,
          summary: riskAnalysis.summary,
          recommendations: riskAnalysis.recommendations || [],
          patternsDetected: riskAnalysis.patternsDetected || [],
          chatStats: {
            totalMessages: parsedChat.totalMessages,
            participants: parsedChat.participants,
            dateRange: parsedChat.dateRange,
          },
          platform: metadata.platform,
          platformMetadata: metadata,
          createdAt: data.created_at,
        },
      })
    } catch (err: any) {
      console.error('[Chat Analysis] Error:', err)
      next(err)
    }
  }
)

/**
 * GET /api/analyze/history
 * Get chat analysis history for the authenticated user
 */
router.get('/history', requireAuth, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { data, error } = await supabaseAdmin
      .from('chat_analyses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Chat Analysis] Error fetching history:', error)
      return res.status(500).json({ error: 'Failed to fetch analysis history', details: error.message })
    }

    res.json({
      success: true,
      analyses: data || [],
    })
  } catch (err: any) {
    next(err)
  }
})

/**
 * GET /api/analyze/:id/export
 * Export chat analysis as PDF
 * NOTE: This route must come before /:id to avoid route conflicts
 */
router.get('/:id/export', requireAuth, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { id } = req.params

    // Fetch analysis
    const { data: analysis, error } = await supabaseAdmin
      .from('chat_analyses')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error || !analysis) {
      if (error?.code === 'PGRST116') {
        return res.status(404).json({ error: 'Analysis not found' })
      }
      return res.status(500).json({ error: 'Failed to fetch analysis', details: error?.message })
    }

    // Get user email
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('id', userId)
      .single()

    if (userError || !userData) {
      return res.status(500).json({ error: 'Failed to fetch user data' })
    }

    // Generate PDF
    const pdfBuffer = await generateChatAnalysisPDF({
      userEmail: userData.email,
      analysis: {
        ...analysis,
        riskScore: analysis.risk_score,
        redFlags: analysis.red_flags || [],
        keywordsDetected: analysis.keywords_detected || [],
        summary: analysis.analysis_text || '',
        recommendations: analysis.recommendations || [],
        patternsDetected: analysis.patterns_detected || [],
        createdAt: analysis.created_at,
      },
    })

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="chat-analysis-${id}.pdf"`)
    res.setHeader('Content-Length', pdfBuffer.length.toString())

    res.send(pdfBuffer)
  } catch (err: any) {
    console.error('[Chat Analysis] PDF export error:', err)
    next(err)
  }
})

/**
 * GET /api/analyze/:id
 * Get specific chat analysis by ID
 */
router.get('/:id', requireAuth, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { id } = req.params

    const { data, error } = await supabaseAdmin
      .from('chat_analyses')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Analysis not found' })
      }
      console.error('[Chat Analysis] Error fetching analysis:', error)
      return res.status(500).json({ error: 'Failed to fetch analysis', details: error.message })
    }

    res.json({
      success: true,
      analysis: data,
    })
  } catch (err: any) {
    next(err)
  }
})

/**
 * DELETE /api/analyze/:id
 * Delete a chat analysis
 */
router.delete('/:id', requireAuth, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { id } = req.params

    // Verify ownership
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('chat_analyses')
      .select('id, chat_export_url')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Analysis not found' })
    }

    // Delete from database
    const { error } = await supabaseAdmin.from('chat_analyses').delete().eq('id', id).eq('user_id', userId)

    if (error) {
      console.error('[Chat Analysis] Error deleting analysis:', error)
      return res.status(500).json({ error: 'Failed to delete analysis', details: error.message })
    }

    // Note: We could also delete the file from storage, but keeping it for now
    // as it might be referenced elsewhere

    // Log audit event
    await logAuditEvent(req, 'delete', 'chat_analysis', id, {
      before: {
        analysis_id: id,
      },
    })

    res.json({
      success: true,
      message: 'Analysis deleted successfully',
    })
  } catch (err: any) {
    next(err)
  }
})

export default router

