import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { ParticipantAvatar } from '@/shared/components/ParticipantAvatar'
import { getAvatarInitials } from '@/shared/utils/avatar'

describe('ParticipantAvatar', () => {
  it('gera iniciais locais sem depender de rede', () => {
    expect(getAvatarInitials('Ana')).toBe('AN')
    expect(getAvatarInitials('Ana Maria Silva')).toBe('AS')
    expect(getAvatarInitials('')).toBe('?')

    render(<ParticipantAvatar name="Ana Maria" size={32} />)
    expect(screen.getByRole('img', { name: 'Iniciais de Ana Maria' })).toHaveTextContent('AM')
  })

  it('troca imagem quebrada por iniciais', () => {
    render(<ParticipantAvatar name="Bruno Lima" src="https://example.test/avatar.webp" />)
    const image = screen.getByRole('img', { name: 'Avatar de Bruno Lima' })
    fireEvent.error(image)
    expect(screen.getByRole('img', { name: 'Iniciais de Bruno Lima' })).toHaveTextContent('BL')
  })
})
