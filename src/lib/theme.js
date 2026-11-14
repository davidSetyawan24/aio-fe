/** Pilihan tema per device (disimpen di localStorage device itu, bukan di akun). */
export const THEME_KEY = 'aio-theme'
export const THEME_PREFS = ['system', 'light', 'dark']

const STATUS_BAR = { light: '#F3F2EE', dark: '#0B0B0A', alwaysDark: '#070807' }

/** Baca pilihan tersimpan. Kosong, nilai aneh, atau storage error (mis. private mode) → 'system'. */
export function readThemePref(storage) {
  try {
    const value = storage?.getItem(THEME_KEY)
    return THEME_PREFS.includes(value) ? value : 'system'
  } catch {
    return 'system'
  }
}

export function saveThemePref(storage, pref) {
  try {
    storage?.setItem(THEME_KEY, pref)
  } catch {
    // Storage nggak bisa ditulis: pilihan tetep jalan sampai app ditutup.
  }
}

export const resolveTheme = (pref, systemDark) => (pref === 'system' ? (systemDark ? 'dark' : 'light') : pref)

/** Warna status bar / bar Safari. Login, splash, dan layar offline selalu gelap. */
export const statusBarColor = (resolved, alwaysDarkScreen) => (alwaysDarkScreen ? STATUS_BAR.alwaysDark : STATUS_BAR[resolved])

/** Terapkan tema ke <html>: token kita (theme-dark), palet Ionic (ion-palette-dark), dan kontrol bawaan (color-scheme). */
export function applyTheme(doc, resolved) {
  const html = doc.documentElement
  const dark = resolved === 'dark'
  html.classList.toggle('theme-dark', dark)
  html.classList.toggle('ion-palette-dark', dark)
  html.style.colorScheme = resolved
}

export function setStatusBarColor(doc, color) {
  const meta = doc.querySelector('meta[name="theme-color"]')
  if (meta) meta.content = color
}
