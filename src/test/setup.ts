import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
afterEach(cleanup)
if (typeof MouseEvent !== 'undefined' && typeof DragEvent === 'undefined') {
  class TestDragEvent extends MouseEvent {
    readonly dataTransfer: DataTransfer | null
    constructor(type: string, init: DragEventInit = {}) {
      super(type, init)
      this.dataTransfer = init.dataTransfer ?? null
    }
  }
  Object.defineProperty(globalThis, 'DragEvent', { configurable: true, value: TestDragEvent })
}

