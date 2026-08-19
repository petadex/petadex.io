import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"

// RTL's automatic cleanup only self-registers when it detects Vitest's
// `globals: true` mode. This config uses explicit imports instead, so
// cleanup is wired up by hand -- otherwise a component left mounted by one
// test (e.g. CitationCard's button) collides with the next test's query.
afterEach(() => {
  cleanup()
})

/**
 * jsdom ships neither ResizeObserver nor a real 2D canvas backend. Nothing
 * under test asserts on pixel content (see the Homepage Test Plan — E2E
 * layer only asserts the canvas mounts and is sized, never pixels), so a
 * no-op stub is enough to let components that call these APIs render without
 * a native `canvas` dependency.
 */
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver

const canvas2DContextStub = {
  setTransform: () => {},
  fillRect: () => {},
  strokeRect: () => {},
  clearRect: () => {},
  beginPath: () => {},
  moveTo: () => {},
  lineTo: () => {},
  arc: () => {},
  stroke: () => {},
  fill: () => {},
  save: () => {},
  restore: () => {},
  translate: () => {},
  scale: () => {},
  measureText: () => ({ width: 0 }),
  fillText: () => {},
} as unknown as CanvasRenderingContext2D

HTMLCanvasElement.prototype.getContext = ((contextId: string) =>
  contextId === "2d"
    ? canvas2DContextStub
    : null) as typeof HTMLCanvasElement.prototype.getContext
