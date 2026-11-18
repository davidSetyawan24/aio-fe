import { BRIDGE_WS } from './cctv.js'

/**
 * Pemutar kecil buat video dari go2rtc lewat WebSocket + MSE (Media Source Extensions).
 * Protokol go2rtc: halaman kirim {"type":"mse","value":"<codecs>"}, go2rtc jawab teks {"type":"mse","value":"<mime>"}
 * lalu data biner (init + potongan fMP4). Masalah → teks {"type":"error"} atau socketnya ditutup.
 */
const H264 = ['avc1.42001E', 'avc1.640029', 'avc1.64002A', 'avc1.640033']
const H265 = 'hvc1.1.6.L153.B0'
/** Stream tajem (H.265) nunggu keyframe, bisa > 4 dtk. Error cuma kalau 15 dtk belum ada data sama sekali. */
export const FIRST_DATA_MS = 15000
/** Data lebih dari 10 dtk di belakang posisi putar dibuang (disisain 3 dtk). */
const KEEP_BEHIND = 10
const TRIM_TO = 3
/** Ketinggalan > 3 dtk dari ujung live (mis. abis tab dibiarin) → loncat ke ujung. */
const MAX_LAG = 3

const supports = (codec) => {
  const MS = globalThis.MediaSource
  return Boolean(MS?.isTypeSupported?.(`video/mp4; codecs="${codec}"`))
}

export const hevcSupported = () => supports(H265)

/** Daftar codec yang bisa diputer browser ini, buat dikirim ke go2rtc. */
export const codecs = () => [...H264, H265].filter(supports).join(',')

/**
 * Putar satu kamera di <video>. onState('live') sekali pas data pertama nyampe, onState('error') kalau gagal.
 * Balikin { stop() } — abis stop nggak ada kabar apa-apa lagi.
 */
export function playCamera(video, { key, cam, q, onState = () => {} }) {
  const ws = new WebSocket(`${BRIDGE_WS}/ws?k=${encodeURIComponent(key)}&cam=${encodeURIComponent(cam)}&q=${q}`)
  ws.binaryType = 'arraybuffer'
  let stopped = false
  let live = false
  let ms = null
  let sb = null
  let url = null
  const queue = []

  const timer = setTimeout(() => fail(), FIRST_DATA_MS)

  function cleanup() {
    stopped = true
    clearTimeout(timer)
    ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null
    try {
      ws.close()
    } catch {
      // udah ketutup
    }
    if (sb) sb.onupdateend = null
    if (ms) ms.onsourceopen = null
    queue.length = 0
    if (url) {
      URL.revokeObjectURL(url)
      video.removeAttribute('src')
      try {
        video.load()
      } catch {
        // jsdom / browser lama
      }
    }
  }

  function fail() {
    if (stopped) return
    cleanup()
    onState('error')
  }

  function pump() {
    if (stopped || !sb || sb.updating || !queue.length) return
    try {
      sb.appendBuffer(queue.shift())
    } catch {
      fail()
    }
  }

  function onUpdateEnd() {
    if (stopped) return
    const b = sb.buffered
    if (b.length) {
      const start = b.start(0)
      const end = b.end(b.length - 1)
      if (end - video.currentTime > MAX_LAG) video.currentTime = end - 0.5
      else if (video.currentTime < start) video.currentTime = start // potongan pertama nggak mulai dari 0 → jangan nyangkut
      if (video.currentTime - start > KEEP_BEHIND) {
        try {
          sb.remove(start, video.currentTime - TRIM_TO)
          return // lanjut pas remove-nya kelar (updateend berikutnya)
        } catch {
          // gagal buang → biarin, lanjut nambah
        }
      }
    }
    pump()
  }

  function startMedia(mime) {
    ms = new MediaSource()
    url = URL.createObjectURL(ms)
    video.src = url
    ms.onsourceopen = () => {
      if (stopped) return
      try {
        sb = ms.addSourceBuffer(mime)
        sb.mode = 'segments'
      } catch {
        return fail()
      }
      sb.onupdateend = onUpdateEnd
      pump()
    }
  }

  ws.onopen = () => ws.send(JSON.stringify({ type: 'mse', value: codecs() }))
  ws.onmessage = (ev) => {
    if (stopped) return
    if (typeof ev.data === 'string') {
      let msg = null
      try {
        msg = JSON.parse(ev.data)
      } catch {
        return
      }
      if (msg?.type === 'mse' && !ms) startMedia(msg.value)
      else if (msg?.type === 'error') fail()
      return
    }
    queue.push(ev.data)
    pump()
    if (!live) {
      live = true
      clearTimeout(timer)
      video.play?.()?.catch?.(() => {})
      onState('live')
    }
  }
  ws.onclose = () => fail()

  return { stop: cleanup }
}
