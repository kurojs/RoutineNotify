import { promises as fs } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import { randomUUID } from 'crypto'
import type { ServiceErrorInfo } from '../shared/types'

const ELEVENLABS_ENDPOINT = 'https://api.elevenlabs.io/v1/text-to-speech'
const ELEVENLABS_MODEL = 'eleven_flash_v2_5'

export interface TtsResult {
  filePath: string
}

function getTtsDir(): string {
  return join(app.getPath('temp'), 'routine-notify')
}

export class TtsError extends Error {
  code: string

  constructor(code: string, detail?: string) {
    super(detail ?? code)
    this.name = 'TtsError'
    this.code = code
  }
}

export async function synthesizeSpeech(
  text: string,
  apiKey: string,
  voiceId: string
): Promise<TtsResult> {
  if (!apiKey) {
    throw new TtsError('invalid_api_key', 'ElevenLabs API key not configured')
  }
  if (!voiceId) {
    throw new TtsError('voice_not_found', 'Voice ID not configured')
  }

  const url = `${ELEVENLABS_ENDPOINT}/${voiceId}`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey
    },
    body: JSON.stringify({
      text,
      model_id: ELEVENLABS_MODEL,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75
      }
    })
  })

  if (!response.ok) {
    const info = await classifyElevenLabsError(response)
    throw new TtsError(info.code, info.detail)
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer())
  const ttsDir = getTtsDir()
  await fs.mkdir(ttsDir, { recursive: true })
  const filePath = join(ttsDir, `routine-tts-${randomUUID()}.mp3`)
  await fs.writeFile(filePath, audioBuffer)

  return { filePath }
}

async function classifyElevenLabsError(response: Response): Promise<ServiceErrorInfo> {
  let detail: string | undefined
  try {
    const body = (await response.json()) as {
      detail?: string | Array<{ msg?: string }>
      message?: string
    }
    if (typeof body.detail === 'string') {
      detail = body.detail
    } else if (Array.isArray(body.detail)) {
      detail = body.detail.map((d) => d.msg).filter(Boolean).join(', ')
    } else if (typeof body.message === 'string') {
      detail = body.message
    }
  } catch {
    const raw = await response.text()
    detail = raw.slice(0, 200)
  }

  let code: ServiceErrorInfo['code'] = 'unknown'
  if (response.status === 401) {
    code = 'invalid_api_key'
  } else if (response.status === 403) {
    code = 'permission_denied'
  } else if (response.status === 404) {
    code = 'voice_not_found'
  } else if (response.status === 429) {
    code = 'quota_exceeded'
  } else if (response.status === 422) {
    code = 'unknown'
  }

  return { code, detail }
}
