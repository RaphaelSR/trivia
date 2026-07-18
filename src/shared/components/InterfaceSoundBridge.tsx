import { useEffect, useRef } from 'react'
import { playSound, unlockAudio } from '@/shared/services/audio.service'

const INTERACTIVE_SELECTOR = [
  'button',
  'a[href]',
  '[role="button"]',
  '[role="tab"]',
  'input:not([type="hidden"])',
  'select',
].join(',')

function findInteractive(target: EventTarget | null) {
  if (!(target instanceof Element)) return null
  return target.closest<HTMLElement>(INTERACTIVE_SELECTOR)
}

function isAvailable(element: HTMLElement) {
  if (element.getAttribute('aria-disabled') === 'true') return false
  return !(element instanceof HTMLButtonElement || element instanceof HTMLInputElement)
    || !element.disabled
}

export function InterfaceSoundBridge() {
  const hoveredRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const handlePointerOver = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      const interactive = findInteractive(event.target)
      if (!interactive || interactive === hoveredRef.current || !isAvailable(interactive)) return
      hoveredRef.current = interactive
      playSound('uiHover')
    }

    const handlePointerOut = (event: PointerEvent) => {
      const interactive = findInteractive(event.target)
      if (!interactive) return
      const nextInteractive = findInteractive(event.relatedTarget)
      if (nextInteractive !== interactive) hoveredRef.current = null
    }

    const handleClick = (event: MouseEvent) => {
      const interactive = findInteractive(event.target)
      if (!interactive || !isAvailable(interactive)) return
      void unlockAudio().then((ready) => {
        if (ready) playSound('uiClick')
      })
    }

    document.addEventListener('pointerover', handlePointerOver)
    document.addEventListener('pointerout', handlePointerOut)
    document.addEventListener('click', handleClick)

    return () => {
      document.removeEventListener('pointerover', handlePointerOver)
      document.removeEventListener('pointerout', handlePointerOut)
      document.removeEventListener('click', handleClick)
    }
  }, [])

  return null
}
