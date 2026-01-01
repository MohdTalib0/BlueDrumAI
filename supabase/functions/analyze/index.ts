import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createSupabaseClient } from '../_shared/supabase.ts'
import { getUserId } from '../_shared/auth.ts'
import { parseUniversalChat, extractTextContent, PlatformType } from '../_shared/chatParser.ts'
import { analyzeChatWithAI, compareAnalysesWithAI, generateRedFlagChatResponse } from '../_shared/ai.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const userId = await getUserId(req)
    if (!userId) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const url = new URL(req.url)
    const supabase = createSupabaseClient(req)

    // Helper to log AI usage
    async function logAiUsage(opts: {
      userId: string
      provider?: string
      model?: string
      inputTokens?: number
      outputTokens?: number
      responseTimeMs?: number
      serviceType?: string
      resourceType?: string
      resourceId?: string
    }) {
      try {
        await supabase.from('ai_usage_logs').insert({
          user_id: opts.userId,
          provider: opts.provider || null,
          model: opts.model || null,
          input_tokens: opts.inputTokens ?? 0,
          output_tokens: opts.outputTokens ?? 0,
          total_tokens: (opts.inputTokens ?? 0) + (opts.outputTokens ?? 0),
          response_time_ms: opts.responseTimeMs ?? null,
          service_type: opts.serviceType || 'analyze',
          resource_type: opts.resourceType || null,
          resource_id: opts.resourceId || null,
          input_cost: null,
          output_cost: null,
          total_cost: null,
        })
      } catch (e) {
        console.error('Failed to log AI usage', e)
      }
    }

    // POST /chat - Analyze chat file
    if (url.pathname.endsWith('/chat') && req.method === 'POST') {
      const formData = await req.formData()
      const file = formData.get('file') as File
      const platform = formData.get('platform') as string || 'auto'

      if (!file) {
        return new Response(
          JSON.stringify({ ok: false, error: 'No file provided' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Upload file to storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}/${Date.now()}.${fileExt}`
      const filePath = `chat-exports/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('chat-exports')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        })

      if (uploadError) {
        return new Response(
          JSON.stringify({ ok: false, error: uploadError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Read file content for analysis
      const fileText = await file.text()

      // Parse chat using universal parser
      const { parsedChat, metadata } = parseUniversalChat(fileText, platform === 'auto' ? undefined : platform as PlatformType)

      if (parsedChat.totalMessages === 0) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: 'Could not parse any messages from chat file. Please ensure it\'s a valid WhatsApp export.',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
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
      const analysisResult = await analyzeChatWithAI({
        chatText: textContent,
        participants: parsedChat.participants,
        totalMessages: parsedChat.totalMessages,
        dateRange: parsedChat.dateRange,
        sampleMessages,
      })

      const riskAnalysis = analysisResult.response

      // Store analysis in database
      const { data: analysisData, error: insertError } = await supabase
        .from('chat_analyses')
        .insert({
          user_id: userId,
          risk_score: riskAnalysis.riskScore,
          red_flags: riskAnalysis.redFlags,
          keywords_detected: riskAnalysis.keywordsDetected,
          summary: riskAnalysis.summary,
          recommendations: riskAnalysis.recommendations,
          patterns_detected: riskAnalysis.patternsDetected,
          platform: metadata.platform,
          file_path: filePath,
          total_messages: parsedChat.totalMessages,
          participants: parsedChat.participants,
          date_range: parsedChat.dateRange,
        })
        .select()
        .single()

      if (insertError) {
        console.error('Failed to save analysis:', insertError)
        return new Response(
          JSON.stringify({ ok: false, error: 'Failed to save analysis' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Log AI usage
      await logAiUsage({
        userId,
        provider: analysisResult.usage?.provider,
        model: analysisResult.usage?.model,
        inputTokens: analysisResult.usage?.inputTokens,
        outputTokens: analysisResult.usage?.outputTokens,
        responseTimeMs: analysisResult.usage?.responseTimeMs,
        serviceType: 'chat_analysis',
        resourceType: 'chat_analysis',
        resourceId: analysisData?.id,
      })

      return new Response(
        JSON.stringify({
          ok: true,
          analysis: analysisData,
          usage: analysisResult.usage,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /text - Analyze text input
    if (url.pathname.endsWith('/text') && req.method === 'POST') {
      const body = await req.json()
      const { text, platform } = body

      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Text content is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (text.length > 500000) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Text content is too large (max 500KB)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Parse chat using universal parser
      const { parsedChat, metadata } = parseUniversalChat(text, platform as PlatformType | undefined)

      if (parsedChat.totalMessages === 0) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: 'Could not parse any messages from text. Please ensure the format is correct.',
            hint: 'Try formatting as: Sender: Message or [Date] Sender: Message',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
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
      const analysisResult = await analyzeChatWithAI({
        chatText: textContent,
        participants: parsedChat.participants,
        totalMessages: parsedChat.totalMessages,
        dateRange: parsedChat.dateRange,
        sampleMessages,
      })

      const riskAnalysis = analysisResult.response

      // Store analysis in database
      const { data: analysisData, error: insertError } = await supabase
        .from('chat_analyses')
        .insert({
          user_id: userId,
          risk_score: riskAnalysis.riskScore,
          red_flags: riskAnalysis.redFlags,
          keywords_detected: riskAnalysis.keywordsDetected,
          summary: riskAnalysis.summary,
          recommendations: riskAnalysis.recommendations,
          patterns_detected: riskAnalysis.patternsDetected,
          platform: metadata.platform,
          total_messages: parsedChat.totalMessages,
          participants: parsedChat.participants,
          date_range: parsedChat.dateRange,
        })
        .select()
        .single()

      if (insertError) {
        console.error('Failed to save analysis:', insertError)
        return new Response(
          JSON.stringify({ ok: false, error: 'Failed to save analysis' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Log AI usage
      await logAiUsage({
        userId,
        provider: analysisResult.usage?.provider,
        model: analysisResult.usage?.model,
        inputTokens: analysisResult.usage?.inputTokens,
        outputTokens: analysisResult.usage?.outputTokens,
        responseTimeMs: analysisResult.usage?.responseTimeMs,
        serviceType: 'chat_analysis',
        resourceType: 'chat_analysis',
        resourceId: analysisData?.id,
      })

      return new Response(
        JSON.stringify({
          ok: true,
          analysis: analysisData,
          usage: analysisResult.usage,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET /history - Get analysis history
    if (url.pathname.endsWith('/history') && req.method === 'GET') {
      const { data, error } = await supabase
        .from('chat_analyses')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        return new Response(
          JSON.stringify({ ok: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ ok: true, analyses: data || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET /:id - Get specific analysis
    if (url.pathname.match(/\/[0-9a-fA-F-]{36}$/) && req.method === 'GET' && !url.pathname.endsWith('/history')) {
      const analysisId = url.pathname.split('/').pop()
      const { data, error } = await supabase
        .from('chat_analyses')
        .select('*')
        .eq('id', analysisId)
        .eq('user_id', userId)
        .single()

      if (error || !data) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Analysis not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ ok: true, analysis: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // DELETE /:id - Delete analysis
    if (url.pathname.match(/\/[0-9a-fA-F-]{36}$/) && req.method === 'DELETE') {
      const analysisId = url.pathname.split('/').pop()

      const { error } = await supabase
        .from('chat_analyses')
        .delete()
        .eq('id', analysisId)
        .eq('user_id', userId)

      if (error) {
        return new Response(
          JSON.stringify({ ok: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /compare - Compare multiple analyses
    if (url.pathname.endsWith('/compare') && req.method === 'POST') {
      const body = await req.json()
      const { analysisIds } = body

      if (!Array.isArray(analysisIds) || analysisIds.length < 2 || analysisIds.length > 5) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Please select between 2 and 5 analyses to compare.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Fetch the selected analyses
      const { data: analyses, error: fetchError } = await supabase
        .from('chat_analyses')
        .select('*')
        .in('id', analysisIds)
        .eq('user_id', userId)

      if (fetchError || !analyses || analyses.length !== analysisIds.length) {
        return new Response(
          JSON.stringify({ ok: false, error: 'One or more analyses not found or not owned by user.' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Prepare analyses for comparison
      const comparisonInput = {
        analyses: analyses.map((a) => ({
          id: a.id,
          riskScore: a.risk_score || 0,
          redFlags: (a.red_flags as any[]) || [],
          patternsDetected: (a.patterns_detected as any[]) || [],
          summary: a.summary || '',
          recommendations: (a.recommendations as string[]) || [],
          createdAt: a.created_at,
          platform: a.platform || undefined,
        })),
      }

      // Compare with AI
      const comparisonResult = await compareAnalysesWithAI(comparisonInput)

      // Persist comparison
      await supabase.from('analysis_comparisons').insert({
        user_id: userId,
        analysis_ids: analysisIds,
        comparison_result: comparisonResult.response,
      })
      // Log AI usage
      await logAiUsage({
        userId,
        provider: comparisonResult.usage?.provider,
        model: comparisonResult.usage?.model,
        inputTokens: comparisonResult.usage?.inputTokens,
        outputTokens: comparisonResult.usage?.outputTokens,
        responseTimeMs: comparisonResult.usage?.responseTimeMs,
        serviceType: 'comparison',
        resourceType: 'analysis_comparison',
      })

      return new Response(
        JSON.stringify({
          ok: true,
          comparison: comparisonResult.response,
          usage: comparisonResult.usage,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /red-flag-chat - Red flag chat interaction
    if (url.pathname.endsWith('/red-flag-chat') && req.method === 'POST') {
      const body = await req.json()
      const { scenarioType, conversationHistory, userMessage } = body

      if (!scenarioType || !Array.isArray(conversationHistory) || !userMessage) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Scenario type, conversation history, and user message are required.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Generate red flag chat response
      const chatResult = await generateRedFlagChatResponse({
        scenarioType: scenarioType as any,
        conversationHistory,
        userMessage,
      })

      // Persist experience
      const conversation = [
        ...conversationHistory,
        { role: 'user', content: userMessage },
        { role: 'assistant', content: chatResult.response },
      ]
      const redFlags =
        chatResult.response?.redFlagsDetected ||
        chatResult.responseDetails?.redFlagsDetected ||
        chatResult.redFlagsDetected ||
        null
      const educationalNote =
        chatResult.response?.educationalNote ||
        chatResult.responseDetails?.educationalNote ||
        null

      await supabase.from('red_flag_experiences').insert({
        user_id: userId,
        scenario_type: scenarioType,
        conversation,
        ai_response: chatResult.response,
        red_flags: redFlags,
        educational_note: educationalNote,
      })
      // Log AI usage
      await logAiUsage({
        userId,
        provider: chatResult.usage?.provider,
        model: chatResult.usage?.model,
        inputTokens: chatResult.usage?.inputTokens,
        outputTokens: chatResult.usage?.outputTokens,
        responseTimeMs: chatResult.usage?.responseTimeMs,
        serviceType: 'red_flag_chat',
        resourceType: 'red_flag_experience',
      })

      return new Response(
        JSON.stringify({
          ok: true,
          response: chatResult.response,
          usage: chatResult.usage,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /demo-red-flag - Log demo red flag interactions (simulated)
    if (url.pathname.endsWith('/demo-red-flag') && req.method === 'POST') {
      const body = await req.json()
      const { prompt, ai_response, red_flags, metadata } = body

      if (!prompt || typeof prompt !== 'string') {
        return new Response(
          JSON.stringify({ ok: false, error: 'Prompt is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      await supabase.from('demo_red_flags').insert({
        user_id: userId,
        prompt,
        ai_response: ai_response || null,
        red_flags: red_flags || null,
        metadata: metadata || null,
      })

      return new Response(
        JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ ok: false, error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Analyze function error:', error)
    return new Response(
      JSON.stringify({ ok: false, error: 'Server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

