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
  const onSwipeLeft = vi.fn()
  const onSwipeRight = vi.fn()
  const onTap = vi.fn()
  render(
    <SwipeRow
      onSwipeLeft={onSwipeLeft}
      onSwipeRight={onSwipeRight}
      editLabel="Edytuj"
      deleteLabel="Usuń"
    >
      <button type="button" onClick={onTap}>
        Zadanie
      </button>
    </SwipeRow>,
  )
  const row = screen.getByRole('button', { name: 'Zadanie' }).closest('div')!.parentElement!
  const swipe = (to: number) => {
    fireEvent.pointerDown(row, { clientX: 200, clientY: 10, pointerId: 1 })
    fireEvent.pointerMove(row, { clientX: 200 + to / 2, clientY: 10, pointerId: 1 })
    fireEvent.pointerMove(row, { clientX: 200 + to, clientY: 10, pointerId: 1 })
  }
  const release = (to: number) =>
    fireEvent.pointerUp(row, { clientX: 200 + to, clientY: 10, pointerId: 1 })
  return { onSwipeLeft, onSwipeRight, onTap, swipe, release }
}

test('w lewo: podpowiedź „Edytuj” → „Puść, aby edytować” → edycja', () => {
  const s = setup()
  s.swipe(-40)
  expect(screen.getByText('Edytuj', { selector: 'span' })).toBeDefined()
  s.swipe(-160)
  expect(screen.getByText(/Puść, abys*edytować/)).toBeDefined()
  s.release(-160)
  expect(s.onSwipeLeft).toHaveBeenCalledOnce()
  expect(s.onSwipeRight).not.toHaveBeenCalled()
})

test('w prawo: podpowiedź „Puść, aby usunąć” → usunięcie', () => {
  const s = setup()
  s.swipe(160)
  expect(screen.getByText(/Puść, abys*usunąć/)).toBeDefined()
  s.release(160)
  expect(s.onSwipeRight).toHaveBeenCalledOnce()
})

test('za krótki gest wraca bez skutku', () => {
  const s = setup()
  s.swipe(50)
  s.release(50)
  expect(s.onSwipeLeft).not.toHaveBeenCalled()
  expect(s.onSwipeRight).not.toHaveBeenCalled()
})

test('ruch w pionie (przewijanie) nie jest gestem', () => {
  const s = setup()
  const row = screen.getByRole('button', { name: 'Zadanie' }).closest('div')!.parentElement!
  fireEvent.pointerDown(row, { clientX: 200, clientY: 10, pointerId: 1 })
  fireEvent.pointerMove(row, { clientX: 260, clientY: 200, pointerId: 1 })
  fireEvent.pointerUp(row, { clientX: 260, clientY: 200, pointerId: 1 })
  expect(s.onSwipeRight).not.toHaveBeenCalled()
})
