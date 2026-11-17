import { defineStore } from 'pinia'
import { api as defaultApi } from '@/lib/api.js'

let personalApi = defaultApi

/** Buat test: ganti penghubung API dengan yang palsu. */
export function setPersonalApi(apiLike) {
  personalApi = apiLike
  booting = null
}

let booting = null

const replaceById = (list, item) => list.map((x) => (x.id === item.id ? item : x))

/**
 * Data Pribadi. Isinya (nomor, biodata, alamat) cuma hidup di memori sini: nggak pernah ke localStorage / cache.
 * Kekunci → isi dikosongin. Server yang nentuin kebuka/nggak; 423 dari server = langsung dianggap kekunci.
 */
export const usePersonalStore = defineStore('personal', {
  state: () => ({ status: null, today: null, bio: null, documents: [], addresses: [], booted: false }),

  getters: {
    unlocked: (state) => state.status?.unlocked === true,
  },

  actions: {
    /** Sekali per app: kunci dulu (buka app baru = selalu kekunci), baru cek keadaan. */
    boot() {
      if (this.booted) return booting ?? Promise.resolve()
      this.booted = true
      booting = (async () => {
        try {
          await personalApi.post('/personal/lock')
        } catch {
          // keadaan sebenernya ketahuan dari status di bawah
        }
        await this.loadStatus()
      })()
      return booting
    },

    async loadStatus() {
      this.status = await personalApi.get('/personal/status')
    },

    /** Kosongin semua isi + tandain kekunci (tanpa nanya server). */
    forget() {
      this.today = null
      this.bio = null
      this.documents = []
      this.addresses = []
      if (this.status) this.status = { ...this.status, unlocked: false }
    },

    /** Jalanin aksi yang butuh kebuka: 423 → kekunci, lalu lempar lagi. */
    async guarded(run) {
      try {
        return await run()
      } catch (err) {
        if (err?.status === 423) this.forget()
        throw err
      }
    },

    async setPin(pin) {
      const { status } = await personalApi.put('/personal/pin', { pin })
      this.status = status
    },

    async unlock(pin) {
      const { status } = await personalApi.post('/personal/unlock', { pin })
      this.status = status
    },

    /** Isi dikosongin DULU (jangan nunggu server), lalu kabarin server; gagal kirim diem aja. */
    async lock() {
      this.forget()
      try {
        await personalApi.post('/personal/lock')
      } catch {
        // server tetep nutup sendiri sesuai batas waktu
      }
    },

    async resetPin(password, pin) {
      const { status } = await personalApi.post('/personal/pin/reset', { password, pin })
      this.status = status
    },

    load() {
      return this.guarded(async () => {
        const data = await personalApi.get('/personal')
        this.today = data.today
        this.bio = data.bio
        this.documents = data.documents
        this.addresses = data.addresses
      })
    },

    saveBio(body) {
      return this.guarded(async () => {
        const { bio } = await personalApi.put('/personal/bio', body)
        this.bio = bio
        return bio
      })
    },

    createDoc(body) {
      return this.guarded(async () => {
        const { document } = await personalApi.post('/personal/documents', body)
        this.documents = [...this.documents, document]
        return document
      })
    },

    updateDoc(id, body) {
      return this.guarded(async () => {
        const { document } = await personalApi.put(`/personal/documents/${id}`, body)
        this.documents = replaceById(this.documents, document)
        return document
      })
    },

    removeDoc(id) {
      return this.guarded(async () => {
        await personalApi.del(`/personal/documents/${id}`)
        this.documents = this.documents.filter((d) => d.id !== Number(id))
      })
    },

    renewDate(id, key, on) {
      return this.guarded(async () => {
        const { document } = await personalApi.put(`/personal/documents/${id}/dates/${key}`, { on })
        this.documents = replaceById(this.documents, document)
        return document
      })
    },

    taxPaid(id) {
      return this.guarded(async () => {
        const { document } = await personalApi.post(`/personal/documents/${id}/tax-paid`)
        this.documents = replaceById(this.documents, document)
        return document
      })
    },

    createAddress(body) {
      return this.guarded(async () => {
        const { address } = await personalApi.post('/personal/addresses', body)
        this.addresses = [...this.addresses, address]
        return address
      })
    },

    updateAddress(id, body) {
      return this.guarded(async () => {
        const { address } = await personalApi.put(`/personal/addresses/${id}`, body)
        this.addresses = replaceById(this.addresses, address)
        return address
      })
    },

    removeAddress(id) {
      return this.guarded(async () => {
        await personalApi.del(`/personal/addresses/${id}`)
        this.addresses = this.addresses.filter((a) => a.id !== Number(id))
      })
    },
  },
})
