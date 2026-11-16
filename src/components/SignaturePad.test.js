import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const lib = vi.hoisted(() => ({ canvasToSignature: vi.fn(() => 'data:image/png;base64,TTD') }))
vi.mock('@/lib/signatureImage.js', () => lib)

import SignaturePad from './SignaturePad.vue'

const ctx = { lineTo: vi.fn(), moveTo: vi.fn(), beginPath: vi.fn(), stroke: vi.fn(), clearRect: vi.fn(), arc: vi.fn(), fill: vi.fn() }

beforeEach(() => {
  Object.values(ctx).forEach((f) => f.mockClear?.())
  lib.canvasToSignature.mockClear()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx)
  vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 300, height: 100 })
  HTMLCanvasElement.prototype.setPointerCapture ??= () => {}
})

const fire = async (el, type, x = 0, y = 0) => {
  const e = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true, cancelable: true })
  Object.defineProperty(e, 'pointerId', { value: 1 })
  el.dispatchEvent(e)
  await Promise.resolve()
}
const draw = async (w) => {
  const el = w.find('canvas').element
  await fire(el, 'pointerdown', 10, 10)
  await fire(el, 'pointermove', 40, 30)
  await fire(el, 'pointerup')
}

describe('SignaturePad', () => {
  it('Pakai mati selama belum ada coretan', () => {
    const w = mount(SignaturePad)
    expect(w.find('[data-test="use"]').attributes('disabled')).toBeDefined()
  })

  it('coret → Pakai ngirim PNG yang udah dipotong lewat emit', async () => {
    const w = mount(SignaturePad)
    await draw(w)
    expect(ctx.stroke).toHaveBeenCalled()
    const use = w.find('[data-test="use"]')
    expect(use.attributes('disabled')).toBeUndefined()
    await use.trigger('click')
    expect(lib.canvasToSignature).toHaveBeenCalledTimes(1)
    expect(w.emitted('use')[0]).toEqual(['data:image/png;base64,TTD'])
  })

  it('Hapus ngosongin lagi', async () => {
    const w = mount(SignaturePad)
    await draw(w)
    await w.find('[data-test="clear"]').trigger('click')
    expect(ctx.clearRect).toHaveBeenCalled()
    expect(w.find('[data-test="use"]').attributes('disabled')).toBeDefined()
  })

  it('Batal emit cancel', async () => {
    const w = mount(SignaturePad)
    await w.find('[data-test="cancel"]').trigger('click')
    expect(w.emitted('cancel')).toHaveLength(1)
  })
})
