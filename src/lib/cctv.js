/**
 * CCTV rumah: ngobrol sama app mini "AIO CCTV" yang jalan di Mac ini (cuma dengerin 127.0.0.1).
 * Server AIO nggak ikut campur sama sekali — video langsung dari Mac ke halaman.
 *
 * Kunci sekali pakai: tiap manggil app mini, halaman bikin kunci acak baru (cuma di memori) & ngirimnya lewat aiocctv://.
 * App mini cuma ngelayanin permintaan yang bawa kunci itu.
 */
export const BRIDGE = 'http://127.0.0.1:1985'
export const BRIDGE_WS = 'ws://127.0.0.1:1985'

export const POLL_MS = 1000
export const POLL_FOR_MS = 15000
export const HIDDEN_MAX_MS = 60000
/** Abis kirim "stop", app mini lama butuh ±2 dtk buat beres-beres (masih jawab 409 ke kunci baru). */
export const STOP_GRACE_MS = 5000
/** App mini yang dipanggil tapi belum nyambung tali mati sendiri dalam 60 dtk → kuncinya diinget selama itu. */
export const LAUNCH_MEMORY_MS = 60000
/** Video kamera putus (wifi kedip / kamera restart) → nyambung ulang sendiri: 2, 5, 10 dtk, lalu tiap 15 dtk (±2 mnt), abis itu nyerah. */
export const RECONNECT_MS = [2000, 5000, 10000, ...Array(7).fill(15000)]
/** Stream tajem di tampilan gede putus → balik ke yang kecil dulu, yang tajem dicoba lagi tiap 5 dtk, maks 3×. */
export const SHARP_RETRY_MS = 5000
export const SHARP_RETRIES = 3

/**
 * Kunci yang udah dikirim lewat aiocctv:// tapi belum kepakai (halaman nyerah nunggu / ditinggal pas lagi nyalain).
 * App mini-nya bisa aja nyala telat & megang kunci itu → dicoba duluan biar nggak dikira "tab lain".
 * Cuma di memori (ilang pas halaman di-reload), nggak pernah ke localStorage / URL.
 */
const pendingLaunches = []

const OPEN = 1
const CLOSED = 3

/** 32 byte acak → base64url tanpa '=' (43 karakter; app mini nolak bentuk lain). */
export function newKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export const launchUrl = (key) => `aiocctv://start?k=${key}`

/** Minta macOS buka app mini (Chrome nanya "Buka AIO CCTV?" kalau belum dicentang selalu). */
export function launch(key) {
  globalThis.location.href = launchUrl(key)
}

/**
 * Tanya app mini lagi nyala nggak (pakai kunci ini).
 * Nggak nyambung / kelamaan / Origin ditolak = off. 409 = dipegang tab lain (kunci beda).
 * Catatan: Chrome yang nolak akses jaringan lokal & app mini yang mati sama-sama TypeError cepet,
 * jadi "diblok" dicek terpisah lewat izin browser (`networkPermission`).
 */
export async function fetchStatus(key, { timeoutMs = 1500 } = {}) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`${BRIDGE}/status?k=${encodeURIComponent(key)}`, { signal: ctrl.signal, cache: 'no-store' })
    if (res.status === 409) return { kind: 'busy' }
    if (!res.ok) return { kind: 'off' }
    const body = await res.json()
    if (body?.ok !== true || !Array.isArray(body.cameras)) return { kind: 'off' }
    return { kind: 'ok', cameras: body.cameras.map((c) => ({ key: String(c.key), ip: String(c.ip) })), hevc: body.hevc === true }
  } catch {
    return { kind: 'off' }
  } finally {
    clearTimeout(timer)
  }
}

/** Izin Chrome buat akses jaringan lokal / device ini: 'granted' | 'denied' | 'prompt' | 'unknown'. Namanya beda-beda antar versi Chrome. */
export async function networkPermission() {
  const query = globalThis.navigator?.permissions?.query
  if (!query) return 'unknown'
  for (const name of ['loopback-network', 'local-network-access', 'local-network']) {
    try {
      const status = await globalThis.navigator.permissions.query({ name })
      if (status?.state) return status.state
    } catch {
      // nama izin ini nggak dikenal browser → coba nama berikutnya
    }
  }
  return 'unknown'
}

/**
 * "Tali" ke app mini: selama kebuka, app mini tetep nyala. Putus = app mini langsung mati.
 * Pesan yang dikirim sebelum nyambung diantri; close() sebelum nyambung nunggu antriannya kekirim dulu (biar "stop" nyampe).
 * onClose cuma dipanggil kalau yang mutus app mini, bukan kita.
 */
export function openTali(key, { onClose } = {}) {
  const ws = new WebSocket(`${BRIDGE_WS}/tali?k=${encodeURIComponent(key)}`)
  const pending = []
  let closing = false
  let gone = false
  ws.onopen = () => {
    pending.splice(0).forEach((text) => ws.send(text))
    if (closing) ws.close()
  }
  ws.onmessage = () => {} // {"hai":true} tiap 15 dtk, cuma biar Chrome nggak nutup
  ws.onclose = () => {
    gone = true
    if (!closing) onClose?.()
  }
  return {
    send(obj) {
      if (gone || closing) return
      const text = JSON.stringify(obj)
      if (ws.readyState === OPEN) ws.send(text)
      else pending.push(text)
    },
    close() {
      if (closing) return
      closing = true
      if (ws.readyState === OPEN) ws.close()
    },
    alive: () => !gone && !closing && ws.readyState !== CLOSED,
  }
}

/**
 * Keadaan halaman CCTV:
 * idle → checking → starting (abis manggil app mini, cek tiap 1 dtk s.d. 15 dtk) → live
 *      | notMac (HP/iPad/PC lain: nggak manggil apa-apa) | off (tombol "Nyalain CCTV") | blocked (Chrome nolak) | busy (tab lain) | error (app mini nggak nyala)
 * `playing` = video boleh jalan (live & tab keliatan).
 */
export function createPageMachine({ isMac, onChange = () => {}, deps = {} } = {}) {
  const d = {
    fetchStatus,
    openTali,
    launch,
    networkPermission,
    newKey,
    // Chrome cuma mau buka aiocctv:// abis ada klik. Nggak ada klik (mis. halaman di-reload) → langsung tombol.
    userActive: () => globalThis.navigator?.userActivation?.isActive !== false,
    docHidden: () => globalThis.document?.visibilityState === 'hidden',
    launches: pendingLaunches,
    ...deps,
  }
  let state = { name: 'idle', key: null, cameras: [], hevc: false, playing: false }
  let run = 0 // naik tiap mulai alur baru / ninggalin halaman → loop lama berhenti sendiri
  let tali = null
  let hiddenAt = null
  let lastStopAt = -Infinity

  const set = (patch) => {
    state = { ...state, ...patch }
    onChange(state)
  }
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

  /** Kunci panggilan yang masih < 60 dtk, paling baru duluan. */
  function recentKeys() {
    const fresh = d.launches.filter((l) => Date.now() - l.at < LAUNCH_MEMORY_MS)
    d.launches.splice(0, d.launches.length, ...fresh)
    return fresh.map((l) => l.key).reverse()
  }
  /**
   * Coba kunci-kunci panggilan sebelumnya. Balikin { stale } kalau alurnya udah diganti,
   * { key, res } kalau ada yang dijawab app mini, atau {} kalau nggak ada.
   */
  async function probeRecent(my, skip = null) {
    for (const key of recentKeys()) {
      if (key === skip) continue
      const res = await d.fetchStatus(key, { timeoutMs: POLL_MS - 100 })
      if (my !== run) return { stale: true }
      if (res.kind === 'ok') return { key, res }
    }
    return {}
  }

  function dropTali({ stop }) {
    const t = tali
    tali = null
    hiddenAt = null
    if (!t) return
    if (stop) t.send({ stop: true })
    t.close()
    lastStopAt = Date.now()
  }

  function goLive(key, status) {
    // Panggilannya udah kepakai: abis ini app mini dimatiin lewat tali, kuncinya jangan dicoba lagi.
    d.launches.splice(0)
    let t = null
    t = d.openTali(key, {
      onClose: () => {
        if (tali !== t) return
        tali = null
        hiddenAt = null
        set({ name: 'off', playing: false })
      },
    })
    tali = t
    const hidden = d.docHidden()
    hiddenAt = hidden ? Date.now() : null
    if (hidden) t.send({ tab: 'ngumpet' })
    set({ name: 'live', key, cameras: status.cameras, hevc: status.hevc, playing: !hidden })
  }

  async function launchAndWait(key, manual, my) {
    set({ name: 'starting', key, cameras: [], playing: false })
    d.launches.push({ key, at: Date.now() })
    d.launch(key)
    const deadline = Date.now() + POLL_FOR_MS
    let last = 'off'
    while (Date.now() < deadline) {
      await sleep(POLL_MS)
      if (my !== run) return
      const res = await d.fetchStatus(key, { timeoutMs: POLL_MS - 100 })
      if (my !== run) return
      if (res.kind === 'ok') return goLive(key, res)
      // 409 = app mini lain yang nyala — bisa jadi panggilan kita sebelumnya yang telat nyala (yang ini langsung keluar).
      if (res.kind === 'busy') {
        const hit = await probeRecent(my, key)
        if (hit.stale) return
        if (hit.key) return goLive(hit.key, hit.res)
      }
      last = res.kind
    }
    // Pas nunggu, Chrome nanya izin & dijawab "Blokir" → kasih tau caranya, bukan "belum kepasang".
    const permission = await d.networkPermission()
    if (my !== run) return
    if (permission === 'denied') return set({ name: 'blocked' })
    if (last === 'busy') return set({ name: 'busy' })
    // Otomatis nggak nyambung (bisa jadi diblok Chrome) → tombol. Udah dipencet tapi tetep nggak nyala → app mini bermasalah.
    set({ name: manual ? 'error' : 'off' })
  }

  async function check(manual) {
    const my = ++run
    if (!isMac) return set({ name: 'notMac', playing: false })
    set({ name: 'checking', key: null, cameras: [], playing: false })
    if ((await d.networkPermission()) === 'denied') return my === run && set({ name: 'blocked' })
    if (my !== run) return
    const key = d.newKey()
    let res
    for (;;) {
      // App mini dari panggilan kita sebelumnya (telat nyala / halaman ditinggal pas nyalain) → pakai lagi.
      const hit = await probeRecent(my)
      if (hit.stale) return
      if (hit.key) return goLive(hit.key, hit.res)
      res = await d.fetchStatus(key)
      if (my !== run) return
      // 409 tapi baru aja ninggalin halaman (app mini lama masih beres-beres) atau baru aja manggil app mini
      // (masih bisa nyala telat) → tunggu, jangan langsung bilang "tab lain". Paling lama 60 dtk.
      const waiting = Date.now() - lastStopAt < STOP_GRACE_MS || recentKeys().length > 0
      if (res.kind !== 'busy' || !waiting) break
      await sleep(POLL_MS)
      if (my !== run) return
    }
    if (res.kind === 'ok') return goLive(key, res)
    if (res.kind === 'busy') return set({ name: 'busy' })
    if (!manual && !d.userActive()) return set({ name: 'off' })
    return launchAndWait(key, manual, my)
  }

  return {
    get state() {
      return state
    },
    /** Halaman kebuka. */
    enter: () => check(false),
    /** "Coba lagi" dari busy / blocked: cek ulang (abis klik → boleh langsung manggil app mini). */
    retry: () => check(true),
    /** "Nyalain CCTV" / "Coba lagi" abis gagal nyala: kunci baru + panggil app mini. */
    async start() {
      const my = ++run
      dropTali({ stop: true })
      if (!isMac) return set({ name: 'notMac', playing: false })
      if ((await d.networkPermission()) === 'denied') return my === run && set({ name: 'blocked' })
      if (my !== run) return
      // Panggilan sebelumnya ternyata nyala telat (abis halaman nyerah nunggu) → langsung pakai, nggak usah manggil lagi.
      set({ name: 'checking', key: null, cameras: [], playing: false })
      const hit = await probeRecent(my)
      if (hit.stale) return
      if (hit.key) return goLive(hit.key, hit.res)
      return launchAndWait(d.newKey(), true, my)
    },
    /** Tab disembunyiin: video dilepas, app mini dikabarin (mati sendiri kalau ≥ 1 mnt). */
    hidden() {
      if (state.name !== 'live' || hiddenAt !== null) return
      hiddenAt = Date.now()
      tali?.send({ tab: 'ngumpet' })
      set({ playing: false })
    },
    /** Tab keliatan lagi: < 1 mnt & tali masih nyambung → lanjut tanpa manggil app mini; selainnya tombol. */
    visible() {
      if (state.name !== 'live' || hiddenAt === null) return
      const away = Date.now() - hiddenAt
      if (!tali?.alive() || away >= HIDDEN_MAX_MS) {
        dropTali({ stop: true })
        return set({ name: 'off', playing: false })
      }
      hiddenAt = null
      tali.send({ tab: 'keliatan' })
      set({ playing: true })
    },
    /** Ninggalin halaman: "stop" dulu baru tali ditutup → app mini langsung mati. */
    leave() {
      run += 1
      dropTali({ stop: true })
      set({ name: 'idle', cameras: [], playing: false })
    },
  }
}
