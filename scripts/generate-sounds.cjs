const fs = require('fs')
const path = require('path')

const SR = 44100
const OUT = path.join(__dirname, '..', 'build', 'sounds')

function writeWav(name, samples) {
  const dataLen = samples.length * 2
  const buf = Buffer.alloc(44 + dataLen)
  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + dataLen, 4)
  buf.write('WAVE', 8)
  buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20)
  buf.writeUInt16LE(1, 22)
  buf.writeUInt32LE(SR, 24)
  buf.writeUInt32LE(SR * 2, 28)
  buf.writeUInt16LE(2, 32)
  buf.writeUInt16LE(16, 34)
  buf.write('data', 36)
  buf.writeUInt32LE(dataLen, 40)
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]))
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2)
  }
  fs.writeFileSync(path.join(OUT, name), buf)
  console.log(`generated ${name} (${buf.length} bytes)`)
}

// tone generator with attack/decay envelope
function tone(freq, dur, { vol = 0.5, attack = 0.005, decay = 0.08, harmonic = 0.3 } = {}) {
  const n = Math.floor(SR * dur)
  const out = new Array(n)
  for (let i = 0; i < n; i++) {
    const t = i / SR
    const env = Math.min(1, t / attack) * Math.exp(-decay * t)
    const v =
      Math.sin(2 * Math.PI * freq * t) +
      harmonic * Math.sin(2 * Math.PI * freq * 2 * t)
    out[i] = v * env * vol
  }
  return out
}

function mix(...parts) {
  const len = Math.max(...parts.map((p) => p.length))
  const out = new Array(len).fill(0)
  for (const p of parts) {
    for (let i = 0; i < p.length; i++) out[i] += p[i]
  }
  return out
}

function silence(dur) {
  return new Array(Math.floor(SR * dur)).fill(0)
}

// Beep: single 880Hz short beep
writeWav('beep.wav', tone(880, 0.35, { decay: 0.18, vol: 0.45 }))

// Ding: 1320Hz bell-like with harmonic
writeWav('ding.wav', tone(1320, 0.6, { decay: 0.12, vol: 0.4, harmonic: 0.5 }))

// Chime: two-note ascending (C6 -> E6)
writeWav(
  'chime.wav',
  mix(tone(1046, 0.5, { decay: 0.16, vol: 0.4, harmonic: 0.4 }), [
    ...silence(0.18),
    ...tone(1318, 0.55, { decay: 0.14, vol: 0.4, harmonic: 0.4 })
  ])
)

// Pop: short soft pop
writeWav('pop.wav', tone(523, 0.12, { decay: 0.6, vol: 0.5, harmonic: 0.1 }))

// Marimba: three quick notes
writeWav(
  'marimba.wav',
  mix(
    tone(523, 0.25, { decay: 0.45, vol: 0.45, harmonic: 0.15 }),
    [...silence(0.09), ...tone(659, 0.25, { decay: 0.45, vol: 0.45, harmonic: 0.15 })],
    [...silence(0.18), ...tone(784, 0.3, { decay: 0.4, vol: 0.45, harmonic: 0.15 })]
  )
)
