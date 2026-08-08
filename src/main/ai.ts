import type { Routine } from '../shared/types'

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models'

export interface AiMessageResult {
  message: string
}

export function buildAiPrompt(routine: Routine, language: string, blockName: string): string {
  return [
    `You are a motivational routine assistant. It's time for: "${blockName}".`,
    `Routine message: "${routine.message}".`,
    '',
    `Generate a SHORT motivational message (1-2 sentences, max 200 chars) in ${language}.`,
    'It must be creative, unique every time, with warm personality. No emojis, no quotes.',
    'Reply with ONLY the message text.'
  ].join('\n')
}

export async function generateMessage(
  apiKey: string,
  prompt: string
): Promise<AiMessageResult> {
  if (!apiKey) {
    throw new Error('Gemini API key not configured')
  }

  const url = `${GEMINI_ENDPOINT}/gemini-2.5-flash:generateContent`
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
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 150
      }
    })
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Gemini API error ${response.status}: ${body.slice(0, 200)}`)
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>
      }
    }>
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    throw new Error('Gemini returned no text')
  }

  return { message: text.trim() }
}
