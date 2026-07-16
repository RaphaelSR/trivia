jest.mock('qrcode', () => ({
  __esModule: true,
  default: {
    toString: jest.fn().mockResolvedValue('<svg><path d="M0 0" /></svg>'),
  },
}))

import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import QRCode from 'qrcode'
import { LocalQrCode } from '@/shared/components/LocalQrCode'

it('gera SVG local sem URL externa', async () => {
  const secretUrl = 'https://example.test/claim?session=segredo'
  render(<LocalQrCode value={secretUrl} label="QR local" size={160} />)

  const image = await screen.findByRole('img', { name: 'QR local' })
  expect(QRCode.toString).toHaveBeenCalledWith(
    secretUrl,
    expect.objectContaining({ type: 'svg', width: 160 }),
  )
  expect(image).toHaveAttribute('src', expect.stringMatching(/^data:image\/svg\+xml/))
  expect(image.getAttribute('src')).not.toContain('api.qrserver.com')
})
