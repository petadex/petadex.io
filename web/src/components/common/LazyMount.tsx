"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

export interface LazyMountProps {
  children: ReactNode
  /** Rendered in place of `children` until the wrapper is (nearly) in view. */
  placeholder?: ReactNode
  /** How far outside the viewport to start mounting — gives it a head start over the scroll. */
  rootMargin?: string
  className?: string
}

/**
 * Defers mounting `children` until the wrapper scrolls near the viewport.
 *
 * For anything whose mount triggers real work — a data fetch, a canvas
 * render loop, a heavy chart library — mounting it eagerly on a long page
 * means paying that cost on load for content the visitor may never scroll
 * to. Once visible the observer disconnects and children stay mounted
 * permanently; this is a one-way reveal, not a virtualizer.
 */
export function LazyMount({
  children,
  placeholder = null,
  rootMargin = "200px",
  className = "",
}: LazyMountProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (visible || !ref.current) return
    const el = ref.current
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [visible, rootMargin])

  return (
    <div ref={ref} className={className}>
      {visible ? children : placeholder}
    </div>
  )
}
