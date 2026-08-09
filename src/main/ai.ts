import type { Routine, GeminiModel, ServiceErrorInfo } from '../shared/types'

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta'
const GEMINI_MODELS_URL = `${GEMINI_BASE}/models`

export interface AiMessageResult {
  message: string
}

export function buildAiPrompt(routine: Routine, language: string): string {
  const context = routine.description?.trim()
    ? `It's time for: "${routine.title}". Context: "${routine.description.trim()}".`
    : `It's time for: "${routine.title}".`
  return [
    `You are a motivational routine assistant. ${context}`,
    '',
    `Generate a SHORT motivational message (1-2 sentences, max 200 chars) in ${language}.`,
    'It must be creative, unique every time, with warm personality. No emojis, no quotes.',
    'Reply with ONLY the message text.'
  ].join('\n')
}

const TEXT_BLOCKLIST = [
  'image',
  'tts',
  'robotics',
  'computer-use',
  'deep-research',
  'lyria',
  'customtools',
  'agent',
  'clip',
  'omni',
  'banana',
  'antigravity'
]

const FREE_TIER_RE =
  /^models\/gemini-(?:\d+(?:\.\d+)?-)?flash(?:-lite)?(?:-(?:latest|preview))?(?:-\d+)?$|^models\/gemma-/

export async function listGeminiModels(apiKey: string): Promise<GeminiModel[]> {
  if (!apiKey) {
    throw new Error('Gemini API key not configured')
  }

  const response = await fetch(`${GEMINI_MODELS_URL}?key=${encodeURIComponent(apiKey)}`)

  if (!response.ok) {
    const info = await classifyGeminiError(response)
    throw new Error(info.detail ?? info.code)
  }

  const data = (await response.json()) as {
    models?: Array<{
      name: string
      displayName?: string
      supportedGenerationMethods?: string[]
    }>
  }

  const models = (data.models ?? [])
    .filter((m) => {
      if (!m.supportedGenerationMethods?.includes('generateContent')) return false
      const lower = m.name.toLowerCase()
      return !TEXT_BLOCKLIST.some((blocked) => lower.includes(blocked))
    })
    .map((m) => ({
      name: m.name.replace('models/', ''),
      displayName: m.displayName ?? m.name.replace('models/', ''),
      freeTier: FREE_TIER_RE.test(m.name)
    }))
    .sort((a, b) => {
      if (a.freeTier !== b.freeTier) return a.freeTier ? -1 : 1
      return a.name.localeCompare(b.name)
    })

  return models
}

export async function generateMessage(
  apiKey: string,
  model: string,
  prompt: string
): Promise<AiMessageResult> {
  if (!apiKey) {
    throw new Error('Gemini API key not configured')
  }
  if (!model) {
    throw new Error('Gemini model not configured')
  }

  const url = `${GEMINI_BASE}/models/${encodeURIComponent(model)}:generateContent`
  const supportsThinking = /^gemini-(?:2\.5|[3-9])/i.test(model)
  const generationConfig: Record<string, unknown> = {
    temperature: 0.9,
    maxOutputTokens: 400
  }
  if (supportsThinking) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 }
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      generationConfig
    })
  })

  if (!response.ok) {
    const info = await classifyGeminiError(response)
    throw new Error(info.detail ?? info.code)
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string; thought?: boolean }>
      }
      finishReason?: string
    }>
  }

  const finishReason = data.candidates?.[0]?.finishReason
  const parts = data.candidates?.[0]?.content?.parts ?? []
  const text = parts
    .filter((part) => !part.thought && typeof part.text === 'string')
    .map((part) => part.text ?? '')
    .join('')
    .trim()

  if (!text) {
    throw new Error('empty_response')
  }

  if (finishReason === 'MAX_TOKENS') {
    console.warn(`[ai] generation truncated (MAX_TOKENS) for model ${model}`)
    throw new Error('empty_response')
  }

  return { message: text }
}

async function classifyGeminiError(response: Response): Promise<ServiceErrorInfo> {
  let detail: string | undefined
  let status: string | undefined
  try {
    const body = (await response.json()) as {
      error?: { code?: number; message?: string; status?: string }
    }
    detail = body.error?.message
    status = body.error?.status
  } catch {
    const raw = await response.text()
    detail = raw.slice(0, 200)
  }

  let code: ServiceErrorInfo['code'] = 'unknown'
  if (response.status === 401 || response.status === 403 || status === 'PERMISSION_DENIED') {
    code = response.status === 401 ? 'invalid_api_key' : 'permission_denied'
  } else if (response.status === 404 || status === 'NOT_FOUND') {
    code = 'model_not_found'
  } else if (response.status === 429 || status === 'RESOURCE_EXHAUSTED') {
    code = 'quota_exceeded'
  }

  return { code, detail }
}
