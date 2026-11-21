// Bunyi selesai istirahat: 3 bip pendek lewat Web Audio + getar. iOS cuma ngebolehin suara kalau
// AudioContext dibikin / di-resume dari tap user → `unlockAudio()` dipanggil di handler tap ✓.
let ctx = null

export function unlockAudio() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    ctx = ctx || new AC()
    if (ctx.state !== 'running') ctx.resume()?.catch?.(() => {})
  } catch {
    // tanpa suara: timer tetep jalan
  }
}

export function beep() {
  try {
    if (ctx) {
      if (ctx.state !== 'running') ctx.resume()?.catch?.(() => {})
      ;[0, 0.22, 0.44].forEach((t, i) => {
        const at = ctx.currentTime + t
        const o = ctx.createOscillator()
        const g = ctx.createGain()
        o.frequency.value = i === 2 ? 1320 : 880
        g.gain.setValueAtTime(0.0001, at)
        g.gain.exponentialRampToValueAtTime(0.25, at + 0.02)
        g.gain.exponentialRampToValueAtTime(0.0001, at + 0.18)
        o.connect(g).connect(ctx.destination)
        o.start(at)
        o.stop(at + 0.2)
      })
    }
  } catch {
    // tanpa suara
  }
  try {
    navigator.vibrate?.([120, 80, 120])
  } catch {
    // getar nggak didukung
  }
}
