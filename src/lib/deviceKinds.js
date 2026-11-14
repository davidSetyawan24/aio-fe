import { PhDesktop, PhDeviceMobile, PhDeviceMobileCamera, PhDevices, PhDeviceTablet, PhLaptop } from '@phosphor-icons/vue'

/** Ikon + tint pastel per jenis device (sesuai mockup "Device yang lagi login" yang disetujui). */
const KINDS = {
  iPhone: { icon: PhDeviceMobile, tint: '#F3E1FF' },
  iPad: { icon: PhDeviceTablet, tint: '#DCEBFF' },
  Mac: { icon: PhLaptop, tint: '#FFE9D6' },
  Android: { icon: PhDeviceMobileCamera, tint: '#E4F7C4' },
  Windows: { icon: PhDesktop, tint: '#FFE0E6' },
  Linux: { icon: PhDesktop, tint: '#ECEBE6' },
}
export const kindLook = (kind) => KINDS[kind] ?? { icon: PhDevices, tint: '#ECEBE6' }
