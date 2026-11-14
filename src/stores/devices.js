import { defineStore } from 'pinia'
import { api as defaultApi } from '@/lib/api.js'

let devicesApi = defaultApi

/** Buat test: ganti penghubung API dengan yang palsu. */
export function setDevicesApi(apiLike) {
  devicesApi = apiLike
}

/** Nama yang ditampilin: nama custom, atau jenis device (mis. "iPad"). */
export const displayName = (d) => d?.name || d?.kind || 'Device'

/** Device yang lagi login (= sesi aktif). Id = id sesi. */
export const useDevicesStore = defineStore('devices', {
  state: () => ({ items: [], loaded: false }),

  getters: {
    byId: (state) => (id) => state.items.find((d) => d.id === Number(id)),
  },

  actions: {
    async load() {
      const data = await devicesApi.get('/auth/devices')
      this.items = data.devices
      this.loaded = true
    },

    async rename(id, name) {
      const { device } = await devicesApi.patch(`/auth/devices/${id}`, { name })
      this.items = this.items.map((d) => (d.id === device.id ? device : d))
      return device
    },

    async kill(id) {
      await devicesApi.del(`/auth/devices/${id}`)
      this.items = this.items.filter((d) => d.id !== Number(id))
    },
  },
})
