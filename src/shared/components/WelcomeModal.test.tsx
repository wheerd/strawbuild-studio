import { fireEvent, render, screen } from '@testing-library/react'
import { keyFromSelector } from 'i18next'
import { describe, expect, it, vi } from 'vitest'

import { WelcomeModal } from './WelcomeModal'

vi.mock('./Logo', () => ({
  Logo: () => <div data-testid="logo" />
}))

vi.mock('react-i18next', () => ({
  useTranslation: vi.fn(() => ({
    t: vi.fn((k, o) => {
      const key = keyFromSelector(k)
      if (o?.returnObjects) {
        return [`${key}.item1`, `${key}.item2`]
      }
      return key
    }),
    i18n: {
      changeLanguage: () => new Promise(vi.fn())
    }
  })),
  initReactI18next: {
    type: '3rdParty',
    init: vi.fn()
  }
}))

describe('WelcomeModal', () => {
  it('renders when open', () => {
    const onAccept = vi.fn()
    render(<WelcomeModal isOpen mode="first-visit" onAccept={onAccept} />)

    expect(screen.getByTestId('logo')).toBeInTheDocument()
    expect(screen.getByText(/introduction/)).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    const onAccept = vi.fn()
    render(<WelcomeModal isOpen={false} mode="first-visit" onAccept={onAccept} />)

    expect(screen.queryByTestId('logo')).not.toBeInTheDocument()
  })

  it('shows disclaimer section', () => {
    const onAccept = vi.fn()
    render(<WelcomeModal isOpen mode="first-visit" onAccept={onAccept} />)

    expect(screen.getByText('disclaimer.title')).toBeInTheDocument()
    expect(screen.getByText(/disclaimer.items.item1/)).toBeInTheDocument()
    expect(screen.getByText(/disclaimer.items.item2/)).toBeInTheDocument()
  })

  it('shows local storage information', () => {
    const onAccept = vi.fn()
    render(<WelcomeModal isOpen mode="first-visit" onAccept={onAccept} />)

    expect(screen.getByText('localStorage.title')).toBeInTheDocument()
    expect(screen.getByText(/localStorage.privacy/)).toBeInTheDocument()
  })

  it('calls onAccept when button is clicked', () => {
    const onAccept = vi.fn()
    render(<WelcomeModal isOpen mode="first-visit" onAccept={onAccept} />)

    const button = screen.getByRole('button', { name: /continueButton/i })
    fireEvent.click(button)

    expect(onAccept).toHaveBeenCalledOnce()
  })

  it('does not show close button in first-visit mode', () => {
    const onAccept = vi.fn()
    render(<WelcomeModal isOpen mode="first-visit" onAccept={onAccept} />)

    const closeButtons = screen.queryAllByRole('button')
    const hasCloseButton = closeButtons.some(
      button =>
        button.getAttribute('aria-label') === 'Close' || button.querySelector('svg')?.classList.contains('X')
    )

    expect(hasCloseButton).toBe(false)
  })

  it('shows close button in manual mode', () => {
    const onAccept = vi.fn()
    render(<WelcomeModal isOpen mode="manual" onAccept={onAccept} />)

    const closeButtons = screen.getAllByRole('button')
    expect(closeButtons.length).toBeGreaterThan(1)
  })

  it('shows helper text in first-visit mode', () => {
    const onAccept = vi.fn()
    render(<WelcomeModal isOpen mode="first-visit" onAccept={onAccept} />)

    expect(screen.getByText(/reviewInfo/)).toBeInTheDocument()
  })

  it('does not show helper text in manual mode', () => {
    const onAccept = vi.fn()
    render(<WelcomeModal isOpen mode="manual" onAccept={onAccept} />)

    expect(screen.queryByText(/reviewInfo/)).not.toBeInTheDocument()
  })
})
