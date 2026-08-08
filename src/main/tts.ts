import { promises as fs } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import { randomUUID } from 'crypto'

const ELEVENLABS_ENDPOINT = 'https://api.elevenlabs.io/v1/text-to-speech'
const ELEVENLABS_MODEL = 'eleven_flash_v2_5'

export interface TtsResult {
  filePath: string
}

function getTtsDir(): string {
  return join(app.getPath('temp'), 'routine-notify')
}

export async function synthesizeSpeech(
  text: string,
  apiKey: string,
  voiceId: string
): Promise<TtsResult> {
  if (!apiKey) {
    throw new Error('ElevenLabs API key not configured')
  }
  if (!voiceId) {
    throw new Error('Voice ID not configured')
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
    const body = await response.text()
    throw new Error(`ElevenLabs API error ${response.status}: ${body.slice(0, 200)}`)
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer())
  const ttsDir = getTtsDir()
  await fs.mkdir(ttsDir, { recursive: true })
  const filePath = join(ttsDir, `routine-tts-${randomUUID()}.mp3`)
  await fs.writeFile(filePath, audioBuffer)

  return { filePath }
}
