import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, expect, test, vi } from 'vitest'
import { SwipeRow } from './SwipeRow.tsx'

// jsdom nie ma PointerEvent – wystarczy MouseEvent z pointerId.
beforeAll(() => {
  class PointerEventStub extends MouseEvent {
    pointerId: number
    pointerType: string
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init)
      this.pointerId = init.pointerId ?? 1
      this.pointerType = init.pointerType ?? 'touch'
    }
  }
  vi.stubGlobal('PointerEvent', PointerEventStub)
})
afterEach(cleanup)

function setup() {
  const onRight = vi.fn()
  const onLeft = vi.fn()
  const onTap = vi.fn()
  render(
    <SwipeRow
      right={{
        label: 'Ogarnij',
        icon: null,
        bg: '#1F3D2E',
        fg: '#E8C98E',
        srLabel: 'Ogarnij zadanie',
        run: onRight,
      }}
      left={{
        label: 'Usuń',
        icon: null,
        bg: '#A4492F',
        fg: '#FFFFFF',
        srLabel: 'Do kosza',
        run: onLeft,
      }}
    >
      <button type="button" onClick={onTap}>
        Zadanie
      </button>
    </SwipeRow>,
  )
  const front = screen.getByRole('button', { name: 'Zadanie' }).parentElement!
  const move = (to: number) => {
    fireEvent.pointerDown(front, { clientX: 200, clientY: 10, pointerId: 1 })
    fireEvent.pointerMove(front, { clientX: 200 + to / 2, clientY: 10, pointerId: 1 })
    fireEvent.pointerMove(front, { clientX: 200 + to, clientY: 10, pointerId: 1 })
  }
  const release = () => fireEvent.pointerUp(front, { pointerId: 1 })
  return { onRight, onLeft, onTap, move, release }
}

test('w prawo: odsłania „Ogarnij”, po progu 90 px – ogarnia', () => {
  const s = setup()
  s.move(100)
  expect(screen.getByText('Ogarnij')).toBeDefined()
  s.release()
  expect(s.onRight).toHaveBeenCalledOnce()
  expect(s.onLeft).not.toHaveBeenCalled()
})

test('w lewo: odsłania „Usuń”, po progu – do kosza', () => {
  const s = setup()
  s.move(-100)
  expect(screen.getByText('Usuń')).toBeDefined()
  s.release()
  expect(s.onLeft).toHaveBeenCalledOnce()
})

test('za krótki gest wraca bez skutku', () => {
  const s = setup()
  s.move(60)
  s.release()
  expect(s.onRight).not.toHaveBeenCalled()
  expect(screen.queryByText('Ogarnij')).toBeNull()
})

test('ruch w pionie (przewijanie) nie jest gestem', () => {
  const s = setup()
  const front = screen.getByRole('button', { name: 'Zadanie' }).parentElement!
  fireEvent.pointerDown(front, { clientX: 200, clientY: 10, pointerId: 1 })
  fireEvent.pointerMove(front, { clientX: 230, clientY: 200, pointerId: 1 })
  fireEvent.pointerMove(front, { clientX: 330, clientY: 210, pointerId: 1 })
  fireEvent.pointerUp(front, { pointerId: 1 })
  expect(s.onRight).not.toHaveBeenCalled()
})

test('ukryte przyciski dla czytników ekranu', () => {
  const s = setup()
  fireEvent.click(screen.getByRole('button', { name: 'Do kosza' }))
  expect(s.onLeft).toHaveBeenCalledOnce()
})
