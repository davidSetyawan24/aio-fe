// Sesi Gym yang lagi jalan, dipegang di HP: draf (angka set, gerakan kebuka, timer) + antrian kirim ke server.
// Aturan utama: ✓ langsung kecentang tanpa nunggu jaringan, dan nggak ada set yang ilang / dobel.
// - Tiap set bawa `clientId` (= `key` barisnya) → kirim ulang nggak bikin dobel di server.
// - Isi request dibaca pas mau dikirim (bukan pas dicentang) → benerin set yang belum kekirim nggak perlu request tambahan.
// - Item antrian yang udah pernah dicoba (`tried`) bisa aja udah nyampe server walau jawabannya ilang,
//   jadi hapus set kayak gitu tetep dikirim ke server (`cancel` = kirim ulang biar dapet id, lalu hapus).
// Semua fungsi ngubah draf di tempat (draf yang sama dipegang store & dikirim di belakang).
import { LIMITS } from './gym.js'

export const LIVE_KEY = 'aio-gym-live'
export const GHOST_KEY = 'aio-gym-ghosts'
export const OFFLINE_TEXT = 'Belum ada sinyal. Set lo aman di HP ini, coba Selesai lagi bentar.'

/** Belum ada sinyal: antrian / request ke server belum bisa jalan, data tetep aman di HP. */
export class OfflineError extends Error {
  constructor(message = OFFLINE_TEXT) {
    super(message)
    this.name = 'OfflineError'
  }
}

export function makeUid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}-${Math.random().toString(36).slice(2, 12)}`
}

const iso = (t) => new Date(t).toISOString()
const row = (key, weight, reps, prev) => ({ key, weight, reps, done: false, doneAt: null, serverId: null, prev })
const blankRow = (uid) => row(uid(), null, null, null)
const patokanOf = (exercise) => (exercise?.last?.sets ?? []).map(([w, r]) => [Number(w), Number(r)])
/** Beban disimpen 2 desimal di server → di HP juga dibulatin ke 2 desimal biar angkanya sama persis. */
const round2 = (w) => (typeof w === 'number' && Number.isFinite(w) ? Math.round(w * 100) / 100 : w)
const sameSet = (a, b) =>
  Math.round(Number(a.weight) * 100) === Math.round(Number(b.weight) * 100) && Number(a.reps) === Number(b.reps)

function patokanRows(exercise, uid) {
  const sets = patokanOf(exercise)
  return sets.length ? sets.map(([w, r]) => row(uid(), w, r, [w, r])) : [blankRow(uid)]
}

/** Beban & reps yang boleh dicentang (sama kayak batas server). */
export function validSet(weight, reps) {
  return (
    typeof weight === 'number' &&
    weight > LIMITS.weight[0] &&
    weight <= LIMITS.weight[1] &&
    Number.isInteger(reps) &&
    reps >= LIMITS.reps[0] &&
    reps <= LIMITS.reps[1]
  )
}

/** Draf sesi baru (belum ada di server): antrian dimulai dengan `start`. */
export function newLive({ program, programs, exercises, now, uid = makeUid }) {
  const byId = new Map(exercises.map((x) => [x.id, x]))
  const planned = [...(programs.find((p) => p.key === program)?.exerciseIds ?? [])]
  const clientId = uid()
  return {
    clientId,
    serverId: null,
    program,
    startedAt: iso(now),
    planned,
    items: planned.map((id) => ({ exerciseId: id, extra: false, rows: patokanRows(byId.get(id), uid) })),
    open: 0,
    timer: null,
    queue: [{ op: 'start' }],
    joined: false,
    lost: 0,
  }
}

function findRow(live, key) {
  for (const item of live.items) {
    const r = item.rows.find((x) => x.key === key)
    if (r) return { item, row: r }
  }
  return null
}

const hasOp = (live, key, ops, except = null) =>
  live.queue.some((o) => o !== except && o.key === key && ops.includes(o.op))
const addBody = (item, r) => ({
  exerciseId: item.exerciseId,
  weight: r.weight,
  reps: r.reps,
  doneAt: r.doneAt,
  clientId: r.key,
})

/** ✓ satu baris (angka boleh dioper sekalian). Balikin false kalau angkanya belum bener / udah ✓. */
export function checkRow(live, i, j, now, vals = null) {
  const item = live.items[i]
  const r = item?.rows[j]
  if (!r || r.done) return false
  const weight = round2(vals ? vals.weight : r.weight)
  const reps = vals ? vals.reps : r.reps
  if (!validSet(weight, reps)) return false
  Object.assign(r, { weight, reps, done: true, doneAt: iso(now) })
  live.queue.push({ op: 'add', key: r.key })
  const next = item.rows[j + 1]
  if (next && !next.done && (next.weight == null || next.reps == null)) Object.assign(next, { weight, reps })
  return true
}

/** Ubah angka. Belum ✓ = cuma di HP (boleh kosong). Udah ✓ = wajib bener; udah kekirim → antri `edit`. */
export function editRow(live, i, j, vals) {
  const r = live.items[i]?.rows[j]
  if (!r) return false
  const weight = round2(vals.weight)
  const reps = vals.reps
  if (!r.done) {
    Object.assign(r, { weight, reps })
    return true
  }
  if (!validSet(weight, reps)) return false
  Object.assign(r, { weight, reps })
  if (r.serverId != null && !hasOp(live, r.key, ['add', 'edit']))
    live.queue.push({ op: 'edit', key: r.key, serverId: r.serverId })
  return true
}

/** Hapus baris. Set yang belum pernah dicoba kirim cukup dibuang dari antrian; sisanya server ikut dikabarin. */
export function deleteRow(live, i, j, uid = makeUid) {
  const item = live.items[i]
  const r = item?.rows[j]
  if (!r) return false
  if (r.done) {
    const key = r.key
    live.queue = live.queue.filter((o) => !(o.key === key && o.op === 'edit'))
    if (r.serverId != null) {
      live.queue = live.queue.filter((o) => !(o.key === key && o.op === 'add'))
      live.queue.push({ op: 'del', key, serverId: r.serverId })
    } else {
      const k = live.queue.findIndex((o) => o.key === key && o.op === 'add')
      if (k >= 0) {
        if (live.queue[k].tried) live.queue[k] = { op: 'cancel', key, body: addBody(item, r) }
        else live.queue.splice(k, 1)
      }
    }
  }
  item.rows.splice(j, 1)
  if (!item.rows.length) item.rows.push(blankRow(uid))
  return true
}

/** + Tambah set: keisi angka baris terakhir gerakan itu. */
export function addRow(live, i, uid = makeUid) {
  const item = live.items[i]
  if (!item) return -1
  const last = item.rows.at(-1)
  item.rows.push(row(uid(), last?.weight ?? null, last?.reps ?? null, null))
  return item.rows.length - 1
}

/** + Tambah gerakan buat sesi ini doang. Udah ada → cuma dibuka. Balikin indeksnya. */
export function addExercise(live, exercise, uid = makeUid) {
  let idx = live.items.findIndex((it) => it.exerciseId === exercise.id)
  if (idx < 0) {
    live.items.push({
      exerciseId: exercise.id,
      extra: !live.planned.includes(exercise.id),
      rows: patokanRows(exercise, uid),
    })
    idx = live.items.length - 1
  }
  live.open = idx
  return idx
}

/** Kegiatan terakhir (ISO): set terakhir yang dicentang (termasuk yang masih ngantri), belum ada = jam mulai. */
export function lastActivityAt(live) {
  let last = Date.parse(live.startedAt)
  for (const item of live.items)
    for (const r of item.rows) if (r.done && r.doneAt) last = Math.max(last, Date.parse(r.doneAt))
  return iso(last)
}

// ---- Gabung sama sesi dari server ----

const bySetOrder = (a, b) => a.doneAt.localeCompare(b.doneAt) || a.id - b.id
const serverRow = (s, prev) => ({
  key: s.clientId,
  weight: Number(s.weight),
  reps: Number(s.reps),
  done: true,
  doneAt: s.doneAt,
  serverId: s.id,
  prev,
})

function freshItem(id, extra, sets, exercise, uid) {
  const pat = patokanOf(exercise)
  const rows = sets.map((s, k) => serverRow(s, pat[k] ?? null))
  for (let k = sets.length; k < pat.length; k++) rows.push(row(uid(), pat[k][0], pat[k][1], pat[k]))
  if (!rows.length) rows.push(blankRow(uid))
  return { exerciseId: id, extra, rows }
}

/**
 * Draf dari sesi server. `local` = draf HP untuk sesi yang sama (atau null):
 * angka belum ✓, gerakan tambahan, gerakan kebuka, timer & antrian dipertahanin; set yang udah di server
 * ikut angka server kecuali lagi ada perubahan yang ngantri; set dari device lain masuk; set yang dihapus
 * di device lain ilang. `local` diubah di tempat & dibalikin.
 */
export function fromServer(session, exercises, local, uid = makeUid) {
  const byId = new Map(exercises.map((x) => [x.id, x]))
  const sets = [...(session.sets ?? [])].sort(bySetOrder)
  const planned = [...(session.planned ?? [])]
  if (!local) {
    const order = [...planned]
    for (const s of sets) if (!order.includes(s.exerciseId)) order.push(s.exerciseId)
    return {
      clientId: session.clientId,
      serverId: session.id,
      program: session.program,
      startedAt: session.startedAt,
      planned,
      items: order.map((id) =>
        freshItem(
          id,
          !planned.includes(id),
          sets.filter((s) => s.exerciseId === id),
          byId.get(id),
          uid,
        ),
      ),
      open: 0,
      timer: null,
      queue: [],
      joined: false,
      lost: 0,
    }
  }

  const live = local
  const openId = live.items[live.open]?.exerciseId
  Object.assign(live, {
    clientId: session.clientId,
    serverId: session.id,
    program: session.program,
    startedAt: session.startedAt,
    planned,
  })
  const pending = new Set(live.queue.filter((o) => ['add', 'edit', 'cancel'].includes(o.op)).map((o) => o.key))
  const deleting = new Set(live.queue.filter((o) => o.op === 'del').map((o) => o.serverId))
  const cancelling = new Set(live.queue.filter((o) => o.op === 'cancel').map((o) => o.key))
  const matched = new Set()

  for (const item of live.items) {
    item.rows = item.rows.filter((r) => {
      if (!r.done) return true
      const s = sets.find((x) => (r.serverId != null && x.id === r.serverId) || x.clientId === r.key)
      if (s) {
        matched.add(s.id)
        r.serverId = s.id
        if (!pending.has(r.key)) Object.assign(r, { weight: Number(s.weight), reps: Number(s.reps), doneAt: s.doneAt })
        return true
      }
      return r.serverId == null || pending.has(r.key) // udah di server tapi ilang = dihapus di device lain
    })
  }

  for (const s of sets) {
    if (matched.has(s.id) || deleting.has(s.id) || cancelling.has(s.clientId)) continue
    let item = live.items.find((it) => it.exerciseId === s.exerciseId)
    if (!item) {
      item = { exerciseId: s.exerciseId, extra: !planned.includes(s.exerciseId), rows: [] }
      live.items.push(item)
    }
    const at = item.rows.findLastIndex((r) => r.done) + 1
    item.rows.splice(at, 0, serverRow(s, null))
  }

  const items = []
  for (const id of planned) {
    const it = live.items.find((x) => x.exerciseId === id) ?? freshItem(id, false, [], byId.get(id), uid)
    it.extra = false
    items.push(it)
  }
  for (const it of live.items) {
    if (planned.includes(it.exerciseId)) continue
    it.extra = true
    items.push(it)
  }
  for (const it of items) if (!it.rows.length) it.rows.push(blankRow(uid))
  live.items = items
  const open = items.findIndex((it) => it.exerciseId === openId)
  live.open = open >= 0 ? open : 0
  return live
}

// ---- Kirim antrian ----

/** Jawaban pasti dari server buat satu set (nggak usah dicoba lagi). Selain ini (jaringan, 5xx, 401, …) = coba lagi nanti. */
const settled = (e) => [404, 409, 422].includes(e?.status)

/**
 * Kirim antrian urut (start dulu). Berhenti di error yang perlu dicoba lagi nanti.
 * `onChange` dipanggil sebelum tiap request & abis tiap perubahan, biar store langsung nyimpen draf.
 * Hasil: `{ done, joined: Session|null, lost, rejected, dropped }`:
 * `lost` = set yang ditolak karena sesinya udah diselesaiin (409), `rejected` = set yang ditolak 404/422 —
 * dua-duanya barisnya balik jadi belum ✓ (angka tetep) biar nggak keliatan kesimpen; set yang udah dihapus
 * sendiri nggak diitung. `dropped` = semua item yang ditolak pasti sama server.
 */
export async function flush(live, api, { onChange = () => {} } = {}) {
  const result = { done: false, joined: null, lost: 0, rejected: 0, dropped: 0 }
  const drop = (op) => {
    const k = live.queue.indexOf(op)
    if (k >= 0) live.queue.splice(k, 1)
  }
  const setsUrl = () => `/gym/sessions/${live.serverId}/sets`

  while (live.queue.length) {
    const op = live.queue[0]
    if (op.op !== 'start' && live.serverId == null) break // nggak kejadian: start selalu paling depan
    op.tried = true
    onChange()
    try {
      if (op.op === 'start') {
        const s = await api.post('/gym/sessions', {
          program: live.program,
          startedAt: live.startedAt,
          clientId: live.clientId,
        })
        live.serverId = s.id
      } else if (op.op === 'add') {
        const found = findRow(live, op.key)
        if (!found) {
          drop(op)
          onChange()
          continue
        }
        const body = addBody(found.item, found.row)
        const res = await api.post(setsUrl(), body)
        afterWrite(live, op, res, body, true)
      } else if (op.op === 'edit') {
        const found = findRow(live, op.key)
        if (found) {
          const sent = { weight: found.row.weight, reps: found.row.reps }
          await api.patch(`${setsUrl()}/${op.serverId}`, sent)
          afterWrite(live, op, null, sent, false)
        }
      } else if (op.op === 'cancel') {
        const res = await api.post(setsUrl(), op.body)
        const k = live.queue.indexOf(op)
        if (k >= 0) live.queue[k] = { op: 'del', key: op.key, serverId: res.id }
        onChange()
        continue
      } else if (op.op === 'del') {
        await api.del(`${setsUrl()}/${op.serverId}`)
      }
      drop(op)
      onChange()
    } catch (e) {
      if (op.op === 'start') {
        const active = e?.status === 409 ? e.fields?.active : null
        if (!active) return result
        live.serverId = active.id
        live.joined = true
        result.joined = active
      } else if (!settled(e)) {
        return result
      } else {
        result.dropped++
        if (op.op === 'add') rejectAdd(live, op, e.status === 409 ? 'lost' : 'rejected', result)
      }
      drop(op)
      onChange()
    }
  }
  result.done = live.queue.length === 0
  return result
}

/** Add ditolak pasti: set nggak ada di server → barisnya balik belum ✓ (angka tetep). Udah dihapus sendiri → diem aja. */
function rejectAdd(live, op, kind, result) {
  live.queue = live.queue.filter((o) => !(o.op === 'cancel' && o.key === op.key))
  const found = findRow(live, op.key)
  if (!found) return
  Object.assign(found.row, { done: false, doneAt: null })
  result[kind]++
  if (kind === 'lost') live.lost = (live.lost ?? 0) + 1
}

/**
 * Abis add / edit kekirim: pasang id server, dan kabarin server lagi kalau barisnya berubah / dihapus selama request jalan.
 * Patokannya angka yang DIKIRIM (`sent`), bukan jawaban server → nggak bisa muter terus walau server ngebulatin angka.
 * Khusus add: jawaban kirim ulang (`clientId` udah ada) bisa bawa angka lama → beda sama baris = PATCH sekali.
 */
function afterWrite(live, op, res, sent, isAdd) {
  const found = findRow(live, op.key)
  if (!found) {
    if (!isAdd) return // dihapus pas PATCH jalan → `del` udah ngantri
    const k = live.queue.findIndex((o) => o.op === 'cancel' && o.key === op.key)
    if (k >= 0) live.queue[k] = { op: 'del', key: op.key, serverId: res.id }
    else live.queue.push({ op: 'del', key: op.key, serverId: res.id })
    return
  }
  const r = found.row
  if (isAdd) r.serverId = res.id
  const differs = !sameSet(sent, r) || (isAdd && res && !sameSet(res, r))
  if (differs && !hasOp(live, r.key, ['edit'], op)) live.queue.push({ op: 'edit', key: r.key, serverId: r.serverId })
}

// ---- Sesi yang dibuang tapi belum bisa dihapus di server ("hantu") ----

/**
 * Hantu = `{ clientId, program, startedAt, serverId }` dari sesi yang dibuang pas belum ada sinyal.
 * id server belum tau → kirim ulang start dengan `clientId` yang sama buat dapet id-nya.
 * Sebelum DELETE dicek `GET /gym/active`: cuma dihapus kalau sesi itu MASIH jalan (DELETE pakai `?running=1`: server nolak 409 kalau udah diselesaiin, hantunya dibuang). Sesi orang (device lain),
 * sesi yang nggak pernah kecatet, atau yang udah diselesaiin di device lain → hantunya dibuang tanpa ngehapus apa-apa.
 * Balikin true kalau semua beres.
 */
export async function clearGhosts(ghosts, api, { onChange = () => {} } = {}) {
  const done = (g) => {
    const k = ghosts.indexOf(g)
    if (k >= 0) ghosts.splice(k, 1)
    onChange()
  }
  while (ghosts.length) {
    const g = ghosts[0]
    try {
      if (g.serverId == null) {
        let s
        try {
          s = await api.post('/gym/sessions', { program: g.program, startedAt: g.startedAt, clientId: g.clientId })
        } catch (e) {
          if (e?.status !== 409) throw e
          s = e.fields?.active ?? null // 409 tapi yang jalan ternyata sesi kita sendiri → tetep diurus
        }
        if (!s || s.clientId !== g.clientId || s.endedAt != null) {
          done(g) // bukan sesi kita / udah diselesaiin (mis. di device lain) → jangan dihapus
          continue
        }
        g.serverId = s.id
        onChange()
      }
      // Cuma dihapus kalau masih jalan: DELETE juga ngehapus riwayat, jadi sesi yang udah diselesaiin
      // di device lain (latihan beneran) nggak boleh ikut kehapus.
      const active = await api.get('/gym/active')
      if (active?.id !== g.serverId) {
        done(g)
        continue
      }
      await api.del(`/gym/sessions/${g.serverId}?running=1`)
      done(g)
    } catch (e) {
      if (!settled(e)) return false
      done(g) // 404 = udah nggak ada
    }
  }
  return true
}

export function saveGhosts(storage, ghosts) {
  try {
    if (ghosts.length) storage.setItem(GHOST_KEY, JSON.stringify(ghosts))
    else storage.removeItem(GHOST_KEY)
  } catch {
    // storage penuh / diblok: hantu tetep ada di memori sampe app ditutup
  }
}

export function loadGhosts(storage) {
  try {
    const list = JSON.parse(storage.getItem(GHOST_KEY) ?? '[]')
    return Array.isArray(list) ? list.filter((g) => g && typeof g.clientId === 'string') : []
  } catch {
    return []
  }
}

// ---- Simpen di HP ----

export function save(storage, live) {
  try {
    if (live) storage.setItem(LIVE_KEY, JSON.stringify(live))
    else storage.removeItem(LIVE_KEY)
    return true
  } catch {
    return false
  }
}

export function load(storage) {
  try {
    const raw = storage.getItem(LIVE_KEY)
    if (!raw) return null
    const live = JSON.parse(raw)
    const ok = live && typeof live.clientId === 'string' && Array.isArray(live.items) && Array.isArray(live.queue)
    return ok ? live : null
  } catch {
    return null
  }
}
