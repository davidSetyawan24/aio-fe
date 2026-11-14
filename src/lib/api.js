import axios from 'axios'
import { deviceHeaders } from './device.js'

/** Error dari BE (atau koneksi). status 0 = server nggak kejangkau. */
export class ApiError extends Error {
  constructor(message, status, fields = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields
  }
}

/**
 * URL BE. VITE_API_URL diisi (production) → pakai itu.
 * Kosong (dev) → host yang sama dengan FE, port 3000. Jadi dibuka dari HP lewat IP laptop tetep nembak BE di laptop.
 */
export function resolveApiBase(env, loc) {
  const fromEnv = env?.VITE_API_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/+$/, '')
  return `${loc.protocol}//${loc.hostname}:3000`
}

const REQUEST_TIMEOUT_MS = 15000

const isEnvelope = (body) => body && typeof body === 'object' && typeof body.message === 'string' && 'success' in body

function toApiError(error) {
  const res = error.response
  if (!res) return new ApiError('Nggak bisa nyambung ke server.', 0)
  const body = res.data
  if (!isEnvelope(body)) return new ApiError('Ada yang error di server. Coba lagi ya.', res.status)
  const fields = body.data && typeof body.data === 'object' && !Array.isArray(body.data) ? body.data : null
  return new ApiError(body.message, res.status, fields)
}

/** Penghubung ke BE: kirim cookie, buka bungkus {success, message, data}, 401 → onUnauthorized. */
export function createApi({ baseURL, adapter, onUnauthorized, extraHeaders } = {}) {
  // Batas 15 detik: kalau server nerima koneksi tapi nggak jawab, jangan muter selamanya (jadi status "offline").
  const http = axios.create({
    baseURL,
    withCredentials: true,
    timeout: REQUEST_TIMEOUT_MS,
    headers: { Accept: 'application/json' },
    ...(adapter ? { adapter } : {}),
  })

  async function send(method, url, body) {
    try {
      const res = await http.request({ method, url, data: body, headers: extraHeaders?.() })
      return res.data?.data ?? null
    } catch (error) {
      const apiError = toApiError(error)
      if (apiError.status === 401) onUnauthorized?.()
      throw apiError
    }
  }

  return {
    get: (url) => send('get', url),
    post: (url, body) => send('post', url, body),
    patch: (url, body) => send('patch', url, body),
    put: (url, body) => send('put', url, body),
    del: (url) => send('delete', url),
  }
}

let unauthorizedHandler = () => {}

/** Dipasang di main.js: apa yang dilakuin kalau ada request yang dapet 401 (sesi habis). */
export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = fn
}

export const api = createApi({
  baseURL: resolveApiBase(import.meta.env, typeof location !== 'undefined' ? location : { protocol: 'http:', hostname: 'localhost' }),
  onUnauthorized: () => unauthorizedHandler(),
  // Kunci + jenis device (fitur "Device yang lagi login"): nyambungin sesi ke device ini.
  extraHeaders: deviceHeaders,
})
