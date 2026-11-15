import { resizeForUpload } from './imageResize.js'

it('sends the original photo when the browser cannot resize it', async () => {
  const file = new File(['x'], 'struk.heic', { type: 'image/heic' })
  expect(await resizeForUpload(file)).toBe(file)
})
