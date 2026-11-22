import { CTX_CHIP, SUGG, chipFor, convSub, convTime, evalState, groupConvs, monthLabel, renderAiText, rupiah } from './ai.js'

// 26 Nov 2026 = Kamis. WIB = UTC+7.
const KAM = new Date('2026-11-26T13:00:00Z') // 20.00 WIB
const SEN = new Date('2026-11-23T05:00:00Z') // 12.00 WIB
const at = (iso) => ({ updatedAt: iso })

describe('renderAiText', () => {
  it('escape HTML mentah, bold, dan daftar', () => {
    const html = renderAiText('<b>x</b> **y**\n- a')
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt; <b>y</b>')
    expect(html).toContain('<ul><li>a</li></ul>')
    expect(html).not.toMatch(/<b>x<\/b>/)
  })
  it('daftar bernomor & bullet digabung jadi satu ul, baris lain paragraf', () => {
    expect(renderAiText('Halo\n1. satu\n• dua\n\nTutup')).toBe('<p>Halo</p><ul><li>satu</li><li>dua</li></ul><p>Tutup</p>')
  })
  it('script & atribut nggak lolos', () => {
    expect(renderAiText('<img src=x onerror=alert(1)>')).not.toContain('<img')
  })
})

describe('groupConvs', () => {
  it('Kamis 26 Nov', () => {
    const g = groupConvs(
      [at('2026-11-26T12:40:00Z'), at('2026-11-25T03:00:00Z'), at('2026-11-24T03:00:00Z'), at('2026-11-22T03:00:00Z')],
      KAM,
    )
    expect(g.map((x) => x.label)).toEqual(['Hari ini', 'Kemarin', 'Minggu ini', 'Lebih lama'])
    expect(g.every((x) => x.items.length === 1)).toBe(true)
  })
  it('Senin 23 Nov: Minggu 22 = Kemarin', () => {
    const g = groupConvs([at('2026-11-22T03:00:00Z')], SEN)
    expect(g).toEqual([{ label: 'Kemarin', items: [at('2026-11-22T03:00:00Z')] }])
  })
  it('pakai tanggal WIB (17.30 UTC = lewat tengah malam WIB)', () => {
    expect(groupConvs([at('2026-11-25T17:30:00Z')], KAM)[0].label).toBe('Hari ini')
  })
})

describe('convTime / convSub / chip', () => {
  it('jam, hari, tanggal', () => {
    expect(convTime('2026-11-26T12:40:00Z', KAM)).toBe('19.40')
    expect(convTime('2026-11-24T03:00:00Z', KAM)).toBe('Sel')
    expect(convTime('2026-11-26T03:00:00Z', KAM)).toBe('10.00')
    expect(convTime('2026-11-17T03:00:00Z', KAM)).toBe('17 Nov')
  })
  it('convSub', () => {
    expect(convSub({ kind: 'chat', messages: 3 })).toBe('3 pesan')
    expect(convSub({ kind: 'eval', title: 'Evaluasi Push · 23 Nov', messages: 0 })).toBe('nempel ke sesi Push')
  })
  it('chipFor', () => {
    expect(chipFor({ context: 'gym', kind: 'chat' })).toBe('🏋️ Gym')
    expect(chipFor({ context: 'badan', kind: 'chat' })).toBe('⚖️ Badan')
    expect(chipFor({ context: 'gym', kind: 'eval', sessionId: 4, title: 'Evaluasi Push · 23 Nov' })).toBe('🏋️ Gym · Push 23 Nov')
  })
  it('konstanta persis mockup', () => {
    expect(CTX_CHIP).toEqual({ gym: '🏋️ Gym', badan: '⚖️ Badan' })
    expect(SUGG.gym).toHaveLength(3)
    expect(SUGG.badan[0]).toBe('Kenapa berat gue nggak turun-turun?')
  })
})

describe('rupiah / monthLabel / evalState', () => {
  it('format', () => {
    expect(rupiah(1500)).toBe('Rp1.500')
    expect(monthLabel('2026-11')).toBe('November')
  })
  it('evalState 6 keadaan', () => {
    const c = { ringkas: 'x', poin: [] }
    expect(evalState({ status: 'none', content: null })).toBe('none')
    expect(evalState(null)).toBe('none')
    expect(evalState({ status: 'jalan', content: null })).toBe('running')
    expect(evalState({ status: 'jalan', content: c })).toBe('rerunning')
    expect(evalState({ status: 'jadi', content: c })).toBe('done')
    expect(evalState({ status: 'gagal', content: null })).toBe('failed')
    expect(evalState({ status: 'gagal', content: c })).toBe('rerunFailed')
  })
})
